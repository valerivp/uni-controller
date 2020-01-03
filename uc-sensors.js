'use strict';

const utils = require("./uc-utils");
const db = require("./uc-db").init(getDbInitData());
const wscli = require("./uc-wscli");
const util = require("util");

function EventEmitterClass() {
    this.events = {
        SensorDataReceived: 'sensor-data-received'
    };
}
util.inherits(EventEmitterClass, require("events"));
const EventEmitter = new EventEmitterClass();
//module.exports.on = events.on.bind(events);
const sensors = module.exports;

module.exports.onSensorDataReceived = EventEmitter.on.bind(EventEmitter, EventEmitter.events.SensorDataReceived);


wscli.context.add('sensor');

sensors.currentSensor = undefined;
wscli.commands.add('Sensor',
    function (arg) {
        arg = 0 | arg;
        if (checkRangeSensorID(arg) && wscli.context.setCurrent(wscli.context.sensor)) {
            sensors.currentSensor = arg;
            return true;
        }
        return false;
    },
    'Set sensor as current');


wscli.commands.add('SetName',
    function (arg) {
        if(wscli.context.getCurrent() !== wscli.context.sensor)
            return undefined;

        if(arg) {
            try {
                db.beginTransaction();
/*                let q = `UPDATE SensorsNames SET Name = $Name WHERE ID = $Sensor;
                         INSERT INTO SensorsNames (ID, Name)
                            SELECT $Sensor, $Name WHERE (SELECT Changes() = 0);`;
*/                let q = `REPLACE INTO SensorsNames (ID, Name) VALUES ($ID, $Name)`;
                db.querySync(q, {$ID: sensors.currentSensor, $Name: arg});
                db.commitTransaction();
            }catch (err){
                if(db.isTransaction())
                    db.rollbackTransaction();
                throw err;
            }
        } else {
            db.querySync('DELETE FROM SensorsNames WHERE ID = $Sensor', {$Sensor: sensors.currentSensor});
        }
        wscli.sendData(`#Sensor:0x${Number(sensors.currentSensor).toHex()},Name:${arg}`);
        return true;
    },
    'Set sensor name');

wscli.commands.add('SensorsNames',
    function(arg){
        let res = false;
        arg = 0 | arg;
        if(!arg || checkRangeSensorID(arg)){
            let rows = db.querySync("SELECT ID, Name FROM SensorsNames WHERE ID = $ID OR 1 = $all", {$ID: arg, $all: 0 | !arg});
            rows.forEach(function (row) {
                wscli.sendData(`#Sensor:0x${Number(row.ID).toHex()},Name:${row.Name}`);
                res = true;
            });
            if(!res)
                wscli.setError("Sensor name not defined");
        }
        return res;
    },
    'Get sensors names. Sensor ID as optional param');

wscli.commands.add('SensorsData',
    function(arg){
        let arg_arr = arg.split('>');

        let id = ((0 | arg_arr[0]) ? 0 | arg_arr[0] : 0);
        let timeFilter = ((arg_arr[1] && arg_arr[1].length === 15) ? utils.DateFromShotXMLString(arg_arr[1]).getTime(): 0);

        let rows = db.querySync("SELECT ID, Type, TimeLabel FROM mem.SensorsData WHERE (ID = $ID OR $ID = 0) AND TimeLabel > datetime($TimeLabel / 1000, 'unixepoch', 'localtime')", {$ID: id, $TimeLabel: timeFilter});
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
            wscli.sendClientData(data);
        });
        return true;
    },
    'Get sensors data.');


module.exports.updateSensorData = function(sensor, params){
    const qp = {$ID: sensor.ID, $Type: sensor.Type, $TimeLabel: new Date(sensor.TimeLabel).getTime()};
    //let q = `DELETE FROM mem.SensorsData WHERE ID = $ID;
    let q = `DELETE FROM mem.SensorsParams WHERE ID = $ID;
        REPLACE INTO mem.SensorsData (ID, Type, TimeLabel) VALUES ($ID, $Type, datetime($TimeLabel / 1000, 'unixepoch', 'localtime'));\n`;
    for (let key in params) {
        // noinspection JSUnfilteredForInLoop
        q += `INSERT INTO mem.SensorsParams (ID, Param, Value) VALUES ($ID, '${key}', ${params[key]});\n`;
    }
    let isNewData = undefined;
    try{
        db.beginTransaction();
        isNewData = !db.querySync("SELECT ID FROM mem.SensorsData WHERE ID = $ID AND TimeLabel = datetime($TimeLabel / 1000, 'unixepoch', 'localtime')", qp).length;
        if(isNewData)
            db.querySync(q, qp);
        db.commitTransaction();
    }catch (err){
        isNewData = undefined;
        if(db.isTransaction())
            db.rollbackTransaction();
        throw(err);
    }

    if(isNewData){
        EventEmitter.emit(EventEmitter.events.SensorDataReceived,
            {id: sensor.ID, type: sensor.Type, timelabel: new Date(sensor.TimeLabel), params: params});
    }

};



function checkRangeSensorID(arg) {
    return wscli.checkInRange(arg, 1, 0xFFFF, 'Sensor');
}



function getDbInitData() {

    return `{
          "main": {
            "SensorsNames": {
              "ID": "INTEGER PRIMARY KEY NOT NULL",
              "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
            }
          },
          "mem":{
            "SensorsData": {
              "ID": "INTEGER PRIMARY KEY NOT NULL",
              "Type": "CHAR(16) NOT NULL",
              "TimeLabel": "DATETIME NOT NULL"
            },
            "SensorsParams": {
              "ID": "INTEGER NOT NULL CONSTRAINT [SensorID] REFERENCES [SensorsData]([ID]) ON DELETE CASCADE",
              "Param": "CHAR(16) NOT NULL",
              "Value": "INTEGER NOT NULL"
            }
          }
        }`;
}
