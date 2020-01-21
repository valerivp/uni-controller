'use strict';

const basedir = require('path').dirname(process.mainModule.filename);

const utils = require(`${basedir}/uc-utils`);

module.exports = function (mod, bin) {
    let errors = '';
    const fs = require('fs');
    let dirname = require('path').dirname(mod.filename);
    var dirs = fs.readdirSync(dirname);
    let res = undefined;
    dirs.some(function(dir) {
            try {
                if (fs.statSync(`${dirname}/${dir}`).isDirectory()) {
                    res = require(`${dirname}/${dir}/${bin}.node`);
                    console.info(`Load ./${dir}/${bin}.node`);
                    return true;
                }
            } catch (err) {
                errors += `${err.message}\n`;
            }
        }
    );
    if(!res)
        throw new Error(`${bin}.node not loaded`);

    return res;

}