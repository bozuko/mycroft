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
            var str = 'Database Status\n'+p.div()+
                p.sep('DB Name:')+mongodb.db_name+'\n'+
                p.sep('RS Name:')+mongodb.rs_name+'\n';
        
            stream.write(str);
        };
    }
};

