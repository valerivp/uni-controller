'use strict';

const db = require(`uc-db`).init(getDbInitData());


function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasTypes": {
              "data": [
                {"Type": "temperature"}
              ]
            },
            "TimeSchemasTypeOptions": {
              "data": [
                {"Type": "temperature", "Option": "MinValue", "Value": 50},
                {"Type": "temperature", "Option": "MaxValue", "Value": 350},
                {"Type": "temperature", "Option": "ValueType", "Value": "Number"}
              ]
            }
          }
        }`;
}
