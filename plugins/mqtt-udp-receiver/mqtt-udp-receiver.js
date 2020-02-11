'use strict';

const udp = require("dgram").createSocket("udp4");

const utils = require(`uc-utils`);
const sensors = require(`uc-sensors`);
const util = require("util");

function EventEmitterClass() {
    this.events = {
        MqttUdpData: 'mqtt-udp-data'
    };
}
util.inherits(EventEmitterClass, require("events"));
const EventEmitter = new EventEmitterClass();

module.exports.onMqttUdpData = EventEmitter.on.bind(EventEmitter, EventEmitter.events.MqttUdpData);



const MQTT_PORT = 1883;
module.exports.init = function () {
    udp.bind(MQTT_PORT);
};


function onMqttUdpData(topic, load){
//    console.log(`${topic}: ${load}`);
    let topic_data = topic.split("/");
    let sensorData = {};
    sensorData.ID = Number(topic_data[1]);
    if(topic_data.length !== 2 || !sensorData.ID)
        return;
    sensorData.Type = topic_data[0];
    let load_data = JSON.parse(load);
    /** @namespace load_data.timelabel */

    for(let key in load_data){
        if(key.toLowerCase() === 'timelabel'){
            sensorData.TimeLabel = Date.make(load_data[key]);
        }else
            sensorData[key] = load_data[key];
    }
    if(!sensorData.TimeLabel)
        sensorData.TimeLabel = new Date;

    sensors.updateSensorData(sensorData);
}

module.exports.onMqttUdpData((topic, load)=>{
    try{
        onMqttUdpData(topic, load);
    }catch (err){
        console.log(err);
    }
});

udp.on("message", function (msg, rinfo) {
    //console.log(rinfo);
    if(msg[0] !== 0x30)
        return;
    let pos = 1, byte = undefined, len = 0;
    do{
        byte = msg[pos];
        len += (byte & 0b1111111) << (7 * (pos - 1));

        pos++;
    }while(byte & 0b10000000);

    if((len + pos) !== msg.length)
        return;
    if(msg[pos])
        return;
    pos++;
    let topic_len = msg[pos];
    pos++;
    let msg_str = msg.toString();
    let topic = msg_str.substr(pos, topic_len);
    let load = msg_str.substr(pos + topic_len);

//    console.log(`server got data from ${rinfo.address}: ${topic} # ${load}`);
    EventEmitter.emit(EventEmitter.events.MqttUdpData, topic, load);//onMqttUdpData(topic, load);
});
