'use strict';

const db = require(`uc-db`).init(getDbInitData());



function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasTypes": {
              "data": [
                {"Type": "humidity"}
              ]
            },
            "TimeSchemasTypeOptions": {
              "data": [
                {"Type": "humidity", "Option": "MinValue", "Value": 0},
                {"Type": "humidity", "Option": "MaxValue", "Value": 99},
                {"Type": "humidity", "Option": "ValueType", "Value": "Number"}
              ]
            }
          }
        }`;
}
