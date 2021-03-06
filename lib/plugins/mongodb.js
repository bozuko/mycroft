var Plugin = require('../plugin'),
    os = require('os'),
    mongo = require('mongodb'),
    Db = mongo.Db,
    Server = mongo.Server,
    ReplSetServers = mongo.ReplSetServers,
    async = require('async'),
    // Don't worry about code org. alert should be standalone module anyway.
    alert = require('../util/alert'),
    error = function(msg) {
        Plugin.error('mongodb', msg);
    },
    inspect = require('util').inspect
;

var defaults = {
    host: 'localhost',
    port: 27017,
    db_name: 'test',
    rs_name: 'rs1',
    poll_time: 5000, // ms
    profile: {
        level: 1
    }
};

var Mongodb = module.exports = function(options) {
    Plugin.apply(this, arguments);
    self = this;
    this.timer = null;
    this.poll_time = options.poll_time || defaults.poll_time;
    this.profiling_level = options.profile.level || defaults.profile.level;
    this.host = options.host || defaults.host;
    this.port = options.port || defaults.port;
    this.db_name = options.db_name || defaults.db_name;
    this.rs_name = options.rs_name || defaults.rs_name;
    this.is_replSet = false;
    this.server_status = null;
    this.db_stats = [];
    this.collection_stats = [];

    if (this.host instanceof Array) {
        this.is_replSet = true;
        var servers = [];
        for (var i = 0; i < this.host.length; i++) {
            servers.push(new Server(this.host[i], this.port, {auto_reconnect: true}));
        };
        this.replSet = new ReplSetServers(servers, {rs_name: this.rs_name});
        this.db = new Db(this.db_name, this.replSet);
    } else {
        this.db = new Db(
            this.db_name,
            new Server(this.host, this.port, {auto_reconnect: true})
        );
    };
    this.db.on('error', function(err) {
        var body = error(err);
        alert.now({
            key: 'mongodb/error',
            email: {
                subject: "ALERT: mycroft(mongodb): db error",
                body: body
            }
        });
    });
    this.db.on('close', function(conn) {
        var body = error('connection closed to '+conn.host+":"+conn.port);
        alert.now({
            key: 'mongodb/close',
            email: {
                subject: "ALERT: mycroft(mongodb): connection closed",
                body: body
            }
        });
    });
};

Mongodb.prototype.__proto__ = Plugin.prototype;

Mongodb.prototype.monitor = function() {
    var self = this;

    // We might be trying to reconnect, cancel the old timer
    if (self.timer) clearInterval(self.timer);

    this.db.open(function(err, client) {
        if (err) {
            error("Failed to open database. "+err);
            alert.now({
                    key: 'mongodb/open',
                    email: {
                        subject: "ALERT: mycroft(mongodb): db error",
                        body: error(err)
                    }
            });

            return setTimeout(function() {
                self.monitor();
            }, self.poll_time);
        }

        self.timer = setInterval(function() {
            self.collect_data();
        }, self.poll_time);

    });
};

Mongodb.prototype.collect_data = function() {
    var self = this;

    var timeout = setTimeout(function() {
        alert.now({
            key: 'mongodb/timeout',
            email: {
                subject: "ALERT: mycroft(mongodb): Timeout running db.isMaster()"
            }
        });
    }, 3000);

    self.db.executeDbCommand({isMaster: 1}, function(err, result) {
        clearTimeout(timeout);
        console.log('err = '+err);
        var isMaster  = result.documents[0].ismaster;
        if (!isMaster) {
            alert.now({
                key: 'mongodb/noMaster',
                email: {
                    subject: "ALERT: mycroft(mongodb): No Master!!!"
                }
            });
        }
    });

    self.db.executeDbCommand({serverStatus: 1}, function(err, result) {
        if (err) return error('Failed to get server  '+err);
        self.server_status = result.documents[0];
        self.mem = self.server_status.mem;
    });

    self.db.executeDbCommand({dbstats:1}, function(err, result) {
        if (err) return error('Failed to get db.stats(). '+err);
        var doc = result.documents[0];
        doc.date = new Date();
        self.db_stats = [doc];
    });

    var stats = [];
    return self.db.collectionNames(function(err, docs) {
        if (err) return error('Failed to retrieve collection names. '+err);
        return async.forEach(docs, function(doc, cb) {
            // strip the db name off collection name
            var name = doc.name.substr(doc.name.indexOf('.')+1);
            return self.db.executeDbCommand({collStats: name}, function(err, result) {
                if (err) return cb(error('Failed to retrieve collection stats for '+doc.name+'. '+err));
                var doc = result.documents[0];
                doc.date = new Date();
                stats.push(doc);
                return cb(null);
            });
        }, function(err) {
            if (err) return error(err);
            self.collection_stats = stats;
        });
    });
};
