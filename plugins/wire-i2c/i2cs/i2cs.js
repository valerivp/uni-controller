(function() {
  var EventEmitter, i2c, tick, wire, _,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __hasProp = {}.hasOwnProperty;

  wire = require(`${require('path').dirname(process.mainModule.filename)}/uc-bin-loader`)(module, 'i2c');

  EventEmitter = require('events').EventEmitter;

  tick = setImmediate || process.nextTick;

  i2c = (function(_super) {
    __extends(i2c, _super);

    i2c.prototype.history = [];

    function i2c(_at_address, _at_options) {
      this.address = _at_address;
      this.options = _at_options != null ? _at_options : {};
      /*_.defaults(this.options, {
        debug: false,
        device: "/dev/i2c-1"
      });*/
      if (this.options.debug) {
        require('repl').start({
          prompt: "i2c > "
        }).context.wire = this;
        process.stdin.emit('data', '');
      }
      process.on('exit', (function(_this) {
        return function() {
          return _this.close();
        };
      })(this));
      this.on('data', (function(_this) {
        return function(data) {
          return _this.history.push(data);
        };
      })(this));
      this.on('error', function(err) {
        return console.log("Error: " + err);
      });
      this.open(this.options.device, (function(_this) {
        return function(err) {
          if (!err) {
            return _this.setAddress(_this.address);
          }
        };
      })(this));
    }

    i2c.prototype.scan = function(callback) {
      return wire.scan(function(err, data) {
        return tick(function() {
          return callback(err, _.filter(data, function(num) {
            return num >= 0;
          }));
        });
      });
    };

    i2c.prototype.scanSync = function(callback) {
      return wire.scan(function(err, data) {
          if(err) throw err;
          return callback(_.filter(data, function(num) {
          return num >= 0;
        }));
      });
    };

    i2c.prototype.setAddress = function(address) {
      wire.setAddress(address);
      return this.address = address;
    };

    i2c.prototype.open = function(device, callback) {
      return wire.open(device, function(err) {
        return tick(function() {
          return callback(err);
        });
      });
    };

    i2c.prototype.openSync = function(device) {
      return wire.open(device, function(err) {
          if(err) throw err;
      });
    };

    i2c.prototype.close = function() {
      return wire.close();
    };

    i2c.prototype.write = function(buf, callback) {
      this.setAddress(this.address);
      if (!Buffer.isBuffer(buf)) {
        buf = new Buffer(buf);
      }
      return wire.write(buf, function(err) {
        return tick(function() {
          return callback(err);
        });
      });
    };

    i2c.prototype.writeSync = function(buf) {
      this.setAddress(this.address);
      if (!Buffer.isBuffer(buf)) {
        buf = new Buffer(buf);
      }
      return wire.write(buf, function(err) {
          if(err) throw err;
      });
    };

    i2c.prototype.writeByte = function(byte, callback) {
      this.setAddress(this.address);
      return wire.writeByte(byte, function(err) {
        return tick(function() {
          return callback(err);
        });
      });
    };

    i2c.prototype.writeByteSync = function(byte) {
      this.setAddress(this.address);
      var error;
      wire.writeByte(byte, function(err) {
          error = err;
      });
      if(error) throw error;
    };

    i2c.prototype.writeBytes = function(cmd, buf, callback) {
      this.setAddress(this.address);
      if (!Buffer.isBuffer(buf)) {
        buf = new Buffer(buf);
      }
      return wire.writeBlock(cmd, buf, function(err) {
        return tick(function() {
          return callback(err);
        });
      });
    };

    i2c.prototype.writeBytesSync = function(cmd, buf) {
      this.setAddress(this.address);
      if (!Buffer.isBuffer(buf)) {
        buf = new Buffer(buf);
      }
      var error;
      wire.writeBlock(cmd, buf, function(err) {
        error = err;
      });
      if(error) throw error;
    };

    i2c.prototype.read = function(len, callback) {
      this.setAddress(this.address);
      return wire.read(len, function(err, data) {
        return tick(function() {
          return callback(err, data);
        });
      });
    };

    i2c.prototype.readSync = function(len) {
      this.setAddress(this.address);
      var res, error;
      wire.read(len, function(err, data) {
          error = err;
          res = data;
      });
        if(error) throw error;

        return res;
    };

    i2c.prototype.readByte = function(callback) {
      this.setAddress(this.address);
      return wire.readByte(function(err, data) {
        return tick(function() {
          return callback(err, data);
        });
      });
    };

    i2c.prototype.readByteSync = function() {
      this.setAddress(this.address);
      var res, error;
      wire.readByte(function(err, data) {
          error = err;
          res = data;
        //return callback(err, data);
      });
        if(error) throw error;

        return res;
    };

    i2c.prototype.readBytes = function(cmd, len, callback) {
      this.setAddress(this.address);
      return wire.readBlock(cmd, len, null, function(err, actualBuffer) {
        return tick(function() {
          return callback(err, actualBuffer);
        });
      });
    };

    i2c.prototype.readBytesSync = function(cmd, len) {
      this.setAddress(this.address);
      var res, error;
      wire.readBlock(cmd, len, null, function(err, actualBuffer) {
          error = err;
          res = data;
      });
        if(error) throw error;

        return res;
    };

    i2c.prototype.stream = function(cmd, len, delay) {
      if (delay == null) {
        delay = 100;
      }
      this.setAddress(this.address);
      return wire.readBlock(cmd, len, delay, (function(_this) {
        return function(err, data) {
          if (err) {
            return _this.emit('error', err);
          } else {
            return _this.emit('data', {
              address: _this.address,
              data: data,
              cmd: cmd,
              length: len,
              timestamp: Date.now()
            });
          }
        };
      })(this));
    };

    return i2c;

  })(EventEmitter);

  module.exports = i2c;

}).call(this);