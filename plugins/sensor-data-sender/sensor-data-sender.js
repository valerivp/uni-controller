'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const utils = require(`${basedir}/uc-utils`);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);
const sensors = require(`${basedir}/uc-sensors`);

module.exports.init = function () {
    db.init(getDbInitData());
};



wscli.commands.add({SetAutosend: Number}, (arg)=> {
        if(wscli.context.current === wscli.context.sensor){
            sensors.checkRangeSensorID(wscli.current.sensor);
            if(arg) {
                let q = `REPLACE INTO mem.SensorsSendTimeouts (ID, MaxTimeLabel)
                VALUES ($ID, datetime($TimeLabel / 1000, 'unixepoch', 'localtime'))`;
                db.querySync(q, {$ID: wscli.current.sensor, $TimeLabel: 1000 * arg + new Date().getTime()});
            } else {
                db.querySync('DELETE FROM mem.SensorsSendTimeouts WHERE ID = $ID', {$ID: wscli.current.sensor});
            }
            wscli.sendData(`#Sensor:0x${Number(wscli.current.sensor).toHex()},Autosend:${arg}`);
            //if(arg)
            //    sendSensorData({ID: wscli.current.sensor});
            return true;
        }

    },
    'Set timeout for autosend sensor data.');

function sendSensorData(data) {
    db.querySync(`DELETE FROM mem.SensorsSendTimeouts
        WHERE MaxTimeLabel < datetime($TimeLabel / 1000, 'unixepoch', 'localtime')`, {$TimeLabel: new Date().getTime()});

    let q = `SELECT SensorsData.ID AS ID, Type, TimeLabel FROM mem.SensorsData AS SensorsData
        INNER JOIN mem.SensorsSendTimeouts AS SensorsSendTimeouts
            ON SensorsData.ID = SensorsSendTimeouts.ID
        WHERE SensorsData.ID = $ID`;
    let rows = db.querySync(q, {$ID: data.id});
    rows.forEach(function (row) {
        let data = '';
        let TimeLabel = new Date(row.TimeLabel);
        /** @namespace row.Type */
        data += `#Sensor:0x${Number(row.ID).toHex()},Type:${row.Type},TimeLabel:${utils.DateToShotXMLString(TimeLabel)}`;
        data += ',Data:';
        let params = {};
        let rows_param = db.querySync("SELECT Param, Value FROM mem.SensorsParams WHERE ID = $ID", {$ID: row.ID});
        rows_param.forEach(function (row_param) {
            /** @namespace row_param.Param */
            /** @namespace row_param.Value */
            params[row_param.Param] = row_param.Value;
        });
        data += wscli.data.toString(params);
        wscli.sendData(data);
    });
}

sensors.onSensorDataReceived(sendSensorData);






// noinspection JSUnusedLocalSymbols
module.exports.update = function(prevVer){
    return getDbInitData();
};

function getDbInitData() {

    return `{
          "mem":{
            "SensorsSendTimeouts": {
              "ID": "INTEGER PRIMARY KEY NOT NULL CONSTRAINT [SensorID] REFERENCES [SensorsData]([ID]) ON DELETE CASCADE",
              "MaxTimeLabel": "DATETIME NOT NULL"
            }
          }
        }`;
}