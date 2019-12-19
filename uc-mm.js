'use strict';

const fs = require('fs');
const path = require('path');
const utils = require("./uc-utils").init(false);
const db = require("./uc-db").init(getDbInitData());

const mm = module.exports;

if(process.mainModule.filename === module.filename){

    process.chdir(path.dirname(module.filename));

    const command = parseArg();
    let cc = 0;
    let exitCode = 0;
    for(let key in command)
        cc++;
    if(command.hasOwnProperty('help')){
        if(commands.help)
            exitCode = commands.help;
        cmdHelp();
    }else if(cc !== 1){
        exitCode = 2;
        cmdHelp();
    }else if(command.hasOwnProperty('update')){
        cmdUpdate(command.update);
    }else if(command.hasOwnProperty('remove')){
        cmdRemove(command.remove);
    }else if(command.hasOwnProperty('list')){
        cmdList();
    }

    process.exit(exitCode);
}

module.exports["web-plugins.js"] = "./www/uc-web-plugins.js";
module.exports["web-plugins.css"] = "./www/uc-plugins.css";

module.exports.init = function(){

    fs.writeFileSync(module.exports["web-plugins.js"], "'use strict';\n\n");
    fs.writeFileSync(module.exports["web-plugins.css"], "");

    let q = `SELECT DISTINCT p.ID, p.Name, p.Version AS Version, p.Directory FROM Plugins as p
        LEFT JOIN PluginsDependences as d
             ON p.ID = d.PluginID
        WHERE NOT p.ID IN (
            SELECT PluginID FROM mem.LoadedPlugins
            UNION
            SELECT DISTINCT d.PluginID FROM PluginsDependences as d
            LEFT JOIN mem.LoadedPlugins as lp
                 ON d.DependsOn = lp.PluginID
            WHERE lp.[PluginID] IS NULL
        )`;
    let rows = [];
    do{
        rows = db.querySync(q);
        rows.forEach(function (row) {
            utils.file.log(`Load plugin '${row.Name}'...`);


            /** @namespace row.Directory */
            const obj = JSON.parse(fs.readFileSync(row.Directory + '/package.json', 'utf8'));
            if(obj.node){
                /** @namespace obj.node */
                let plugin = require(row.Directory + '/' + obj.node);
                module.exports[row.Name] = plugin;
                if(plugin.hasOwnProperty('init')){
                    plugin.init();
                }
            }
            const about = `\n/* ${row.Name} v.${row.Version} */\n`;
            /** @namespace obj.web */
            /** @namespace obj.web.js */
            if(obj.web && obj.web.js)
                obj.web.js.forEach(function (file) {
                    fs.appendFileSync(module.exports["web-plugins.js"], about);
                    fs.appendFileSync(module.exports["web-plugins.js"], fs.readFileSync(row.Directory + '/' + file));
                });

            if(obj.web && obj.web.css)
                obj.web.css.forEach(function (file) {
                    fs.appendFileSync(module.exports["web-plugins.css"], about);
                    fs.appendFileSync(module.exports["web-plugins.css"], fs.readFileSync(row.Directory + '/' + file));
                });

            /** @namespace row.ID */
            db.querySync("INSERT INTO mem.LoadedPlugins (PluginID) VALUES ($PluginID)", {$PluginID: row.ID});
        });
    }while(rows.length);

    return module.exports;
};

function cmdList() {
    let q = "SELECT DISTINCT p.ID, p.Name, p.Version AS Version, p.Directory FROM Plugins as p";
    let rows = db.querySync(q);
    rows.forEach(function (row) {
        console.log(`${row.ID}\t${row.Name}\t${row.Version}\t${row.Directory}`);
    });
}

function cmdRemove(pluginName) {
    let rows = db.querySync("SELECT * FROM Plugins WHERE Name = $Name", {$Name: pluginName})
    if(rows.length){
        let pluginExistData = rows[0];
        try{
            db.beginTransaction();

            uninit(pluginExistData.UninstallInfo);

            db.querySync("DELETE FROM Plugins WHERE Name = $Name", {$Name: pluginName});

            db.commitTransaction();
            console.log(`Plugin '${pluginName}' removed.`);
        } catch (err){
            if(db.isTransaction())
                db.rollbackTransaction();
            throw(err);
        }
    }else
        console.log(`Plugin '${pluginName}' not installed.`);

}

function cmdUpdate(dirName) {
    //let dir = path.dirname(module.filename) + '/plugins/' + path.parse(dirName).base;
    let dir = `./plugins/${path.parse(dirName).base}`;

    const obj = JSON.parse(fs.readFileSync(`${dir}/package.json`, 'utf8'));

    let rows = db.querySync("SELECT * FROM Plugins WHERE Name = $Name", {$Name: obj.name});
    let pluginExistData = rows.length ? rows[0] : undefined;

    if(pluginExistData && pluginExistData.Version === obj.version) {
        console.log(`Plugin '${obj.name}' no need to update.`);
        return true;
    }

    let q = "CREATE TABLE mem.dependencies AS\nSELECT '' as Name WHERE 1 = 0\n";
    for(let d in obj["dependencies"]){
        q = q + `UNION\n
                 SELECT '${d}'\n`;
    }
    db.querySync(q);

    q = `SELECT d.Name FROM mem.dependencies as d
        LEFT JOIN Plugins as p
        ON d.Name = p.Name
        WHERE p.Name IS NULL`;
    rows = db.querySync(q);

    if(rows.length) {
        rows.forEach(function (row) {
            console.log(`Required plugin '${row.Name}' not installed.`);
        });
        return false;
    }

    try{
        db.beginTransaction();

        if(pluginExistData) {
            // удалим список зависимостей
            db.querySync("DELETE FROM PluginsDependences WHERE PluginID = $ID", {$ID: pluginData.ID});
            db.querySync("UPDATE Plugins SET Version = $Version, Directory = $Directory WHERE ID = $ID",
                {$ID: pluginData.ID, $Version: obj.version, $Directory: dir});
        }else{
            db.querySync("INSERT INTO Plugins (Name, Version, Directory) VALUES ($Name, $Version, $Directory)",
                {$Name: obj.name, $Version: obj.version, $Directory: dir});
        }
        let pluginData = db.querySync("SELECT ID FROM Plugins WHERE Name = $Name", {$Name: obj.name})[0];

        q = `INSERT INTO PluginsDependences (PluginID, DependsOn)
                SELECT $ID, p.ID FROM mem.dependencies as d
                LEFT JOIN Plugins as p
                ON d.Name = p.Name`;
        db.querySync(q, {$ID: pluginData.ID});


        let UninstallInfo = '';
        if(obj.node){
            const plugin = require(dir + '/' + obj.node);
            if(plugin.update)
                UninstallInfo = plugin.update(pluginExistData ? pluginExistData.Version : undefined,
                    pluginExistData ? pluginExistData.UninstallInfo : undefined);
        }
        db.querySync("UPDATE Plugins SET UninstallInfo = $UninstallInfo WHERE ID = $ID", {$ID: pluginData.ID, $UninstallInfo: UninstallInfo});


        db.commitTransaction();
        console.log(`Plugin '${obj.name}' was updated.`);
    }catch (err){
        if(db.isTransaction())
            db.rollbackTransaction();
        throw(err);

    }

}

function cmdHelp() {
    console.log(`Usage:\nnode ${path.basename(module.filename)} CMD [param]`);
    console.log("Commands:");
    for(let p in getArgumentsDescription()){
        let pd = getArgumentsDescription()[p];
        console.log(`\t-${pd[0]}, --${pd[2]}\t${pd[1]}`);
    }
}

function getDbInitData() {

    return `{
          "main": {
            "Plugins": {
              "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
              "Name": "CHAR(32) NOT NULL",
              "Version": "CHAR(16) NOT NULL ON CONFLICT REPLACE DEFAULT ''",
              "Directory": "CHAR(64) NOT NULL",
              "UninstallInfo": "TEXT"
            },
            "PluginsDependences": {
              "PluginID": "INTEGER NOT NULL CONSTRAINT [PluginID] REFERENCES [Plugins]([ID]) ON DELETE CASCADE",
              "DependsOn": "INTEGER NOT NULL CONSTRAINT [DependsOn] REFERENCES [Plugins]([ID]) ON DELETE SET NULL"
            }
          },
          "mem":{
            "LoadedPlugins": {
              "Order": "INTEGER PRIMARY KEY AUTOINCREMENT",
              "PluginID": "INTEGER NOT NULL CONSTRAINT [PluginID] REFERENCES [Plugins]([ID]) ON DELETE CASCADE"
            }
          }
        }`;
}

function getArgumentsDescription(){
    return {
        help: ['h', 'Show this help.', 'help', null],
        update: ['u', 'Update plugin. Directory name as param.', 'update'],
        remove: ['r', 'Remove plugin. Plugin name as param.', 'remove'],
        list: ['l', 'List installed plugin.', 'list', null]
    }
}


function parseArg(){
    const commands = {};

    const basename = path.basename(module.filename, '.js');
    let isAppArg = false;
    let currentParam = undefined;

    for(let a = 0; a < process.argv.length; a++){
        let arg = process.argv[a];
        if(basename === path.basename(arg, '.js')){
            isAppArg = true;
            continue;
        }else if(!isAppArg)
            continue;
//        console.log(arg);

        if(!currentParam){
            for(let p in getArgumentsDescription()){
                let ad = getArgumentsDescription()[p];
                if(arg === ('-' + ad[0]) || arg === ('--' + ad[2]) ){
                    currentParam = ad[2];
                    break;
                }
            }
            if(!currentParam) {
                commands.help = 1;
                console.log(`Argument '${arg}' unknown`);
            }else if(getArgumentsDescription()[currentParam][3] === null) {
                commands[currentParam] = undefined;
                currentParam = undefined;
            }
        }else{
            commands[currentParam] = arg;
            currentParam = undefined;
        }
    }

    return commands;

}

function uninitTable(table, data){
    if(data.schema || !data.data) {
        let table_schema = data.schema || data;
        let table_info = db.querySync(`PRAGMA table_info(${table})`);
        if (table_info.length) { // таблица существует
            // поместим удаляемые колонки в массив
            let columns = [];
            for (let cn in table_schema)
                columns.push(cn.toLowerCase());
            let diff = columns.length !== table_info.length;
            for (let i = 0; i < table_info.length && !diff; i++) {
                if (columns.indexOf(table_info[i].name.toLowerCase()) < 0)
                    diff = true;
            }
            if (diff)
                throw new Error('Table structure differs from expected');

            db.querySync(`DROP TABLE ${table}`);
        }
    }
}


module.exports.uninit = uninit;
function uninit(uninitData){
    const data = JSON.parse(uninitData);
    if(data.main) {
        try {
            db.beginTransaction();

            for (let table in data.main)
                uninitTable(table, data.main[table]);

            db.commitTransaction();

        } catch (err) {
            if (db.isTransaction())
                db.rollbackTransaction();
            throw(err);
        }
    }

}
