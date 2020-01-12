'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());

    // noinspection JSUnresolvedVariable
    let MaxTimeSchemasCount = db.querySync("SELECT MaxTimeSchemasCount FROM TimeSchemasSettings")[0].MaxTimeSchemasCount;
    db.querySync("DELETE FROM TimeSchemasParams WHERE ID > $MaxTimeSchemasCount", {$MaxTimeSchemasCount: MaxTimeSchemasCount});
    for(let i = 1; i <= MaxTimeSchemasCount; i++){
        db.querySync("INSERT OR IGNORE INTO TimeSchemasParams (ID) VALUES ($ID)", {$ID: i});
    }
};

wscli.context.add('TimeSchema');         /** @namespace wscli.context.TimeSchema */


wscli.commands.add('TimeSchema', 'Set current TimeSchema. TimeSchema as param.',
    function(arg){
        arg = 0 | arg;
        wscli.context.current = wscli.context.TimeSchema;
        if( !arg || checkRangeTimeSchema(arg)) // noinspection CommaExpressionJS
            wscli.current.TimeSchema = arg;
        return true;
    });

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.TimeSchema){
        let res = false;
        // noinspection JSUnresolvedVariable
        let TimeSchemasCount = db.querySync("SELECT TimeSchemasCount FROM TimeSchemasSettings")[0].TimeSchemasCount;
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

wscli.commands.add('GetType', 'Get current TimeSchema type.', GetInfo.bind(undefined, 'Type'));
wscli.commands.add('GetParams', 'Get current TimeSchema params.', GetInfo.bind(undefined, 'Params'));

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
wscli.commands.add('SetName', 'Set current TimeSchema name.', SetInfo.bind(undefined, 'Name'));
wscli.commands.add('SetType', 'Set current TimeSchema type.', SetInfo.bind(undefined, 'Type'));
wscli.commands.add('SetParams', 'Set current TimeSchema params.', SetInfo.bind(undefined, 'Params'));

// noinspection JSUnusedLocalSymbols
wscli.commands.add('GetTimeSchemasCount', 'Get TimeSchemas count.',
    function(arg){
        let row = db.querySync("SELECT TimeSchemasCount FROM TimeSchemasSettings")[0];
        // noinspection JSUnresolvedVariable
        wscli.sendClientData(`#TimeSchemaCount:${row.TimeSchemasCount}`);
        return true;
    });

function checkRangeTimeSchema(arg) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, 1,
        db.querySync("SELECT MaxTimeSchemasCount FROM TimeSchemasSettings")[0].MaxTimeSchemasCount,
        'TimeSchema');
}

wscli.commands.add('SetTimeSchemasCount', 'Set TimeSchemas count. Count as param.',
    function(arg){
        arg = 0 | arg;
        checkRangeTimeSchema(arg);
        db.querySync("UPDATE TimeSchemasSettings SET TimeSchemasCount = $TimeSchemasCount", {$TimeSchemasCount: arg});
        let row = db.querySync("SELECT TimeSchemasCount FROM TimeSchemasSettings")[0];
        /** @namespace row.TimeSchemasCount */
        wscli.sendData(`#TimeSchemaCount:${row.TimeSchemasCount}`);
        return true;
    });


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
                "MaxTimeSchemasCount": "INTEGER NOT NULL",
                "TimeSchemasCount": "INTEGER NOT NULL"
              },
              "data": [
                {"ID": 0, "TimeSchemasCount": 0, "MaxTimeSchemasCount": 8}
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
