'use strict';

const db = require(`uc-db`);
const wscli = require(`uc-wscli`);

module.exports.init = function () {
    db.init(getDbInitData())
};

const REGULATOR_TYPE = 'thermo';

wscli.commands.add({SetParams: Object},
    function (arg) {
        if(wscli.context.current === wscli.context.regulator){
            let qp = {$ID: wscli.current.regulator, $Type: 'regulator-' + REGULATOR_TYPE};
            let row = db.querySync(`SELECT r.TypeID AS TypeID
                FROM Regulators AS r
                INNER JOIN RegulatorsTypes as rt
                    ON r.TypeID = rt.TypeID
                WHERE RegulatorID = $ID AND rt.Type = $Type`, qp)[0];
            if(row){
                let arrParamNames = [];
                if(arg.hasOwnProperty('timeSchema')){
                    qp.$TimeSchemaID = arg.timeSchema;
                    if(!db.querySync(`SELECT TimeSchemaID FROM TimeSchemas WHERE TimeSchemaID = $TimeSchemaID`, qp).length)
                        throw `TimeSchema not exist: ${arg.TimeSchema}`;
                    arrParamNames.push('TimeSchema');
                }
                if(arg.hasOwnProperty('sensor')) {
                    qp.$SensorID = arg.sensor;
                    //if (!db.querySync(`SELECT SensorID FROM Sensors WHERE SensorsID = $SensorsID`, qp).length)
                     //   throw `Sensor not exist: ${arg.Sensors}`;
                    arrParamNames.push('Sensor');
                }

                let q = `UPDATE RegulatorsThermoParams 
                    SET ${arrParamNames.map(item=>`${item}ID = $${item}ID`).join(', ')}
                    WHERE RegulatorID = $ID;
                        -- If no update happened (i.e. the row didn't exist) then insert one
                    INSERT INTO RegulatorsThermoParams (RegulatorID, ${arrParamNames.map(item=>`${item}ID`).join(', ')})
                        SELECT $ID, ${arrParamNames.map(item=>`$${item}ID`).join(', ')}
                    WHERE (Select Changes() = 0);`;
                db.querySync(q, qp);

                wscli.sendData(`#Regulator:${qp.$ID},Params:${getParams(qp.$ID)}`);
                return true;
            }
        }
    },
    'Set Regulator params.');


function getParams(RegulatorID) {
    let res = {};
    let qp = {$ID: RegulatorID};

    let row = db.querySync(`SELECT TimeSchemaID AS TimeSchema, SensorID AS Sensor FROM RegulatorsThermoParams WHERE RegulatorID = $ID`, qp)[0];
    if(!row)
        row ={TimeSchema: 0, Sensor: 0};

    res = wscli.data.toString(row);
    return res;
}

wscli.commands.add({GetParams: String},
    function (arg) {
        if(wscli.context.current === wscli.context.regulator){
            let qp = {$ID: wscli.current.regulator, $Type: 'regulator-' + REGULATOR_TYPE};
            db.querySync(`SELECT r.RegulatorID AS RegulatorID
                FROM Regulators AS r
                INNER JOIN RegulatorsTypes as rt
                    ON r.TypeID = rt.TypeID
                WHERE (RegulatorID = $ID OR $ID = 0) AND rt.Type = $Type`, qp).forEach(row =>
                    wscli.sendClientData(`#Regulator:${row.RegulatorID},Params:${getParams(row.RegulatorID)}`)
            );
            return true;
        }
    },
    'Get Regulator params.');





const update = {};
module.exports.update = update;
update['0.0.1'] = function(){
    return getDbInitData();
};


function getDbInitData() {
    return `
        {
           "main": {
              "RegulatorsTypes": {
                  "data": [
                      {"Type": "regulator-${REGULATOR_TYPE}"}
                  ]
              },
              "RegulatorsThermoParams":{
                "RegulatorID": "INTEGER NOT NULL CONSTRAINT [RegulatorID] REFERENCES [Regulators]([RegulatorID]) ON DELETE CASCADE",
                "TimeSchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([TimeSchemaID]) ON DELETE SET NULL",
                "SensorID": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              }
           }
        }`;
}
