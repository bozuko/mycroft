var pretty = module.exports;

pretty.ind = function() {
    return '    ';
};

pretty.sep = function(str) {
    var width = 20;
    for (var i = 0; i < width - str.length; i++) {
        str += ' ';
    }
    return str;
};

pretty.div = function() {
    return '========================================\n';
};