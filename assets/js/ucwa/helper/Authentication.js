/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// Authentication is responsible for responding to a challenge for credentials during AutoDiscovery.
    /// </summary>
    /// <param name="transport">Transport object used during authentication.</param>
    /// <param name="cache">Cache object used during authentication.</param>
    microsoft.rtc.ucwa.samples.Authentication = (function($) {
        var obj = function Authentication(cache, transport) {
            if (!this instanceof Authentication) {
                return new Authentication();
            }

            // The request payload for the application we hope to create
            var _application = null,
            // The state machine's state
            _currentState = 0,
            // The number of errors encountered so far (some are expected, like the 401)
            _authErrorCounter = 0,
            // The conference Uri supplied to the application
            _conferenceUri = null,
            // The conference Id supplied to the application
            _conferenceId = null,
            // The username supplied to the application
            _username = null,
            // The password supplied to the application
            _password = null,
            // The authenticated state of the application
            _authenticated = false,
            // The callback to use once Authentication is complete
            _callback = null,
            // The link provided by AutoDiscovery
            _link = null;

            cache.create({
                id: "main",
                data: {}
            });

            /// <summary>
            /// Makes the initial request to start authentication.
            /// </summary>
            /// <param name="link">Link to authentication service.</param> 
            function startAuthentication(link) {
                transport.clientRequest({
                    url: link,
                    type: "get",
                    callback: handleState
                });
            }

            /// <summary>
            /// Attempts to authorize a user.
            /// </summary>
            /// <param name="data">Authorization data.</param>
            /// <remarks>
            /// Check to see if a link is not defined in the data object 
            /// and check to see if we have exceeded six errors (if so, reset the 
            /// state). Otherwise, make a request using the internal 
            /// Transport object. If the link is defined in the data object, 
            /// begin the process of requesting an access token.
            /// </remarks>
            function handleAuthorization(data) {
                if (data.Link === undefined) {
                    if (_authErrorCounter === 6) {
                        resetState();
                    } else {
                        transport.clientRequest({
                            url: _link,
                            type: "get",
                            callback: handleState
                        });
                    }
                } else {
                    requestAccessToken(data.Link);
                }
            }

            /// <summary>
            /// Attempts to request an access token for the user.
            /// </summary>
            /// <param name="link">Link used to request credentials.</param>
            /// <param name="grantType">Type of authorization request.</param>
            /// <param name="data">Authorization data.</param>
            /// <remarks>
            /// Check to see if a user name and password has been set, and if so, build 
            /// the data object to send in the access token request. Check if a confernce uri 
            /// to attempt anonymous authentication. If nothing has been set default to dialog 
            /// authentication (this will prompt the user). Make a request based on this data 
            /// for an access token using the internal Transport object.
            /// </remarks>
            function requestAccessToken(link, grantType, data) {
                // If the user supplied a username and password allow them to authenticate via grant_type=password first
                // If we have seen at least one error we will default to windows-based because their credentials are 
                // incorrect
                if (_username && _password && _authErrorCounter < 1) {
                    // This assumes data is in the form of username=xxx&password=xxx
                    data = "grant_type=password&username=" + window.encodeURIComponent(_username) + "&password=" + window.encodeURIComponent(_password);
                } else if (_conferenceUri && _conferenceId && _authErrorCounter < 1) {
                    // Attempt anonymous authentication
                    data = "grant_type=urn:microsoft.rtc:anonmeeting&ms_rtc_conferenceuri=" + encodeURIComponent(_conferenceUri) + "&password=" + encodeURIComponent(_conferenceId);
                } else {
                    grantType = "grant_type=urn:microsoft.rtc:windows";
                    data = grantType;
                }

                transport.clientRequest({
                    url: link,
                    type: "post",
                    data: data,
                    contentType: "application/x-www-form-urlencoded;charset='utf-8'",
                    callback: handleState
                });
            }

            /// <summary>
            /// Passes credentials to finalize authentication.
            /// </summary>
            /// <param name="data">Data containing authorization credentials.</param>
            /// <remarks>
            /// First, set the credentials in the internal Transport object for use in subsequent requests.
            /// Then make a request with the credentials.
            /// </remarks>
            function authenticate(data) {
                transport.setAuthorization(data.access_token, data.token_type);
                transport.clientRequest({
                    url: _link,
                    type: "get",
                    callback: handleState
                });
            }

            /// <summary>
            /// Creates a UCWA application.
            /// </summary>
            /// <param name="link">Link used to create a UCWA application.</param>
            /// <remarks>
            /// Use the internal Transport object to make a request using the 
            /// application object as input.
            /// </remarks>
            function createApplication(link) {
                transport.clientRequest({
                    url: link,
                    type: "post",
                    data: _application,
                    callback: handleState
                });
            }

            /// <summary>
            /// Processes state data looking for redirects and errors.
            /// </summary>
            /// <param name="data">Data object to be processed.</param>
            /// <remarks>
            /// State processing checks for any redirect links, which would 
            /// indicate the requested resource has moved and no further processing 
            /// should occur. If no redirect is found, state processing handles success 
            /// states 200, 201, and 204, by incrementing state and parsing JSON data. 
            /// For 401 state it will check for a response header that indicates 
            /// that an authentication link might be present. For error states 400 or 404, 
            /// authentication will reset. All other responses increment an error counter 
            /// that will reset state after six failures.
            /// </remarks>
            /// <returns>Boolean indicating whether state processing was successful.</returns>
            function processStateData(data) {
                // We found a redirect and need to handle it instead of the current state...
                if (data) {
                    if (handleRedirect(data)) {
                        return null;
                    }

                    if (data.status) {
                        switch (data.status) {
                            case 200:
                            case 201:
                            case 204:
                                // Intentional fall-through for all expected 2xx states
                                _currentState++;

                                if (data.results) {
                                    cache.update({
                                        id: "main",
                                        data: data.results
                                    });

                                    if (data.results && data.results._links && data.results._links.applications) {
                                        _currentState = 3;
                                    }

                                }
                                break;
                            case 401:
                                // 401 means it's time to supply credentials
                                data.Link = checkForResponseHeaderUrl(data.headers);

                                // Track how many failed authorize attempts occur
                                if (_currentState === 1) {
                                    _authErrorCounter++;
                                } else {
                                    _currentState++;
                                }
                                break;
                            case 400:
                            case 404:
                                // Reset for either 400 or 404
                                resetState();
                                return false;
                            default:
                                // Other errors
                                if (_authErrorCounter > 6) {
                                    resetState();
                                    return false;
                                }

                                _authErrorCounter++;
                                break;
                        }
                    }

                    return true;
                }

                resetState();

                return false;
            }

            /// <summary>
            /// Handles any redirect links that appear.
            /// </summary>
            /// <param name="data">Data object to be cached.</param>
            /// <remarks>
            /// Checks the supplied data object for any redirect links 
            /// that indicate a resource has moved, and makes a request on 
            /// that redirect to further state logic.
            /// </remarks>
            /// <returns>Boolean indicating whether a redirect occurred.</returns>
            function handleRedirect(data) {
                var link = "",
                result = false;

                if (data && data._links && data._links.redirect) {
                    link = data._links.redirect;
                }

                if (link) {
                    transport.clientRequest({
                        url: link,
                        type: "get",
                        callback: handleState
                    });

                    result = true;
                }

                return result;
            }

            /// <summary>
            /// Resets the authentication state.
            /// </summary>
            /// <remarks>
            /// Clears the current authentication state and executes the provided
            /// callback to indicate authentication has changed.
            /// </remarks>
            function resetState() {
                _authErrorCounter = 0;
                _currentState = 0;
                _authenticated = false;

                _generalHelper.safeCallbackExec({
                    callback: _callback,
                    params: [
                        _authenticated,
                        null
                    ],
                    error: "Encountered error executing authentication callback"
                });
            }

            /// <summary>
            /// Checks the response header for an authentication URL.
            /// </summary>
            /// <param name="headers">Header data to be searched.</param>
            /// <remarks>
            /// Parse headers into a JSON object and attempt to read the 'WWW-Authenticate' 
            /// header and look for MsRtcOAuth to find the authentication href.
            /// </remarks>
            /// <returns>undefined or an authentication href.</returns>
            function checkForResponseHeaderUrl(headers) {
                var url = undefined,
                obj = _generalHelper.parseHeaders(headers);

                if (obj["WWW-Authenticate"] && obj["WWW-Authenticate"].MsRtcOAuth) {
                    url = obj["WWW-Authenticate"].MsRtcOAuth.href;
                }

                return url;
            }

            /// <summary>
            /// Handles internal state logic based on the data supplied and the current state.
            /// </summary>
            /// <param name="data">Data object to use during state processing.</param>
            /// <remarks>
            /// Begins by checking state data to see if the request was successful. If so,
            /// it attempts to handle current state. Each success increments the state.
            /// </remarks>
            function handleState(data) {
                var success = processStateData(data);

                if (success) {
                    switch (_currentState) {
                        case 0:
                            startAuthentication(data);
                            break;
                        case 1:
                            handleAuthorization(data);
                            break;
                        case 2:
                            authenticate(data.results);
                            break;
                        case 3:
                            createApplication(data.results._links.applications.href);
                            break;
                        case 4:
                            if (!_conferenceUri) {
                                makeMeAvailable();
                            } else {
                                handleState(data);
                            }
                            break;
                        case 5:
                            cache.read({
                                id: "main"
                            }).done(function(cacheData) {
                                transport.clientRequest({
                                    url: cacheData._links.self.href,
                                    type: "get",
                                    callback: handleState
                                });
                            });
                            break;
                        case 6:
                            _authenticated = true;

                            _generalHelper.safeCallbackExec({
                                callback: _callback,
                                params: [
                                    _authenticated,
                                    data
                                ],
                                error: "Encountered error handling authentication callback"
                            });
                            break;
                        default:
                            break;
                    }
                }
            }

            /// <summary>
            /// Attempts to make the user available for communication via the currently active UCWA application.
            /// </summary>
            /// <remarks>
            /// First, it determines whether the user is authenticated. Next, it issues a request 
            /// via the Transport layer to make the user available for communication.
            /// Authentication's callback is used to handle the response.
            /// </remarks>
            function makeMeAvailable() {
                if (!_authenticated) {
                    cache.read({
                        id: "main"
                    }).done(function(cacheData) {
                        if (cacheData) {
                            var data = {
                                SupportedModalities: ["Messaging"]
                            };

                            transport.clientRequest({
                                url: cacheData._embedded.me._links.makeMeAvailable.href,
                                type: "post",
                                data: data,
                                callback : handleState
                            });
                        }
                    });
                } else {
                    handleState({
                        status: 204
                    });
                }
            }

            /// <summary>
            /// Sets the conference URI for anonymous join.
            /// </summary>
            /// <param name="conferenceUri">The URI of the conference to join.</param>
            /// <returns>Boolean indicating whether the conference URI was valid and stored.</returns>
            obj.prototype.setAnonymousJoinUri = function(conferenceUri) {
                _conferenceUri = conferenceUri;
                // Matches a conference URI of the form: sip:john@contoso.com;gruu;opaque=app:conf:focus:id:G03W98W4
                var confRegex = /sip:([^;@]+)@([^;@]+);gruu;opaque=app:conf:focus:id:([a-zA-Z0-9]+).*/,
                matches = confRegex.exec(conferenceUri);

                if (!matches || matches.length != 4) {
                    return false;
                } else {
                    _conferenceId = matches[3];
                    return true;
                }
            }

            /// <summary>
            /// Sets the user credentials to be used by authentication.
            /// </summary>
            /// <param name="username">The username to be used for authentication.</param>
            /// <param name="password">The password to be used for authentication.</param>
            obj.prototype.setCredentials = function(username, password) {
                _username = username;
                _password = password;
            }

            /// <summary>
            /// Starts the authentication process.
            /// </summary>
            /// <param name="link">The link that Authentication should start with.</param>
            /// <param name="application">The request payload for the application to create.</param>
            /// <param name="callback">The callback to execute after authentication completes.</param>
            /// <remarks>
            /// Stores the application and callback and begins handling state logic.
            /// The application parameter should an object in the form of:
            /// {
            ///     userAgent: "UCWA Samples",
            //      endpointId: (Unique Identifier),
            //      culture: "en-US",
            /// }
            /// </remarks>
            obj.prototype.start = function(link, application, callback) {
                _link = link;
                _application = application;
                _callback = callback;
                handleState(_link);
            }

            /// <summary>
            /// Attempts to destroy the currently active UCWA application.
            /// </summary>
            /// <param name="callback">Callback to execute after destroying the application.</param>
            /// <remarks>
            /// If the user is not currently authenticated, this function will attempt to call back 
            /// indicating authentication status with no data; otherwise it will attempt 
            /// a delete on the application resource followed by using the callback to 
            /// indicate authentication status.
            ///
            /// The callback should have the following method signature:
            /// function callback( /* bool */ authenticatedState, /* obj */ responseData )
            /// </remarks>
            obj.prototype.destroyApplication = function(callback) {
                if (_authenticated) {
                    cache.read({
                        id: "main"
                    }).done(function(cacheData) {
                        transport.clientRequest({
                            url: cacheData._links.self.href,
                            type: "delete",
                            callback: function(data) {
                                _authenticated = false;
                                _currentState = 0;
                                cache.delete({
                                    id: "main"
                                });
                                transport.setAuthorization(null, null);

                                _generalHelper.safeCallbackExec({
                                    callback: _callback,
                                    params: [
                                        _authenticated,
                                        data
                                    ],
                                    error: "Encountered error handling destroy application callback"
                                });
                            }
                        });
                    });
                } else {
                    _generalHelper.safeCallbackExec({
                        callback: _callback,
                        params: [
                            _authenticated,
                            null
                        ],
                        error: "Encountered error handling destroy application callback"
                    });
                }
            }

            /// <summary>
            /// Determines whether authentication has succeeded and user is authenticated.
            /// </summary>
            /// <returns>Boolean indicating whether the user is authenticated.</returns>
            obj.prototype.isAuthenticated = function() {
                return _authenticated;
            }
        };

        return obj;
    }(jQuery));
}());