'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const utils = require(`${basedir}/uc-utils`);

let i2c;
try {
    i2c = require('./i2cs/i2cs');
}catch (err){
    utils.file.log(err.message);
}


const wire_cashe = {};
function wire(addres) {
    let res = wire_cashe[addres];
    if(i2c && !res){
        res = new i2c(addres, {device: '/dev/i2c-0'}); // point to your i2c address, debug provides REPL interface
        wire_cashe[addres] = res;
    }
    return res;
}

module.exports.get = wire;