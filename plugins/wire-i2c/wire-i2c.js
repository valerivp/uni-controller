'use strict';

const utils = require(`${basedir}/uc-utils`);

const i2c = (process.platform === 'linux' ? require('./i2cs/i2cs') : undefined);

if(!i2c){
    utils.file.log('i2c not use');
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