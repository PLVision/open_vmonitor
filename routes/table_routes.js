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
var custom_data_loaders = require("./custom_data_loaders.js");
var routes_info = require("./table_routes_info.js");


/* Abstract table route.
 * basic routine for rendering entities from db
 * is customisated by parameters:
 *   - load_data: async function that loads data
 *   - get_table_title: function that build table title
 *   - is_table: bool responsible for search table details if routes_info
*/
var AbstractTableRoute = function (load_data, get_table_title, is_table) {
    this.load_data = load_data;
    this.get_table_title = get_table_title;
    this.is_table = is_table;
};

AbstractTableRoute.prototype.route = function (req, res, next) {
    var self = this;
    var addr = req.session.connection;
    var db_name = req.session.db_name;
    var table = req.params.table;
    var userid = req.session.userid;

    client_manager.client(userid, addr, function (err, client) {
        if (err) {
            return next(err);
        }
        var db = client.database(db_name);
        try {
            self.load_data(db, req, function (err, data) {
                if (err)
                    return next(err);

                var table_schema = client.db_schema(db_name).tables[table];
                var custom_tmpl;
                if (self.is_table)
                    custom_tmpl = routes_info.custom_templates.tables[table];
                else
                    custom_tmpl = routes_info.custom_templates.objects[table];

                var additional_data_loader;
                var template;
                if (custom_tmpl) {
                    template = custom_tmpl.template;
                    additional_data_loader = custom_tmpl.additional_data_loader;
                }

                if (!template)
                    template = ((!self.is_table) || routes_info.vtables.includes(table)) ? "vtable" : "htable";

                var title = self.get_table_title(req);
                var additional_data;

                var render = function () {
                    res.renderView(template, {
                        title: title,
                        data: data,
                        table_schema: table_schema,
                        table: table,
                        additional_data: additional_data
                    });
                };

                if (additional_data_loader) {
                    additional_data_loader(data, client.database(db_name), function (err, extra_data) {
                        if (err) {
                            return next(err);
                        }
                        additional_data = extra_data;
                        render();
                    });
                } else {
                    render();
                }
            });
        } catch (e) {
            next(e);
        }
    });
};

/* route for some table */
var table_route = function (req, res, next) {
    var table = req.params.table;

    var load_data_strategy = function (db, req, callback) {
        db.tableByName(table).data(callback);
    };

    var get_table_title_strategy = function (req) {
        return table + "s list";
    };

    (new AbstractTableRoute(load_data_strategy, get_table_title_strategy, true)).route(req, res, next);

};

/* route for special object from some table */
var table_object_route = function (req, res, next) {
    var obj_name = req.params.row_name;
    var table = req.params.table;

    var load_data_strategy = function (db, req, callback) {
        db.tableByName(table).find_by_name(obj_name).data(callback);
    };

    var get_table_title_strategy = function (req) {
        return table + " " + obj_name;
    };

    (new AbstractTableRoute(load_data_strategy, get_table_title_strategy, false)).route(req, res, next);

};

/* route for children of special object from some parent table */
var table_object_subtable_route = function (req, res, next) {
    var parent_obj_name = req.params.parent_obj_name;
    var parent_table = req.params.parent_table;
    var table = req.params.table;

    var load_data_strategy = function (db, req, callback) {
        db.tableByName(parent_table).find_by_name(parent_obj_name).tableByName(table).data(callback);
    };

    var get_table_title_strategy = function (req) {
        return table + "s of " + parent_table + " " + parent_obj_name;
    };

    (new AbstractTableRoute(load_data_strategy, get_table_title_strategy, true)).route(req, res, next);

};

module.exports = {
    table_route: table_route,
    table_object_route: table_object_route,
    table_object_subtable_route: table_object_subtable_route
};
