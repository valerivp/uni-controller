'use strict';

let tick = setImmediate || process.nextTick;

module.exports.read = function (len, callback) {

    setTimeout(()=>{let arr = Array(len);
        for(let i = 0; i < len; i++)
            arr[i] = Math.random()*255|0;

        callback(undefined, arr);
    }, 2000);
};

module.exports.open = function(device, callback) {
    tick(function() {
            return callback(undefined);
        });
};
module.exports.close = function() {
    return true;
};

module.exports.setAddress = function(address) {
    return true;
};
