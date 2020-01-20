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
/*
wscli.commands.add({SetName: String},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            checkRangeTimeSchema(wscli.current.TimeSchema);
            let qp = {$ID: wscli.current.TimeSchema};
            qp.$Name = arg;
            let q = `UPDATE TimeSchemas SET Name = $Name WHERE ID = $ID;
                SELECT * FROM TimeSchemasParams WHERE ID = $ID;`;
            let row = db.querySync(q, qp)[0];
            wscli.sendData(`#TimeSchema:${row.ID},Name:${row.Name}`);
            return true;
        }
    },
    'Set TimeSchema name.');

wscli.commands.add({SetType: String},
    function (arg) {
        if(wscli.context.current === wscli.context.TimeSchema){
            checkRangeTimeSchema(wscli.current.TimeSchema);
            let qp = {$ID: wscli.current.TimeSchema};
            qp.$Type = arg;
            // при изменении типа стираем связанные записи
            let q = `CREATE TABLE temp._TimeSchemas AS
                  SELECT * FROM TimeSchemas WHERE ID = $ID AND Type != $Type;
                DELETE FROM TimeSchemas WHERE ID IN (SELECT ID FROM temp._TimeSchemas);
                UPDATE temp._TimeSchemas SET Type = $Type;
                INSERT INTO TimeSchemas
                  SELECT * FROM temp._TimeSchemas;
                DROP TABLE temp._TimeSchemas;
                SELECT * FROM TimeSchemas WHERE ID = $ID;`;
            let row = db.querySync(q, qp)[0];
            wscli.sendData(`#TimeSchema:${row.ID},Type:${row.Type}`);
            return true;
        }
    },
    'Set TimeSchema type.');

*/


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
            "TimeSchemasDOW": {
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
            }
          }
        }`;
}
