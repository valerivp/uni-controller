'use strict';

const db = require(`uc-db`);

const wscli = require('uc-wscli');

module.exports.init = function () {
    db.init(getDbInitData());
};

wscli.context.add('regulator');         /** @namespace wscli.context.timeSchema */

wscli.commands.add({Regulator: Number},
    function(arg){
        wscli.context.current = wscli.context.regulator;
        if(arg)
            checkRangeRegulator(arg); // noinspection CommaExpressionJS
        wscli.current.regulator = arg;
        return true;
    },
    'Set current Regulator.'
);

function checkRangeRegulator(arg) {
    // noinspection JSUnresolvedVariable
    return wscli.checkInRange(arg, 1,
        db.querySync("SELECT Count FROM RegulatorsSettings")[0].Count,
        'Regulator');
}
wscli.commands.add({GetCount: null},
    function(arg){
        if(wscli.context.current === wscli.context.regulator) {
            let row = db.querySync("SELECT Count FROM RegulatorsSettings")[0];
            // noinspection JSUnresolvedVariable
            wscli.sendClientData(`#Regulator,Count:${row.Count}`);
            return true;
        }
    },
    'Get Regulators count.'
);


wscli.commands.add({SetCount:Number},
    function(arg){
        if(wscli.context.current === wscli.context.regulator) {

            let row = db.querySync("SELECT MaxCount, Count FROM RegulatorsSettings")[0];
            wscli.checkInRange(arg, 0, row.MaxCount, 'Regulator')

            let count = row.Count;
            if(count >= arg){
                let q = `DELETE FROM Regulators WHERE RegulatorID > $RegulatorsCount;
                    UPDATE RegulatorsSettings SET Count = (SELECT COUNT(*) AS Count FROM Regulators);
                    SELECT Count FROM RegulatorsSettings;`;
                let row = db.querySync(q, {$RegulatorsCount: arg})[0];
                wscli.sendData(`#Regulator,Count:${row.Count}`);
            }else{
                let row = db.querySync(`SELECT Type, TypeID FROM RegulatorsTypes ORDER BY TypeID LIMIT 1`)[0];
                if(!row)
                    throw ("Types of time schemas not defined");
                let qp = {$TypeID: row.TypeID};
                let q = `INSERT
                        INTO Regulators (RegulatorID, TypeID)
                        VALUES ($RegulatorID, $TypeID);
                     UPDATE RegulatorsSettings SET Count = (SELECT COUNT(*) AS Count FROM Regulators);
                     SELECT Count, RegulatorID, Type
                        FROM RegulatorsSettings AS RegulatorsSettings, Regulators AS Regulators
                        LEFT JOIN RegulatorsTypes AS RegulatorsTypes
                            ON Regulators.TypeID = RegulatorsTypes.TypeID
                        WHERE Regulators.RegulatorID = $RegulatorID`;
                for(let i = count + 1; i <= arg; i++){
                    qp.$RegulatorID = i;
                    let row = db.querySync(q, qp)[0];
                    wscli.sendData(`#Regulator,Count:${row.Count}`);
                    wscli.sendData(`#Regulator:${row.RegulatorID},Type:${row.Type}`);
                }
            }
            return true;
        }
    },
    'Set Regulators count.'
);

// noinspection JSUnusedLocalSymbols
function GetInfo(info, arg) {
    if(wscli.context.current === wscli.context.regulator){
        let res = false;
        // noinspection JSUnresolvedVariable
        let q = `SELECT RegulatorID, Name, Type
            FROM Regulators AS Regulators 
            LEFT JOIN RegulatorsTypes AS RegulatorsTypes
                ON Regulators.TypeID = RegulatorsTypes.TypeID
            WHERE (RegulatorID = $RegulatorID OR ($RegulatorID = 0 AND RegulatorID <= (SELECT Count FROM RegulatorsSettings)))`;
        let rows = db.querySync(q, {$RegulatorID: wscli.current.regulator});
        rows.forEach(function (row) { // noinspection JSUnresolvedVariable
            let data = `#Regulator:${row.RegulatorID},${info}:${row[info]}`;
            wscli.sendClientData(data);
            res = true;
        });

        return true; //res || !wscli.current.timeRegulator;
    }
}

wscli.commands.add({GetName: null}, GetInfo.bind(undefined, 'Name'), 'Get Regulator name.');
wscli.commands.add({GetType: null}, GetInfo.bind(undefined, 'Type'), 'Get Regulator type.');


wscli.commands.add({SetName: String},
    function(arg) {
        if(wscli.context.current === wscli.context.regulator){
            checkRangeRegulator(wscli.current.regulator);
            let qp = {$RegulatorID: wscli.current.regulator};
            qp.$Name = arg;
            db.querySync(`UPDATE Regulators
                SET Name = $Name
            WHERE RegulatorID = $RegulatorID and Name != $Name`, qp);
            let row = db.querySync("SELECT RegulatorID, Name FROM Regulators WHERE RegulatorID = $RegulatorID", qp)[0];
            wscli.sendData(`#Regulator:${row.RegulatorID},Name:${row.Name}`);
            return true;
        }
    },
    'Set Regulator name.');

wscli.commands.add({SetType: String},
    function(arg) {
        if(wscli.context.current === wscli.context.regulator){
            checkRangeRegulator(wscli.current.regulator);
            let qp = {$RegulatorID: wscli.current.regulator};
            qp.$Type = arg;
            db.querySync(`UPDATE Regulators
                SET TypeID = (SELECT TypeID FROM RegulatorsTypes WHERE Type = $Type)
            WHERE RegulatorID = $RegulatorID`, qp);
            let row = db.querySync(`SELECT RegulatorID, Type
                FROM Regulators
                    LEFT JOIN RegulatorsTypes AS RegulatorsTypes
                        ON Regulators.TypeID = RegulatorsTypes.TypeID
                WHERE RegulatorID = $RegulatorID`, qp)[0];
            wscli.sendData(`#Regulator:${row.RegulatorID},Type:${row.Type}`);
            // noinspection JSConstructorReturnsPrimitive
            return true;
        }
    },
    'Set Regulator type.');




const update = {};
module.exports.update = update;
update['0.0.3'] = function(){
    db.querySync(`ALTER TABLE UpDownRegulatorSettings RENAME TO RegulatorSettings;
        ALTER TABLE UpDownRegulators RENAME TO Regulators`);
    return getDbInitData();
};
update['0.0.4'] = function(){
    db.querySync(`ALTER TABLE RegulatorSettings RENAME TO RegulatorsSettings;`);
    return getDbInitData();
};
update['0.0.5'] = function(){
    db.renameColumns(getDbInitData(), 'Regulators', {UpDownRegulatorID: 'RegulatorID'});
    return getDbInitData();
};
update['0.0.6'] = function(){
    return getDbInitData();
};
update['0.0.7'] = function(){
    db.querySync(`DROP INDEX IF EXISTS [TimeSchemas.SchemaIDTypeID];`);
    return getDbInitData();
};

function getDbInitData() {
    return `{
          "main": {
            "RegulatorsSettings": {
              "schema": {
                "MaxCount": "INTEGER NOT NULL",
                "Count": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              },
              "data": [
                {"RowID": 1, "MaxCount": 8, "Count": 0}
              ]
            },
            "RegulatorsTypes": {
              "schema": {
                "TypeID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "Type": "CHAR(32) NOT NULL"
              },
              "unique index": {
                "Type": ["Type"]
              }
            },
            "Regulators": {
              "schema": {
                "RegulatorID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [RegulatorsTypes]([TypeID]) ON DELETE SET NULL",
                "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            }
          }
        }`;
}
