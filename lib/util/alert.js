var async = require('async');
var mail = require('./mail');
var alert = module.exports;

var config;
var active_alerts = alert.active_alerts = {};

alert.configure = function(options) {
    config = options;
    if (config.email) mail.configure(config.email);
};

alert.now = function(options, callback) {
    var self = this;

    if (!config) {
        if (callback) return callback(null);
        return null;
    }

    if (!options.key) {
        console.error("alert: Missing options.key. Options = "+JSON.stringify(options));

        // Don't bring down our monitoring process because of a forgotten error key.
        // TODO: Queue the messsage and send it out with other 'Unkown Messages' at config.alert.interval
        if (callback) return callback(null);
        return null;
    }

    if (active_alerts[options.key]) {
        active_alerts[options.key].enabled = true;
        if (callback) return callback(null);
        return null;
    }

    function alert() {
        if (active_alerts[options.key].enabled === false) {
            self.cancelAlert(options.key);
            if (callback) return callback(null);
            return null;
        }
        console.error(JSON.stringify(options));
        active_alerts[options.key].enabled = false;
        if (options.email && config.email) {
            async.forEach(config.email.addresses,
                function(email_address, callback) {
                    return mail.send({
                        to: email_address,
                        subject: options.email.subject,
                        body: options.email.body
                    }, function(err, success) {
                        if (err || !success) {
                            console.error("Failed to send alert email with subject: "+
                                options.email.subject+"to "+email_address+". "+err
                            );
                        }
                        return callback(null);
                    });
                },
                function(err) {
                    if (callback) return callback(null);
                    return null;
                }
            );
        }
        return null;
    }

    var tid = setInterval(function() {
        alert();
    }, config.interval*60000);

    active_alerts[options.key] = {
        tid: tid,
        enabled: true
    };
    alert();
};

alert.cancel = function(key) {
    var a = active_alerts[key];
    if (a) {
        clearInterval(a.tid);
        delete active_alerts[key];
    }
};
