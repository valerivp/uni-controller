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

let currentTile;

wscli.context.add('tile');         /** @namespace wscli.context.tile */


wscli.commands.add('Tile', 'Set current tile. Tile as param.',
    function(arg){
        let res = false;
        arg = 0 | arg;
        if(wscli.context.setCurrent(wscli.context.tile) && (!arg || checkRangeTile(arg))) // noinspection CommaExpressionJS
            currentTile = arg, res = true;
        return res;
    });

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.getCurrent() === wscli.context.tile){
        let res = false;
        // noinspection JSUnresolvedVariable
        let TilesCount = db.querySync("SELECT TilesCount FROM TilesSettings")[0].TilesCount;
        let q = `SELECT * FROM TilesParams WHERE (ID = $ID OR ($ID = 0 AND ID <= $TilesCount))`;
        let rows = db.querySync(q, {$ID: currentTile, $TilesCount: TilesCount});
        rows.forEach(function (row) { // noinspection JSUnresolvedVariable
            let data = `#Tile:${row.ID},${info}:${row[info]}`;
            wscli.sendClientData(data);
            res = true;
        });
        // noinspection JSConstructorReturnsPrimitive
        return res;
    }
}

wscli.commands.add('GetType', 'Get current tile type.', GetInfo.bind(undefined, 'Type'));
wscli.commands.add('GetParams', 'Get current tile params.', GetInfo.bind(undefined, 'Params'));

function SetInfo(info, arg) {
    if(wscli.context.getCurrent() === wscli.context.tile){
        let res = false;
        if(checkRangeTile(currentTile)){
            let qp = {$ID: currentTile};
            qp[`\$${info}`] = arg;
            db.querySync(`UPDATE TilesParams
                SET ${info} = \$${info}${(info === 'Type' ? ", Params = ''" : "")}
                WHERE ID = $ID and ${info} != \$${info}`, qp);
            let row = db.querySync("SELECT * FROM TilesParams WHERE ID = $ID", qp)[0];
            /** @namespace row.Component */
            let data = `#Tile:${row.ID},${info}:${row[info]}`;
            wscli.sendData(data);
            res = true;
        }
        // noinspection JSConstructorReturnsPrimitive
        return res;
    }

}
wscli.commands.add('SetName', 'Set current tile name.', SetInfo.bind(undefined, 'Name'));
wscli.commands.add('SetType', 'Set current tile type.', SetInfo.bind(undefined, 'Type'));
/*
    function(arg){
        if(wscli.context.getCurrent() === wscli.context.tile){
            let res = false;
            if(checkRangeTile(currentTileId)){
                let qp = {$ID: currentTileId, $Component: arg};
                db.querySync("UPDATE TilesParams SET Component = $Component, Params = '' WHERE ID = $ID and Component != $Component", qp);
                let row = db.querySync("SELECT ID, Component FROM TilesParams WHERE ID = $ID", qp)[0];
                let data = `#Tile:${row.ID},Type:${row.Component}`;
                wscli.sendData(data);
                res = true;
            }
            return res;
        }
    });
*/
wscli.commands.add('SetParams', 'Set current tile params.', SetInfo.bind(undefined, 'Params'));/*
    function(arg){
        if(wscli.context.getCurrent() === wscli.context.tile) {
            let res = false;
            if (checkRangeTile(currentTileId)) {
                let qp = {$ID: currentTileId, $Params: arg};
                db.querySync("UPDATE TilesParams SET Params = $Params WHERE ID = $ID", qp);
                let row = db.querySync("SELECT ID, Params FROM TilesParams WHERE ID = $ID", qp)[0];
                let data = `#Tile:${row.ID},Params:${row.Params}`;
                wscli.sendData(data);
                res = true;
            }
            return res;
        }
    });
*/
// noinspection JSUnusedLocalSymbols
wscli.commands.add('GetTilesCount', 'Get tiles count.',
    function(arg){
        let row = db.querySync("SELECT TilesCount FROM TilesSettings")[0];
        // noinspection JSUnresolvedVariable
        wscli.sendClientData(`#TileCount:${row.TilesCount}`);
        return true;
    });

function checkRangeTile(arg) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, 1,
        db.querySync("SELECT MaxTilesCount FROM TilesSettings")[0].MaxTilesCount,
        'Tile');
}

wscli.commands.add('SetTilesCount', 'Set tiles count. Count as param.',
    function(arg){
        let res = false;
        arg = 0 | arg;
        if(checkRangeTile(arg)){
//            let q = `UPDATE TilesSettings SET TilesCount = $TilesCount;
//                     SELECT TilesCount FROM TilesSettings`;
            db.querySync("UPDATE TilesSettings SET TilesCount = $TilesCount", {$TilesCount: arg});
            let row = db.querySync("SELECT TilesCount FROM TilesSettings")[0];
//            let row = db.querySync(q, {$TilesCount: arg})[0];
            //let row = db.querySync("SELECT TilesCount FROM TilesSettings")[0];
            // noinspection JSUnresolvedVariable
            wscli.sendData(`#TileCount:${row.TilesCount}`);
            res = true;
        }
        return res;
    });


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
