/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";
    
    if(typeof($) == 'undefined' || typeof(jQuery) == 'undefined'){
      var noJqueryErrorString = 'Cannot find jQuery. Check your internet connection.';
      alert(noJqueryErrorString);
      throw new Error(noJqueryErrorString);
    }

    /// <summary>
    /// Index is responsible for setting up the samples page
    /// </summary>
    /// <remarks>
    /// It is not actually a module. It does initiate AutoDiscovery
    /// based on user action and pass user input to Authentication. 
    /// </remarks>
    $(document).ready(function() {
        // Create and setup a Site object
        var site = new Site(),
        // An internal reference to the current object. Used in case of changing scope.
        scope = this;

        window.site = site;
        site.setup();

        // Check if IE is in compatibility mode, which prevents the site from running.
        if (document.documentMode && document.documentMode < 9) {
            alert("You appear to be running IE in compatibility mode. Please press F12 and then Alt+S to reload the page in standards mode.");
        }

        function handleAjaxStart() {
            $("body").addClass("loading");
        }

        function handleAjaxStop() {
            $("body").removeClass("loading");
        }

        // Update the UI based on login state
        function handleLogin(isAuthenticated) {
            handleAjaxStop();

            if (isAuthenticated) {
                $("#preAuth").hide();
                $("#postAuth").show();
                $(".authOptions").hide();
            } else {
                $(".authOptions").hide();
                $("#postAuth").hide();
                $("#preAuth").show();
                $("#pickAuth").show();
                alert("Login failed");
            }
        }

        // If AutoDiscovery returns a link, pass user credentials to the Authentication module
        function handleAutoDiscovery(link) {
            handleAjaxStop();
            
            if (link) {
                site.ucwa.Authentication.setCredentials($("#username").val(), $("#password").val());
                site.ucwa.Authentication.start(link, site.ucwa.createApplication(), handleLogin);
            } else {
                alert("Autodiscovery failed!");
            }
        }

        // Parse the user's sign-in address
        function determineDomain() {
            var userName = $("#username").val(),
            password = $("#password").val(),
            domain;

            if (userName !==  "") {
                domain = userName.split("@")[1];
            } else {
                domain = "";
            }

            return domain;
        }

        // Setup and call the AutoDiscovery module
        function beginDiscovery(domain) {
            site.ucwa.Transport.setRequestCallbacks({
                start: handleAjaxStart,
                stop: handleAjaxStop
            });
            handleAjaxStart();
            site.ucwa.AutoDiscovery.startDiscovery(domain, $("#container"), handleAutoDiscovery);
        }

        // Process a click on the sign-in button for user credentials
        function processAuthClick() {
            var domain = determineDomain();

            if (domain !== "") {
                handleAjaxStart();
                site.ucwa = new microsoft.rtc.ucwa.samples.Main();
                beginDiscovery(domain);
            } else {
                alert("Missing credentials!");
            }
        }

        // Process a click on the sign-in button for sandbox credentials
        function processSandboxClick() {
            var domain = $("#domain").val(),
            token = $("#token").val(),
            splitToken = token.split(" ");

            if (!(domain && token && splitToken.length === 2)) {
                alert("Missing credentials!");
                return false;
            }

            var tokenType = splitToken[0],
            accessToken = splitToken[1];

            site.ucwa = new microsoft.rtc.ucwa.samples.Main();
            site.ucwa.Transport.setAuthorization(accessToken, tokenType);
            beginDiscovery(domain);
        }

        // Process a click on the sign-in button for anonMeeting credentials
        function processAnonMeeting() {
            site.ucwa = new microsoft.rtc.ucwa.samples.Main(true);
            handleLogin(true);
            $("#AnonMeeting").trigger("click");
        }

        $(".authPicker").click(function() {
            var target = $(this).attr("target");

            if (target !== "sandbox") {
                $("#CallViaWork").remove();
            }

            if (target !== "anonMeeting") {
                $("#AnonMeeting").remove();
                $("#" + target).show();
            } else {
                // Find the Tasks items and remove all but Anon to prevent navigation...
                $("ul#tasklist > li > a").not("#AnonMeeting").remove();
                $("#AnonMeeting").addClass("selectedNav idleNav");
                processAnonMeeting();
            }

            $("#pickAuth").hide();
            return false;
        });

        $(".authOptions > div").hide();
        $("#postAuth").toggle();
        $("#relogin").addClass("idleAnchor");

        $("#auth .login").click(function() {
            if (site && site.ucwa && site.ucwa.Transport) {
                site.ucwa.Transport.cleanup();
            }

            processAuthClick();
            return false;
        });

        $("#sandbox .login").click(function() {
            if (site && site.ucwa && site.ucwa.Transport) {
                site.ucwa.Transport.cleanup();
            }

            processSandboxClick();
            return false;
        });

        $('input, select').live("keyup", function(e) {
            if (13 === e.keyCode) {
                var enterBinding = $(this).attr("data-enterBinding")
                $('#' + enterBinding).click();
                return false;
            }
        });
    });
}());