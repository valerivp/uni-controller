'use strict';

const udp = require("dgram").createSocket("udp4");

const utils = require(`${basedir}/uc-utils`);
const sensors = require(`${basedir}/uc-sensors`);

module.exports.init = function () {
    udp.bind(1883);
};


function onMqttUdpData(topic, load){
    //console.log("server got data: " + topic + ": " + load);
    let topic_data = topic.split("/");
    let sensorData = {};
    sensorData.ID       = Number(topic_data[1]);
    sensorData.Type     = topic_data[0];
    let load_data = JSON.parse(load);
    /** @namespace load_data.timelabel */
    if(load_data.timelabel){
        sensorData.TimeLabel = utils.DateFromShotXMLString(load_data.timelabel).getTime();
        delete load_data.timelabel;
    }else{
        sensorData.TimeLabel = Date.now();
    }

    sensors.updateSensorData(sensorData, load_data);
}


udp.on("message", function (msg, rinfo) {
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

    onMqttUdpData(topic, load);
});


