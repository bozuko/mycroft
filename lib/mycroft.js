var http = require('http'),
    https = require('https'),
    async = require('async'),
    inspect = require('util').inspect,
    fs = require('fs'),
    alert = require('./util/alert'),
    replserver = require('./repl/replserver')
;

var errlog = console.error;
console.error = function(msg) {
    errlog(new Date().toString() + " " + msg);
};

var error = function(msg) {
    var str = "mycroft: "+msg;
    return str;
};

var defaults = {
    nodes: [],
    keepalive_poll_time: 5000,
    timeout: 5000,
    poll_time: 10000
};

var mycroft = module.exports = {};

mycroft.alert = alert.now;

var config = mycroft.config = {};
var nodes = mycroft.nodes = {};
var plugins = mycroft.plugins = {};
var active_alerts = alert.active_alerts;

mycroft._help = {
    plugins: {},
    commands: {}
};

mycroft.start = function(options) {
    config.nodes = options.nodes || [];
    config.poll_time = options.poll_time || defaults.poll_time;
    config.timeout = options.timeout || defaults.timeout;
    config.keepalive_poll_time = options.keepalive_poll_time || defaults.keepalive_poll_time;
    config.repl = options.repl;
    config.plugins_dir = options.plugins_dir;
    config.plugins = options.plugins;
    config.alert = options.alert;
    config.log_file = options.log_file;

    if (config.log_file) {
        var stream = fs.createWriteStream(config.log_file, {flags: 'a', mode: '0644'});
        console.error = function(msg) {
            stream.write('ERR '+new Date().toString()+" "+msg+"\n");
        };
        console.log = function(msg) {
            stream.write('LOG '+new Date().toString()+" "+msg+"\n");
        };
    }

    config.nodes.forEach(function(node) {
        var key = node.host+':'+node.port;
        if (node.alias) key = node.alias;
        nodes[key] = {
            alive: false
        };
    });

    alert.configure(config.alert);

    if (config.plugins) {
        for (var i = 0; i < config.plugins.length; i++) {
            this.use(config.plugins[i]);
        }
    }

    // Collect Data from the commandos at an interval
    setInterval(function() {
        async.forEach(config.nodes, collect, function(err) {
        });
    }, config.poll_time);

    // Ensure commandos are alive at an interval
    setInterval(function() {
        async.forEach(config.nodes, keepalive, function(err) {
        });
    }, config.keepalive_poll_time);

    this.replserver = replserver;
    this.replserver.start(this, config.repl);
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


function collect(node, callback) {
    var opts = Object.create(node);
    opts.path = '/data';
    var key = node.host+':'+node.port;
    if (node.alias) key = node.alias;

    return get(opts, function(err, data) {
        if (err) {
            nodes[key].last_error = {
                error: err,
                timestamp: new Date().toString()
            };
            var body = error(err);
            alert.now({
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
    if (node.alias) key = node.alias;

    return get(opts, function(err) {
        if (err) {
            nodes[key].last_error = {
                error: err,
                timestamp: new Date().toString()
            };
            nodes[key].alive = false;
            var body = error(err);
            alert.now({
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

    _http = opts.protocol === 'https' ? https : http;

    var tid;
    var req = _http.request(opts, function(res) {
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
