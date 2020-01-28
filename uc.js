'use strict';

const path = require('path');
process.chdir(path.dirname(module.filename));

//console.warn(require.resolve.paths('ttt'));

require("uc-utils").init({log: true});
console.info('Initialization...');

require('uc-mm-rt').loadPlugins();

if(! Buffer.alloc) Buffer = require('safe-buffer').Buffer;

const router = require('uc-router');

const server = require('uc-server').init(router);

require('uc-wscli').init(server.ws);

require('uc-sensors');


console.info("Started...");

