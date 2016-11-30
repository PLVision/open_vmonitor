/*
 * Open vMonitor is a WEB-based tool for monitoring and troubleshooting Open vSwitch
 * Copyright (C) 2014-2016  PLVision
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


/*
 * file with extra-data loaders for some tables
 * USED BY: table_routes_info.js
*/
var utils = require("../lib/utils.js");
var asyncForEach = require("async").forEach;

/* extra-data loader for bridge table. Loads bridge controllers info */
var object_bridge_data_loader = function (bridge_data, db, callback) {
    var additiona_data = {};
    if (bridge_data instanceof Array) {
        bridge_data = bridge_data[0];
    }
    db.bridges().get(bridge_data._uuid).controllers().data(["is_connected", "target", "status"], function (err, controllers) {
        if (err) return callback(err);
        for (var i = 0; i < controllers.length; i++) {
            controllers[i].status = utils.map_array2map(controllers[i].status);
        }
        additiona_data.controllers = controllers;
        callback(null, additiona_data);
    });
};

/* extra-data loader for port/ports table. Loads interfaces and qoses info */
var ports_data_loader = function (ports_data, db, callback) {
    var additional_data = { interfaces: {} };
    if (!(ports_data instanceof Array)) {
        ports_data = [ports_data];
    }

    asyncForEach(ports_data, function (port, next_port) {
        db.ports().get(port._uuid).interfaces().data(["name", "statistics"], function (err, interface_data) {
            if (err) return next_port(err);
            additional_data.interfaces[port.name] = interface_data;
            next_port();
        });
    }, function (err) {
        callback(err, additional_data);
    });

};

var bridges_data_loader = function (bridges_data, db, callback) {
    var additional_data = { controllers: {} };
    if (!(bridges_data instanceof Array)) {
        bridges_data = [bridges_data];
    }

    asyncForEach(bridges_data, function (bridge, next_bridge) {
        db.bridges().get(bridge._uuid).controllers().data(["is_connected", "target", "status"], function (err, controller_data) {
            if (err) return next_bridge(err);
            additional_data.controllers[bridge.name] = controller_data;
            next_bridge();
        });
    }, function (err) {
        callback(err, additional_data);
    });

};


module.exports = {
    object_bridge_data_loader: object_bridge_data_loader,
    ports_data_loader: ports_data_loader,
    bridges_data_loader: bridges_data_loader
};
