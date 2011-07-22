## Install

#### Node and NPM are already installed locally

mycroft is meant to be installed locally. If you already have npm and node setup in your home directory then you only need the following command:

    npm install mycroft

You then want to create a config file as detailed in the config section. This file should live at **~/.mycroft**. Alternatively you can use the **--config** switch to tell mycroft where its config is located.

#### Node is not installed

In order to use mycroft you must have node.js installed locally. It is preferable that a mycroft user be setup and install done in /home/mycroft. This way you can use the upstart script to control mycroft if you are on Ubuntu. 

    cd mycroft/install && ./install.sh

You then want to create a config file as detailed in the config section. This file should live at **~/.mycroft**. Alternatively you can use the **--config** switch to tell mycroft where its config is located.
