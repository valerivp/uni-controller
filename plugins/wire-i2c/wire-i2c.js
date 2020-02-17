'use strict';

const i2c = require('./i2cs/i2cs');
const db = require(`uc-db`);
const queues = require('uc-qlock');
const os = require('os');

const queue = new queues.queue('i2c', 5);


let device;
let wire;
module.exports.init = function () {

    db.init(getDbInitData());
    let qp = {$Platform: `${os.arch()}.${os.platform()}`};

    device = db.querySync(`SELECT Device FROM I2C_Settings WHERE Platform = $Platform`, qp)[0].Device;

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
                wire = getWire(address);
                wire.open(device, ()=>{
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

const update = {};
module.exports.update = update;

update['0.0.1'] = function(){
    return getDbInitData();
};

update['0.0.2'] = function () {
    db.querySync(`DROP TABLE IF EXISTS I2C_Settings`);
    return getDbInitData();
};

function getDbInitData() {

    return `{
          "main": {
            "I2C_Settings": {
              "schema": {
                "Platform": "CHAR(16) NOT NULL",
                "Device": "CHAR(16) NOT NULL"
              },
              "data": [
                {"Platform": "mipsel.linux", "Device": "/dev/i2c-0"},
                {"Platform": "arm.linux", "Device": "/dev/i2c-1"},
                {"Platform": "ia32.win32", "Device": "null"}
              ],
              "unique index": {
                "Platform": ["Platform"]
              }
            }
          }
        }`;
}

