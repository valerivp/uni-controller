'use strict';

const path = require('path');
process.chdir(path.dirname(module.filename));
const fs = require('fs');

const utils = require("uc-utils").initLog({log: false});
const db = require("uc-db");
const mm = require("uc-mm-rt");


if(process.mainModule.filename === module.filename){

    process.chdir(path.dirname(module.filename));

    const command = parseArg();
    let cc = 0;
    let exitCode = 0;
    for(let key in command)
        cc++;

    for(let key in command) {
        if (!cc || key === 'help') {
            if (command.help)
                exitCode = command.help;
            else if (!cc)
                exitCode = 2;
            cmdHelp();
        }
        if (key === 'list')
            cmdList();

        if (key === 'update')
            command.update.forEach(item => cmdUpdate(item));

        if (key === 'remove')
            command.remove.forEach(item => cmdRemove(item));
    }


    process.exit(exitCode);
}


function cmdList() {
    let q = "SELECT DISTINCT p.Name, p.Version AS Version, p.Directory FROM Plugins as p";
    let rows = db.querySync(q);
    rows.forEach(function (row) {
        console.log(`${row.Name}\t${row.Version}\t${row.Directory}`);
    });
    if(!rows.length)
        console.log(`Plugins not installed.`);

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
        console.error(`Plugin '${pluginName}' not installed.`);

}
function updatePlugin(dir) {
    const obj = JSON.parse(fs.readFileSync(`${dir}/package.json`, 'utf8'));

    let rows = db.querySync("SELECT * FROM Plugins WHERE Name = $Name", {$Name: obj.name});
    let pluginExistData = rows.length ? rows[0] : undefined;

    if(pluginExistData && pluginExistData.Version === obj.version) {
        console.warn(`Plugin '${obj.name}' no need to update.`);
        return true;
    }

    let q = "CREATE TABLE mem.dependencies AS\nSELECT '' as Name WHERE 1 = 0\n";
    for(let d in obj["plugins-dependencies"]){
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
        console.error(`Plugin ${dir} not updated.`);
        rows.forEach(function (row) {
            console.error(` Required plugin '${row.Name}' not installed.`);
        });
        db.querySync("DROP TABLE mem.dependencies");
        return false;
    }


    if(pluginExistData) {
        // удалим список зависимостей
        db.querySync("DELETE FROM PluginsDependences WHERE Plugin = $Name", {$Name: pluginData.Name});
        db.querySync("UPDATE Plugins SET Version = $Version, Directory = $Directory WHERE Name = $Name",
            {$Name: pluginData.Name, $Version: obj.version, $Directory: dir});
    }else{
        db.querySync("INSERT INTO Plugins (Name, Version, Directory) VALUES ($Name, $Version, $Directory)",
            {$Name: obj.name, $Version: obj.version, $Directory: dir});
    }
    let pluginData = db.querySync("SELECT Name FROM Plugins WHERE Name = $Name", {$Name: obj.name})[0];

    q = `INSERT INTO PluginsDependences (Plugin, DependsOn)
                    SELECT $Name, p.Name FROM mem.dependencies as d
                    LEFT JOIN Plugins as p
                    ON d.Name = p.Name`;
    db.querySync(q, {$Name: pluginData.Name});


    let UninstallInfo = '';
    if(obj.node){
        const plugin = require(dir + '/' + obj.node);
        if(plugin.update)
            UninstallInfo = plugin.update(pluginExistData ? pluginExistData.Version : undefined,
                pluginExistData ? pluginExistData.UninstallInfo : undefined);
    }
    db.querySync("UPDATE Plugins SET UninstallInfo = $UninstallInfo WHERE Name = $Name", {$Name: pluginData.Name, $UninstallInfo: UninstallInfo});
    db.querySync("DROP TABLE mem.dependencies");

    console.log(`Plugin '${obj.name}' was updated.`);

}

function cmdUpdate(dirName) {
    let dir = `./plugins/${path.parse(dirName).base}`;

    let mask = path.parse(dirName).base
        .replaceAll('.', '\\.')
        .replaceAll('$', '\\$')
        .replaceAll('*', '.*');
    mask = `^${mask}$`;

    let found = false;

    fs.readdirSync('./plugins').forEach((dir)=>{
        if (fs.statSync(`./plugins/${dir}`).isDirectory() && dir.match(mask) ) {
            found = true;
            dir = `./plugins/${path.parse(dir).base}`;
            try{
                db.beginTransaction();
                updatePlugin(dir);
                db.commitTransaction();
            }catch (err){
                if(db.isTransaction())
                    db.rollbackTransaction();
                throw(err);
            }
        }
    });
    if(!found)
        console.error(`Plugin directory '${dir}' not found.`)
}

function cmdHelp() {
    console.log(`Usage:\nnode ${path.basename(module.filename)} CMD [param]`);
    console.log("Commands:");
    for(let p in getArgumentsDescription()){
        let pd = getArgumentsDescription()[p];
        console.log(`\t-${pd[0]}, --${pd[2]}\t${pd[1]}`);
    }
}

function getArgumentsDescription(){
    return {
        help: ['h', 'Show this help.', 'help'],
        update: ['u', 'Update plugin. Directory name/mask as param.', 'update', true],
        remove: ['r', 'Remove plugin. Plugin name as param.', 'remove', true],
        list: ['l', 'List installed plugin.', 'list']
    }
}


function parseArg(){
    const commands = {};

    const basename = path.basename(module.filename, '.js');
    let isAppArg = false;
    let currentParam, lastParam;

nextArg:
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
                    if(ad[3])
                        currentParam = ad[2];
                    else
                        commands[ad[2]] = undefined;
                    continue nextArg;
                }
            }
            if(!currentParam) {
                if(lastParam){
                    commands[lastParam].push(arg);
                }else{
                    commands.help = 1;
                    console.error(`Argument '${arg}' unknown`);
                }
            }else if(getArgumentsDescription()[currentParam][3] === null) {
                commands[currentParam] = undefined;
                currentParam = undefined;
                lastParam = currentParam;
            }
        }else{
            if(commands[currentParam] === undefined)
                commands[currentParam] = [];
            commands[currentParam].push(arg);
            lastParam = currentParam;
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
                throw('Table structure differs from expected');

            db.querySync(`DROP TABLE ${table}`);
        }
    }
}


function uninit(uninitData){
    if(!uninitData)
        return
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
