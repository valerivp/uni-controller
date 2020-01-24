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
