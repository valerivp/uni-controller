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

wscli.commands.add({Sensor: Number}, (arg)=> {
        sensors.checkRangeSensorID(arg, 0);
        wscli.context.current = wscli.context.sensor;
        wscli.current.sensor = arg;
        return true;
    },
    'Set sensor as current.'
);


wscli.commands.add({SetName: String}, (arg) =>{
        if(wscli.context.current === wscli.context.sensor){
            sensors.checkRangeSensorID(wscli.current.sensor);
            if(arg) {
                try {
                    db.beginTransaction();
                    let q = `REPLACE INTO SensorsNames (ID, Name) VALUES ($ID, $Name)`;
                    db.querySync(q, {$ID: wscli.current.sensor, $Name: arg});
                    db.commitTransaction();
                }catch (err){
                    if(db.isTransaction())
                        db.rollbackTransaction();
                    throw err;
                }
            } else {
                db.querySync('DELETE FROM SensorsNames WHERE ID = $ID', {$ID: wscli.current.sensor});
            }
            wscli.sendData(`#Sensor:0x${Number(wscli.current.sensor).toHex()},Name:${wscli.data.toString(arg)}`);
            return true;
        }
    },
    'Set sensor name.');

wscli.commands.add({GetName: null}, (arg)=>{
        if(wscli.context.current === wscli.context.sensor){
            sensors.checkRangeSensorID(wscli.current.sensor, 0);
            let res = false;
            let rows = db.querySync("SELECT ID, Name FROM SensorsNames WHERE ID = $ID OR $ID = 0", {$ID: wscli.current.sensor});
            rows.forEach(function (row) {
                wscli.sendData(`#Sensor:0x${Number(row.ID).toHex()},Name:${wscli.data.toString(row.Name)}`);
                res = true;
            });
            if(!res)
                throw("Sensor name not defined");
            return res;
        }
    },
    'Get sensors name.');

wscli.commands.add({GetData: String}, (arg)=>{
        if(wscli.context.current === wscli.context.sensor) {
            sensors.checkRangeSensorID(wscli.current.sensor, 0);
            let arg_arr = arg.split('>');

            // noinspection JSBitwiseOperatorUsage
            let timeFilter = ((arg_arr[1] && arg_arr[1].length === 15) ? wscli.data.fromString(arg_arr[1], Date).getTime() / 1000 | 0: 0);

            let rows = db.querySync("SELECT ID, Type, TimeLabel FROM mem.SensorsData WHERE (ID = $ID OR $ID = 0) AND TimeLabel > $TimeLabel", {
                $ID: wscli.current.sensor,
                $TimeLabel: timeFilter
            });
            rows.forEach(function (row) {
                let data = '';
                let TimeLabel = new Date(row.TimeLabel * 1000);
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
                wscli.sendClientData(data);
            });
            return true;
        }
    },
    'Get sensor data.');


module.exports.updateSensorData = function(sensor, params){
    const qp = {$ID: sensor.ID, $Type: sensor.Type, $TimeLabel: new Date(sensor.TimeLabel).getTime() / 1000 | 0};
    let q = `SELECT SensorsData.ID,
                abs(TimeLabel - $TimeLabel) as dif,
                TimeLabel,
                $TimeLabel
            FROM mem.SensorsData as SensorsData, SensorsSettings as SensorsSettings
            WHERE SensorsData.ID = $ID
                AND abs(TimeLabel - $TimeLabel) <= SensorsSettings.MaxTimeDivergence`;
    if(db.querySync(q, qp).length)
        return;

    q = `DELETE FROM mem.SensorsParams WHERE ID = $ID;
        REPLACE INTO mem.SensorsData (ID, Type, TimeLabel) VALUES ($ID, $Type, $TimeLabel);\n`;

    let kebab_params = {};
    for(let key in params)
        kebab_params[key.toKebab()] = params[key];
    delete kebab_params.id;
    delete kebab_params.name;

    for (let key in kebab_params) {
        // noinspection JSUnfilteredForInLoop
        q += `INSERT INTO mem.SensorsParams (ID, Param, Value) VALUES ($ID, '${key}', ${kebab_params[key]});\n`;
    }
    try{
        db.beginTransaction();
        db.querySync(q, qp);
        db.commitTransaction();
    }catch (err){
        if(db.isTransaction())
            db.rollbackTransaction();
        throw(err);
    }

    EventEmitter.emit(EventEmitter.events.SensorDataReceived,
        {id: sensor.ID, type: sensor.Type, timelabel: new Date(sensor.TimeLabel), params: kebab_params});

};



module.exports.checkRangeSensorID = (arg, allowVal) =>{
    if(allowVal === undefined)
        return wscli.checkInRange(arg, 1, 0xFFFF, 'Sensor');
    else
        return wscli.checkInRange(arg, [[allowVal, allowVal], [1, 0xFFFF]], 'Sensor');

};



function getDbInitData() {

    return `{
          "main": {
            "SensorsNames": {
              "ID": "INTEGER PRIMARY KEY NOT NULL",
              "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
            },
            "SensorsSettings": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "MaxTimeDivergence": "INTEGER"
              },
              "data": [
                {"ID": 0, "MaxTimeDivergence": 2}
              ]
            }
          },
          "mem":{
            "SensorsData": {
              "ID": "INTEGER PRIMARY KEY NOT NULL",
              "Type": "CHAR(16) NOT NULL",
              "TimeLabel": "INTEGER NOT NULL"
            },
            "SensorsParams": {
              "ID": "INTEGER NOT NULL CONSTRAINT [SensorID] REFERENCES [SensorsData]([ID]) ON DELETE CASCADE",
              "Param": "CHAR(16) NOT NULL",
              "Value": "INTEGER NOT NULL"
            }
          }
        }`;
}
