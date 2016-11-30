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
 * Contains informations that specify some features of concrete table route
 */

var custom_data_loaders = require("./custom_data_loaders.js");

/* list of tables that should be vertical */
var vtables = ["Open_vSwitch", "SSL", "IPFIX", "NetFlow", "sFlow"];

/* specify for table custom template and if need loader of additional date needed by that template */
var custom_templates = {
    tables: {
        "Open_vSwitch": {
            template: "custom/table_openvswitch"
        },
        "Bridge": {
            template: "custom/table_bridge",
            additional_data_loader: custom_data_loaders.bridges_data_loader
        },
        "Manager": {
            template: "custom/table_manager"
        },
        "Port": {
            template: "custom/table_port",
            additional_data_loader: custom_data_loaders.ports_data_loader
        },
        /* bug #89
        "SSL" : {
          template : "custom/table_ssl"
        }, */
        "Controller": {
            template: "custom/table_controller"
        },
        "Interface": {
            template: "custom/table_interface"
        }
    },
    objects: {
        "Bridge": {
            template: "custom/object_bridge",
            additional_data_loader: custom_data_loaders.object_bridge_data_loader
        },
    }
};

module.exports = {
    vtables: vtables,
    custom_templates: custom_templates
};
