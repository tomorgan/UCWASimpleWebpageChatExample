function ajaxStart() {
	$('#ajaxLoading').show();
}

function ajaxStop() {
	$('#ajaxLoading').hide();
}

function AppendToConversation(newDiv) {
	$('#conversation').append(newDiv);
}
