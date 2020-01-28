'use strict';

const wire = require('wire-i2c');

const sensors = require(`uc-sensors`);
const db = require(`uc-db`).init(getDbInitData());

let address;

module.exports.init = function () {
    address = db.querySync(`SELECT Address FROM I2C_WTH_ReceiverSettings`)[0].Address;

    setInterval(readSensorsData, db.querySync(`SELECT 1000 * Interval AS Interval FROM I2C_WTH_ReceiverSettings`)[0].Interval);
    //setTimeout(readSensorsData, 1000);
    //setTimeout(readSensorsData, 2000);
};

function readSensorsData(){
    if(utils.locks.test(module.filename)) {
        wire.open(address)
            .then(() => {
                return wire.read(7);
            })
            .then((data) => {
                console.log('Receive data:' + data);
                wire.close();
            })
            .catch((err) => {
                console.error(err)
            })
            .finally(()=>{
                utils.locks.unlock(module.filename)
            });
    }
    return;

    let data = wire_WTH433.read(7);
    if(!data[0] && !data[1]) { // no sensor data, id = 0

        return false;
    }else if(utils.byte(data[6]) != utils.crc8(data, 6)){ // bad src
        console.log('Bad crc WTH433: ' + utils.byte(data[6]) + ' != ' + utils.crc8(data, 6));
        return true;
    }
    console.log(`Received data WTH433: ${toBin(data)}`);

    var sensorData = {};
    sensorData.ID       = Number(utils.byte(data[0]) + utils.byte(data[1]) * 256);
    sensorData.Type     = 'WTH433-' + ((utils.byte(data[0]) >> 2) & 0b11);
    sensorData.TimeLabel= Date.now() - utils.byte(data[2]) * 1000;
    var sensorParams = {};
    sensorParams.temperature = ((utils.byte(data[3]) + (utils.byte(data[4]) & 0x0f) * 256) - 500);
    sensorParams.humidity = (utils.byte(data[5]) & 0x7f);
    sensorParams.battery = utils.byte(data[5]) >> 7;
    //sensorData.params = sensorParams;

    updateSensorData(sensorData, sensorParams);
    return true;

}




function onMqttUdpData(topic, load){
    //console.log(`${topic}: ${load}`);
    let topic_data = topic.split("/");
    let sensorData = {};
    sensorData.ID = Number(topic_data[1]);
    if(topic_data.length !== 2 || !sensorData.ID)
        return;
    sensorData.Type = topic_data[0];
    let load_data = JSON.parse(load);
    /** @namespace load_data.timelabel */
    if(load_data.timelabel){
        if(load_data.timelabel.slice(8, 9) === 'T')
            sensorData.TimeLabel = utils.DateFromShotXMLString(load_data.timelabel);
        else
            sensorData.TimeLabel = new Date(load_data.timelabel);

        delete load_data.timelabel;
    }else{
        sensorData.TimeLabel = new Date;
    }

    sensors.updateSensorData(sensorData, load_data);
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
                {"RowID": 1, "Address": 96, "Interval": 1}
              ]
            }
          }
        }`;
}


