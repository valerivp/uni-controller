'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());
};

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
        if(arg)
            checkRangeTimeSchema(wscli.current.timeSchema);
        //let TimeSchemasCount = db.querySync("SELECT Count(*) AS Count FROM TimeSchemasSettings")[0].Count;
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
        // noinspection JSConstructorReturnsPrimitive
        if(!res)
            throw ('No data');
        return res;
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
                        TimeSchemasTypeOptionsMax.[Value] AS maxValue
                    FROM [TimeSchemasTypes]
                        LEFT JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptionsMin
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptionsMin.Type
                                AND TimeSchemasTypeOptionsMin.Option = 'MinValue'
                        LEFT JOIN TimeSchemasTypeOptions AS TimeSchemasTypeOptionsMax
                            ON TimeSchemasTypes.[Type] = TimeSchemasTypeOptionsMax.Type
                                AND TimeSchemasTypeOptionsMax.Option = 'MaxValue'
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

        rows = db.querySync(`SELECT TimeSchemasDOWmask.DOW, BeginTime, Value,
            (TimeSchemasParams.DOW IS NULL) AS NoData  
            FROM TimeSchemasDOWmask AS TimeSchemasDOWmask
            LEFT JOIN TimeSchemasParams AS TimeSchemasParams
                ON TimeSchemasDOWmask.DOW = TimeSchemasParams.DOW
                    AND TimeSchemasParams.SchemaID = $SchemaID AND TypeID = $TypeID
            WHERE TimeSchemasDOWmask.DOWmask & $DOWmask
            ORDER BY TimeSchemasDOWmask.DOW`, qp);
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
            "TimeSchemasDOWmask": {
              "schema": {
                "DOW": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "DOWmask": "INTEGER NOT NULL"
              },
              "data": [
                {"DOW": 0, "DOWmask": 128},
                {"DOW": 1, "DOWmask": 1},
                {"DOW": 2, "DOWmask": 2},
                {"DOW": 3, "DOWmask": 4},
                {"DOW": 4, "DOWmask": 8},
                {"DOW": 5, "DOWmask": 16},
                {"DOW": 6, "DOWmask": 32},
                {"DOW": 7, "DOWmask": 64}
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
                "SchemaID": "INTEGER NOT NULL",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "DOWmask": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
            },
            "TimeSchemasParams": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "DOW": "INTEGER NOT NULL",
                "BeginTime": "INTEGER NOT NULL",
                "Value": "CHAR(64)"
              }
            }
          }
        }`;
}
