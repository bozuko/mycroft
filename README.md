## Install

#### Node and NPM are already installed locally

mycroft is meant to be installed locally. If you already have npm and node setup in your home directory then you only need the following command:

    npm install mycroft

You then want to create a config file as detailed in the config section. This file should live at **~/.mycroft**. Alternatively you can use the **--config** switch to tell mycroft where its config is located.

#### Node is not installed

In order to use mycroft you must have node.js installed locally. It is preferable that a mycroft user be setup and install done in /home/mycroft. This way you can use the upstart script to control mycroft if you are on Ubuntu. 

    cd mycroft/install && ./install.sh

You then want to create a config file as detailed in the config section. This file should live at **~/.mycroft**. Alternatively you can use the **--config** switch to tell mycroft where its config is located.

If you are on ubuntu you want to copy the upstart file in install/upstart to /etc/init

    sudo cp upstart/mycroft.conf /etc/init

## Config

All config is done via the config file. The config file is a module to be required. It's location defaults to **~/.mycroft** but can be change with the **--config** switch.

    mycroft --config /home/mycroft/config/mycroft.conf

**.mycroft**
    module.exports = {
        nodes: [{
            host: 'localhost',
            port: 10000
        },{
            protocol: 'https',
            host: 'localhost',
            port: 8000
        }],
       log_file: process.env.HOME+'/logs/mycroft.log',
       keepalive_poll_time: 5000,
       timeout: 5000,
       poll_time: 10000,
       plugins_dir: process.cwd(),
       ...
    };

----------------------------------

**nodes** - An array of servers making up the mycroft cluster. They must be http(s) servers that handle *GET* requests for **/alive** and **/data**;
  
    nodes: [{
        protocol: 'https',
        host: 'localhost',
        port: 10000
    }]

 * **protocol** - 'http' (default) || 'https'
 * **host** - DNS name or IP address of the node
 * **port** - HTTP listening port of the node


**log_file** - The full path of the log file for the process. If a log file is used console.error and console.log no longer write to standard out and to standard error. They are written to the log instead.

    log_file: process.env.HOME+'/logs/mycroft.log'

## Plugins
