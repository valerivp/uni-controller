'use strict';

const I2c = require('i2c');
const cmds = require('./commands');
const utils = require('./utils');

const ROM_SIZE = 8;


class DS2482 {
    constructor(i2c, options) {
        // eslint-disable-next-line no-param-reassign
        options = options || {};

        if (!i2c)
            throw new Error("i2c not set");
        this.i2c = i2c;
    }

    /*
     * Main API
     */

    reset() {
        this.resetBridge();
        this.resetWire();
    }

    /*    configureBridge(options) {
            let config = 0;

            if (options) {
                if (options.activePullup) config |= commands.CONFIG.ACTIVE;
                if (options.strongPullup) config |= commands.CONFIG.STRONG;
                if (options.overdrive) config |= commands.CONFIG.OVERDRIVE;
            }
            this.i2c.writeBytesSync(commands.WRITE_CONFIG, [((~config & 0x0F) << 4) | config]);

            if (config !== this._readBridge()) {
                throw new Error('Failed to configure bridge');
            }
        }*/

    matchROM(rom) {
        this.wireWriteByte(commands.ONE_WIRE_MATCH_ROM);
        for (var i = 0; i < ROM_SIZE; i++)
            this.wireWriteByte(rom[i]);
    }

    skipROM() {
        this.wireWriteByte(commands.ONE_WIRE_SKIP_ROM);
    }

    resetSearch() {
        this.searchExhausted = 0;
        this.searchLastDisrepancy = 0;

        this.searchAddress = [0, 0, 0, 0, 0, 0, 0, 0];
        this.resetBridge();
        this.resetWire();
        return (this._busyWait() & commands.STATUS.PRESENCE) != 0;
    }

    wireSearchNext() {
        var i;
        var direction;
        var last_zero = 0;
        if (this.searchExhausted)
            return;

        this.reset();
        var status = this._busyWait(false);
        if (!(status & commands.STATUS.PRESENCE))
            return;

        this.wireWriteByte(commands.ONE_WIRE_SEARCH_ROM);
        //console.log("ONE_WIRE_SEARCH_ROM")

        for (i = 1; i < 65; i++) {
            let romByte = (i - 1) >> 3;
            let romBit = 1 << ((i - 1) & 7);

            if (i < this.searchLastDisrepancy)
                direction = this.searchAddress[romByte] & romBit;
            else
                direction = i == this.searchLastDisrepancy;

            this._busyWait();
            this.i2c.writeBytesSync(commands.ONE_WIRE_TRIPLET, [direction ? 0x80 : 0]);
            status = this._busyWait();

            var id = status & commands.STATUS.SINGLE_BIT;//DS2482_STATUS_SBR;
            var comp_id = status & commands.STATUS.TRIPLE_BIT; //DS2482_STATUS_TSB;
            direction = status & commands.STATUS.BRANCH_DIR; //DS2482_STATUS_DIR;

            if (id && comp_id) {
                return;
            } else {
                if (!id && !comp_id && !direction)
                    last_zero = i;
            }

            if (direction)
                this.searchAddress[romByte] |= romBit;
            else
                this.searchAddress[romByte] &= ~romBit;
        }

        this.searchLastDisrepancy = last_zero;

        if (last_zero == 0)
            this.searchExhausted = 1;

        return this.searchAddress;
    }

    wireWriteByte(b) {
        this._busyWait();
        this.i2c.writeBytesSync(commands.ONE_WIRE_WRITE_BYTE, [b]);
    }

    wireReadByte() {
        this._busyWait(true);
        this.i2c.writeByteSync(commands.ONE_WIRE_READ_BYTE);
        this._busyWait();

        return this._readBridge(commands.REGISTERS.DATA);
    }

    _busyWait(setReadPtr) {
        var status;
        var loopCount = 100;
        while ((status = this._readStatus(setReadPtr)) & commands.STATUS.BUSY) {
            if (--loopCount <= 0)
                throw new Error("Busy wait timeout");
            //this.delay(2);
        }
        return status;
    }

    resetBridge() {
        this.i2c.writeByteSync(commands.DEVICE_RESET);
    }

    resetWire() {
        this.i2c.writeByteSync(commands.ONE_WIRE_RESET);
    }

    _readStatus(setPointer) {
        if (setPointer)
            this.i2c.writeBytesSync(commands.SET_READ_POINTER, [commands.REGISTERS.STATUS]);
        return this.i2c.readByteSync()
    }


    _readBridge(reg) {
        if (reg)
            this.i2c.writeBytesSync(commands.SET_READ_POINTER, [reg]);

        return this.i2c.readByteSync();
    }

}

module.exports = DS2482;
