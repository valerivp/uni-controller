'use strict';

const db = require(`uc-db`);
const wscli = require(`uc-wscli`);


module.exports.init = function () {
    db.init(getDbInitData());

    setInterval(updateTimeSchemaCurrentAndPrevValues, 1000);

};

function updateTimeSchemaCurrentAndPrevValues() {
        db.querySync(`CREATE TABLE temp.NewDataTimeSchemaCurrentAndPrevValues AS
                SELECT cd.[SchemaID] AS SchemaID, cd.TypeID AS TypeID,
                       CASE WHEN NOT IFNULL(cd.[Value] = pv.[Value], 0) THEN pv.[Value] ELSE pv.[PrevValue] END AS PrevValue,  
                       CASE WHEN NOT IFNULL(cd.[Value] = pv.[Value], 0) THEN dt.DateTime ELSE pv.TimeLabel END AS TimeLabel,
                       cd.[Value] AS Value  
                FROM temp.TimeSchemaCurrentData AS cd, mem.[CurrentDateTime] AS dt
                LEFT JOIN mem.TimeSchemaCurrentAndPrevValues AS pv
                     ON cd.[SchemaID] = pv.SchemaID AND cd.[TypeID] = pv.TypeID 
                ;
                DELETE FROM mem.TimeSchemaCurrentAndPrevValues;
                
                INSERT INTO mem.TimeSchemaCurrentAndPrevValues(SchemaID, TypeID, PrevValue, TimeLabel, Value)
                SELECT SchemaID, TypeID, PrevValue, TimeLabel, Value FROM temp.NewDataTimeSchemaCurrentAndPrevValues;
                DROP TABLE temp.NewDataTimeSchemaCurrentAndPrevValues;
            `);
}



wscli.context.add('timeSchema');         /** @namespace wscli.context.timeSchema */


wscli.commands.add({TimeSchema: Number},
    function(arg){
        wscli.context.current = wscli.context.timeSchema;
        if(arg)
            checkRangeTimeSchema(arg); // noinspection CommaExpressionJS
        wscli.current.timeSchema = arg;
        return true;
    },
    'Set current TimeSchema.'
);

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.timeSchema){
        let res = false;
        // noinspection JSUnresolvedVariable
        let q = `SELECT SchemaID, Name, Type
            FROM TimeSchemas AS TimeSchemas 
            LEFT JOIN TimeSchemasTypes AS TimeSchemasTypes
                ON TimeSchemas.TypeID = TimeSchemasTypes.TypeID
            WHERE (SchemaID = $SchemaID OR ($SchemaID = 0 AND SchemaID <= (SELECT Count FROM TimeSchemasSettings)))`;
        let rows = db.querySync(q, {$SchemaID: wscli.current.timeSchema});
        rows.forEach(function (row) { // noinspection JSUnresolvedVariable
            let data = `#TimeSchema:${row.SchemaID},${info}:${row[info]}`;
            wscli.sendClientData(data);
            res = true;
        });

        return true; //res || !wscli.current.timeSchema;
    }
}

wscli.commands.add({GetName: null}, GetInfo.bind(undefined, 'Name'), 'Get TimeSchema name.');
wscli.commands.add({GetType: null}, GetInfo.bind(undefined, 'Type'), 'Get TimeSchema type.');


wscli.commands.add({SetName: String},
    function(arg) {
        if(wscli.context.current === wscli.context.timeSchema){
            checkRangeTimeSchema(wscli.current.timeSchema);
            let qp = {$SchemaID: wscli.current.timeSchema};
            qp.$Name = arg;
            db.querySync(`UPDATE TimeSchemas
                SET Name = $Name
            WHERE SchemaID = $SchemaID and Name != $Name`, qp);
            let row = db.querySync("SELECT SchemaID, Name FROM TimeSchemas WHERE SchemaID = $SchemaID", qp)[0];
            wscli.sendData(`#TimeSchema:${row.SchemaID},Name:${row.Name}`);
            return true;
        }
    },
    'Set TimeSchema name.');

wscli.commands.add({SetType: String},
    function(arg) {
        if(wscli.context.current === wscli.context.timeSchema){
            checkRangeTimeSchema(wscli.current.timeSchema);
            let qp = {$SchemaID: wscli.current.timeSchema};
            qp.$Type = arg;
            db.querySync(`UPDATE TimeSchemas
                SET TypeID = (SELECT TypeID FROM TimeSchemasTypes WHERE Type = $Type)
            WHERE SchemaID = $SchemaID`, qp);
            let row = db.querySync(`SELECT SchemaID, Type
                FROM TimeSchemas
                    LEFT JOIN TimeSchemasTypes AS TimeSchemasTypes
                        ON TimeSchemas.TypeID = TimeSchemasTypes.TypeID
                WHERE SchemaID = $SchemaID`, qp)[0];
            wscli.sendData(`#TimeSchema:${row.SchemaID},Type:${row.Type}`);
            // noinspection JSConstructorReturnsPrimitive
            return true;
        }
    },
    'Set TimeSchema type.');

// noinspection JSUnusedLocalSymbols
wscli.commands.add({GetCount: null},
    function(arg){
        if(wscli.context.current === wscli.context.timeSchema) {
            let row = db.querySync("SELECT Count FROM TimeSchemasSettings")[0];
            // noinspection JSUnresolvedVariable
            wscli.sendClientData(`#TimeSchema,Count:${row.Count}`);
            return true;
        }
    },
    'Get TimeSchemas count.'
);

function checkRangeTimeSchema(arg) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, 0,
        db.querySync("SELECT Count FROM TimeSchemasSettings")[0].Count,
        'TimeSchema');
}

wscli.commands.add({SetCount:Number},
    function(arg){
        if(wscli.context.current === wscli.context.timeSchema) {

            let row = db.querySync("SELECT MaxCount, Count FROM TimeSchemasSettings")[0];
            wscli.checkInRange(arg, 0, row.MaxCount, 'TimeSchema')

            let count = row.Count;
            if(count >= arg){
                let q = `DELETE FROM TimeSchemas WHERE SchemaID > $SchemasCount;
                    UPDATE TimeSchemasSettings SET Count = (SELECT COUNT(*) AS Count FROM TimeSchemas);
                    SELECT Count FROM TimeSchemasSettings;`;
                let row = db.querySync(q, {$SchemasCount: arg})[0];
                wscli.sendData(`#TimeSchema,Count:${row.Count}`);
            }else{
                let rows = db.querySync(`SELECT Type, TypeID FROM TimeSchemasTypes ORDER BY TypeID LIMIT 1`);
                if(!rows.length)
                    throw ("Types of time schemas not defined");
                let qp = {$TypeID: rows[0].TypeID};
                let q = `INSERT
                        INTO TimeSchemas (SchemaID, TypeID)
                        VALUES ($SchemaID, $TypeID);
                     UPDATE TimeSchemasSettings SET Count = (SELECT COUNT(*) AS Count FROM TimeSchemas);
                     SELECT Count, SchemaID, Type
                        FROM TimeSchemasSettings AS TimeSchemasSettings, TimeSchemas AS TimeSchemas
                        LEFT JOIN TimeSchemasTypes AS TimeSchemasTypes
                            ON TimeSchemas.TypeID = TimeSchemasTypes.TypeID
                                AND TimeSchemasSettings.Count = TimeSchemas.SchemaID
                        WHERE TimeSchemas.SchemaID = $SchemaID`;
                for(let i = count + 1; i <= arg; i++){
                    qp.$SchemaID = i;
                    let row = db.querySync(q, qp)[0];
                    wscli.sendData(`#TimeSchema,Count:${row.Count}`);
                    wscli.sendData(`#TimeSchema:${row.SchemaID},Type:${row.Type}`);
                }
            }
            return true;
        }
    },
    'Set TimeSchemas count.'
);



wscli.commands.add({SetParams: Object},
    function (arg) {
        if(wscli.context.current === wscli.context.timeSchema){
            let qp = {$SchemaID: wscli.current.timeSchema};
            qp.$TypeID = (db.querySync(`SELECT TypeID FROM TimeSchemas WHERE SchemaID = $SchemaID`, qp)[0] || {}).TypeID;
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
                        q += `UPDATE TimeSchemasDOW SET DOWmask = $DOWmask WHERE SchemaID = $SchemaID AND TypeID = $TypeID;
                            INSERT INTO TimeSchemasDOW (SchemaID, TypeID, DOWmask)
                                SELECT $SchemaID, $TypeID, $DOWmask WHERE (Select Changes() = 0);\n`;
                    }else if(key.startsWith('dow=')){
                        let dow = wscli.data.fromString(key, Object).dow;
                        q += `DELETE FROM TimeSchemasParams WHERE SchemaID = $SchemaID AND TypeID = $TypeID AND DOW = ${dow};\n`;
                        let data = arg[key];
                        data = wscli.data.fromString(data, Array);
                        if(data.length) {
                            q += `INSERT INTO TimeSchemasParams(SchemaID, TypeID, DOW, BeginTime, Value) VALUES\n`;
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


function getParams(SchemaID, DOWmask) {
    let res = {};
    let qp = {$SchemaID: SchemaID, $DOWmask: (DOWmask === undefined ? 0b11111111 : DOWmask)};

    let rows = db.querySync(`SELECT TypeID FROM TimeSchemas WHERE SchemaID = $SchemaID`, qp);
    if(rows.length) {
        qp.$TypeID = rows[0].TypeID;
        rows = db.querySync(`SELECT DOWmask FROM TimeSchemasDOW WHERE SchemaID = $SchemaID AND TypeID = $TypeID`, qp);
        res.DOWmask = rows.length ? rows[0].DOWmask : 0;

        rows = db.querySync(`SELECT dow.DOW, BeginTime, Value,
            (TimeSchemasParams.DOW IS NULL) AS NoData  
            FROM temp.CurrentDOW AS dow
            LEFT JOIN TimeSchemasParams AS TimeSchemasParams
                ON dow.DOW = TimeSchemasParams.DOW
                    AND TimeSchemasParams.SchemaID = $SchemaID AND TypeID = $TypeID
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



// noinspection JSUnusedLocalSymbols
module.exports.update = function(prevVer){
    return getDbInitData();
};


function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasSettings": {
              "schema": {
                "MaxCount": "INTEGER NOT NULL",
                "Count": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              },
              "data": [
                {"RowID": 1, "MaxCount": 8, "Count": 0}
              ]
            },
            "TimeSchemasTypes": {
              "schema": {
                "TypeID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "Type": "CHAR(32) NOT NULL"
              },
              "unique index": {
                "Type": ["Type"]
              }
            },
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
            "TimeSchemas": {
              "schema": {
                "SchemaID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            },
            "TimeSchemasDOW": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [SchemaID] REFERENCES [TimeSchemas]([SchemaID]) ON DELETE NO ACTION",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "DOWmask": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
            },
            "TimeSchemasParams": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [SchemaID] REFERENCES [TimeSchemas]([SchemaID]) ON DELETE NO ACTION",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "DOW": "INTEGER NOT NULL",
                "BeginTime": "INTEGER NOT NULL",
                "Value": "CHAR(64)"
              }
            }
          },
          "mem":{
            "TimeSchemaCurrentAndPrevValues": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL PRIMARY KEY",
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
SELECT ts.SchemaID AS SchemaID, ts.[TypeID] AS TypeID, cdt.DOW AS DOW_current, cdt.TimeHM AS TimeHM, dow.[DOW] AS DOW, IFNULL(tsp.DOW, 0) AS DOW_src,
       IFNULL(tsp.[BeginTime], tsp0.[BeginTime]) AS BeginTime, IFNULL(tsp.[Value], tsp0.[Value]) AS Value,
      dow.PrevDOW_desc AS PrevDOW_desc    
        
FROM main.[TimeSchemas] AS ts, mem.[CurrentDateTime] AS cdt
LEFT JOIN temp.CurrentDOW AS dow
ON dow.DOW > 0

LEFT JOIN main.[TimeSchemasDOW] AS tsdow
     ON ts.[SchemaID] = tsdow.[SchemaID] AND ts.[TypeID] = tsdow.[TypeID] AND tsdow.[DOWmask] & dow.[mask]

LEFT JOIN main.[TimeSchemasParams] AS tsp
     ON tsdow.[SchemaID] = tsp.[SchemaID] AND tsdow.[TypeID] = tsp.[TypeID] AND dow.[DOW] = tsp.[DOW]      

LEFT JOIN main.[TimeSchemasParams] AS tsp0
     ON ts.[SchemaID] = tsp0.[SchemaID] AND ts.[TypeID] = tsp0.[TypeID] AND tsp.[DOW] IS NULL AND tsp0.[DOW] = 0
WHERE NOT IFNULL(tsp.[Value], tsp0.[Value]) IS NULL
     ),
     
Step2 AS (      
SELECT SchemaID, TypeID, MAX(PrevDOW_desc * 10000 + BeginTime) AS DOW_BeginTime FROM Step1

WHERE (PrevDOW_desc * 10000 + BeginTime) <= (7 * 10000 + TimeHM)
GROUP BY SchemaID, TypeID)

SELECT s1.[SchemaID] AS SchemaID, s1.[TypeID] AS TypeID, s1.DOW_src AS DOW, s1.[BeginTime] AS BeginTime, s1.[Value] AS Value FROM Step1 AS s1
INNER JOIN Step2 AS s2
ON s1.[SchemaID] = s2.[SchemaID] AND  (PrevDOW_desc * 10000 + BeginTime) = DOW_BeginTime;"
            }
          }
          
        }`;
}


