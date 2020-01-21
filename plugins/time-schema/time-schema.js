'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());

    // noinspection JSUnresolvedVariable
    let MaxTimeSchemasCount = db.querySync("SELECT MaxCount FROM TimeSchemasSettings")[0].MaxCount;
    db.querySync("DELETE FROM TimeSchemas WHERE ID > $MaxTimeSchemasCount", {$MaxTimeSchemasCount: MaxTimeSchemasCount});
    for(let i = 1; i <= MaxTimeSchemasCount; i++){
        db.querySync("INSERT OR IGNORE INTO TimeSchemas (ID) VALUES ($ID)", {$ID: i});
    }

};

wscli.context.add('TimeSchema');         /** @namespace wscli.context.TimeSchema */


wscli.commands.add({TimeSchema: Number},
    function(arg){
        arg = 0 | arg;
        wscli.context.current = wscli.context.TimeSchema;
        if( !arg || checkRangeTimeSchema(arg)) // noinspection CommaExpressionJS
            wscli.current.TimeSchema = arg;
        return true;
    },
    'Set current TimeSchema.'
);

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.TimeSchema){
        let res = false;
        // noinspection JSUnresolvedVariable
        let TimeSchemasCount = db.querySync("SELECT Count FROM TimeSchemasSettings")[0].Count;
        let q = `SELECT * FROM TimeSchemas WHERE (ID = $ID OR ($ID = 0 AND ID <= $TimeSchemasCount))`;
        let rows = db.querySync(q, {$ID: wscli.current.TimeSchema, $TimeSchemasCount: TimeSchemasCount});
        rows.forEach(function (row) { // noinspection JSUnresolvedVariable
            let data = `#TimeSchema:${row.ID},${info}:${row[info]}`;
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
//wscli.commands.add({GetParams: null}, GetInfo.bind(undefined, 'Params'), 'Get TimeSchema params.');

function SetInfo(info, arg) {
    if(wscli.context.current === wscli.context.TimeSchema){
        checkRangeTimeSchema(wscli.current.TimeSchema);
        let qp = {$ID: wscli.current.TimeSchema};
        qp[`\$${info}`] = arg;
        db.querySync(`UPDATE TimeSchemas
            SET ${info} = \$${info}
            WHERE ID = $ID and ${info} != \$${info}`, qp);
        let row = db.querySync("SELECT * FROM TimeSchemas WHERE ID = $ID", qp)[0];
        wscli.sendData(`#TimeSchema:${row.ID},${info}:${row[info]}`);
        // noinspection JSConstructorReturnsPrimitive
        return true;
    }

}


wscli.commands.add({SetName: String}, SetInfo.bind(undefined, 'Name'), 'Set TimeSchema name.');
wscli.commands.add({SetType: String}, SetInfo.bind(undefined, 'Type'), 'Set TimeSchema type.');
//wscli.commands.add({SetParams:String}, SetInfo.bind(undefined, 'Params'), 'Set TimeSchema params.');

// noinspection JSUnusedLocalSymbols
wscli.commands.add({GetCount: null},
    function(arg){
        let row = db.querySync("SELECT Count FROM TimeSchemasSettings")[0];
        // noinspection JSUnresolvedVariable
        wscli.sendClientData(`#TimeSchema,Count:${row.Count}`);
        return true;
    },
    'Get TimeSchemas count.'
);

function checkRangeTimeSchema(arg, allowZero) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, allowZero ? 0 : 1,
        db.querySync("SELECT MaxCount FROM TimeSchemasSettings")[0].MaxCount,
        'TimeSchema');
}

wscli.commands.add({SetCount:Number},
    function(arg){
        arg = 0 | arg;
        checkRangeTimeSchema(arg, true);
        db.querySync("UPDATE TimeSchemasSettings SET Count = $TimeSchemasCount", {$TimeSchemasCount: arg});
        let row = db.querySync("SELECT Count FROM TimeSchemasSettings")[0];
        /** @namespace row.Count */
        wscli.sendData(`#TimeSchema,Count:${row.Count}`);
        return true;
    },
    'Set TimeSchemas count.'
);



wscli.commands.add({SetParams: Object},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            let qp = {$ID: wscli.current.TimeSchema};
            if(db.querySync(`SELECT * FROM TimeSchemas WHERE ID = $ID`, qp).length){
                let q = '';
                for(let key in arg){
                    if(key === 'DOWs'){
                        qp.$DOWs = arg.DOWs | 0;
                        q += `UPDATE TimeSchemasDOW SET DOWs = $DOWs WHERE SchemaID = $ID;
                            INSERT INTO TimeSchemasDOW (SchemaID, DOWs)
                                SELECT $ID, $DOWs WHERE (Select Changes() = 0);\n`;
                    }else if(key.startsWith('dow=')){
                        let dow = wscli.data.fromString(key, Object).dow;
                        q += `DELETE FROM TimeSchemasParams WHERE SchemaID = $ID AND DOW = ${dow};\n`;
                        let data = arg[key];
                        data = wscli.data.fromString(data, Array);
                        if(data.length) {
                            q += `INSERT INTO TimeSchemasParams(SchemaID, DOW, BeginTime, Value) VALUES\n`;
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

    let rows = db.querySync(`SELECT DOWs FROM TimeSchemasDOW WHERE SchemaID = $ID`, qp);
    res.DOWs = rows.length ? rows[0].DOWs : 0;

    rows = db.querySync(`SELECT TimeSchemasDOWs.DOW, BeginTime, Value,
        (TimeSchemasParams.DOW IS NULL) AS NoData  
        FROM TimeSchemasDOWs AS TimeSchemasDOWs
        LEFT JOIN TimeSchemasParams AS TimeSchemasParams
            ON TimeSchemasDOWs.DOW = TimeSchemasParams.DOW
                AND TimeSchemasParams.SchemaID = $ID
        WHERE  TimeSchemasDOWs.DOWs & $DOWs
        ORDER BY TimeSchemasDOWs.DOW`, qp);
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
    }

    res = wscli.data.toString(res);
    return res;
}

wscli.commands.add({GetParams: String},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            arg = arg === '' ? undefined : (arg | 0);
            wscli.sendClientData(`#TimeSchema:${wscli.current.TimeSchema},Params:${getParams(wscli.current.TimeSchema, arg)}`);
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
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "MaxCount": "INTEGER NOT NULL",
                "Count": "INTEGER NOT NULL"
              },
              "data": [
                {"ID": 0, "Count": 0, "MaxCount": 8}
              ]
            },
            "TimeSchemasDOWs": {
              "schema": {
                "DOW": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "DOWs": "INTEGER NOT NULL"
              },
              "data": [
                {"DOW": 0, "DOWs": 128},
                {"DOW": 1, "DOWs": 1},
                {"DOW": 2, "DOWs": 2},
                {"DOW": 3, "DOWs": 4},
                {"DOW": 4, "DOWs": 8},
                {"DOW": 5, "DOWs": 16},
                {"DOW": 6, "DOWs": 32},
                {"DOW": 7, "DOWs": 64}
              ]
            },
            "TimeSchemas": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''",
                "Type": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            },
            "TimeSchemasDOW": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([ID]) ON DELETE CASCADE",
                "DOWs": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
            },
            "TimeSchemasParams": {
              "schema": {
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([ID]) ON DELETE CASCADE",
                "DOW": "INTEGER NOT NULL",
                "BeginTime": "INTEGER NOT NULL",
                "Value": "CHAR(64)"
              }
            }
          }
        }`;
}
