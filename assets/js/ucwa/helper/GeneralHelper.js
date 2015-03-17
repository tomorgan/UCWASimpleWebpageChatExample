/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var GeneralHelper = {};

    /// <summary>
    /// GeneralHelper contains functions common across several modules.
    /// </summary>
    /// <remarks>
    /// The functions can be used for these purposes:
    /// * create namespaces (to prevent collisions with other JavaScript objects)
    /// * check for null and undefined objects
    /// * generate UUIDs
    /// * check if an object is an Array and empty
    /// * process Data URIs
    /// * Extract Origin from URL
    /// * Extract domain from URL
    /// * Convert Join URL to Conference URI
    /// * Log Error objects
    /// * Method to reject deferred objects
    /// * Safe callback execution
    /// * Default value fallback
    /// * Parse header string into JSON object
    /// </remarks>
    GeneralHelper = (function($) {
        var obj = function GeneralHelper() {
            if (!this instanceof GeneralHelper) {
                return new GeneralHelper();
            }

            // Fix console issues in IE...
            if (!window.console) {
                window.console = {
                    log: function() {},
                    trace: function() {},
                    error: function() {}
                };
            }
        };

        /// <summary>
        /// Generates a namespace object based on the supplied string.
        /// </summary>
        /// <param name="namespaceString">Namespace to generate.</param>
        /// <remarks>
        /// Namespaces are used to prevent collisions with other JavaScript objects.
        /// Split the namespace on '.' and begin iterating over the parts, 
        /// creating a new object if necessary.
        /// </remarks>
        /// <returns>JSON object representing the namespace.</returns>
        obj.prototype.namespace = function(namespaceString) {
            var parts = namespaceString.split('.'),
                parent = window,
                currentPart = '';

            for (var i = 0, length = parts.length; i < length; i++) {
                currentPart = parts[i];

                if (!parent[currentPart]) {
                    parent[currentPart] = parent[currentPart] || {};
                }

                parent = parent[currentPart];
            }

            return parent;
        }

        /// <summary>
        /// Generates a Universally Unique Identifier (UUID) based on the RFC 4122 specification.
        /// </summary>
        /// <remarks>
        /// For more information see RFC 4122, at
        ///     http://tools.ietf.org/html/rfc4122
        /// </remarks>
        /// <returns>UUID that can be used as a unique object.</returns>
        obj.prototype.generateUUID = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
                function(c) {
                    var r = Math.random() *16|0,
                    v = c == 'x' ? r : r &0x3|0x8;

                    return v.toString(16);
                }
            );
        }

        /// <summary>
        /// Determines whether object is empty.
        /// </summary>
        /// <param name="object">Object to check.</param>
        /// <returns>Boolean indicating whether the object is empty.</returns>
        obj.prototype.isEmpty = function(object) {
            if (object) {
                if ($.isArray(object)) {
                    return object.length === 0;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        }
        
        /// <summary>
        /// Extracts textual data from a Data URI.
        /// </summary>
        /// <param name="uri">Object containing data to extract.</param>
        /// <param name="options">Object used to determine if the output will be escaped</param>
        /// <remarks>
        /// In UCWA 1.0, Data URIs are used to transmit instant message bodies.
        /// For more information about Data URIs see the RFC:
        ///     http://tools.ietf.org/html/rfc2397
        /// </remarks>
        /// <returns>String extracted from the Data URI.</returns>
        obj.prototype.extractDataFromDataUri = function (uri, options) {
            var regex = /^data:([^,;]+)(?:;charset=([^,;]+))?(;base64)?,(.*)$/i,
            result = regex.exec(uri);

            // Check for base64 and browser support of atob
            if (result[3] && window.atob) {
                var data = escape(window.atob(result[4]));
                return (options && options.unescape) ? decodeURI(data) : data;
            } else {
                // A necessary fix based on browser differences on space representation in Data URI
                var fixPlus = result[4].replace(/\+/g, "%20");
                return (options && options.unescape) ? unescape(fixPlus) : fixPlus;
            }
        }

        /// <summary>
        /// Extracts the Origin from an Absolute URL.
        /// </summary>
        /// <param name="url">Object to extract Origin from.</param>
        /// <remarks>
        /// An Origin consists of SCHEME + "://" + HOST + (optional) ":" + (optional) PORT + "/".
        /// Extract the Origin portion of the URL (shown in [] below).
        ///     [https://example.com:8080/]some/long/path
        /// For more information see RFC 6454, at
        ///     http://tools.ietf.org/html/rfc6454#section-3.2.1
        /// </remarks>
        /// <returns>The Origin as a string or an empty string.</returns>
        obj.prototype.extractOriginFromAbsoluteUrl = function(url) {
            if (url && typeof(url) == "string") {
                var index = url.indexOf("://");
                if (index !== -1) {
                    index += 3;
                    var endOfFqdn = url.indexOf("/", index);
                    return url.slice(0, endOfFqdn);
                } else {
                    return "";
                }
            } else {
                return "";
            }
        }

        /// <summary>
        /// Extracts the Host from a URL.
        /// </summary>
        /// <param name="uri">Object to extract domain from.</param>
        /// <remarks>
        /// Extract the Host portion of the URL (shown in [] below).
        ///     https://[example.com]:8080/some/long/path
        /// </remarks>
        /// <returns>The domain as a string or an empty string.</returns>
        obj.prototype.determineDomain = function(url) {
            var domain = "",
            temp = url.match(/^(?:(?:f|ht)tps?:\/\/)?([^\/:]+)/);

            if (temp.length !== 0) {
                temp = temp[0];

                domain = temp.slice(temp.indexOf(".") + 1);
            }

            return domain;
        }

        /// <summary>
        /// Converts a Join URL into a Conference URI.
        /// </summary>
        /// <param name="joinUrl">Object convert into a conference URI.</param>
        /// <remarks>
        /// A Join URL comes in the form of:
        ///     https://meet.domain.com/username/unique_id
        /// A Conference URI comes in the form of:
        ///     sip:username@domain.com;gruu;opaque=app:conf:focus:id:unique_id
        /// </remarks>
        /// <returns>A formatted Conference URI or an empty string.</returns>
        obj.prototype.convertJoinUrlToUri = function(joinUrl) {
            var domain = this.determineDomain(joinUrl),
            temp = joinUrl.split(domain),
            uri = "";

            if (temp.length >= 2) {
                temp = temp[1];
                temp = temp.split("/");

                uri = "sip:" + temp[1] + "@" + domain + ";gruu;opaque=app:conf:focus:id:" + temp[2];
            }

            return uri;
        }

        /// <summary>
        /// Logs an the message part of an Error object to the Console log.
        /// </summary>
        /// <param name="error">Error object to log.</param>
        obj.prototype.logError = function(error) {
            if (error && error instanceof Error && error.message) {
                window.console.log(error.message);
            }
        }

        /// <summary>
        /// Fails a deferred/callback.
        /// </summary>
        /// <param name="object">Object containing a callback and deferred object.</param>
        /// <param name="message">Error message to log.</param>
        /// <remarks>
        /// object comes in the form of:
        /// {
        ///     callback - method to execute
        ///     deferred - deferred object to reject and if not defined only will be created
        /// }
        /// </remarks>
        /// <returns>Promise object that has been rejected.</returns>
        obj.prototype.genericRejectAction = function(object, message) {
            window.console.log(message);

            var deferred = null;

            if (object) {
                this.logError(object);

                try {
                    if ($.isFunction(object.callback)) {
                        object.callback(null);
                    }
                } catch(e) {
                    window.console.log("GeneralHelper: Encountered error executing callback");
                    this.logError(object);
                }

                if (object.deferred) {
                    deferred = object.deferred;
                }
            }

            if (!deferred) {
                deferred = $.Deferred();
            }

            deferred.reject(null);

            return deferred.promise();
        }

        /// <summary>
        /// Attempts to execute a callback safely (try/catch) and log errors when errors are 
        /// encountered.
        /// </summary>
        /// <param name="object">Object containing information to execute a callback.</param>
        /// <remarks>
        /// object comes in the form of:
        /// {
        ///     callback - method to execute
        ///     params - parameters used by callback
        ///     this - scope resolution
        ///     error - message to log if an error occurs
        /// }
        /// </remarks>
        obj.prototype.safeCallbackExec = function(object) {
            if (object) {
                if ($.isFunction(object.callback)) {
                    try {
                        if ($.isArray(object.params) || !object.params) {
                            object.callback.apply(object.this, object.params);
                        } else {
                            window.console.log("object.params not in correct format: should be [] or null: unable to safe execute callback");
                        }
                    } catch(e) {
                        if (object.error) {
                            window.console.log(object.error);
                        } else {
                            window.console.log("Encountered error safe executing callback");
                        }

                        this.logError(e);
                    }
                } else if (object.callback) {
                    window.console.log("object.callback is not a Function: unable to safe execute callback");
                }
            } else {
                window.console.log("object not defined: unable to safe execute callback");
            }
        }

        /// <summary>
        /// Tests and returns a value (if not null/undefined) or a default.
        /// </summary>
        /// <param name="defaultValue">Object to return when other is null/undefined.</param>
        /// <param name="value">Object to return if not null/undefined.</param>
        /// <returns>Value if not null/undefined or default.</returns>
        obj.prototype.getValue = function(defaultValue, value) {
            return value || defaultValue;
        }

        /// <summary>
        /// Parses a header string into a JSON object.
        /// </summary>
        /// <param name="headers">String representation of headers.</param>
        /// <returns>JSON object containing headers.</returns>
        obj.prototype.parseHeaders = function(headers) {
            var obj = {},
            split = headers.split("\r\n");

            for (var i = 0; i < split.length; i++) {
                if (split[i] !== "") {
                    var index = split[i].indexOf(":");

                    if (index !== -1) {
                        var key = $.trim(split[i].slice(0, index)),
                        value = $.trim(split[i].slice(index + 1)),
                        match = value.match(/\=".*?"/g);

                        if (match && match.length !== 0) {
                            index = value.indexOf(match[0]);

                            var temp = value.slice(0, index),
                            tempMatch = temp.match(/\W/g),
                            splitChar = tempMatch ? tempMatch[0] : null,
                            root =  splitChar ? $.trim(temp.split(splitChar)[0]) : $.trim(temp),
                            child = value.slice(root.length + 1),
                            j = 0;

                            if (!obj[key]) {
                                obj[key] = {};
                            }

                            while (j < match.length) {
                                if (!obj[key][root]) {
                                    obj[key][root] = {};
                                }

                                for (j; j < match.length; j++) {
                                    var skip = 0;

                                    if (child.indexOf(",") === 0 || child.indexOf(splitChar) === 0) {
                                        skip += 1;
                                    }

                                    if (child.indexOf(",") === 1 || child.indexOf(splitChar) === 1) {
                                        skip += 1;
                                    }
                                    
                                    child = child.slice(skip);
                                    index = child.indexOf(match[j]);

                                    var item = $.trim(child.slice(0, index));
                                    index = item.lastIndexOf(splitChar);

                                    if (index !== -1) {
                                        root = $.trim(item.slice(0, index));
                                        child = child.slice(root.length + 1);
                                        break;
                                    }

                                    child = child.slice(item.length + match[j].length);

                                    var valueSplit = match[j].slice(1).replace(/"/g, "").split(",");

                                    if (valueSplit.length === 1) {
                                        obj[key][root][item] = valueSplit[0];
                                    } else {
                                        obj[key][root][item] = [];

                                        for (var k = 0; k < valueSplit.length; k++) {
                                            obj[key][root][item].push(valueSplit[k]);
                                        }
                                    }
                                }
                            }
                        } else {
                            obj[key] = value.replace(/"/g, "");
                        }
                    } else {
                        window.console.log("Not a header?");
                    }
                }
            }

            return obj;
        }

        return obj;
    }(jQuery));

    // Chrome needs this so that the GeneralHelper is available everywhere...
    window["GeneralHelper"] = GeneralHelper;
}());