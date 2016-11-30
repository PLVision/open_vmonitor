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

var client_manager = require("../lib/client-manager.js")();
var utils = require("../lib/utils.js");
var extend = require("../lib/extend.js");
//var extend = require("extend")

module.exports.stats_route = function (req, res, next) {
    var db_name = req.session.db_name;
    var addr = req.session.connection;
    var bridge_name = req.params.bridge_name;

    var userid = "test";
    client_manager.client(userid, addr, function (err, client) {
        var stats = {};
        client.database(db_name).tableByName("Bridge").find_by_name(bridge_name).ports().each(function (port, next_port) {
            port.data(["name", "statistics", "interfaces"], function (err, port_data) {
                if (err) {
                    return next_port(err);
                }
                if (port_data.statistics[1].length) {
                    stats[port_data.name] = utils.map_array2map(port_data.statistics);
                };
                // TODO: bound port is temporary skipped
                if (port_data.interfaces[0] !== "uuid") {
                    return next_port();
                }

                var uuid = port_data.interfaces[1];
                port.interfaces().get(uuid).data(["statistics"], function (err, iface_data) {
                    if (err)
                        return next_port(err);
                    stats[port_data.name] = extend(stats[port_data.name],
                        utils.map_array2map(iface_data.statistics));
                    next_port();
                });
            }
            );
        }, function (err) {
            res.send(JSON.stringify(stats)).end();
        });
    });
};
