'use strict';

const wire = require('wire-i2c');
const utils = require(`uc-utils`);
const crc = require(`uc-crc`);

const sensors = require(`uc-sensors`);
const db = require(`uc-db`).init(getDbInitData());


let address;

module.exports.init = function () {
    address = db.querySync(`SELECT Address FROM I2C_WTH_ReceiverSettings`)[0].Address;

    setInterval(readSensorsData, db.querySync(`SELECT Interval AS Interval FROM I2C_WTH_ReceiverSettings`)[0].Interval);
};

function onReceiveData(data) {
    if(!data[0] && !data[1]) { // no sensor data, id = 0

        return false;
    }else if(utils.byte(data[6]) != crc.crc8(data, 6)){ // bad src
        console.log('Bad crc WTH433: ' + utils.byte(data[6]) + ' != ' + crc.crc8(data, 6));
        return true;
    }
    console.log(`Received data WTH433: ${data.toBin()}`);

    var sensorData = {};
    sensorData.ID       = Number(utils.byte(data[0]) + utils.byte(data[1]) * 256);
    sensorData.Type     = 'WTH433-' + ((utils.byte(data[0]) >> 2) & 0b11);
    sensorData.TimeLabel= Date.now() - utils.byte(data[2]) * 1000;
    sensorData.temperature = ((utils.byte(data[3]) + (utils.byte(data[4]) & 0x0f) * 256) - 500);
    sensorData.humidity = (utils.byte(data[5]) & 0x7f);
    sensorData.battery = utils.byte(data[5]) >> 7;

    sensors.updateSensorData(sensorData);
    return true;

}

function readSensorsData(){
    wire.open(address)
        .then(() => {
            return wire.read(7);
        })
        .then((data) => {
            console.log('Receive data:' + data);
            wire.close();

            onReceiveData(data);
        })
        .catch((err) => {
            console.error(err)
        })
    return;
}




function getDbInitData() {

    return `{
          "main": {
            "I2C_WTH_ReceiverSettings": {
              "schema": {
                "Address": "INTEGER NOT NULL",
                "Interval": "INTEGER NOT NULL"
              },
              "data": [
                {"RowID": 1, "Address": 96, "Interval": 2000}
              ]
            }
          }
        }`;
}


