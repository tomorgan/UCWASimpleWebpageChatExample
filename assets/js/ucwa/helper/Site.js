/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    /// <summary>
    /// Site is responsible for handling transitions between samples
    /// </summary>
    /// <remarks>
    /// It is not actually a module. It does call on Transport to make
    /// sure the server-side UCWA application is still active.
    /// It handles the following:
    /// * Loading a new sample via ajax and injecting it into the DOM
    /// * Setting up collapse/expand divs on a new sample page
    /// * Loading and rendering code snippets on a new sample page
    /// </remarks>
    var Site = {};

    Site = (function($) {
        var obj = function Site() {
            if (!this instanceof Site) {
                return new Site();
            }

            // Preserve this so we can use it in the click callback...
            var _scope = this,
            _selectedNav = null;

            // Load a new sample via ajax
            function loadContent(id) {
                $.ajax({
                    url: "samples/html/" + id + ".html",
                    type: "get",
                    dataType: "text",
                    success: function(result) {
                        $(".content").html(result);
                        var counter = 0;
                        $(".task").each(function() {
                            $(this)[0].id = counter++;
                            $("#tasks").append($("#task-template").tmpl({
                                text: $(this).text(),
                                id: $(this)[0].id
                            }));
                        });
                    }
                });
            }

            // Use Transport to ping the server-side UCWA application & setup collapse/expand divs
            this.setup = function() {
                // Style the anchors with idleNav
                $(".nav li a").addClass("idleNav");
                $(".nav li a").click(function() {
                    if (_scope.ucwa) {
                        if (!_scope.ucwa.Authentication.isAuthenticated() && this.id === "AnonMeeting") {
                            // If we are anonymously joining a meeting we are locked into 1 task...
                            _scope.ucwa.Events.stopEvents();
                            loadContent(this.id);
                        } else if (_scope.ucwa.Authentication.isAuthenticated() && _selectedNav !== this && !_scope.ucwa.anonMeeting && this.id !== "AnonMeeting") {
                            var nav = this;

                            _scope.ucwa.Cache.read({
                                id: "main"
                            }).done(function(cacheData) {
                                _scope.ucwa.Transport.clientRequest({
                                    url: cacheData._links.self.href,
                                    type: "get",
                                    callback: function(data) {
                                        if (data.status >= 400) {
                                            // Time to re-login
                                            $("#relogin").trigger("click");
                                        } else {
                                            // Keep a reference to determine if we are currently on this Nav or another Nav
                                            // This may be removed in case a user wants to reload the Nav without actually needing 
                                            // to choose another Nav and come back...
                                            _selectedNav = nav;

                                            $(".auth").hide();

                                            // selectedNav is removed and idleNav is added to all
                                            $(".nav li a").removeClass("selectedNav").addClass("idleNav");
                                            // selectedNav is added to the clicked anchor
                                            $(nav).addClass("selectedNav idleNav");

                                            _scope.ucwa.Events.stopEvents();
                                            loadContent(_selectedNav.id);
                                        }
                                    }
                                });
                            });
                        }
                    }

                    return false;
                });

                $.ajax({
                    url: "content-template.html",
                    type: "get",
                    dataType: "text",
                    success: function(result) {
                        $("body").append(result);
                    }
                });

                $("body").delegate(".code", "click", function() {
                    var element = $(this).next("div"),
                    value = $(this).text().split(" ")[0];

                    if (element.is(":hidden")) {
                        $(this).text(value + " - Click to Collapse");
                    } else {
                        $(this).text(value + " - Click to Expand");
                    }

                    $(this).next("div").toggle();
                });
            }

            // Load & render code snippets
            this.codifyElement = function(element, file, isModule) {
                element.html($("#code-template").tmpl({
                    file: file,
                    isModule: isModule
                }));

                $.ajax({
                    url: element.find(".codeHeader a").html(),
                    type: "get",
                    dataType: "text",
                    success: function(result) {
                        element.find("div").toggle();
                        element.find(".codeBody pre").html(result.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
                    }
                });
            }
        };

        return obj;
    }(jQuery));

    // Chrome needs this so that the Site is available everywhere...
    window["Site"] = Site;
}());