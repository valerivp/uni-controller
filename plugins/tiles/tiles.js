'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());

    // noinspection JSUnresolvedVariable
    let MaxTilesCount = db.querySync("SELECT MaxCount FROM TilesSettings")[0].MaxCount;
    db.querySync("DELETE FROM TilesParams WHERE ID > $MaxTilesCount", {$MaxTilesCount: MaxTilesCount});
    for(let i = 1; i <= MaxTilesCount; i++){
        db.querySync("INSERT OR IGNORE INTO TilesParams (ID) VALUES ($ID)", {$ID: i});
    }
};

wscli.context.add('tile');         /** @namespace wscli.context.tile */

wscli.commands.add({Tile: Number}, (arg)=>{
        wscli.context.current = wscli.context.tile;
        checkRangeTile(arg, true);
        wscli.current.tile = arg;
        return true;
    },
    'Set current tile.'
);

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.tile){
        checkRangeTile(wscli.current.tile, true);
        let res = false;
        // noinspection JSUnresolvedVariable
        let TilesCount = db.querySync("SELECT Count FROM TilesSettings")[0].Count;
        let q = `SELECT * FROM TilesParams WHERE (ID = $ID OR ($ID = 0 AND ID <= $TilesCount))`;
        let rows = db.querySync(q, {$ID: wscli.current.tile, $TilesCount: TilesCount});
        rows.forEach(function (row) { // noinspection JSUnresolvedVariable
            let data = `#Tile:${row.ID},${info}:${row[info]}`;
            wscli.sendClientData(data);
            res = true;
        });
        // noinspection JSConstructorReturnsPrimitive
        if(!res)
            throw ('No data');
        return res;
    }
}

wscli.commands.add({GetType: null}, GetInfo.bind(undefined, 'Type'), 'Get tile type.');
wscli.commands.add({GetParams: String}, GetInfo.bind(undefined, 'Params'), 'Get tile params.');

function SetInfo(info, arg) {
    if(wscli.context.current === wscli.context.tile){
        checkRangeTile(wscli.current.tile);
        let qp = {$ID: wscli.current.tile};
        qp[`\$${info}`] = arg;
        db.querySync(`UPDATE TilesParams
            SET ${info} = \$${info}${(info === 'Type' ? ", Params = ''" : "")}
            WHERE ID = $ID and ${info} != \$${info}`, qp); // проверка на изменение типа чтобы параметры не затереть
        let row = db.querySync("SELECT * FROM TilesParams WHERE ID = $ID", qp)[0];
        wscli.sendData(`#Tile:${row.ID},${info}:${row[info]}`);
        // noinspection JSConstructorReturnsPrimitive
        return true;
    }

}
//wscli.commands.add({SetName: String}, SetInfo.bind(undefined, 'Name'), 'Set tile name.');
wscli.commands.add({SetType: String}, SetInfo.bind(undefined, 'Type'), 'Set tile type.');
wscli.commands.add({SetParams: String}, SetInfo.bind(undefined, 'Params'), 'Set tile params.');

// noinspection JSUnusedLocalSymbols
wscli.commands.add({GetCount: null},(arg) => {
        if (wscli.context.current === wscli.context.tile) {
            wscli.checkInRange(wscli.current.tile, 0, 0, 'Tile');
            let row = db.querySync("SELECT Count FROM TilesSettings")[0];
            // noinspection JSUnresolvedVariable
            wscli.sendClientData(`#Tile,Count:${row.Count}`);
            return true;
        }
    },
    'Get tiles count.'
);

function checkRangeTile(arg, allowZero) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, allowZero ? 0 : 1,
        db.querySync("SELECT MaxCount FROM TilesSettings")[0].MaxCount, 'Tile');
}

wscli.commands.add({SetCount: Number}, (arg)=>{
        if (wscli.context.current === wscli.context.tile) {
            wscli.checkInRange(wscli.current.tile, 0, 0, 'Tile');
            checkRangeTile(arg);
            db.querySync("UPDATE TilesSettings SET Count = $TilesCount", {$TilesCount: arg});
            let row = db.querySync("SELECT Count FROM TilesSettings")[0];
            /** @namespace row.Count */
            wscli.sendData(`#Tile,Count:${row.Count}`);
            return true;
        }
    },
    'Set tiles count.'
);


// noinspection JSUnusedLocalSymbols
module.exports.update = function(prevVer){
    return getDbInitData();
};


function getDbInitData() {

    return `{
          "main": {
            "TilesSettings": {
              "schema": {
                "MaxCount": "INTEGER NOT NULL",
                "Count": "INTEGER NOT NULL"
              },
              "data": [
                {"RowID": 1, "Count": 1, "MaxCount": 8}
              ]
            },
            "TilesParams": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "Type": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''",
                "Params": "TEXT NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            }
          }
        }`;
}
