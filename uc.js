'use strict';

const path = require('path');
process.chdir(path.dirname(module.filename));

//console.warn(require.resolve.paths('ttt'));

require("uc-utils").init({log: true});
console.info('Initialization...');

const  mm = require('uc-mm-rt');

require('uc-datetime-to-db');

const router = require('uc-router');

const server = require('uc-server').init(router);

require('uc-wscli').init(server.ws);

require('uc-sensors');


mm.loadPlugins();


console.info("Started...");

