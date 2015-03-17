/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// Main is responsible creating modules in order with proper dependencies.
    /// </summary>
    /// <remarks>
    /// Main also provides an application creation request body that ensures a unique endpoint ID.
    microsoft.rtc.ucwa.samples.Main = (function($) {
        var obj = function Main(anonMeeting) {
            if (!this instanceof Main) {
                return new Main();
            }

            var _storage = new microsoft.rtc.ucwa.samples.MemoryStorage();

            obj.prototype.GeneralHelper = new GeneralHelper();
            obj.prototype.endpointId = this.GeneralHelper.generateUUID();
            obj.prototype.Cache = new microsoft.rtc.ucwa.samples.Cache(_storage);
            obj.prototype.Transport = new microsoft.rtc.ucwa.samples.Transport("*");
            obj.prototype.Events = new microsoft.rtc.ucwa.samples.Events(this.Cache, this.Transport);
            obj.prototype.AutoDiscovery = new microsoft.rtc.ucwa.samples.AutoDiscovery(this.Transport);
            obj.prototype.Authentication = new microsoft.rtc.ucwa.samples.Authentication(this.Cache, this.Transport);

            if (anonMeeting) {
                obj.prototype.anonMeeting = true;
            }
        };

        obj.prototype.createApplication = function() {
            var application = {
                userAgent: "UCWA Samples",
                endpointId: this.endpointId,
                culture: "en-US"
            };

            return application;
        };

        return obj;
    }(jQuery));
}());