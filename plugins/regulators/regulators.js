'use strict';

const db = require(`uc-db`);

const wscli = require('uc-wscli');
const template = require('uc-tmpl-plugin-settings');


Object.assign(module, new template('Regulator', 'Regulators', {maxCount:8, name:true}));

module.exports.init = function () {
     db.init(getDbInitData());
};

const update = {};
module.exports.update = update;
update['0.0.1'] = function(){
    return getDbInitData();
};


function getDbInitData() {
    return module.getDbInitData(`{
          "main": {
          },
          "mem": {
          }
        }`);

}
