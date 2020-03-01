'use strict';

const db = require(`uc-db`);
const wscli = require(`uc-wscli`);

const REGULATOR_TYPE = 'thermo';

module.exports.init = function () {
    db.init(getDbInitData())
    db.querySync(getQueryForUpdateTimeSchemasInUse());
};

function getQueryForUpdateTimeSchemasInUse() {
    return `DELETE FROM TimeSchemasInUse WHERE OwnerKey = 'regulator-${REGULATOR_TYPE}';
        INSERT INTO TimeSchemasInUse(TimeSchemaID, OwnerKey)
            SELECT DISTINCT [TimeSchemaID], 'regulator-${REGULATOR_TYPE}' FROM [main].[Regulators${REGULATOR_TYPE.toPascal()}Params];`

}


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
                let names = [], params = [], keys = [];
                for(let key in arg){
                    keys.push(key);
                    let keylc = key.toLowerCase();
                    if(keylc === 'timeschema'){
                        qp.$TimeSchemaID = arg[key], names.push('TimeSchemaID'), params.push('$TimeSchemaID');
                    }else if(keylc === 'sensor') {
                        qp.$SensorID = arg[key], names.push('SensorID'), params.push('$SensorID');
                    }else if(keylc === 'temperaturedeviation') {
                        qp.$TemperatureDeviation = Number(arg[key]), names.push('TemperatureDeviation'), params.push('min(max($TemperatureDeviation, -MaxTemperatureDeviation), MaxTemperatureDeviation)');
                    }else if(keylc === 'temperaturetolerance') {
                        qp.$TemperatureTolerance = Number(arg[key]), names.push('TemperatureTolerance'), params.push('min(max($TemperatureTolerance, 0), MaxTemperatureTolerance)');
                    }
                }

                let q = `UPDATE RegulatorsThermoParams 
                    SET (${names.join(', ')}) = (SELECT ${params.join(', ')} FROM Regulators${REGULATOR_TYPE.toPascal()}Settings )
                    WHERE RegulatorID = $ID;
                        -- If no update happened (i.e. the row didn't exist) then insert one
                    INSERT INTO RegulatorsThermoParams (RegulatorID, ${names.join(', ')})
                        SELECT $ID, ${params.join(', ')} FROM Regulators${REGULATOR_TYPE.toPascal()}Settings
                    WHERE (Select Changes() = 0);
                    ${getQueryForUpdateTimeSchemasInUse()}
                    SELECT ${names.map((item, ind) => `${item} AS ${keys[ind]}`)} FROM Regulators${REGULATOR_TYPE.toPascal()}Params WHERE RegulatorID = $ID`;
                row = db.querySync(q, qp)[0];

                wscli.sendData(`#Regulator:${qp.$ID},Params:${wscli.data.toString(row)}`);
                return true;
            }
        }
    },
    'Set Regulator params.');


function getParams(RegulatorID) {
    let res = {};
    let qp = {$ID: RegulatorID};

    let row = db.querySync(`
        INSERT OR IGNORE INTO RegulatorsThermoParams (RegulatorID, TimeSchemaID)
                        SELECT $ID, TimeSchemaID FROM TimeSchemas ts
                            INNER JOIN TimeSchemasTypes as tst ON ts.TypeID = tst.TypeID 
                        WHERE tst.Type = 'temperature'
                        ORDER BY TimeSchemaID LIMIT 1;    
        ${getQueryForUpdateTimeSchemasInUse()}
        SELECT
            TimeSchemaID AS TimeSchema, SensorID AS Sensor, TemperatureDeviation, TemperatureTolerance
            FROM RegulatorsThermoParams WHERE RegulatorID = $ID`, qp)[0];

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
update['0.0.7'] = function(){
    return getDbInitData();
};


function getDbInitData() {
    return `
        {
           "main": {
              "Regulators${REGULATOR_TYPE.toPascal()}Settings":{
                  "schema":{
                    "MaxTemperatureDeviation": "INTEGER NOT NULL",
                    "MaxTemperatureTolerance": "INTEGER NOT NULL"
                  },
                  "data":[
                        {"RowID": 1, "MaxTemperatureDeviation": 50, "MaxTemperatureTolerance": 50}
                    ]
              },
              "RegulatorsTypes": {
                  "data": [
                      {"Type": "regulator-${REGULATOR_TYPE}"}
                  ]
              },
              "RegulatorsThermoParams":{
                "RegulatorID": "INTEGER NOT NULL PRIMARY KEY CONSTRAINT [RegulatorID] REFERENCES [Regulators]([RegulatorID]) ON DELETE CASCADE",
                "TimeSchemaID": "INTEGER NOT NULL CONSTRAINT [TimeSchemaID] REFERENCES [TimeSchemas]([TimeSchemaID]) ON DELETE SET NULL",
                "SensorID": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0",
                "TemperatureDeviation": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0",
                "TemperatureTolerance": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 5"
              }
           },
           "mem":{
                "RegulatorsThermoState": {
                    "RegulatorID": "INTEGER NOT NULL PRIMARY KEY CONSTRAINT [RegulatorID] REFERENCES [RegulatorsThermoParams]([RegulatorID]) ON DELETE CASCADE",
                    "TimeSchemaID": "INTEGER NOT NULL",
                    "TargetTemperature": "INTEGER NOT NULL",
                    "CurrentTemperature": "INTEGER NOT NULL",
                    "State": "INTEGER NOT NULL"
                }
           }
        }`;
}

/*
,
           "temp":{
             "FillTimeSchemasInUseByRegulators${REGULATOR_TYPE.toPascal()}_update":{
                "trigger": "AFTER UPDATE OF [TimeSchemaID]
                    ON [main].[Regulators${REGULATOR_TYPE.toPascal()}Params]
                    BEGIN
                    DELETE FROM TimeSchemasInUse WHERE OwnerKey = 'regulator-${REGULATOR_TYPE}';
                    INSERT INTO TimeSchemasInUse(TimeSchemaID, OwnerKey)
                        SELECT DISTINCT [TimeSchemaID], 'regulator-${REGULATOR_TYPE}' FROM [main].[Regulators${REGULATOR_TYPE.toPascal()}Params];
                    END"
             },
             "FillTimeSchemasInUseByRegulators${REGULATOR_TYPE.toPascal()}_insert":{
                "trigger": "AFTER INSERT
                    ON [main].[Regulators${REGULATOR_TYPE.toPascal()}Params]
                    BEGIN
                    DELETE FROM TimeSchemasInUse WHERE OwnerKey = 'regulator-${REGULATOR_TYPE}';
                    INSERT INTO TimeSchemasInUse(TimeSchemaID, OwnerKey)
                        SELECT DISTINCT [TimeSchemaID], 'regulator-${REGULATOR_TYPE}' FROM [main].[Regulators${REGULATOR_TYPE.toPascal()}Params];
                    END"
             },
             "FillTimeSchemasInUseByRegulators${REGULATOR_TYPE.toPascal()}_delete":{
                "trigger": "AFTER DELETE
                    ON [main].[Regulators${REGULATOR_TYPE.toPascal()}Params]
                    BEGIN
                    DELETE FROM TimeSchemasInUse WHERE OwnerKey = 'regulator-${REGULATOR_TYPE}';
                    INSERT INTO TimeSchemasInUse(TimeSchemaID, OwnerKey)
                        SELECT DISTINCT [TimeSchemaID], 'regulator-${REGULATOR_TYPE}' FROM [main].[Regulators${REGULATOR_TYPE.toPascal()}Params];
                    END"
             },
             "FillTimeSchemasInUseByRegulators${REGULATOR_TYPE.toPascal()}":{
                "query": "DELETE FROM TimeSchemasInUse WHERE OwnerKey = 'regulator-${REGULATOR_TYPE}';
                    INSERT INTO TimeSchemasInUse(TimeSchemaID, OwnerKey)
                        SELECT DISTINCT [TimeSchemaID], 'regulator-${REGULATOR_TYPE}' FROM [main].[Regulators${REGULATOR_TYPE.toPascal()}Params];"
             }


           }

* */