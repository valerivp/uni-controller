'use strict';

const path = require('path');
process.chdir(path.dirname(module.filename));

const utils = require("./uc-utils").init();
console.info('Initialization...');

if(! Buffer.alloc) Buffer = require('safe-buffer').Buffer;

const router = require('./uc-router');
module.exports.router = router;

const server = require('./uc-server').init(8080, router);

const wscli = require('./uc-wscli').init(server.ws);

const sensors = require('./uc-sensors');

const mm = require('./uc-mm').init();




console.info("Started...");

