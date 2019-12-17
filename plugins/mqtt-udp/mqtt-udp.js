'use strict';

const udp = require("dgram").createSocket("udp4");

const basedir = require('path').dirname(process.mainModule.filename);

const utils = require(`${basedir}/uc-utils`);
const db = require(`${basedir}/uc-db`).init(getDbInitData());
const sensors = require(`${basedir}/uc-sensors`);
const router = require(`${basedir}/uc-router`);


let MQTT_UDP_Settings;

const MQTT_PORT = 1883;
module.exports.init = function () {
    udp.bind(MQTT_PORT, () => { udp.setBroadcast(true);});
    updateMQTT_UDP_SettingsFromDB();
};

function updateMQTT_UDP_SettingsFromDB() {
    MQTT_UDP_Settings = db.querySync('SELECT * FROM MQTT_UDP_Settings')[0];
}


function onMqttUdpData(topic, load){
    let topic_data = topic.split("/");
    let sensorData = {};
    sensorData.ID = Number(topic_data[1]);
    if(topic_data.length !== 2 || !sensorData.ID)
        return;
    sensorData.Type = topic_data[0];
    let load_data = JSON.parse(load);
    /** @namespace load_data.timelabel */
    if(load_data.timelabel){
        sensorData.TimeLabel = utils.DateFromShotXMLString(load_data.timelabel).getTime();
        delete load_data.timelabel;
    }else{
        sensorData.TimeLabel = Date.now();
    }

    try {
        sensors.updateSensorData(sensorData, load_data);
    }catch (err){
        console.log(err);
    }
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

//    console.log(`server got data from ${rinfo.address}: ${topic} # ${load}`);
    onMqttUdpData(topic, load);
});

const PKT_BUF_SIZE = 2048;
const PTYPE_PUBLISH = 0x30;
function mqtt_udp_send(topic, data, ip_addr){

    topic = new Buffer(topic);
    data = new Buffer(data);

    let buf = new Buffer(PKT_BUF_SIZE);
    buf.fill(0);

    let bp = 0;
    buf[bp++] = PTYPE_PUBLISH;

    let total_len = topic.length + data.length + 2; // packet size
    if( total_len > (buf.length - 6) )
        throw new Error(`Packet lenght more than ${(buf.length - 6)} bytes`);

    do{
        let byte = total_len % 128;
        total_len = Math.floor(total_len / 128);

        if( total_len > 0 )
            byte |= 0b10000000;

        buf[bp++] = byte;
    }while(total_len);

    buf[bp++] = (topic.length >>8) & 0xFF;
    buf[bp++] = topic.length & 0xFF;
    topic.copy(buf, bp);
    bp += topic.length;

    data.copy(buf, bp);
    bp += data.length;

    /*udp.bind({}, () => {
        udp.setBroadcast(true);
    });*/

    udp.send(buf, 0, bp, MQTT_PORT, ip_addr || "255.255.255.255", (err) => {
//        udp.close();
    });

}

sensors.onSensorDataReceived(function (data) {
    if(MQTT_UDP_Settings.PublicateSensorsData && MQTT_UDP_Settings.IP){
        console.log(JSON.stringify(data));
    }
});


function getDbInitData() {

    return `{
          "main": {
            "MQTT_UDP_Settings": {
              "schema": {
                "PublicateSensorsData": "BOOLEAN NOT NULL",
                "IP": "CHAR(15) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              },
              "index": {
                
              },
              "data": [
                {"PublicateSensorsData": 0, "IP": "192.168.1.255"}
              ]
            }
          }
        }`;
}

const urlMqttUdp = "/mqtt-udp";
router.get(urlMqttUdp,
    function (req, res) {
        let data, contentType;
        if (req.query.format === "json") {
            contentType = 'text/json';
            data = JSON.stringify(MQTT_UDP_Settings);
        }else{
            contentType = 'text/html';
            // language=HTML
            data = `
                <html>
                    <head>
                        <title>Config MQTT/UDP</title>
                    </head>
                    <body>
                        <form method="post" action="${urlMqttUdp}">
                            <label>Publicate sensors data: <input name="PublicateSensorsData"
                                type="checkbox" ${(MQTT_UDP_Settings.PublicateSensorsData ? 'checked' : '')}></label><br>
                            <label>Mqtt/udp server: <input name="IP" length="15" placeholder="xxx.xxx.xxx.xxx"
                                value="${MQTT_UDP_Settings.IP}"></label><br>
                            <button type="submit">save</button>
                        </form>
                    </body>
                </html>`;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.write(data);
        res.end();
    },
    'get MQTT/UDP settings form or data (?[format=json])');

router.post(urlMqttUdp,
    function (req, res) {
        try{
            let q = 'UPDATE MQTT_UDP_Settings SET PublicateSensorsData = $PublicateSensorsData, IP = $IP';
            let PublicateSensorsData = (req.body.PublicateSensorsData ? 1 : 0);
            db.querySync(q, {$PublicateSensorsData:PublicateSensorsData, $IP:req.body.IP});
            updateMQTT_UDP_SettingsFromDB();
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write("Setting save");

        }catch (err){
            res.writeHead(400);
            res.write(err.message);
        }
        res.end();
    },
    'set MQTT/UDP settings');
