'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());
};


wscli.commands.add({SetParams: Object},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            let qp = {$ID: wscli.current.TimeSchema, $Type: 'time-schema-temperature'};
            if(db.querySync(`SELECT * FROM TimeSchemas WHERE ID = $ID AND Type = $Type`, qp).length){
                //arg = wscli.data.fromString(arg, Object);
                let q = '';
                for(let key in arg){
                    if(key === 'DOWs'){
                        qp.$DOWs = arg.DOWs | 0;
                        q += `UPDATE TimeSchemasTemperatureDOWs SET DOWs = $DOWs WHERE SchemaID = $ID;
                            INSERT INTO TimeSchemasTemperatureDOWs (SchemaID, DOWs)
                                SELECT $ID, $DOWs WHERE (Select Changes() = 0);\n`;
                    }else if(key.startsWith('dow=')){
                        let dow = wscli.data.fromString(key, Object).dow;
                        q += `DELETE FROM TimeSchemasTemperatureParams WHERE SchemaID = $ID AND DOW = ${dow};\n`;
                        let data = arg[key];
                        data = wscli.data.fromString(data, Array);
                        if(data.length) {
                            q += `INSERT INTO TimeSchemasTemperatureParams(SchemaID, DOW, BeginTime, Value) VALUES\n`;
                            q += data.map((item) => wscli.data.fromString(item, Object))
                                .map((item) =>
                                    `($ID, ${dow}, ${item.time === undefined ? 'NULL' : item.time}, ${item.value === undefined ? 'NULL' : item.value})`
                                )
                                .join(',\n') + ';\n';
                        }
                    }
                }
                db.querySync(q, qp);
                wscli.sendData(`#TimeSchema:${qp.$ID},Params:${getParams(qp.$ID, qp.$DOWs)}`);
                return true;
            }
        }
    },
    'Set TimeSchema params.');


function getParams(SchemaID, DOWs) {
    let res = {};
    let qp = {$ID: SchemaID, $DOWs: (DOWs === undefined ? 0b11111111 : DOWs)};

    let rows = db.querySync(`SELECT DOWs FROM TimeSchemasTemperatureDOWs WHERE SchemaID = $ID`, qp);
    res.DOWs = rows.length ? rows[0].DOWs : 0;

    rows = db.querySync(`SELECT TimeSchemasDOW.DOW, BeginTime, Value,
        (TimeSchemasTemperatureParams.DOW IS NULL) AS NoData  
        FROM TimeSchemasDOW AS TimeSchemasDOW
        LEFT JOIN TimeSchemasTemperatureParams AS TimeSchemasTemperatureParams
            ON TimeSchemasDOW.DOW = TimeSchemasTemperatureParams.DOW
                AND SchemaID = $ID
        WHERE  TimeSchemasDOW.DOWs & $DOWs
        ORDER BY TimeSchemasDOW.DOW`, qp);
    let dow, i, data = {};

    rows.forEach((row)=>{
        if(dow !== row.DOW){
            i = 0;
            dow = row.DOW;
            data[dow] = [];
            if(row.NoData)
                return;
        }
        data[dow].push( {time: row.BeginTime, value: row.Value});
        i++;
    });

    for(let dow in data){
        res[`dow=${dow}`] = wscli.data.toString(data[dow]);
        //res[`dow=${dow}`] = data[dow].map((item, i)=>`time${i}=${item.time};value${i}=${item.value}`).join(';');
    }

    res = wscli.data.toString(res);
    return res;
}

wscli.commands.add({GetParams: String},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            let qp = {$ID: wscli.current.TimeSchema, $Type: 'time-schema-temperature'};
            if(db.querySync(`SELECT * FROM TimeSchemas WHERE ID = $ID AND Type = $Type`, qp).length){
                arg = arg === '' ? undefined : (arg | 0);
                wscli.sendClientData(`#TimeSchema:${qp.$ID},Params:${getParams(qp.$ID, arg)}`);
                return true;
            }
        }
    },
    'Get TimeSchema params.');






// noinspection JSUnusedLocalSymbols
module.exports.update = function(prevVer){
    return getDbInitData();
};


function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasTemperatureSettings": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "DefaultValue": "INTEGER NOT NULL"
              },
              "data": [
                {"ID": 0, "DefaultValue": 180}
              ]
            },
            "TimeSchemasTemperatureDOWs": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([ID]) ON DELETE CASCADE",
                "DOWs": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
            },
            "TimeSchemasTemperatureParams": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([ID]) ON DELETE CASCADE",
                "DOW": "INTEGER NOT NULL",
                "BeginTime": "INTEGER",
                "Value": "INTEGER"
              }
            }
          }
        }`;
}
