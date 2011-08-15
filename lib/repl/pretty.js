var pretty = module.exports;

pretty.title = function(str) {
    return '\033\[36m'+str+'\033[0m\n';
};

pretty.ind = function() {
    return '    ';
};

pretty.sep = function(str, _width) {
    var width = _width || 40;
    var ct = width - str.length;
    for (var i = 0; i < ct; i++) {
        str += ' ';
    }
    return str;
};

pretty.div = function() {
    return '========================================\n';
};

pretty.ok = function(val) {
    if (val) return val;
    return '\033\[31m'+val+'\033\[0m\n';    
};