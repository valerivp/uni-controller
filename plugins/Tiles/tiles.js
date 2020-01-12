'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);
const wscli = require(`${basedir}/uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData());

    // noinspection JSUnresolvedVariable
    let MaxTilesCount = db.querySync("SELECT MaxTilesCount FROM TilesSettings")[0].MaxTilesCount;
    db.querySync("DELETE FROM TilesParams WHERE ID > $MaxTilesCount", {$MaxTilesCount: MaxTilesCount});
    for(let i = 1; i <= MaxTilesCount; i++){
        db.querySync("INSERT OR IGNORE INTO TilesParams (ID) VALUES ($ID)", {$ID: i});
    }
};

wscli.context.add('tile');         /** @namespace wscli.context.tile */

wscli.commands.add({Tile: Number}, (arg)=>{
        wscli.context.current = wscli.context.tile;
        if( !arg || checkRangeTile(arg)) // noinspection CommaExpressionJS
            wscli.current.tile = arg;
        return true;
    },
    'Set current tile. Tile as param.'
);

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.tile){
        let res = false;
        // noinspection JSUnresolvedVariable
        let TilesCount = db.querySync("SELECT TilesCount FROM TilesSettings")[0].TilesCount;
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
wscli.commands.add({GetParams: null}, GetInfo.bind(undefined, 'Params'), 'Get tile params.');

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
wscli.commands.add({SetName: String}, SetInfo.bind(undefined, 'Name'), 'Set tile name.');
wscli.commands.add({SetType: String}, SetInfo.bind(undefined, 'Type'), 'Set tile type.');
wscli.commands.add({SetParams: String}, SetInfo.bind(undefined, 'Params'), 'Set tile params.');

// noinspection JSUnusedLocalSymbols
wscli.commands.add({GetTilesCount: null},(arg) =>{
        let row = db.querySync("SELECT TilesCount FROM TilesSettings")[0];
        // noinspection JSUnresolvedVariable
        wscli.sendClientData(`#TileCount:${row.TilesCount}`);
        return true;
    },
    'Get tiles count.'
);

function checkRangeTile(arg) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, 1,
        db.querySync("SELECT MaxTilesCount FROM TilesSettings")[0].MaxTilesCount,
        'Tile');
}

wscli.commands.add({SetTilesCount: Number}, (arg)=>{
        checkRangeTile(arg);
        db.querySync("UPDATE TilesSettings SET TilesCount = $TilesCount", {$TilesCount: arg});
        let row = db.querySync("SELECT TilesCount FROM TilesSettings")[0];
        /** @namespace row.TilesCount */
        wscli.sendData(`#TileCount:${row.TilesCount}`);
        return true;
    },
    'Set tiles count. Count as param.'
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
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "MaxTilesCount": "INTEGER NOT NULL",
                "TilesCount": "INTEGER NOT NULL"
              },
              "data": [
                {"ID": 0, "TilesCount": 1, "MaxTilesCount": 8}
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
