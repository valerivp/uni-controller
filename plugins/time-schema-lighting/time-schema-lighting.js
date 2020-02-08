'use strict';

const db = require(`uc-db`).init(getDbInitData());



function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasTypes": {
              "data": [
                {"Type": "lighting"}
              ]
            },
            "TimeSchemasTypeOptions": {
              "data": [
                {"Type": "humidity", "Option": "MinValue", "Value": 0},
                {"Type": "humidity", "Option": "MaxValue", "Value": 100},
                {"Type": "humidity", "Option": "ValueType", "Value": "Number"}
              ]
            }
          }
        }`;
}
