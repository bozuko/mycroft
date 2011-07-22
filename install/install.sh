#!/bin/bash -e

export NODE_VER=v0.5.0

function install_nvm() {
    echo "*** Installing nvm"
    if [[ ! -d ~/.nvm ]] ; then
        git clone git://github.com/creationix/nvm.git ~/.nvm
        echo '. ~/.nvm/nvm.sh' >> ~/.bashrc
    fi
    . ~/.nvm/nvm.sh || echo "ok"
}

function install_node() {
    echo "*** Installing node $NODE_VER"
    if [[ ! -d ~/.nvm/$NODE_VER ]] ; then
        nvm install $NODE_VER
        echo "nvm use $NODE_VER" >> ~/.bashrc
    fi
    nvm use $NODE_VER
}

# node version manager (nvm)
install_nvm

# node.js
install_node

echo "export PATH=~/mycroft/bin:~/node_modules/.bin/:$PATH" >> ~/.bashrc
source ~/.bashrc

# node packages
echo "*** Installing mycroft via NPM
cd ~ && npm install mycroft
