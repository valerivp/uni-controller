'use strict';

const basedir = require('path').dirname(process.mainModule.filename);

const utils = require(`${basedir}/uc-utils`);

module.exports = function (mod, bin) {
    const fs = require('fs');
    let dirname = require('path').dirname(mod.filename);
    var dirs = fs.readdirSync(dirname);
    let res = undefined;
    dirs.some(function(dir) {
            try {
                if (fs.statSync(`${dirname}/${dir}`).isDirectory()) {
                    utils.file.log(`Try load ./${dir}/${bin}.node...`);
                    res = require(`${dirname}/${dir}/${bin}.node`);
                    utils.file.log('...module load successfully.');
                    return true;
                }
            } catch (err) {
                utils.file.log(err.message);
            }
        }
    );
    if(!res)
        throw new Error(`${bin}.node not loaded`);

    return res;

}