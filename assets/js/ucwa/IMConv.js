$(function () {

	var opRes;
	var conversation;
	
	var destinationSIPAddress = 'sip:expert@yourdomain.com';

	$("#chat-send").click(function () {
		if (typeof opRes == 'undefined') {
			Initialise();
		}

		if (typeof conversation == 'undefined') {
			StartNewConversation();
		} else {
			SendMessage();
		}
	});

	function Initialise() {
		opRes = new microsoft.rtc.ucwa.samples.OperationResource(site.ucwa.Transport, site.ucwa.Events),
		imData = {
			importance : "Normal",
			sessionContext : null,
			operationId : null,
			subject : "New Online Chat Request",
			telemetryId : null,
			to : null
		},
		messagingLinks = {
			Messaging : null,
			SendMessage : null,
			StopMessaging : null
		},
		contactObjs = [],
		handlers = [];

	}

	function StartNewConversation() {
		site.ucwa.Cache.read({
			id : "main"
		}).done(function (cacheData) {

			imData.sessionContext = site.ucwa.GeneralHelper.generateUUID();
			imData.operationId = site.ucwa.GeneralHelper.generateUUID();
			imData.to = destinationSIPAddress;
			site.ucwa.Transport.clientRequest({
				url : cacheData._embedded.communication._links.startMessaging.href,
				type : "post",
				data : imData,
				callback : function (data) {
					if (data.status === 201) {
						if (handlers.indexOf("conversation") === -1) {
							handlers.push("conversation");
							site.ucwa.Events.addEventHandlers({
								rel : "conversation"
							}, {
								updated : handleConversation
							});
						}

						if (handlers.indexOf("message") === -1) {
							handlers.push("message");
							site.ucwa.Events.addEventHandlers({
								rel : 'message'
							}, {
								completed : handleMessage
							});
						}

						if (handlers.indexOf("messaging") === -1) {
							handlers.push("messaging");
							site.ucwa.Events.addEventHandlers({
								rel : "messaging"
							}, {
								updated : handleMessaging
							});
						}

						site.ucwa.Events.startEvents();
					} else {
						cleanupMessaging();
					}
				}
			});
		});
	}

	function SendMessage() {
		var textToSend = $('#chat-input').val();

		if (textToSend !== "") {
			site.ucwa.Transport.clientRequest({
				url : messagingLinks.SendMessage + "?OperationContext=" + site.ucwa.GeneralHelper.generateUUID(),
				type : "post",
				data : textToSend,
				contentType : "text/plain",
				callback : function (data) {
					$('#chat-input').val('');
					var newItem = "<div class='conversation-sent'><span class='conversation-sent-text'>" + textToSend + "</span></div>";
					AppendToConversation(newItem);
				}
			});
		}
	}

	function handleConversation(data) {
		if (data._embedded.conversation.state === "Disconnected") {
			cleanupMessaging();
		}
	}

	function handleMessaging(data) {
		if (data._embedded.messaging.state === "Connected") {
			conversation = data;
			messagingLinks.SendMessage = data._embedded.messaging._links.sendMessage.href;
			messagingLinks.StopMessaging = data._embedded.messaging._links.stopMessaging.href;
			SendMessage();
		}
	}

	function handleMessage(data, parts) {
		if (data._embedded && data.link && data.link.rel) {
			var embedded = data._embedded[data.link.rel] || false;

			if (embedded && embedded._links && embedded._links.plainMessage && embedded._links.plainMessage.href) {
				var message = decodeMessage(embedded._links.plainMessage.href);
			
				var newItem = "<div class='conversation-recd'><span class='conversation-recd-text'>" + message + "</span></div>";
				AppendToConversation(newItem);
			}
		}

	}

	function decodeMessage(message) {
		return site.ucwa.GeneralHelper.extractDataFromDataUri(message, {
			unescape : true
		});
	}

	function cleanupMessaging() {

		contactObjs.length = 0;

		for (var id in handlers) {
			site.ucwa.Events.removeEventHandlers(handlers[id]);
		}

		handlers.length = 0;

		for (var item in messagingLinks) {
			messagingLinks[item] = null;
		}

		var newItem = "<div class='conversation-recd'><span class='conversation-recd-text'>Conversation has ended.</span></div>";
		AppendToConversation(newItem);
	}

});
