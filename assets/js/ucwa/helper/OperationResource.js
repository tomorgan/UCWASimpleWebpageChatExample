/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// OperationResource is responsible for the following steps (order matters!):
    ///     1) Creating an operation ID
    ///     2) Registering handlers with the Event module for the operation ID in #1
    ///     3) Issuing a request via Transport with the operation ID from #1
    /// </summary>
    /// <param name="transport">Transport object used during operations.</param>
    /// <param name="events">Events object used during operations.</param>
    /// <remarks>
    /// OperationResource is a thin layer on top of Transport and Events to 
    /// streamline the handling of UCWA operation resources.
    /// </remarks>
    microsoft.rtc.ucwa.samples.OperationResource = (function($) {
        var obj = function OperationResource(transport, events) {
            if (!this instanceof OperationResource) {
                return new OperationResource();
            }

            /// <summary>
            /// Starts a UCWA operation resource and register handlers for changes on the event channel.
            /// </summary>
            /// <param name="data">Request object to process (similar to the input of Transport's clientRequest function).</param>
            /// <param name="handlers">The set of handlers, one for each event type.</param>
            /// <remarks>
            /// 1) Generate an operation ID.
            /// 2) Register the provided event handlers with the operation ID from step 1 as the trigger.
            /// 3) Start the event channel (if not already started).
            /// 4) Add the operation ID to the request object.
            /// 5) Call on Transport to issue the request.
            /// request should an object in the form of (see Transport):
            /// {
            ///     url: "myLink" (Http request url),
            ///     type: "get" (get, post, put, delete),
            ///     acceptType: "application/json" (default, can be omitted),
            ///     contentType: "application/json" (default, can be omitted),
            ///     data: "hello world" (any kind of JSON data),
            ///     callback: (can be omitted),
            /// }
            /// handlers should be an object containing one or more of the following (see Events):
            /// {
            ///     started : function(data) {...},
            ///     updated : function(data) {...},
            ///     completed : function(data) {...},
            /// }
            /// </remarks>
            /// <returns>A string representing the operationId</returns>
            obj.prototype.startOperation = function(request, handlers) {
                /*
                1) Register handlers
                2) Start the event channel (NOP if already started)
                3) POST on URL supplied in request object
                */
                var raiser = {
                    operationId : _generalHelper.generateUUID()
                };

                events.addEventHandlers(raiser, handlers);
                events.startEvents();

                request.data.operationId = raiser.operationId;
                transport.clientRequest({
                    url: request.url,
                    type: request.type,
                    acceptType: request.acceptType,
                    contentType: request.contentType,
                    data: request.data,
                    callback: request.callback ? request.callback : function() {}
                });

                return raiser.operationId;
            }

            /// <summary>
            /// Stops a UCWA operation resource and removes handlers for changes from the event channel.
            /// </summary>
            /// <param name="id">Identifier of of the UCWA operation.</param>
            obj.prototype.stopOperation = function(id) {
                events.removeEventHandlers(id);
            }
        };

        return obj;
    }(jQuery));
}());