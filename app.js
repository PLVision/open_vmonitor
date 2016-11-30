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

Array.prototype.clear = function () {
    this.length = 0;
};

Array.prototype.includes = function (object) {
    return this.indexOf(object) != -1;
};

String.prototype.startsWith = function (object) {
    return this.indexOf(object) == 0;
}

var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var errorhandler = require('errorhandler');
var cookie_session = require('cookie-session');
var body_parser = require('body-parser');
var debug = require('debug')('app');
var extend = require("./lib/extend.js");
var uuid = require("uuid");
var url = require('url');

var ovsdb = require('ovsdb-client');

var app = express();
var client_manager = require("./lib/client-manager.js")(app);

var utils = require("./lib/utils.js");
var routes = require("./routes");

app.listen = function () {
    var options = undefined;
    var server;

    switch (app.get("mode")) {
        case 'https':
            options = {
                key: fs.readFileSync(app.get("key")),
                cert: fs.readFileSync(app.get("certificate"))
            };
        case 'http':
        default:
            server = options ? https.createServer(options, this) : http.createServer(this);
            break;
    }

    // Check if we are running as root
    if (process.getgid && process.setgid && process.setuid) {
        if (process.getgid() === 0) {
            // TODO: uncomment on release
            // process.setgid('ovm');
            // process.setuid('ovm');
        }
    }

    return server.listen.apply(server, arguments);
};

app.set('config', {})

app.load_config = function (callback) {
    var config;
    var config_file = __dirname + "/config.json";

    app.set('configErr', undefined)
    fs.exists(config_file, function (exists) {
        if (exists) {
            fs.readFile(config_file, function (err, data) {
                if (!err) {
                    try {
                        config = JSON.parse(data);
                        app.set("port", config.server.port);
                        app.set("mode", config.server.mode);
                        app.set("key", config.server.key);
                        app.set("certificate", config.server.certificate);
                    } catch (err) {
                        console.error(err);
                        err.code = 500;
                        err.message = "[config.json]: " + err + ".\nPlease check the configuration file and restart an application";
                        app.set('configErr', err)
                    }
                }
                app.set('config', config || {});
                callback(err);
            });
        } else {
            callback("Configuration file does not exist");
        }
    });
}

app.use(errorhandler());

app.use(function (req, res, next) {
    if (app.get("configErr") !== undefined) {
        res.render("error", {
            message: "Config file syntax error",
            error: app.get("configErr"),
            showStack: false
        })
    } else {
        next();
    }
});

app.use(cookie_session({
    genid: function (req) {
        return genuuid(); // use UUIDs for session IDs
    },
    secret: 'keyboard pretty cat',
    cookie: {
        secure: false
    }
}));

app.use(express.static(__dirname + '/public'));

// parse application/x-www-form-urlencoded
app.use(body_parser.urlencoded({
    extended: false
}));

app.use(function (req, res, next) {
    debug('app.use: original url', req.originalUrl);
    res.locals.isAjax = req.headers['x-requested-with'] && req.headers['x-requested-with'] === 'XMLHttpRequest';
    next();
});

app.use(function (req, res, next) {
    if (req.originalUrl.startsWith("/enter")) {
        // need to look at this 'return' later
        next();
        return;
    }
    if (!req.session.connection) {
        res.redirect('/enter');
    } else {
        next();
    }
});

app.use(function (req, res, next) {
    res.renderView = function (viewName, opts) {
        var defaults = {
            title: app.get('title'),
            connection: req.session.connection,
        };

        // if loaded not over ajax but using GET, table view need info for constructing menu
        if (!res.locals.isAjax) {
            var addr = req.session.connection;

            var userid = req.session.userid;
            client_manager.client(userid, addr, function (err, client) {
                if (err)
                    throw err;
                var db_name = req.session.db_name;
                if (!db_name) {
                    db_name = client.databases()[0];
                }
                client.database(db_name).bridges().list(["name"], function (err, bridges) {
                    if (err)
                        throw err;

                    var extra_opts = {
                        databases: client.databases(),
                        selected_db: db_name,
                        bridges: bridges,
                    };
                    if (client.authorized === true) {
                        extra_opts.authorized = true;
                    } else if (client.authorized === false) {
                        extra_opts.authorized = false;
                        extra_opts.auth_error = client.auth_error;
                    }
                    // if client.authorized is not specified then we have simple (nonsecure) connection

                    opts = extend(defaults, opts, extra_opts);
                    res.render(viewName, opts);
                });
            });
        } else {
            opts = extend(defaults, opts);
            res.render(viewName, opts);
        }
    };
    next();
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('title', "Open_vMonitor");
app.set('default_connection_address', '127.0.0.1');
app.set('username', 'admin');

// app.all('/', function(req, res, next) {
// debug('/: body: ' + JSON.stringify(req.body));
// next();
// });

app.all('/enter', function (req, res, next) {
    // get all possible arguments
    var ip = req.query.database_ip_address || req.body.database_ip_address;
    var port;
    var secure = req.body.secure == 'true' || req.query.secure == 'true';

    // authenticate user
    var username = req.query.username || req.body.username;
    var password = req.query.password || req.body.password;
    var config = app.get('config');

    // retrieve a port number
    if (ip && ip.indexOf(":") != -1) {
        var parts = ip.split(":");
        ip = parts[0];
        port = parts[1];
    }
    port = req.query.port || port || 6640;

    // if we have all necessary info, proceed to required page
    var redirect = true;
    if (username && password && ip && port) {
        redirect = false;
    }

    if (req.method == 'GET' && redirect) {
        res.render('enter', {
            title: app.get('title'),
            username: app.get('username'),
            connection: app.get('default_connection_address')
        });
    } else if (req.method == 'POST' || (req.method == 'GET' && !redirect)) {
        if ((config.credentials.username != username) || (config.credentials.password != password)) {
            debug("user/password do not match")
            res.status(403).end();
        } else {
            var conn_id = (secure ? "ssl:" : "") + ip + ":" + port;

            debug("Add " + conn_id + " to connections");
            req.session.connection = conn_id;
            req.session.userid = uuid.v4();

            var userid = req.session.userid;
            client_manager.client(userid, ip, port, secure, function (err) {
                if (!err) {
                    // if client specifies a page through a POST request, redirect
                    if (req.query.page) {
                        var item = req.query.item || '';
                        debug('redirect to selected page');
                        res.redirect(req.query.page + '/' + item);
                    } else {
                        debug('redirect to /');
                        res.redirect('/');
                    }
                } else {
                    debug('error: ', err);
                    next(err);
                }
            });
        }
    }
});

//app.post('/enter', function(req, res, next) {
//  
//});

app.get('/alerts/:action?', function (req, res, next) {
    var db_name = req.session.db_name;
    var addr = req.session.connection;
    var count = -1;
    var action = req.params.action || 'show';
    debug(action);

    var userid = req.session.userid;
    client_manager.client(userid, addr, function (err, client) {
        switch (action) {
            case 'clear':
                client.clear_updates(function () {
                    res.renderView('alerts', {
                        title: 'Alerts',
                        table: 'Alerts', // FIXME: index template should be modified
                        updates: []
                    });
                });
                break;
            case 'show':
                client.retrieve_updates(count, function (updates) {
                    res.renderView('alerts', {
                        title: 'Alerts',
                        table: 'Alerts', // FIXME: index template should be modified
                        updates: updates
                    });
                });
                break;
            default:
                break;
        }
    });
});

app.get('/updates', function (req, res, next) {
    var db_name = req.session.db_name;
    var addr = req.session.connection;
    var count = -1;

    var userid = req.session.userid;
    client_manager.client(userid, addr, function (err, client) {
        if (err) {
            return next(err);
        }
        client.retrieve_updates(count, function (updates) {
            res.send(updates);
        });
    });
});

app.get('/logout', function (req, res, next) {
    client_manager.closeAll();
    req.session.connection = null;
    res.redirect('/enter');
});

app.post('/select-db/:db_name', function (req, res, next) {
    var db_name = req.params.db_name;
    req.session.db_name = db_name;
    res.status(200).end();
});

app.get('/', function (req, res, next) {
    res.redirect('/Open_vSwitch');
});

app.get('/raw_json', function (req, res, next) {
    res.renderView('raw_json');
});

app.post('/:db_name/raw_json', function (req, res, next) {
    var db_name = req.session.db_name;
    var addr = req.session.connection;

    debug(req.body);
    var request = JSON.parse(req.body.request);

    var userid = req.session.userid;
    client_manager.client(userid, addr, function (err, client) {
        client.raw_request(request, function (result) {
            res.status(200).send(JSON.stringify(result));
        });
    });
});

app.get('/_switch_view', function (req, res, next) {
    var db_name = req.session.db_name;
    var addr = req.session.connection;

    var userid = req.session.userid;
    client_manager.client(userid, addr, function (err, client) {
        var brs = [];
        if (err) {
            return next(err);
        }
        client.database(db_name).bridges().each(function (bridge, next_bridge) {
            var ports = [];

            bridge.data(function (err, data) {
                var name = data.name;
                debug(err, data, name);

                bridge.ports().each(function (port, next_port) {
                    port.data(function (err, data) {
                        var name = data.name;
                        debug(err, data, name);

                        port.interfaces().data(function (err, interfaces) {
                            ports.push({
                                name: name,
                                interfaces: interfaces
                            });
                            next_port();
                        });
                    });
                }, function () {
                    // done for ports
                    brs.push({
                        name: name,
                        ports: ports
                    });
                    next_bridge();
                });
            });
        }, function (err) {
            // done for bridges
            debug(brs.length);
            res.send(JSON.stringify(brs));
        });
    });
});

app.get('/:table', routes.table_route);

app.get('/:table/:row_name', routes.table_object_route);

app.get('/Bridge/:bridge_name/port-stats', routes.stats_route);
app.get('/Port/:port_name/port-stats', routes.stats_route);

app.get('/:parent_table/:parent_obj_name/:table', routes.table_object_subtable_route);

// catch 404 and forwarding to error handler
app.use(function (m_err, req, res, next) {
    if (m_err) {
        return next(m_err);
    }
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


app.use(function (err, req, res, next) {
    if (err.status === 404) {
        res.status(404).renderView("404", { route: err.table });
    } else if (err.code === 495) { //ssl error
        res.status(495).send(err)
    } else {
        res.status(500).render("500");
    }
    //console.log(err);
});

//module.exports = app;

// we need to generate certificates first
// mkdir -p ./certs
// openssl genrsa -out ./certs/key.pem 1024
// openssl req -new -key ./certs/key.pem -out ./certs/certrequest.csr # lots of questions here
// openssl x509 -req -in ./certs/certrequest.csr -signkey ./certs/key.pem -out ./certs/certificate.pem

var app_name = 'Open_vMonitor';

//var app = require('../app');
//var debug = require('debug')(app_name);

app.set('port', process.env.PORT || 3000);
app.set('mode', process.env.MODE || 'http');
app.set('key', process.env.KEY || './cert/key.pem');
app.set('certificate', process.env.CERTIFICATE || './cert/certificate.pem');

app.load_config(function (err) {
    if (err) {
        console.error("Can't load configuration file 'config.json': ", err);
        console.error("Try to continue without it...");
    }
    debug("listening port: " + app.get("port"));
    var server = app.listen(app.get("port"), function () {
        var log_string = app_name.concat(' ', app.get("mode"), ' server listening on port ', server.address().port);
        debug(log_string);
    });
});



