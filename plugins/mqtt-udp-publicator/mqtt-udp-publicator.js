'use strict';

const udp = require("dgram").createSocket("udp4");

const basedir = require('path').dirname(process.mainModule.filename);

const utils = require(`${basedir}/uc-utils`);
const db = require(`${basedir}/uc-db`);
const sensors = require(`${basedir}/uc-sensors`);
const router = require(`${basedir}/uc-router`);



const MQTT_PORT = 1883;

module.exports.init = function () {

    db.init(getDbInitData());

    updateMQTT_UDP_SettingsFromDB();

    udp.bind({}, () => { udp.setBroadcast(true);});
};

module.exports.update = function(prevVer){
    return getDbInitData();
};

function updateMQTT_UDP_SettingsFromDB() {
    module.MQTT_UDP_Settings = db.querySync('SELECT * FROM MQTT_UDP_publicator_Settings')[0];
}

const PKT_BUF_SIZE = 2048;
const PTYPE_PUBLISH = 0x30;
function mqtt_udp_send(topic, data, ip_addr){
    //console.log(data);

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

    udp.send(buf, 0, bp, MQTT_PORT, ip_addr || "127.0.0.1", (err) => {
//        udp.close();
    });

}

sensors.onSensorDataReceived(function (data) {
    if(module.MQTT_UDP_Settings.PublicateSensorsData && module.MQTT_UDP_Settings.IP){
        let params = Object.assign({}, data.params);
        params.timelabel = data.timelabel;
        mqtt_udp_send(`${data.type}/0x${Number(data.id).toHex()}`, JSON.stringify(params), module.MQTT_UDP_Settings.IP);
        //console.log(JSON.stringify(data));
    }
});


function getDbInitData() {

    return `{
          "main": {
            "MQTT_UDP_publicator_Settings": {
              "schema": {
                "ID": "INTEGER PRIMARY KEY AUTOINCREMENT",
                "PublicateSensorsData": "BOOLEAN NOT NULL",
                "IP": "CHAR(15) NOT NULL ON CONFLICT REPLACE DEFAULT ''"
              },
              "index": {
                
              },
              "data": [
                {"ID": 0, "PublicateSensorsData": 0, "IP": "192.168.1.255"}
              ]
            }
          }
        }`;
}

const urlMqttUdp = "/mqtt-udp-publicator";
router.get(urlMqttUdp,
    function (req, res) {
        let data, contentType;
        if (req.query.format === "json") {
            contentType = 'text/json';
            data = JSON.stringify(module.MQTT_UDP_Settings);
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
                                type="checkbox" ${(module.MQTT_UDP_Settings.PublicateSensorsData ? 'checked' : '')}></label><br>
                            <label>Mqtt/udp server: <input name="IP" length="15" placeholder="xxx.xxx.xxx.xxx"
                                value="${module.MQTT_UDP_Settings.IP}"></label><br>
                            <button type="submit">save</button>
                        </form>
                    </body>
                </html>`;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.write(data);
        res.end();
    },
    'get MQTT/UDP publicator settings form or data (?[format=json])');

router.post(urlMqttUdp,
    function (req, res) {
        try{
            let q = 'UPDATE MQTT_UDP_publicator_Settings SET PublicateSensorsData = $PublicateSensorsData, IP = $IP';
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
    'set MQTT/UDP publicator settings');
