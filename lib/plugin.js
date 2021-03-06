var mycroft = require('./mycroft');

var Plugin = module.exports = function(config) {
    this.config = config;
};

// Start monitoring whatever the plugin monitors
Plugin.prototype.monitor = function() {
    console.error("This method not implemented by the plugin");
};

// Return all collected data for this plugin
Plugin.prototype.data = function() {
    console.error("This method not implemented by the plugin");
};

// Perform an operation with the plugin
Plugin.prototype.action = function() {
    console.error("This method not implemented by the plugin");
};

Plugin.error = function(name,msg) {
    var str = "mycroft/"+name+": "+msg;
    return str;
};
