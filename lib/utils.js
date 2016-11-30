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

var ip2url = function (url) {
    //TODO
};

var url2ip = function (url) {
    return url.replace('__', ':').split('_').join('.');
};

var prepare_breadcrumbs = function (url) {
    var parts = url.split("/");

    var breadcrumbs = [];
    var current_url = "";
    var first = true;
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] === "") continue;
        current_url += ("/" + parts[i]);
        if (first) {
            parts[i] = url2ip(parts[i]);
            first = false;
        }
        var crumb = {};
        crumb.title = parts[i];
        crumb.url = current_url;
        breadcrumbs.push(crumb);
    }
    return breadcrumbs;
};

var map_array2map = function (map_array) {
    res = {};
    if (map_array && map_array[0] === "map") {
        var map_array_elems = map_array[1];
        for (var i = 0; i < map_array_elems.length; i++) {
            res[map_array_elems[i][0]] = map_array_elems[i][1];
        }
    }
    return res;
};

module.exports = {
    prepare_breadcrumbs: prepare_breadcrumbs,
    url2ip: url2ip,
    ip2url: ip2url,
    map_array2map: map_array2map
};
