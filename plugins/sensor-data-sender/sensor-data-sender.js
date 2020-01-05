'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const utils = require(`${basedir}/uc-utils`);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);
const sensors = require(`${basedir}/uc-sensors`);

module.exports.init = function () {
    db.init(getDbInitData());
};



wscli.commands.add('SetAutosend',
    function (arg) {
        if(wscli.context.current !== wscli.context.sensor)
            return undefined;
        arg = 0 | arg;

        if(arg) {
            let q = `REPLACE INTO mem.SensorsSendTimeouts (ID, MaxTimeLabel)
                VALUES ($ID, datetime($TimeLabel / 1000, 'unixepoch', 'localtime'))`;
            db.querySync(q, {$ID: sensors.currentSensor, $TimeLabel: 1000 * arg + new Date().getTime()});
        } else {
            db.querySync('DELETE FROM mem.SensorsSendTimeouts WHERE ID = $ID', {$ID: sensors.currentSensor});
        }
        wscli.sendData(`#Sensor:0x${Number(sensors.currentSensor).toHex()},Autosend:${arg}`);
        return true;
    },
    'Set timeout for autosend sensor data');



sensors.onSensorDataReceived(function (data) {
    let q = `DELETE FROM mem.SensorsSendTimeouts WHERE MaxTimeLabel > datetime($TimeLabel / 1000, 'unixepoch', 'localtime');
        SELECT ID, Type, TimeLabel FROM mem.SensorsData AS SensorsData
        INNER JOIN mem.SensorsSendTimeouts AS SensorsSendTimeouts
            ON SensorsData.ID = SensorsSendTimeouts.ID
        WHERE SensorsData.ID = $ID`;
    const qp = {$ID: data.ID, $TimeLabel: new Date().getTime()};
    let rows = db.querySync(q, qp);
    rows.forEach(function (row) {
        let data = '';
        let TimeLabel = new Date(row.TimeLabel);
        /** @namespace row.Type */
        data += `#Sensor:0x${Number(row.ID).toHex()},Type:${row.Type},TimeLabel:${utils.DateToShotXMLString(TimeLabel)}`;
        data += ',SensorData';
        let delimiter = ':';
        let rows_param = db.querySync("SELECT Param, Value FROM mem.SensorsParams WHERE ID = $ID", {$ID: row.ID});
        rows_param.forEach(function (row_param) {
            /** @namespace row_param.Param */
            /** @namespace row_param.Value */
            data += `${delimiter}${row_param.Param}=${row_param.Value}`;
            delimiter = '/';
        });
        wscli.sendData(data);
    });
});






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
