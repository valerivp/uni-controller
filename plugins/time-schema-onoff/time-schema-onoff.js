'use strict';

const db = require(`uc-db`).init(getDbInitData());


function getDbInitData() {

    return `{
          "main": {
            "TimeSchemasTypes": {
              "data": [
                {"Type": "onoff"}
              ]
            },
            "TimeSchemasTypeOptions": {
              "data": [
                {"Type": "humidity", "Option": "ValueType", "Value": "Boolean"}
              ]
            }
          }
        }`;
}
