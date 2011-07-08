var express = require('express')
;

var app = express.createServer(
    express.bodyParser()
);

exports.listen = function(options) {
    app.listen(options.port, options.host);
    return app;
};

