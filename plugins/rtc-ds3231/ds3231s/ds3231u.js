var i2c = require('./lib/i2c');
var address = 0x0;
var wire = new i2c(0x68, {device: '/dev/i2c-0'}); // point to your i2c address, debug provides REPL interface
//var wire2  = require('i2c');

/*
console.log("--1--");
wire.scan(function(err, data) {
	if(err)
	console.log(err);
	else{
		console.log("scan");
		data.forEach(function(entry) {
			console.log(entry);
		});  // result contains an array of addresses
	}
});

console.log("--2--");
*/
function bcd2dec(n) { return n - 6 * (n >> 4); }
function dec2bcd(n) { var b = (n * 103) >> 10; return (b * 16 + n - (b * 10));}

function getDateTime(cb){
	wire.writeByte(0, function(err) { 
		if(err)
			cb(null, err); 
		else{
			wire.read(7, function(err, data) {
				if(err)
					cb(null, err);
				else{
/*					console.log("getDateTime");
					data.forEach(function(entry) {
						console.log(entry + "	:	" + bcd2dec(entry));
						});
*/		    		
		    		var date = new Date(bcd2dec(data[6]) + 2000, bcd2dec(data[5]) - 1, bcd2dec(data[4]), bcd2dec(data[2]), bcd2dec(data[1]), bcd2dec(data[0]));
		    		cb(date)
		    		//console.log(date);
				}	
	
			})
		}
	});
}

function setDateTime(date, cb){
	data = [0,
		dec2bcd(date.getSeconds()),
		dec2bcd(date.getMinutes()),
		dec2bcd(date.getHours()),
		0, //dow
		dec2bcd(date.getDate()),
		dec2bcd(date.getMonth() + 1),
		dec2bcd(date.getFullYear() - 2000)
	];	

/*	console.log("setDateTime");
	console.log(date);
	data.forEach(function(entry) {
		console.log(entry + "	:	" + bcd2dec(entry));
		});
*/	wire.write(data, cb);

}

//console.log("--3--");

/*
setDateTime(new Date(), function(err){
	if(err)
		console.log(err);
})
*/
getDateTime(function(date, err){
	if(err)
		console.log(err);
	else
		console.log(date);
})

/*
console.log("--4--");
*/
