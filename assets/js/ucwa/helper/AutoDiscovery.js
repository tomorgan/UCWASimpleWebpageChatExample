/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// AutoDiscovery is responsible for discovering the correct location of the AutoDiscover service
    /// and setting up a Transport object with the correct final domain.
    /// </summary>
    /// <param name="transport">Transport object used during AutoDiscovery.</param>
    microsoft.rtc.ucwa.samples.AutoDiscovery = (function($) {
        var obj = function AutoDiscovery(transport) {
            if (!this instanceof AutoDiscovery) {
                return new AutoDiscovery();
            }

            // Link to the user resource encountered during AutoDiscovery
            var _user = null,
            // The callback to use once AutoDiscovery is complete
            _callback = null,
            // The URL to use to start AutoDiscovery
            _discoveryLocation = null,
            // The fully-qualified domain name (FQDN) derived from the user's sign-in address
            _domain = null,
            // The FQDN given by the server during the AutoDiscovery process
            _serverFqdn = null,
            // DOM element where Transport should inject the cross-domain frame.
            _container = null;

            /// <summary>
            /// Internal starting point for AutoDiscovery.
            /// </summary>
            /// <param name="domain">FQDN to use during AutoDiscovery.</param>
            /// <param name="container">DOM element where Transport should inject the cross-domain frame.</param>
            /// <remarks>
            /// Stores the supplied domain as it will be used in subsequent AutoDiscovery attempts. 
            /// Stores the container as it will receive any iframe needed during AutoDiscovery and 
            /// the final iframe if AutoDiscovery succeeds. The first location to check is: 
            ///     "https://lyncdiscover." + domain
            /// Use the Transport object to insert a new iframe at the discovery location and supply 
            /// a callback to test it after load.
            /// </remarks>
            function startAutoDiscover(domain, container, prefix) {
                _domain = domain;
                _container = container;
                _discoveryLocation = prefix + _domain;
                var frameLoc = _discoveryLocation + "/xframe";
                transport.injectFrame(frameLoc, _container, handleFrameLoad);
            }

            /// <summary>
            /// Handler for iframe's load event.
            /// </summary>
            /// <remarks>
            /// Updates the internal Transport object to use the correct iframe and domain during 
            /// communications.  If the final domain has not been determined, it will begin testing 
            /// AutoDiscovery.  If the final domain has been determined, it will execute the stored 
            /// callback (if defined).
            /// </remarks>
            function handleFrameLoad(data) {
                if (_serverFqdn === null) {
                    testDiscovery(data);
                } else {
                    _generalHelper.safeCallbackExec({
                        callback: _callback,
                        params: [
                            _user
                        ],
                        error: "Encountered error executing autodiscovery callback"
                    });
                }
            }

            /// <summary>
            /// Tests the current frame and domain for AutoDiscovery.
            /// </summary>
            /// <remarks>
            /// Use the internal Transport object to make a request on the current discovery location. 
            /// Depending on the result it will either 
            /// 1) make a further discovery attempt on: 
            ///     "https://lyncdiscover." + domain, or
            /// 2) if successful, it will determine the final domain and inject the final iframe using 
            /// the Transport object.
            /// </remarks>
            function testDiscovery(data) {
                if (data.status !== 200) {
                    if (data.link && data.link.indexOf("https://lyncdiscoverinternal.") !== -1) {
                        startAutoDiscover(_domain, _container, "https://lyncdiscover.");
                    } else {
                        window.console.log("Autodiscovery failed on internal/external location");

                        _generalHelper.safeCallbackExec({
                            callback: _callback,
                            params: [
                                null
                            ],
                            error: "Encountered error executing autodiscovery callback"
                        });
                    }
                } else {
                    transport.clientRequest({
                        url: _discoveryLocation,
                        type: "get",
                        callback: function (data) {
                            if (data.status === 200) {
                                _user = data.results._links.user.href;
                                _serverFqdn = data.results._links.xframe.href;
                                transport.injectFrame(_serverFqdn, _container, handleFrameLoad);
                            } else if (_discoveryLocation.indexOf("https://lyncdiscoverinternal.") !== -1) {
                                startAutoDiscover(_domain, _container, "https://lyncdiscover.");
                            } else {
                                window.console.log("Failed Autodiscovery on: " + _discoveryLocation);

                                _generalHelper.safeCallbackExec({
                                    callback: _callback,
                                    params: [
                                        null
                                    ],
                                    error: "Encountered error executing autodiscovery callback"
                                });
                            }
                        }
                    });
                }
            }

            /// <summary>
            /// Starting point for AutoDiscovery.
            /// </summary>
            /// <param name="domain">FQDN to use during AutoDiscovery.</param>
            /// <param name="container">DOM element that will contain to-be-injected iframe(s).</param>
            /// <param name="callback">Method to execute when AutoDiscovery completes.</param>
            /// <remarks>
            /// Stores supplied callback and begins the internal processing of AutoDiscovery.
            /// </remarks>
            obj.prototype.startDiscovery = function(domain, container, callback) {
                _callback = callback;
                startAutoDiscover(domain, container, "https://lyncdiscoverinternal.");
            }
        };

        return obj;
    } (jQuery));
}());