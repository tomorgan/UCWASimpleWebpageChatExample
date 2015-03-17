/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// Events functions can be used to automatically issue event channel requests and 
    /// process the resulting responses.
    /// </summary>
    /// <remarks>
    /// These functions also provide a way for business logic to register event handlers.
    /// These handlers are invoked when relevant data is found during response processing.
    /// </remarks>
    /// <param name="cache">Cache object used during eventing.</param>
    /// <param name="transport">Transport object used during eventing.</param>
    /// <param name="options">Object for configuring rate at which events are polled.</param>
    microsoft.rtc.ucwa.samples.Events = (function($) {
        var obj = function Events(cache, transport, options) {
            if (!this instanceof Events) {
                return new Events();
            }

            // The state of the event processing pipeline
            var _handlingEvents = false,
            // The handlers registered to listen for events
            _handlers = {};

            /// <summary>
            /// Continues the event cycle by requesting the next event response.
            /// </summary>
            /// <param name="data">Data to check for event resources.</param>
            /// <remarks>
            /// Check the supplied data object to see if it is non-null and that 
            /// _links exists. If it sees either a resync or next resource on 
            /// the _links property, make an HTTP request on it to continue the 
            /// event cycle. Note that resync is given precedence over next.
            /// </remarks>
            function getNextEventResponse(data) {
                if (data && data._links) {
                    if (data._links.resync) {
                        transport.clientRequest({
                            url: getEventsHref(data._links.resync.href),
                            type: "get",
                            acceptType: 'application/json',
                            callback: processEvents,
                            notifyAction: false
                        });
                    } else if (data._links.next) {
                        transport.clientRequest({
                            url: getEventsHref(data._links.next.href),
                            type: "get",
                            acceptType: 'application/json',
                            callback: processEvents,
                            notifyAction: false
                        });
                    }
                }
            }

            /// <summary>
            /// Normalizes event type for easier processing.
            /// </summary>
            /// <param name="eventType">The type of the event being processed.</param>
            /// <remarks>
            /// Noramlize added to started and deleted to completed.
            /// </remarks>
            function normalizeEventType(eventType) {
                var normalizedEventType = eventType;

                if (normalizedEventType === 'added') {
                    normalizedEventType = 'started';
                }

                if (normalizedEventType === 'deleted') {
                    normalizedEventType = 'completed';
                }

                return normalizedEventType;
            }

            /// <summary>
            /// Determines whether there are any listeners for this event.
            /// </summary>
            /// <param name="cachedData">The event being checked.</param>
            /// <remarks>
            /// Check for listeners based on operationId, rel, or href. 
            /// Also check the global handler, *.
            /// For ease of use, this will fetch a non-embedded resource 
            /// and pass it to the handler. Advanced applications might choose to omit
            /// this behavior and decide to fetch in the business logic.
            /// </remarks>
            function checkHrefOrOperationListeners(cachedData, parts) {
                var tempEventType = normalizeEventType(cachedData.type),
                opId = null,
                localHandlers = [];

                if (cachedData._embedded) {
                    opId = cachedData._embedded[cachedData.link.rel].operationId || null;
                }

                localHandlers.push(_handlers[opId]);
                localHandlers.push(_handlers[cachedData.link.rel]);
                localHandlers.push(_handlers[cachedData.link.href]);
                localHandlers.push(_handlers['*']);
                for (var i = 0; i < localHandlers.length; i++) {
                    if (localHandlers[i] && localHandlers[i][tempEventType]) {
                        var handler = localHandlers[i][tempEventType];
                        try {
                            handler(cachedData, parts);
                        } catch(e) {
                            window.console.log("Encountered error executing event handler callback: " + e.message);
                        }
                    }
                }
            }

            /// <summary>
            /// Process event data and notify any subscribed handlers.
            /// </summary>
            /// <param name="data">Event data to process.</param>
            /// <remarks>
            /// Determine whether event handling is already active. If so, iterate over 
            /// each event in the response, caching each and 
            /// seeing if any match one or more registered handlers.
            /// </remarks>
            function processEvents(data) {
                if (_handlingEvents) {
                    if (data.results) {
                        getNextEventResponse(data.results);
                    }

                    if (data.results && data.results.sender && data.results.sender.length > 0) {
                        if (data.results.sender) {
                            for (var item in data.results.sender) {
                                var ref = data.results.sender[item].events;
                                for (var subItem in ref) {
                                    checkHrefOrOperationListeners(ref[subItem], data);
                                }
                            }
                        }
                    }
                }
            }

            /// <summary>
            /// Determine if events href should include additional query parameters.
            /// </summary>
            /// <param name="href">Initial href to events</param>
            /// <remarks>
            /// Events has an internal options object that describe the rate at which 
            /// low and medium events (in seconds, 5 minimum / 1800 maximum), priority 
            /// for event requests (0 minimum), and timeout when no events are received 
            /// (in seconds, 180 minimum, 1800 maximum).
            /// </remarks>
            /// <returns>Href with the appropriate query parameter additions.</returns>
            function getEventsHref(href) {
                if (options) {
                    if (options.low) {
                        if (options.low < 5) {
                            options.low = 5;
                        } else if (options.low > 1800) {
                            options.low = 1800
                        }

                        href += "&low=" + options.low;
                    }

                    if (options.medium) {
                        if (options.medium < 5) {
                            options.medium = 5;
                        } else if (options.medium > 1800) {
                            options.medium = 1800
                        }

                        href += "&medium=" + options.medium;
                    }

                    if (options.priority) {
                        if (options.priority < 0) {
                            options.priority = 0;
                        }

                        href += "&priority=" + options.priority;
                    }

                    if (options.timeout) {
                        if (options.timeout < 180) {
                            options.timeout = 180;
                        } else if (options.timeout > 1800) {
                            options.timeout = 1800
                        }

                        href += "&timeout=" + options.timeout;
                    }
                }

                return href;
            }

            /// <summary>
            /// Starts listening to the event channel.
            /// </summary>
            /// <remarks>
            /// Determines whether event handling is already active. If not, it makes 
            /// the initial request to start receiving data via the event channel.
            /// </remarks>
            obj.prototype.startEvents = function() {
                if (!_handlingEvents) {
                    _handlingEvents = true;

                    cache.read({
                        id: "main"
                    }).done(function(cacheData) {
                        transport.clientRequest({
                            url: getEventsHref(cacheData._links.events.href),
                            type: "get",
                            acceptType: 'application/json',
                            callback: processEvents
                        });
                    });
                }
            }

            /// <summary>
            /// Stops listening to the event channel.
            /// </summary>
            /// <remarks>
            /// Stops listening to the event channel and clears the event handler array.
            /// </remarks>
            obj.prototype.stopEvents = function() {
                _handlingEvents = false;
                _handlers.length = 0;
            }

            /// <summary>
            /// Adds an event handler.
            /// </summary>
            /// <param name="raiser">The raiser of the event that will trigger the handlers.</param>
            /// <param name="handlers">The set of handlers, one for each event type.</param>
            /// <remarks>
            /// raiser should be an object containing one of the following:
            /// {
            ///     href: "myLink" (relative URL of the resource provided by the server),
            ///     rel: "people" (relation type),
            ///     operationId: "1918-bf83" (unique, client-supplied ID for tracking operation resources on the event channel)
            /// }
            /// handlers should be an object containing one or more of the following:
            /// {
            ///     started : function(data) {...},
            ///     updated : function(data) {...},
            ///     completed : function(data) {...},
            /// }
            /// </remarks>
            obj.prototype.addEventHandlers = function(raiser, handlers) {
                var specificRaiser;

                if (raiser) {
                    if (raiser.href) {
                        specificRaiser = raiser.href;
                    } else if (raiser.rel) {
                        specificRaiser = raiser.rel;
                    } else {
                        specificRaiser = raiser.operationId;
                    }
                }
                
                _handlers[specificRaiser] = handlers;
            }

            /// <summary>
            /// Removes event handlers.
            /// </summary>
            /// <param name="raiser">The raiser of the event to be removed along with handlers.</param>
            /// <remarks>
            /// If a raiser for the event is not found, a console message will indicate as such.
            /// </remarks>
            obj.prototype.removeEventHandlers = function(raiser) {
                if (_handlers[raiser]) {
                    delete _handlers[raiser];
                } else {
                    window.console.log("Event handler not found, unable to remove: " + raiser);
                }
            }

            /// <summary>
            /// Updates the local options object with new values.
            /// </summary>
            /// <param name="value">Object to update local options with.</param>
            /// <remarks>
            /// value comes in the form of:
            /// {
            ///     low - number in seconds (5 - 1800)
            ///     medium - number in seconds (5 - 1800)
            ///     priority - number indicating event priority
            ///     timeout - number in seconds (180 - 1800) 
            /// }
            /// </remarks>
            obj.prototype.updateEventOptions = function(value) {
                if (!options) {
                    options = {};
                }

                if (value) {
                    if (value.low) {
                        options.low = value.low;
                    }

                    if (value.medium) {
                        options.medium = value.medium;
                    }

                    if (value.priority) {
                        options.priority = value.priority;
                    }

                    if (value.timeout) {
                        options.timeout = value.timeout;
                    }
                }
            }
        };

        return obj;
    }(jQuery));
}());