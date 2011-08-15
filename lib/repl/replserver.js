var repl = require('repl'),
    p = require('./pretty'),
    os = require('os'),
    net = require('net')
;

var replserver = module.exports;

var defaults = {
    host: 'localhost',
    port: 9999,
    prompt: 'mycroft@'+os.hostname()+'>'
};

var mycroft;
var commands;
var config;

replserver.start = function(_mycroft, _config) {
    var config = _config || defaults;
    mycroft = _mycroft;
    var self = this;
    this.repl_server = net.createServer(function(socket) {
        var _repl = repl.start(config.prompt, socket);

        _repl.context.mycroft = mycroft;
        _repl.context.nodes = mycroft.nodes;

        self.addPluginsToContext(_repl.context);
        self.addCommandsToContext(_repl.context, socket);
        self.addHelpMenuToContext(_repl.context, socket);

    });
    this.repl_server.listen(config.port, config.host);
};

// TODO: handle more than just descriptions. Allow parameter docs and examples as well.
replserver.addHelpMenuToContext = function(context, stream) {
    context.help = function() {
        var str = p.title("Commands");
        var keys = Object.keys(commands);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            str += p.ind()+p.sep(key+"()",20)+commands[key].help.desc+"\n";
        }
        stream.write(str);
    };    
}

replserver.addPluginsToContext = function(context) {
    // Make all plugins directly accessible from repl
    var plugins = mycroft.plugins;
    var keys = Object.keys(plugins);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        context[key] = plugins[key];
    }    
};

replserver.addCommandsToContext = function(context, stream) {
    // Allow custom repl commands
    var c = require('./commands');
    c.configure(mycroft);
    commands = c.commands;
 
    var keys = Object.keys(commands);
    for (i = 0; i < keys.length; i++) {
        var key = keys[i];
        context[key] = commands[key].create(stream);
    }
};
