function bcd2dec(n) { return n - 6 * (n >> 4); }
function dec2bcd(n) { var b = (n * 103) >> 10; return (b * 16 + n - (b * 10));}

module.exports.getDateTimeSync = function(wire){
	wire.writeByteSync(0);
	var data = wire.readSync(7);
	var date = new Date(bcd2dec(data[6]) + 2000, bcd2dec(data[5]) - 1, bcd2dec(data[4]), bcd2dec(data[2]), bcd2dec(data[1]), bcd2dec(data[0]));
	return date;
}

module.exports.setDateTimeSync = function(wire, date){
	data = [0,
		dec2bcd(date.getSeconds()),
		dec2bcd(date.getMinutes()),
		dec2bcd(date.getHours()),
		0, //dow
		dec2bcd(date.getDate()),
		dec2bcd(date.getMonth() + 1),
		dec2bcd(date.getFullYear() - 2000)
	];	

	wire.writeSync(data);

}
