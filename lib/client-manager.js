/*
 * Open vMonitor is a WEB-based tool for monitoring and troubleshooting Open vSwitch
 * Copyright (C) 2014  PLVision
 * Ihor Chumak, Roman Gotsiy
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.

 * PLVision, developers@plvision.eu
 */

var ovsdb = require('ovsdb-client');
var debug = require('debug')('client-manager');
var assert = require("assert");
var async = require("async");
var fs = require("fs");

var lock = require("./lock.js")

var _instance;

function getInstance(app) {
    if (!_instance) {
        debug("Creating instance of ClientManager");
        _instance = new ClientManager(app);
        return _instance;
    }
    return _instance;
}

function ClientManager(app) {
    this.app = app;
    this.init();
}

ClientManager.prototype.init = function () {
    this.clients = {};
};

ClientManager.prototype.client = function (/* ip [, port, secure], callback */) {
    var self = this;
    var userid = arguments[0];
    var ip = arguments[1];
    var port, callback, secure;

    if (ip.indexOf(":") != -1) {
        var parts = ip.split(":");
        if (parts[0] === "ssl") {
            secure = true;
            ip = parts[1];
            port = parts[2];
        } else {
            secure = false;
            ip = parts[0];
            port = parts[1];
        }
        callback = arguments[2];
    } else {
        port = arguments[2];
        secure = arguments[3];
        if (secure instanceof Function) {
            callback = secure;
            secure = false;
        } else {
            callback = arguments[4];
        }
    }

    assert(!(port instanceof Function), "Expected port but function given");

    assert((callback === undefined || (callback instanceof Function)),
        "Expected callback, but third parameter is not a function");

    client_id = userid + "@" + (secure ? "ssl:" : "") + ip + ":" + port;
    debug("Requesting client " + client_id);

    var connect_client = function (client_id, attempts) {
        client = self.clients[client_id];
        if (lock.get(callback)) {
            debug("locked");
            client.connect(function (err, remote) {
                if (err) {
                    delete self.clients[client_id];
                    if (callback) {
                        callback(err, null);
                    }
                    lock.free(this, [err, null])
                } else {
                    if (callback) {
                        callback(null, client);
                    }
                    lock.free(this, [null, client])
                }
            });
        } else {
            debug("wait for free");
        }
    };

    if (!self.clients[client_id]) {
        debug("Client doesn't exist: creating new client");
        var new_client
        if (secure) {
            self.loadCertificates(function (err, certs) {
                if (err) return callback(err);
                new_client = ovsdb.createClient(port, ip, certs);
                self.clients[client_id] = new_client;
                connect_client(client_id);
            });
        }
        else {
            new_client = ovsdb.createClient(port, ip);
            self.clients[client_id] = new_client;
            connect_client(client_id);
        }
    } else {
        debug("Client exist");
        var client = self.clients[client_id];
        if (!client.connected()) {
            debug("Client is not connected: reconnecting");
            connect_client(client_id);
        } else {
            if (callback) {
                callback(null, self.clients[client_id]);
            }
        }
    }
};

ClientManager.prototype.closeAll = function () {
    var self = this;

    for (var client_id in self.clients) {
        var client = self.clients[client_id].close();
        delete self.clients[client_id];
    }
};

ClientManager.prototype.loadCertificates = function (callback) {
    var self = this;

    var certs = {};

    var e = new Error();
    e.code = 495; //cert error
    var cfg = self.app.get('config').secure_connection;
    if (!cfg) {
        e.message = "Secure connection options are not present in config file"
        return callback(e);
    }

    var options = ["private_key", "certificate", "ca_certificate"];
    var optional = { "ca_certificate": true }

    async.each(options, function (opt, next) {
        var cert_file = cfg[opt];
        if (!cert_file) {
            if (!optional[opt]) {
                e.message = "Option " + opt + " is not specified in config file";
                return next(e);
            } else {
                return next();
            }
        }

        fs.readFile(cert_file, function (err, data) {
            if (!err) {
                certs[opt] = data;
                next();
            } else {
                e.message = "Error during reading  " + opt + " (" + cert_file + ")";
                return next(e);
            }
        });
    }, function (err) {
        callback(err, certs);
    });
}

module.exports = getInstance;
