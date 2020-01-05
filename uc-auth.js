'use strict';

const db = require('./uc-db').init(getDbInitData());

const authentication = require('basic-authentication');

module.exports.get = function (requestPathname) {

    let row = db.querySync("SELECT User AS user, Password AS password FROM Authentication WHERE Password != ''")[0];
    if(row)
        return authentication(row);
};

Object.defineProperty(module.exports, 'User', {
    get: function() {
        return db.querySync('select User from authentication')[0].User;
    }
});

module.exports.set = function (user, password) {
    if(! user)
        throw('User name is empty');

    db.querySync("UPDATE Authentication SET User = $user, Password = $password", {$user: user, $password: password});

    return true;
};

function getDbInitData() {

    return `{
          "main": {
            "Authentication": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "User": "CHAR(32) NOT NULL",
                "Password": "CHAR(32) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              },
              "index": {
                "User": ["User"]
              },
              "data": [
                {"ID": 0, "User": "Admin"}
              ]
            }
          }
        }`;
}
