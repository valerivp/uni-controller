'use strict';

const db = require(`uc-db`);
const wscli = require(`uc-wscli`);
const template = require('uc-tmpl-plugin-settings');


Object.assign(module, new template('TimeSchema', 'TimeSchemas', {maxCount:8, name:true}));

module.exports.init = function () {
    db.init(module.getDbInitData(getDbInitData()));

    setInterval(updateTimeSchemaCurrentAndPrevValues, 1000);

};

function updateTimeSchemaCurrentAndPrevValues() {
        db.querySync(`CREATE TABLE temp.NewDataTimeSchemaCurrentAndPrevValues AS
                SELECT cd.[TimeSchemaID] AS TimeSchemaID, cd.TypeID AS TypeID,
                       CASE WHEN NOT IFNULL(cd.[Value] = pv.[Value], 0) THEN pv.[Value] ELSE pv.[PrevValue] END AS PrevValue,  
                       CASE WHEN NOT IFNULL(cd.[Value] = pv.[Value], 0) THEN dt.DateTime ELSE pv.TimeLabel END AS TimeLabel,
                       cd.[Value] AS Value  
                FROM temp.TimeSchemaCurrentData AS cd, mem.[CurrentDateTime] AS dt
                LEFT JOIN mem.TimeSchemaCurrentAndPrevValues AS pv
                     ON cd.[TimeSchemaID] = pv.TimeSchemaID AND cd.[TypeID] = pv.TypeID 
                ;
                DELETE FROM mem.TimeSchemaCurrentAndPrevValues;
                
                INSERT INTO mem.TimeSchemaCurrentAndPrevValues(TimeSchemaID, TypeID, PrevValue, TimeLabel, Value)
                SELECT TimeSchemaID, TypeID, PrevValue, TimeLabel, Value FROM temp.NewDataTimeSchemaCurrentAndPrevValues;
                DROP TABLE temp.NewDataTimeSchemaCurrentAndPrevValues;
            `);
}




wscli.commands.add({SetParams: Object},
    function (arg) {
        if(wscli.context.current === wscli.context.timeSchema){
            let qp = {$SchemaID: wscli.current.timeSchema};
            qp.$TypeID = (db.querySync(`SELECT TypeID FROM TimeSchemas WHERE TimeSchemaID = $SchemaID`, qp)[0] || {}).TypeID;
            if(qp.$TypeID){
                Object.assign(qp, db.querySync(`SELECT TimeSchemasTypes.Type,
                        TimeSchemasTypeOptionsMin.[Value] AS minValue,
                        TimeSchemasTypeOptionsMax.[Value] AS maxValue,
                        TimeSchemasTypeOptionsDef.[Value] AS defValue
                    FROM [TimeSchemasTypes]
                        LEFT JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptionsMin
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptionsMin.Type
                                AND TimeSchemasTypeOptionsMin.Option = 'MinValue'
                        LEFT JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptionsMax
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptionsMax.Type
                                AND TimeSchemasTypeOptionsMax.Option = 'MaxValue'
                        LEFT JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptionsDef
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptionsMax.Type
                                AND TimeSchemasTypeOptionsMax.Option = 'DefValue'
                        INNER JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptions
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptions.Type
                                AND TimeSchemasTypeOptions.Option = 'ValueType'
                                AND TimeSchemasTypeOptions.Value = 'Number'
                    WHERE TypeID = $TypeID`, qp)[0] || {} );

                let q = '';
                for(let key in arg){
                    if(key === 'DOWmask'){
                        qp.$DOWmask = arg.DOWmask | 0;
                        q += `UPDATE TimeSchemasDOW SET DOWmask = $DOWmask WHERE TimeSchemaID = $SchemaID AND TypeID = $TypeID;
                            INSERT INTO TimeSchemasDOW (TimeSchemaID, TypeID, DOWmask)
                                SELECT $SchemaID, $TypeID, $DOWmask WHERE (Select Changes() = 0);\n`;
                    }else if(key.startsWith('dow=')){
                        let dow = wscli.data.fromString(key, Object).dow;
                        q += `DELETE FROM TimeSchemasParams WHERE TimeSchemaID = $SchemaID AND TypeID = $TypeID AND DOW = ${dow};\n`;
                        let data = arg[key];
                        data = wscli.data.fromString(data, Array);
                        if(data.length) {
                            q += `INSERT INTO TimeSchemasParams(TimeSchemaID, TypeID, DOW, BeginTime, Value) VALUES\n`;
                            q += data.map((item) => wscli.data.fromString(item, Object))
                                .map((item) =>{
                                    let value = (item.value === undefined ? 'NULL' : String(item.value));

                                    if(qp.defValue !== undefined)
                                        value = `ifnull(${value}, ${qp.defValue})`;
                                    if(qp.minValue !== undefined)
                                        value = `max(${qp.minValue}, ${value})`;
                                    if(qp.maxValue !== undefined)
                                        value = `min(${qp.maxValue}, ${value})`;

                                    return `($SchemaID, $TypeID, ${dow}, ${item.time}, ${value})`}
                                )
                                .join(',\n') + ';\n';
                        }
                    }
                }
                db.querySync(q, qp);
                wscli.sendData(`#TimeSchema:${qp.$SchemaID},Params:${getParams(qp.$SchemaID, qp.$DOWmask)}`);
                return true;
            }
        }
    },
    'Set TimeSchema params.');


function getParams(TimeSchemaID, DOWmask) {
    let res = {};
    let qp = {$SchemaID: TimeSchemaID, $DOWmask: (DOWmask === undefined ? 0b11111111 : DOWmask)};

    let row = db.querySync(`SELECT TypeID FROM TimeSchemas WHERE TimeSchemaID = $SchemaID`, qp)[0];
    if(row) {
        qp.$TypeID = row.TypeID;

        row = db.querySync(`SELECT DOWmask FROM TimeSchemasDOW WHERE TimeSchemaID = $SchemaID AND TypeID = $TypeID`, qp)[0];
        res.DOWmask = row ? row.DOWmask : 0;

        let rows = db.querySync(`SELECT dow.DOW, BeginTime, Value,
            (TimeSchemasParams.DOW IS NULL) AS NoData  
            FROM temp.CurrentDOW AS dow
            LEFT JOIN TimeSchemasParams AS TimeSchemasParams
                ON dow.DOW = TimeSchemasParams.DOW
                    AND TimeSchemasParams.TimeSchemaID = $SchemaID AND TypeID = $TypeID
            WHERE dow.mask & $DOWmask
            ORDER BY dow.DOW`, qp);
        let dow, i, data = {};

        rows.forEach((row) => {
            if (dow !== row.DOW) {
                i = 0;
                dow = row.DOW;
                data[dow] = [];
                if (row.NoData)
                    return;
            }
            data[dow].push({time: row.BeginTime, value: row.Value});
            i++;
        });

        for (let dow in data) {
            res[`dow=${dow}`] = wscli.data.toString(data[dow]);
        }
    }
    res = wscli.data.toString(res);
    return res;
}

wscli.commands.add({GetParams: String},
    function (arg) {
        if(wscli.context.current === wscli.context.timeSchema){
            arg = arg === '' ? undefined : (arg | 0);
            wscli.sendClientData(`#TimeSchema:${wscli.current.timeSchema},Params:${getParams(wscli.current.timeSchema, arg)}`);
            return true;
        }
    },
    'Get TimeSchema params.');



const update = {};
module.exports.update = update;
update['0.0.1'] = function(){
    return getDbInitData();
};

function getDbInitData() {

    return module.getDbInitData(`{
          "main": {
            "TimeSchemasTypeOptions": {
              "schema": {
                "Type": "CHAR(32) NOT NULL",
                "Option": "CHAR(32) NOT NULL",
                "Value": "CHAR(32) NOT NULL"
              },
              "unique index": {
                "TypeOption": ["Type", "Option"]
              }
            },
            "TimeSchemasDOW": {
              "schema": {
                "TimeSchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([TimeSchemaID]) ON DELETE CASCADE",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE  SET NULL",
                "DOWmask": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
            },
            "TimeSchemasParams": {
              "schema": {
                "TimeSchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([TimeSchemaID]) ON DELETE CASCADE",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE  SET NULL",
                "DOW": "INTEGER NOT NULL",
                "BeginTime": "INTEGER NOT NULL",
                "Value": "CHAR(64)"
              }
            }
          },
          "mem":{
            "TimeSchemaCurrentAndPrevValues": {
              "schema": {
                "TimeSchemaID": "INTEGER PRIMARY KEY",
                "TypeID": "INTEGER NOT NULL",
                "Value": "CHAR(64)",
                "TimeLabel": "INTEGER NOT NULL",
                "PrevValue": "CHAR(64)"
              }
            }
          },
          "temp":{
            "TimeSchemaCurrentData":{
                "view": "WITH Step1 AS ( 
SELECT ts.TimeSchemaID AS TimeSchemaID, ts.[TypeID] AS TypeID, cdt.DOW AS DOW_current, cdt.TimeHM AS TimeHM, dow.[DOW] AS DOW, IFNULL(tsp.DOW, 0) AS DOW_src,
       IFNULL(tsp.[BeginTime], tsp0.[BeginTime]) AS BeginTime, IFNULL(tsp.[Value], tsp0.[Value]) AS Value,
      dow.PrevDOW_desc AS PrevDOW_desc    
        
FROM main.[TimeSchemas] AS ts, mem.[CurrentDateTime] AS cdt
LEFT JOIN temp.CurrentDOW AS dow
ON dow.DOW > 0

LEFT JOIN main.[TimeSchemasDOW] AS tsdow
     ON ts.[TimeSchemaID] = tsdow.[TimeSchemaID] AND ts.[TypeID] = tsdow.[TypeID] AND tsdow.[DOWmask] & dow.[mask]

LEFT JOIN main.[TimeSchemasParams] AS tsp
     ON tsdow.[TimeSchemaID] = tsp.[TimeSchemaID] AND tsdow.[TypeID] = tsp.[TypeID] AND dow.[DOW] = tsp.[DOW]      

LEFT JOIN main.[TimeSchemasParams] AS tsp0
     ON ts.[TimeSchemaID] = tsp0.[TimeSchemaID] AND ts.[TypeID] = tsp0.[TypeID] AND tsp.[DOW] IS NULL AND tsp0.[DOW] = 0
WHERE NOT IFNULL(tsp.[Value], tsp0.[Value]) IS NULL
     ),
     
Step2 AS (      
SELECT TimeSchemaID, TypeID, MAX(PrevDOW_desc * 10000 + BeginTime) AS DOW_BeginTime FROM Step1

WHERE (PrevDOW_desc * 10000 + BeginTime) <= (7 * 10000 + TimeHM)
GROUP BY TimeSchemaID, TypeID)

SELECT s1.[TimeSchemaID] AS TimeSchemaID, s1.[TypeID] AS TypeID, s1.DOW_src AS DOW, s1.[BeginTime] AS BeginTime, s1.[Value] AS Value FROM Step1 AS s1
INNER JOIN Step2 AS s2
ON s1.[TimeSchemaID] = s2.[TimeSchemaID] AND  (PrevDOW_desc * 10000 + BeginTime) = DOW_BeginTime;"
            }
          }
          
        }`);
}


