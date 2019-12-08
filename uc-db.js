'use strict';

const sqlite = require("./node-sqlite/sqlite");

/** @namespace process.mainModule */
const file = 'uc.db';
const db = sqlite.openDatabaseSync(file);
db.querySync = querySync;
db.querySync("PRAGMA temp_store = MEMORY;");
//db.querySync("PRAGMA temp_store = FILE;");
db.querySync("ATTACH DATABASE ':memory:' AS mem;");
//db.querySync("ATTACH DATABASE './mem.db' AS mem;");

let transactionCount = 0;
db.beginTransaction = function(){
    if(!transactionCount++)
        db.query("BEGIN;");
};
db.commitTransaction = function(){
    if(!transactionCount)
        throw new Error("transaction not active");
    if(!--transactionCount)
        db.query("COMMIT;");
};
db.rollbackTransaction = function(){
    if(!transactionCount)
        throw new Error("transaction not active");
    db.query("ROLLBACK;");
    transactionCount = 0;
};
db.isTransaction = function(){
    return transactionCount > 0;
};


function querySync(query, par) {
    if(query.match(/^BEGIN|^COMMIT|^ROLLBACK/mi))
        throw new Error("do not use SQL transactions");

    let result = undefined;
    db.query(query, par, function (rows) {
        result = rows;
    });
    return result;
}

function checkTableSchema(schema, table, data){
    // проверим содержит ли описание схемы начальные данные
    let table_schema = undefined;
    let table_data = undefined;
    let table_index = undefined;
    for (let key in data){
        // noinspection JSUnfilteredForInLoop
        if(key === 'schema' && typeof(data[key]) === 'object')
            // noinspection JSUnfilteredForInLoop
            table_schema = data[key];
        else
            // noinspection JSUnfilteredForInLoop
            if(key === 'data' && typeof(data[key]) === 'object' && data[key] instanceof Array)
                // noinspection JSUnfilteredForInLoop
                table_data = data[key];
        else
            // noinspection JSUnfilteredForInLoop
            if(key === 'index' && typeof(data[key]) === 'object')
                // noinspection JSUnfilteredForInLoop
                table_index = data[key];
    }

    if(!table_schema)
        table_schema = data;

    let table_info = db.querySync(`PRAGMA ${schema}.table_info(${table})`);
    if(!table_info.length) { // таблица не существует
        let q = `CREATE TABLE ${schema}.${table} (\n`;
        for(let key in table_schema)
            // noinspection JSUnfilteredForInLoop
            q += `[${key}] ${table_schema[key]},\n`;

        q = q.slice(0, -2) + '\n)';
        db.querySync(q);

    }else{
        let columns = {};
        for(let i = 0; i < table_info.length; i++){
            let column = table_info[i];
            columns[column.name] = column.type;
        }
        let q = '';//ALTER TABLE employees ADD status VARCHAR;
        for(let key in table_schema)
            // noinspection JSUnfilteredForInLoop
            if(!columns[key])
                // noinspection JSUnfilteredForInLoop
                q += `ALTER TABLE ${schema}.${table} ADD [${key}] ${table_schema[key]};\n`;
        if(q)
            db.querySync(q);
    }

    if(table_index){
        for(let key in table_index) {
            // noinspection JSUnfilteredForInLoop
            let index_info = db.querySync(`PRAGMA ${schema}.index_info([${table}.${key}])`);
            if(!index_info.length){
                let columns = '';
                // noinspection JSUnfilteredForInLoop
                for(let i = 0; i < table_index[key].length; i++)
                    // noinspection JSUnfilteredForInLoop
                    columns += `, [${table_index[key][i]}]`;
                columns = columns.slice(2);
                // noinspection JSUnfilteredForInLoop
                let q = `CREATE UNIQUE INDEX ${schema}.[${table}.${key}] ON ${table} (${columns})`;
                db.querySync(q);
            }
        }
    }

    if(table_data){
        let q = '';
        for(let i = 0; i < table_data.length; i++){
            let columns = '';
            let values = '';
            let row = table_data[i];
            for(let key in row){
                // noinspection JSUnfilteredForInLoop
                columns += `[${key}], `;
                // noinspection JSUnfilteredForInLoop
                values += `"${row[key]}", `;
            }
            columns = columns.slice(0, -2);
            values = values.slice(0, -2);
            q += `INSERT OR IGNORE INTO ${schema}.${table} (${columns}) VALUES (${values}); \n`;
        }
        if(q)
            db.querySync(q);
    }


}

function checkSchemaSchema(schema, data){
    for (let key in data)
        // noinspection JSUnfilteredForInLoop
        checkTableSchema(schema, key, data[key]);
}

db.init = function(initData){
    const obj = JSON.parse(initData);
    try {
        db.beginTransaction();

        for (let key in obj) // noinspection JSUnfilteredForInLoop
            checkSchemaSchema(key, obj[key]);

        db.commitTransaction();
    }catch (err){
        if(db.isTransaction())
            db.rollbackTransaction();
        throw(err);
    }
    return module.exports;
};

module.exports = db;