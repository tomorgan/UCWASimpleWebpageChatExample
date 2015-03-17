/* Copyright (C) Microsoft 2014. All rights reserved. */
(function() {
    "use strict";

    var _generalHelper = new GeneralHelper();

    _generalHelper.namespace("microsoft.rtc.ucwa.samples");

    /// <summary>
    /// MemoryStorage is an in-memory implementation of a storage object.
    /// </summary>
    microsoft.rtc.ucwa.samples.MemoryStorage = (function($) {
        var obj = function MemoryStorage() {
            if (!this instanceof MemoryStorage) {
                return new MemoryStorage();
            }

            var _scope = this,
            _data = {};

            /// <summary>
            /// Initialize data.
            /// </summary>
            /// <param name="object">Object to init the storage.</param>
            /// <returns>Promise object related to this init.</returns>
            obj.prototype.init = function(object) {
                var deferred = $.Deferred();
                _data = {};
                deferred.resolve();

                return deferred.promise();
            }

            /// <summary>
            /// Create data in storage based on id.
            /// </summary>
            /// <param name="data">Information.</param>
            /// <param name="id">Identifier to data.</param>
            /// <param name="callback">Method to execute upon completion.</param>
            /// <returns>Promise object related to this create.</returns>
            obj.prototype.create = function(data, id, callback) {
                var deferred = $.Deferred();

                _data[id] = data;

                deferred.resolve(id);

                _generalHelper.safeCallbackExec({
                    callback: callback,
                    params: [
                        id
                    ]
                });

                return deferred.promise();
            }

            /// <summary>
            /// Read data in storage based on id.
            /// </summary>
            /// <param name="id">Identifier to data.</param>
            /// <param name="callback">Method to execute upon completion.</param>
            /// <returns>Promise object related to this read.</returns>
            obj.prototype.read = function(id, callback) {
                var deferred = $.Deferred();

                deferred.resolve(_data[id]);

                _generalHelper.safeCallbackExec({
                    callback: callback,
                    params: [
                        _data[id]
                    ]
                });

                return deferred.promise();
            }

            /// <summary>
            /// Update data in storage based on id.
            /// </summary>
            /// <param name="data">Information.</param>
            /// <param name="id">Identifier to data.</param>
            /// <param name="callback">Method to execute upon completion.</param>
            /// <returns>Promise object related to this update.</returns>
            obj.prototype.update = function(data, id, callback) {
                var deferred = $.Deferred();

                _data[id] = data;

                deferred.resolve(id);

                _generalHelper.safeCallbackExec({
                    callback: callback,
                    params: [
                        id
                    ]
                });

                deferred.promise();
            }

            /// <summary>
            /// Delete data in storage based on id.
            /// </summary>
            /// <param name="id">Identifier to data.</param>
            /// <param name="callback">Method to execute upon completion.</param>
            /// <returns>Promise object related to this delete.</returns>
            obj.prototype.delete = function(id, callback) {
                var deferred = $.Deferred();

                delete _data[id];

                deferred.resolve(id);

                _generalHelper.safeCallbackExec({
                    callback: callback,
                    params: [
                        id
                    ]
                });

                return deferred.promise();
            }
        };

        return obj;
    }(jQuery));
}());