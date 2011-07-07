var http = require('http'),
    async = require('async'),
    server = require('./server'),
    mail = require('./util/mail')
;

var errlog = console.error;
console.error = function(msg) {
    errlog(new Date().toString() + " " + msg);
};

var error = function(msg) {
    var str = "mycroft: "+msg;
    console.error(str);
    return str;
};

var defaults = {
    host: '0.0.0.0',
    port: 9999,
    nodes: [],
    keepalive_poll_time: 5000,
    timeout: 5000,
    poll_time: 10000
};

var mycroft = module.exports;

var config = mycroft.config = {};
var nodes = mycroft.nodes = {};
var plugins = mycroft.plugins = {};
var active_alerts = mycroft.active_alerts = {};

mycroft.start = function(options) {
    config.host = options.host || defaults.host;
    config.port = options.port || defaults.port;
    config.nodes = options.nodes || [];
    config.poll_time = options.poll_time || defaults.poll_time;
    config.timeout = options.timeout || defaults.timeout;
    config.keepalive_poll_time = options.keepalive_poll_time || defaults.keepalive_poll_time;
    config.plugins_dir = options.plugins_dir;
    config.plugins = options.plugins;
    config.alert = options.alert;

    config.nodes.forEach(function(node) {
        var key = node.host+':'+node.port;
        nodes[key] = {
            alive: false
        };
    });

    if (config.alert.email) mail.configure(config.alert.email);

    server.listen({host: config.host, port: config.port});

    if (config.plugins) {
        for (var i = 0; i < config.plugins.length; i++) {
            mycroft.use(config.plugins[i]);
        }
    }

    // Collect Data from the commandos at an interval
    setInterval(function() {
        async.forEach(config.nodes, collect, function(err) {
            if (err) console.error(err);
        });
    }, config.poll_time);

    // Ensure commandos are alive at an interval
    setInterval(function() {
        async.forEach(config.nodes, keepalive, function(err) {
            if (err) console.error(err);
        });
    }, config.keepalive_poll_time);
};

mycroft.use = function(plugin_opts) {
    var name = plugin_opts.name;
    var Plugin;
    try {
        Plugin = require('./plugins/'+name);
    } catch(e) {
        Plugin = require(config.plugins_dir+"/"+name);
    }
    plugins[name] = new Plugin(plugin_opts.config);
    plugins[name].monitor();
};

mycroft.alert = function(options, callback) {
    var self = this;

    if (!config.alert) {
        if (callback) return callback(null);
        return;
    }

    if (!options.key) {
        console.error("mycroft.alert: Missing options.key. Options = "+JSON.stringify(options));

        // Don't bring down our monitoring process because of a forgotten error key.
        // TODO: Queue the messsage and send it out with other 'Unkown Messages' at config.alert.interval
        if (callback) return callback(null);
        return;
    }

    if (active_alerts[options.key]) {
        active_alerts[options.key].enabled = true;
        if (callback) return callback(null);
        return;
    }

    function alert() {
        if (active_alerts[options.key].enabled === false) {
            self.cancelAlert(options.key);
            if (callback) return callback(null);
            return;
        }
        active_alerts[options.key].enabled = false;
        if (options.email && config.alert.email) {
            async.forEach(config.alert.email.addresses,
                function(email_address, callback) {
                    return mail.send({
                        to: email_address,
                        subject: options.email.subject,
                        body: options.email.body
                    }, function(err, success) {
                        if (err || !success) {
                            console.error("Failed to send alert email with subject: "+
                                options.email.subject+"to "+email_address+". "+err);
                        }
                        return callback(null);
                    });
                },
                function(err) {
                    if (callback) return callback(null);
                    return;
                }
            );
        }
    }

    var tid = setInterval(function() {
        alert();
    }, config.alert.interval*60000);

    active_alerts[options.key] = {
        tid: tid,
        enabled: true
    };
    alert();
};

mycroft.cancelAlert = function(key) {
    var a = active_alerts[key];
    if (a) {
        clearInterval(a.tid);
        delete active_alerts[key];
    }
};

function collect(node, callback) {
    var opts = Object.create(node);
    opts.path = '/data';
    var key = node.host+':'+node.port;

    return get(opts, function(err, data) {
        if (err) {
            nodes[key].last_error = {
                error: err,
                timestamp: Date.now()
            };
            var body = error(err);
            mycroft.alert({
                key: "mycroft/collect/"+key,
                email: {
                    subject: "ALERT: mycroft: collect() error",
                    body: body
                 }
            });
            return callback(null);
        }
        nodes[key].alive = true;
        nodes[key].data = data;
        return callback(null);
    });
}

function keepalive(node, callback) {
    var opts = Object.create(node);
    opts.path = '/alive';
    var key = node.host+':'+node.port;

    return get(opts, function(err) {
        if (err) {
            nodes[key].last_error = {
                error: err,
                timestamp: Date.now()
            };
            nodes[key].alive = false;
            var body = error(err);
            mycroft.alert({
                key: "mycroft/keepalive/"+key,
                email: {
                    subject: "ALERT: mycroft: Node "+key+" Down!!!",
                    body: body
                 }
            });
            return callback(null);
        }
        nodes[key].alive = true;
        return callback(null);
    });
}

function get(opts, callback) {
    opts.method = 'GET';

    var tid;
    var req = http.request(opts, function(res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            clearTimeout(tid);

            if (res.statusCode != 200) {
                return callback(data);
            }
            if (data == '') return callback(null, data);

            try {
                var result = JSON.parse(data);
            } catch(e) {
                return callback(e);
            }

            return callback(null, result);
        });
        res.on('error', function(err) {
            return callback(err);
        });
    });

    req.on('error', function(err) {
        return callback(err);
    });

    req.end();

    tid = setTimeout(function() {
        req.abort();
        return callback('HTTP timeout: '+ opts.host+':'+opts.port+opts.path);
    }, config.timeout);
}
