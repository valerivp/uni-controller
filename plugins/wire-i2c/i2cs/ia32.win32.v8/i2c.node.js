'use strict';

const crc = require(`uc-crc`);

let tick = setImmediate || process.nextTick;

module.exports.read = function (len, callback) {

    setTimeout(()=>{let arr = Array(len);
        for(let i = 0; i < len; i++)
            arr[i] = Math.random()*255|0;
        arr[len - 1] = crc.crc8(arr, len - 1);


        callback(undefined, arr);
    }, 500);
};

module.exports.open = function(device, callback) {
    tick(function() {
            return callback(undefined);
        });
};

module.exports.close = function() {
    return true;
};

module.exports.write = function(data, cb) {
    setTimeout(()=>{
        cb();
    }, 500);
};
module.exports.writeBlock = function(cmd, data, cb) {
    setTimeout(()=>{
        cb();
    }, 500);
};

module.exports.writeByte = function() {
    return true;
};
module.exports.readByte = function() {
    return Math.random()*255|0;
};

module.exports.setAddress = function(address) {
    return true;
};
