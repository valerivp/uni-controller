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
          "main": {
            "ListDOW": {
              "schema": {
                "DOW": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "mask": "INTEGER NOT NULL"
              },
              "data": [
                {"DOW": 0, "mask": 128},
                {"DOW": 1, "mask": 1},
                {"DOW": 2, "mask": 2},
                {"DOW": 3, "mask": 4},
                {"DOW": 4, "mask": 8},
                {"DOW": 5, "mask": 16},
                {"DOW": 6, "mask": 32},
                {"DOW": 7, "mask": 64}
              ]
            }          
          },
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
          },
          "temp": {
            "CurrentDOW":{
                "view": "SELECT cdt.DOW AS CurrentDOW, dow.DOW, mask,
                   1 + cdt.DOW  - dow.DOW + CASE WHEN dow.DOW = 0 THEN NULL WHEN dow.DOW > cdt.DOW THEN 7 ELSE 0 END AS PrevDOW_asc,     
                   dow.DOW - cdt.DOW + 7 - CASE WHEN dow.DOW = 0 THEN NULL WHEN dow.DOW > cdt.DOW THEN 7 ELSE 0 END AS PrevDOW_desc     
                FROM mem.[CurrentDateTime] AS cdt, main.ListDOW AS dow"
            }
          }
        }`;
}
