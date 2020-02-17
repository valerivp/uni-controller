'use strict';

const db = require(`uc-db`);

module.exports.init = function () {
    db.init(getDbInitData())
};






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
                      {"Type": "regulator-thermo"}
                  ]
              },
              "RegulatorsThermoParams":{
                "RegulatorID": "INTEGER NOT NULL CONSTRAINT [RegulatorID] REFERENCES [Regulators]([RegulatorID]) ON DELETE CASCADE",
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [SchemaID] REFERENCES [TimeSchemas]([SchemaID]) ON DELETE SET NULL"
              }
           }
        }`;
}
