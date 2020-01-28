'use strict';

const i2c = require('./i2cs/i2cs');
const utils = require('uc-utils');
const db = require(`uc-db`).init(getDbInitData());
const queues = require('uc-qlock');

const queue = new queues.queue('i2c', 5);


let device, wire, _wire;
module.exports.init = function () {
    device = db.querySync(`SELECT Device FROM I2C_Settings`)[0].Device;
    _wire = new i2c(undefined, {device: device});
};

const wire_cashe = {};
function getWire(address) {
    let res = wire_cashe[address];
    if(!res){
        res = new i2c(address, {device: device}); // point to your i2c address, debug provides REPL interface
        wire_cashe[address] = res;
    }
    return res;
}



module.exports.open = function(address) {
    return queue.lock({timeout: 500})
        .then(()=> {
            return new Promise(function(resolve, reject) {
                _wire.setAddress(address);
                //wire = getWire(address);
                _wire.open(device, ()=>{
                    wire = _wire;
                    resolve(this);
                });
            });
        });
};
module.exports.close = function() {
    if(wire)
        wire.close();
    wire = undefined;
    return queue.unlock();
};

module.exports.read = function (len) {
    return new Promise(function(resolve, reject) {
        if(!wire)
            reject(new Error("I2C session not opened"));
        else
            wire.read(len, (err, data)=>{
                if(err)
                    reject(err);
                else if(!wire)
                    reject(new Error("I2C session closed"));
                else
                    resolve(data);
            });
    });
};


function getDbInitData() {

    return `{
          "main": {
            "I2C_Settings": {
              "schema": {
                "Device": "CHAR(16) NOT NULL"
              },
              "data": [
                {"RowID": 1, "Device": "/dev/i2c-0"}
              ]
            }
          }
        }`;
}

