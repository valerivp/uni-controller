'use strict';

const i2c = require('./i2cs/i2cs');
const utils = require('uc-utils');

const db = require(`uc-db`).init(getDbInitData());

let device;
let _wire, wire;
module.exports.init = function () {
    device = db.querySync(`SELECT Device FROM I2C_Settings`)[0].Device;
    _wire = new i2c(undefined, {device: device});
};


const wire_cashe = {};
function wire_(addres) {
    return wire_cashe[addres] || (wire_cashe[addres] = new i2c(addres, {device: device}), wire_cashe[addres]);
}

let handles = {};
module.exports.open = function(address) {
    let options = {autoclose: 5000, timeout: 500};
    return utils.lock(device, {timeout: options.timeout})
        .then(()=> {
            handles.timeout = setTimeout(()=>{
                //module.exports.close();
                throw new Error(`I2C session timeout`);
            }, options.autoclose);

            return new Promise(function(resolve, reject) {
                _wire.open(device, ()=>{
                    wire = _wire;
                    wire.setAddress(address);
                    resolve(this);
                });
            });
        }).catch((err)=> {
            console.error(err);
            //throw err;
        });
};
module.exports.close = function() {
    if(wire)
        wire.close();
    wire = undefined;
    clearTimeout(handles.timeout);
    console.warn(new Error());
    return utils.unlock(device);
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
            })
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

