'use strict';

const db = require(`uc-db`).init(getDbInitData());

doit();
setInterval(doit, 1000);

function doit() {
    let d = new Date();
    let qp = {};
    qp.$DateTimeUTC = Math.trunc(d.getTime() / 1000);
    qp.$DateTime = qp.$DateTimeUTC - d.getTimezoneOffset() * 60;
    qp.$Time = qp.$DateTime % (24*60*60);
    let m = Math.trunc(qp.$Time / 60);
    qp.$TimeHM = Math.trunc(m / 60) * 100 + Math.trunc(m % 60);
    qp.$Date = qp.$DateTime - qp.$Time;
    qp.$DOW = d.getDay();
    qp.$DOW = qp.$DOW ? qp.$DOW : 7;

    try {
        db.beginTransaction();
        db.querySync(`DELETE FROM mem.CurrentDateTime;
        INSERT INTO mem.CurrentDateTime(DateTimeUTC, DateTime, Date, Time, TimeHM, DOW) 
            VALUES($DateTimeUTC, $DateTime, $Date, $Time, $TimeHM, $DOW);`, qp);
        db.commitTransaction();
    }catch (err){
        if(db.isTransaction())
            db.rollbackTransaction();
        throw err;
    }
}

function getDbInitData() {

    return `{
          "mem":{
            "CurrentDateTime": {
              "schema": {
                "DateTimeUTC": "INTEGER NOT NULL",
                "DateTime": "INTEGER NOT NULL",
                "Date": "INTEGER NOT NULL",
                "Time": "INTEGER NOT NULL",
                "TimeHM": "INTEGER NOT NULL",
                "DOW": "INTEGER NOT NULL"
              }
            }
          }
        }`;
}
