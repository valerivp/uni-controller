'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

//global.basedir = path.dirname(process.mainModule.filename);

const utils = module.exports;
module.exports.file = {};
module.exports.file.log = function(text){
    console.log(text);
    if(utils.file.logFile) {
        let tl = (new Date()).toFormatString('yyyymmddThhiiss');
        fs.appendFileSync(utils.file.logFile, `${tl}\t${text}\n`);
    }
};

module.exports.init = function (writeFileLog) {
    if(!utils.file.hasOwnProperty("logFile"))
        if(writeFileLog === undefined || writeFileLog === true){
            const processFile = path.parse(process.mainModule.filename);
            const logDir = `${processFile.dir}/logs`;
            if (!fs.existsSync(logDir))
                fs.mkdirSync(logDir);
            utils.file.logFile = `${logDir}/${processFile.name}.log`;
        }else
            utils.file.logFile = undefined;

    utils.exitHandlers.push(utils.defaultExitHandler);

    return module.exports;
};

module.exports.exitHandlers = [];
initExitHandler(exitHandler);



function byte(x){
    return x < 0 ? x + 256 : x;
}
module.exports.byte = byte;


module.exports.DateFromShotXMLString = function (ds){
    return new Date(ds.substr(0, 4), Number(ds.substr(4, 2)) - 1, ds.substr(6, 2), ds.substr(9, 2), ds.substr(11, 2), ds.substr(13, 2));
};


Number.prototype.toHex = function(len){
    return String('0000' + Number(this).toString(16)).slice(-len);
};
Number.prototype.toBin = function(len){
    return String('0000000000000000' + Number(this).toString(2)).slice(-len);
};


Array.prototype.toBin = function() {
    let res = '';
    this.forEach(function (entry) {
        res += Number(byte(entry)).toBin(8) + ' ';
    });

    return res;
};

Array.prototype.toHex = function() {
    let res = '';
    this.forEach(function (entry) {
        res += Number(byte(entry)).toHex(2) + ' ';
    });

    return res;
};

Date.prototype.toFormatString = function(format, utc) {
    if(format === undefined)
        return this.toString();
    else if(utc){
        let yyyy = this.getUTCFullYear().toString();
        format = format.replace(/yyyy/g, yyyy);
        let mm = (this.getUTCMonth() + 1).toString();
        format = format.replace(/mm/g, (mm[1] ? mm : "0" + mm[0]));
        let dd = this.getUTCDate().toString();
        format = format.replace(/dd/g, (dd[1] ? dd : "0" + dd[0]));
        let hh = this.getUTCHours().toString();
        format = format.replace(/hh/g, (hh[1] ? hh : "0" + hh[0]));
        let ii = this.getUTCMinutes().toString();
        format = format.replace(/ii/g, (ii[1] ? ii : "0" + ii[0]));
        let ss = this.getSeconds().toString();
        format = format.replace(/ss/g, (ss[1] ? ss : "0" + ss[0]));

    }else {
        let yyyy = this.getFullYear().toString();
        format = format.replace(/yyyy/g, yyyy);
        let mm = (this.getMonth() + 1).toString();
        format = format.replace(/mm/g, (mm[1] ? mm : "0" + mm[0]));
        let dd = this.getDate().toString();
        format = format.replace(/dd/g, (dd[1] ? dd : "0" + dd[0]));
        let hh = this.getHours().toString();
        format = format.replace(/hh/g, (hh[1] ? hh : "0" + hh[0]));
        let ii = this.getMinutes().toString();
        format = format.replace(/ii/g, (ii[1] ? ii : "0" + ii[0]));
        let ss = this.getSeconds().toString();
        format = format.replace(/ss/g, (ss[1] ? ss : "0" + ss[0]));
    }
    return format;
};



function exitHandler(options, exitCode) {
    for(let i = utils.exitHandlers.length - 1; i >= 0 ; i--){
        try{
            utils.exitHandlers[i](options, exitCode);
        }catch (err){
            utils.file.log(err);
        }
    }

/*    if(options.error)
        utils.file.log(options.error.message + '\n' + options.error.stack);

    if (exitCode || exitCode === 0)
        utils.file.log('Done. Exit code: ' + exitCode + '\n');
*/
    if (options.exit) process.exit();
}

module.exports.defaultExitHandler = function(options, exitCode) {
    if(options.error)
        utils.file.log(options.error.message + '\n' + options.error.stack);

    if (exitCode || exitCode === 0)
        utils.file.log('Done. Exit code: ' + exitCode + '\n');
};


function initExitHandler(exitHandler) {
//do something when app is closing
    process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {exit: true}));

// catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
    process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));

    process.on('unhandledRejection', (reason, p) => {
        exitHandler({reason: reason, exit: true})
    });
    process.on('uncaughtException', err => {
        exitHandler({error: err, exit: true})
    });
}

module.exports.spawnAnything = function (apps, cb, opt) {
    for(let key in apps){
        let child = child_process.spawn(key, apps[key], opt);
        child.on('error', (err) => {
            console.log(`Failed to start child process '${child.spawnargs.join(' ')}' (${err.message})`);
        });
        if(child.pid){
            child._stdout = '';
            child.stdout.on('data', (data) => {
                child._stdout += (data ? new Buffer(data,'utf-8') : '').toString();
            });
            child._stderr = '';
            child.stderr.on('data', (data) => {
                child._stderr += (data ? new Buffer(data,'utf-8') : '').toString();
            });

            child.on('close', (code) => {
                cb(child, child._stdout, child._stderr);
            });
            return child;
        }
    }
};
