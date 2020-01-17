'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());

    // noinspection JSUnresolvedVariable
    let MaxTimeSchemasCount = db.querySync("SELECT MaxCount FROM TimeSchemasSettings")[0].MaxCount;
    db.querySync("DELETE FROM TimeSchemasParams WHERE ID > $MaxTimeSchemasCount", {$MaxTimeSchemasCount: MaxTimeSchemasCount});
    for(let i = 1; i <= MaxTimeSchemasCount; i++){
        db.querySync("INSERT OR IGNORE INTO TimeSchemasParams (ID) VALUES ($ID)", {$ID: i});
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
        let q = `SELECT * FROM TimeSchemasParams WHERE (ID = $ID OR ($ID = 0 AND ID <= $TimeSchemasCount))`;
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
wscli.commands.add({GetParams: null}, GetInfo.bind(undefined, 'Params'), 'Get TimeSchema params.');

function SetInfo(info, arg) {
    if(wscli.context.current === wscli.context.TimeSchema){
        checkRangeTimeSchema(wscli.current.TimeSchema);
        let qp = {$ID: wscli.current.TimeSchema};
        qp[`\$${info}`] = arg;
        db.querySync(`UPDATE TimeSchemasParams
            SET ${info} = \$${info}${(info === 'Type' ? ", Params = ''" : "")}
            WHERE ID = $ID and ${info} != \$${info}`, qp); // проверка на изменение типа чтобы параметры не затереть
        let row = db.querySync("SELECT * FROM TimeSchemasParams WHERE ID = $ID", qp)[0];
        wscli.sendData(`#TimeSchema:${row.ID},${info}:${row[info]}`);
        // noinspection JSConstructorReturnsPrimitive
        return true;
    }

}
wscli.commands.add({SetName: String}, SetInfo.bind(undefined, 'Name'), 'Set TimeSchema name.');
wscli.commands.add({SetParams:String}, SetInfo.bind(undefined, 'Params'), 'Set TimeSchema params.');

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
            "TimeSchemasParams": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''",
                "Params": "TEXT NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            }
          }
        }`;
}
