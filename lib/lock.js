/*
 * Open vMonitor is a WEB-based tool for monitoring and troubleshooting Open vSwitch
 * Copyright (C) 2015 PLVision
 * Ihor Chumak
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
var locked = false;
var requesters = [];

var getLock = function (callback) {
    if (locked) {
        requesters.push(callback);
        return false;
    }
    else {
        locked = true;
        return true;
    }
};
exports.get = getLock;

var freeLock = function (arg, params) {
    locked = false;

    for (var r = 0; r < requesters.length; r++) {
        if (requesters[r]) {
            requesters[r].apply(arg, params);
            delete requesters[r];
        }
    }
};
exports.free = freeLock;
