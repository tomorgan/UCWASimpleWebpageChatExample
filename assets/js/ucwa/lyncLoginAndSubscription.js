$(function () {

	//set up UCWA
	var site = new Site();
	window.site = site;
	site.setup();
	site.ucwa = new microsoft.rtc.ucwa.samples.Main();
	
	var loginSIPAddress = 'webchatuser@yourdomain.com';
	var loginDomain = 'yourdomain.com';
	var loginPassword = 'pass@word1';
	var subscribeToSIPAddress = 'sip:expert@yourdomain.com';

	SignIntoLync();

	function SignIntoLync() {
		site.ucwa.Transport.setRequestCallbacks({
			start : ajaxStart,
			stop : ajaxStop
		});
		ajaxStart();
		site.ucwa.AutoDiscovery.startDiscovery(loginDomain, $("#container"), handleAutoDiscovery);				
	}

	function handleAutoDiscovery(link) {
		ajaxStop();

		if (link) {
			site.ucwa.Authentication.setCredentials(loginSIPAddress, loginPassword);
			site.ucwa.Authentication.start(link, site.ucwa.createApplication(), handleLogin);
		} else {
			alert("Autodiscovery failed!");
		}
	}

	function handleLogin(isAuthenticated) {
		ajaxStop();

		if (isAuthenticated) {
			console.log('logged in');
			SubscribePresenceUpdates();
		} else {
			alert("Login failed");
		}
	}

	function SubscribePresenceUpdates() {
		var raiser = {
			rel : 'contactPresence'
		},
		handlers = {
			started : handleGetPresence,
			updated : handleGetPresence
		};

		site.ucwa.Events.addEventHandlers(raiser, handlers);
		site.ucwa.Events.startEvents();

		var sips = [subscribeToSIPAddress];

		var data = {
			"duration" : 11,
			"uris" : sips
		};

		site.ucwa.Cache.read({
			id : "main"
		}).done(function (cacheData) {
			site.ucwa.Transport.clientRequest({
				url : cacheData._embedded.people._links.presenceSubscriptions.href,
				type : "post",
				data : data,
				callback : function (data) {
					window.site.adHocSubscriptionLink = data.results._links.self.href;
				}
			});
		});
	}

	function handleGetPresence(data) {
		if (data.results !== undefined) {
			if (data.results.availability == 'Online') {
				$('#chat-offline').hide();
				$('#chat-online').show();
			} else {
				$('#chat-offline').show();
				$('#chat-online').hide();
			}
		} else if (data.link) {
			site.ucwa.Transport.clientRequest({
				url : data.link.href,
				type : "get",
				callback : handleGetPresence
			});
		}
	}

});
