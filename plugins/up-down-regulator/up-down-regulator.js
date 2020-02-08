'use strict';

const db = require(`uc-db`).init(getDbInitData());


function getDbInitData() {
    return `{
          "main": {
            "UpDownRegulatorSettings": {
              "schema": {
                "MaxCount": "INTEGER NOT NULL",
                "Count": "INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0"
              },
              "data": [
                {"RowID": 1, "MaxCount": 8, "Count": 0}
              ]
            },
            "UpDownRegulators": {
              "schema": {
                "UpDownRegulatorID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "SchemaID": "INTEGER NOT NULL CONSTRAINT [SchemaID] REFERENCES [TimeSchemas]([SchemaID]) ON DELETE NO ACTION",
                "TypeID": "INTEGER NOT NULL CONSTRAINT [TypeID] REFERENCES [TimeSchemasTypes]([TypeID]) ON DELETE CASCADE",
                "Name": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              }
            }
          }
        }`;
}
