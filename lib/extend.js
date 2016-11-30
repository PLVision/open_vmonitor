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

function ExtendException(message) {
    this.message = message;
    this.name = 'ExtendException';
}

module.exports = function extend() {
    var target = arguments[0];
    var length = arguments.length;

    if (length > 1) {
        switch (typeof target) {
            case 'function':
            case 'boolean':
            case 'number':
            case 'string':
            case 'symbol':
                throw 'Incompatible type. Must be \'object\', but ' + typeof target + ' found.';
                break;
            case 'undefined':
                target = {};
            default:
                // do nothing
                break;
        }

        // need to extend an array
        for (var i = 1; i <= length; i++) {
            var element = arguments[i];
            for (name in element) {
                var tmp = element[name];
                if (!(tmp in target)) {
                    target[name] = tmp;
                }
            }
        }
    }
    return target;
}
