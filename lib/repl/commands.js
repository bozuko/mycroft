var inspect = require('util').inspect;
var p = require('./pretty');

var mycroft;

exports.configure = function(_mycroft) {
    mycroft = _mycroft;
};

exports.commands = {};

exports.commands['mem'] = {
    help: {
        desc: 'Show the memory usage for all machines in the cluster'
    },

    create: function(stream) {
        return function() {
            if (mycroft.plugins.mongodb) {
                return mycroft.plugins.mongodb.mem;
            }
            return "unknown";
        };
    }
};

exports.commands['status'] = {
    help: {
        desc: 'Show general status of the cluster and database'
    },

    create: function(stream) {
        return function() {
            var mongodb = mycroft.plugins.mongodb;
            var str = p.title('Database Status')+p.div()+
                'DB Name: '+mongodb.db_name+'\n'+
                'RS Name: '+mongodb.rs_name+'\n'+
                p.sep('Primary: ' +mongodb.replSet.primary.host+':'+mongodb.replSet.primary.port)+
                'Connected: '+p.ok(mongodb.replSet.primary.connected)+'\n';
            for (var i = 0; i < mongodb.replSet.secondaries.length; i++) {
                var s = mongodb.replSet.secondaries[i];
                str += p.sep('Secondary: '+s.host+':'+s.port)+
                    'Connected: '+p.ok(s.connected)+'\n';
            };
            for (i = 0; i < mongodb.replSet.arbiters.length; i++) {
                var a = mongodb.replSet.arbiters[i];
                str += p.sep('Arbiter: '+a.host+':'+a.port)+
                    'Connected: '+p.ok(a.connected)+'\n';
            }        
            stream.write(str+'\n');
        };
    }
};

