'use strict';

const wire = require('wire-i2c');
const utils = require(`uc-utils`);
const crc = require(`uc-crc`);

const DS2482s = require('ds2482');

const sensors = require(`uc-sensors`);
const db = require(`uc-db`).init(getDbInitData());


let address;

module.exports.init = function () {
    let settings = db.querySync(`SELECT * FROM DS2482SensorsReceiverSettings`)[0];
    address = settings.Address;

    setInterval(readSensorsData, settings.Interval);
};

function receiveData(wire) {
    let $this = receiveData;
    const SensorsTypes = { // Model IDs
        DS18S20MODEL: 0x10,  // also DS1820
        DS18B20MODEL: 0x28,
        DS1822MODEL : 0x22,
        DS1825MODEL : 0x3B
    };
    const OneWireCommands = { // OneWire commands
        STARTCONVO     : 0x44,  // Tells device to take a temperature reading and put it on the scratchpad
        COPYSCRATCH    : 0x48,  // Copy EEPROM
        READSCRATCH    : 0xBE,  // Read EEPROM
        WRITESCRATCH   : 0x4E,  // Write to EEPROM
        RECALLSCRATCH  : 0xB8,  // Reload from last known
        READPOWERSUPPLY: 0xB4,  // Determine if device needs parasite power
        ALARMSEARCH    : 0xEC  // Query bus for devices with an alarm condition
    };

    let bridge_DS2482s = new DS2482s(wire);

    if(!$this.searchStarted){
        $this.searchStarted = true;
        bridge_DS2482s.resetSearch();
        $this.searchState = bridge_DS2482s.getSearchState();
        bridge_DS2482s.skipROM();
        bridge_DS2482s.wireWriteByte(OneWireCommands.STARTCONVO);        // start conversion, with parasite power on at the end
        return true;
    }
    bridge_DS2482s.setSearchState($this.searchState);

    let sensorROM = bridge_DS2482s.wireSearchNext();
    if(sensorROM){
        $this.searchState = bridge_DS2482s.getSearchState();
        // проверим crc
        // console.log("OneWire sensor ROM: " + sensorROM);
        if (crc.crc8(sensorROM, 7) != utils.byte(sensorROM[7])) {
            console.log("OneWire sensor ROM: " + sensorROM);
            console.log('Bad crc: ' + utils.byte(sensorROM[7]) + ' != ' + crc.crc8(sensorROM, 7));
            return true; //
        }
        bridge_DS2482s.reset();
        bridge_DS2482s.matchROM(sensorROM);
        // нашли датчик, прочитаем данные. Датчик уже выбран
        bridge_DS2482s.wireWriteByte(OneWireCommands.READSCRATCH);
        let databuf = [];
        for (let i = 0; i < 9; i++) {           // we need 9 bytes
            databuf[i] = bridge_DS2482s.wireReadByte();
        }
        //console.log("OneWire sensor data: " + databuf);
        if (crc.crc8(databuf, 8) != databuf[8]) {
            console.log("OneWire sensor data: " + databuf);
            console.log('Bad crc: ' + utils.byte(databuf[8]) + ' != ' + crc.crc8(databuf, 8));
            return true;
        }

        let sensorData = {};
        sensorData.ID       = crc.crc16(sensorROM);
        sensorData.TimeLabel= Date.now();

        switch (sensorROM[0]){
            case SensorsTypes.DS18B20MODEL:{
                sensorData.Type     = 'DS18B20';
                let raw = (databuf[1] << 8) | databuf[0];

                let cfg = (databuf[4] & 0x60);
                // at lower res, the low bits are undefined, so let's zero them
                if (cfg == 0x00) raw = raw & ~7;  // 9 bit resolution, 93.75 ms
                else if (cfg == 0x20) raw = raw & ~3; // 10 bit res, 187.5 ms
                else if (cfg == 0x40) raw = raw & ~1; // 11 bit res, 375 ms
                //// default is 12 bit resolution, 750 ms conversion time
                sensorData.temperature = (raw*10) >> 4;
                //console.log(sensorParams)
            }break;
        }
        if(sensorData.Type)
            sensors.updateSensorData(sensorData);

    }else
        $this.searchStarted = false;

    return true;
}

function readSensorsData(){
    wire.open(address)
        .then((i2c) => {
            try {
                receiveData(i2c);
            }catch (err){
                throw err;
            }finally {
                wire.close();
            }
        })
        .catch((err) => {
            //wire.close();
            console.error(err)
        });
    return;
}


const update = {};
module.exports.update = update;
update['0.0.1'] = function(){
    return getDbInitData();
};


function getDbInitData() {

    return `{
          "main": {
            "DS2482SensorsReceiverSettings": {
              "schema": {
                "Address": "INTEGER NOT NULL",
                "Interval": "INTEGER NOT NULL"
              },
              "data": [
                {"RowID": 1, "Address": 24, "Interval": 2000}
              ]
            }
          }
        }`;
}


