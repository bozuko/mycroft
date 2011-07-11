var Plugin = require('../plugin'),
    os = require('os'),
    mongo = require('mongodb'),
    Db = mongo.Db,
    Server = mongo.Server,
    ReplSetServers = mongo.ReplSetServers,
    async = require('async'),
    error = function(msg) {
        Plugin.error('mongodb', msg);
    }
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
    this.is_connected = false;
    this.is_master = false;
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
        self.alert({
            key: 'mongodb/error',
            email: {
                subject: "ALERT: mycroft(mongodb): db error",
                body: body
            }
        });
    });
    this.db.on('close', function(conn) {
        var body = error('connection closed to '+conn.host+":"+conn.port);
        self.alert({
            key: 'mongodb/close',
            email: {
                subject: "ALERT: mycroft(mongodb): connection closed",
                body: body
            }
        });
        self.is_connected = false;
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
            self.alert({
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

        self.db.createCollection('db_stats', {capped:true, size:10000000}, function(err, collection) {
            if (err) {
                self.alert({
                    key: 'mongodb/open',
                    email: {
                        subject: "ALERT: mycroft(mongodb): db error",
                        body: error(err)
                    }
                });
                return error('couldn\'t create collection');
            }
            self.collection = collection;
            self.is_connected = true;
            self.timer = setInterval(function() {
                self.collect_data();
            }, self.poll_time);
        });

    });
};

Mongodb.prototype.collect_data = function() {
    var self = this;
    self.db.executeDbCommand({isMaster: 1}, function(err, result) {
        if (err) return error('Failed to get master  '+err);
        self.is_connected = true;
        self.is_master = result.documents[0].ismaster;

        // Only check rest of status if we are talking to the master
        if (self.is_master) {

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
                self.collection.insert(doc);
            });

            var stats = [];
            self.db.collectionNames(function(err, docs) {
                if (err) return error('Failed to retrieve collection names. '+err);
                async.forEach(docs, function(doc, cb) {
                    // strip the db name off collection name
                    var name = doc.name.substr(doc.name.indexOf('.')+1);
                    self.db.executeDbCommand({collStats: name}, function(err, result) {
                        if (err) return cb(error('Failed to retrieve collection stats for '+doc.name+'. '+err));
                        var doc = result.documents[0];
                        doc.date = new Date();
                        stats.push(doc);
                        cb(null);
                    });
                }, function(err) {
                    if (err) return error(err);
                    self.collection_stats = stats;
                });
            });
        }
    });
};
