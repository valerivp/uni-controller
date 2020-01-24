'use strict';

const basedir = require('path').dirname(process.mainModule.filename);
const db = require(`${basedir}/uc-db`);

module.exports.init = function () {
    db.init(getDbInitData());
};



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
