var server = require('./lib/server');
var mycroft = require('./lib/mycroft');
var plugin = require('./lib/plugin');

exports.start = mycroft.start;

exports.Plugin = plugin;

