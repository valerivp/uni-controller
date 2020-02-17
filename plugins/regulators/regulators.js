'use strict';

const db = require(`uc-db`);
const utils = require('uc-utils');

const wscli = require('uc-wscli');
const template = require('uc-tmpl-plugin-settings');


Object.assign(module, new template('Regulator', 'Regulators', {maxCount:8, name:true}));

module.exports.init = function () {
     db.init(module.getDbInitData(getDbInitData()));
};

function getDbInitData() {
    return `{
          "main": {
          },
          "mem": {
          }
        }`;

}
