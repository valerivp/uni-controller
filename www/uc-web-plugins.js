'use strict';


/* clock-at-logo v.0.0.6 */

function clockAtLogo_class(){
                        
let module = {exports: this};

addElement("div", "main-logo").id = "clock-at-logo";

new Vue({
    el: '#clock-at-logo',
    computed: {
        time: ()=> $store.state.time,
    },
    template: `
    <div id="clock-at-logo" onclick="vContent.setTab(vContent.tabsList[0].id)">
        <span class="sFontBold sColorContrast">UNI</span>Controller
        <span v-if="!time">--:--</span>
        <span v-if="time" class="sFontBold sColorContrast">
            {{String('00' + time.getHours()).substr(-2)}}<span v-bind:style="(time.getSeconds() % 2 ? 'opacity:0.4;' : '')">:</span>{{String('00' + time.getMinutes()).substr(-2)}}
        </span>
        <span v-if="time" >{{['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][time.getDay()]}}</span>
    </div>  `

});
}
                    
mm['clock-at-logo'] = new clockAtLogo_class();

/* sensors-wth433 v.0.0.1 */

function sensorsWth433_class(){
                        
let module = {exports: this};
let sensorInfo = {
    temperature: {
        title: 'Темпе\u00ADратура, \u00B0C',
        align: 'right',
        data: (sd) => Number(sd.param('temperature') / 10).toFixed(1)
    },
    humidity: {
        title: 'Влаж\u00ADность, %',
        align: 'right',
        data: (sd) => Number(sd.param('humidity'))
    },
    battery: {
        title: 'Бата\u00ADрея',
        align: 'center',
        data: (sd) => '',
        html: (sd) => {return `<div class="sSensorBattery"><div class="${(sd.param('battery') ? 'ok' : 'low')}"></div></div>`}
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
};
sensorsTypes.add( 'WTH433-0', Object.assign({}, sensorInfo));
let sensorInfo1 = Object.assign({}, sensorInfo);
delete sensorInfo1.battery;
sensorsTypes.add( 'WTH433-1', sensorInfo1);
sensorsTypes.add( 'WTH433-2', Object.assign({}, sensorInfo));
sensorsTypes.add( 'WTH433-3', Object.assign({}, sensorInfo));

}
                    
mm['sensors-wth433'] = new sensorsWth433_class();

/* sensors-ds18b20 v.0.0.1 */

function sensorsDs18b20_class(){
                        
let module = {exports: this};
sensorsTypes.add( 'DS18B20', {
    temperature: {
        title: 'Темпе\u00ADратура, \u00B0C',
        align: 'right',
        data: (sd) => Number(sd.param('temperature') / 10).toFixed(1)
    },
/*    timeLabel: {
        title: 'Данные получены',
        align: 'right',
        data: (sd) => sd.timelabel2string()
    },
*/    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
});

}
                    
mm['sensors-ds18b20'] = new sensorsDs18b20_class();

/* sensors-pzem004t v.0.0.1 */

function sensorsPzem004t_class(){
                        
let module = {exports: this};
sensorsTypes.add( 'PZEM004T', {
    voltage: {
        title: 'Напря\u00ADжение, В',
        align: 'right',
        data: (sd) => Number(sd.param('voltage') / 10).toFixed(0)
    },
    current: {
        title: 'Ток, А',
        align: 'right',
        data: (sd) => Number(sd.param('current') / 100).toFixed(1)
    },
    power: {
        title: 'Мощ\u00ADность, Вт',
        align: 'right',
        data: (sd) => Number(sd.param('power'))
    },
    energy: {
        title: 'Энергия, кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy') / 1000).toFixed(1)
    },
    energyT1: {
        title: 'Энергия Т1, кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy-t1') / 1000).toFixed(0)
    },
    energyT2: {
        title: 'Энергия Т2, кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy-t2') / 1000).toFixed(0)
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
});

}
                    
mm['sensors-pzem004t'] = new sensorsPzem004t_class();

/* mqtt-udp-publicator v.0.0.1 */

function mqttUdpPublicator_class(){
                        
let module = {exports: this};
vSettings.add(
    Vue.component('settings-set-mqtt-udp-pub', {
        data:()=> {return {PublicateSensorsData: false, IP:''}},
        methods: {
            sendSettings(){
                let bodyFormData = new FormData();

                bodyFormData.set('PublicateSensorsData', (this.PublicateSensorsData ? 'on' : ''));
                bodyFormData.set('IP', this.IP);
                axios({
                    url: `http://${serverLocation}/mqtt-udp-publicator`,
                    method: 'post',
                    data: bodyFormData,
                    config: { headers: {'Content-Type': 'multipart/form-data' }}})
                    .then(function (response) {
                        vToasts.add(response.data);
                        console.log(response); })
                    .catch(function (error) {
                        vToasts.addHttpError(error);
                        console.log(error);});
            },
            onFetch: function () {
                axios.get(`http://${serverLocation}/mqtt-udp-publicator?format=json`)
                    .then(response => {
                        this.PublicateSensorsData = Boolean(response.data.PublicateSensorsData);
                        this.IP = response.data.IP;
                    })
                    .catch(function (error) {
                        vToasts.addHttpError(error); console.log(error);});
            },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template:`
    <div>
        <div>
            <span>Настройки MQTT/UDP</span>
            <button v-on:click="sendSettings">Сохранить</button>
        </div>
        <div>
            <span>Публиковать данные датчиков</span>
            <input type="checkbox" v-model="PublicateSensorsData">
        </div>
        <div>
            <span>Адрес для публикации</span>
            <input v-model="IP" length="15" placeholder="xxx.xxx.xxx.xxx">
        </div>
    </div>`
    })
);

}
                    
mm['mqtt-udp-publicator'] = new mqttUdpPublicator_class();

/* tiles v.0.0.1 */

function tiles_class(){
                        
let module = {exports: this};
const TilesComponentsTypes = function () {
};
TilesComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;
};
const vTilesComponentsTypes = new TilesComponentsTypes;
module.exports.components = {types: vTilesComponentsTypes};

function Tile(pId) {
    this.params = {};
    this._id = pId;
    this._type = undefined;
}
Object.defineProperty(Tile.prototype, 'id', {
    get() {
        return this._id;
    },
    set(val) {
        throw('Property is read only');
    },
});
Object.defineProperty(Tile.prototype, 'type', {
    get() {
        return this._type;
    },
    set(val) {
        if(val !== this._type){
            this.params = {};
            this._type = val;
        }
    },
});

Tile.prototype = {
    get id() {
        return this._id;
    },
    set id(val) {
        throw('Property is read only');
    },
    get type() {
        return this._type;
    },
    set type(val) {
        if(val !== this._type){
            this.params = {};
            this._type = val;
        }
    },
};


function Tiles() {
}

Tiles.prototype.toArray = function () {
    let res = [];
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach((id)=>res.push(this[id]));
    return res;
};
Tiles.prototype.length = function () {
    let res = 0;
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach(() => res++);
    return res;
};

const vTiles = new Vue({
    data: {
        tiles: new Tiles(),
    },
    computed:{
        tilesCount: {
            get(){
                return this.tiles.length();
            },
            set(val){
                wscli.send(`#SetTilesCount:${val}`);
            }
        },
    },

    methods: {
        setTilesCount(val){
            let tilesCount = this.tiles.length();
            if(tilesCount !== val) {
                while (tilesCount < val){
                    tilesCount++;
                    Vue.set(this.tiles, tilesCount, new Tile(tilesCount));//{id: tilesCount, params: {}});
                    wscli.send(`#Tile:${tilesCount},GetType,GetParams`);
                }
                while (tilesCount > val)
                    Vue.delete(this.tiles, tilesCount--);
            }
        },
        changeTileSetting(id){
            vContent.setTab('tile-settings', {tileId: id});
        },
        checkTile(t){
            return checkInRange(t, 1, this.tiles.length(), "Tile id");
        },

        getCSSClass(id){
            let tilesCount = this.tiles.length();
            let l = [[1], [2,2], [3,3,3], [2,2,2,2], [2,2,3,3,3], [3,3,3,3,3,3], [3,3,3,4,4,4,4],[4,4,4,4,4,4,4,4]];
            let p = [[1],[1,1],[1,1,1],[1,2,2,1],[2,2,1,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,1],[2,2,2,2,2,2,2,2]];
            return `sTilesCount${tilesCount}`
                + ` l${l[tilesCount - 1][id - 1]}-in-line`
                + ` p${p[tilesCount - 1][id - 1]}-in-line`
            ;
        },
        setType(id, type){
            if(this.tiles[id].type !== type){
                wscli.send(`#Tile:${id},SetType:${type},GetParams`);
            }
        },
        setParams(id, params){
            let data = `#Tile:${id},SetParams:${wscli.data.toString(params)}`;
            wscli.send(data);
        },
        onShow(params){
            this.$emit('show');
            doResizeTilesContent();
        },
    },
    created: function() {
        module.exports.setParams = this.setParams;
        ws.on('open', ()=>{
            wscli.send("#GetTilesCount");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles.toArray()" v-bind:class="getCSSClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
            <div class="sTile border3d">
                <div v-bind:params="tile.params" v-bind:is="tile.type">
                
                </div>
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTiles, id: 'tiles'}, {before: 'sensors', });


vTilesComponentsTypes.add('tile-test', {title: 'Компонент'});
vTilesComponentsTypes.add('tile-second', {title: 'Второй'});

const vTileSettings = new Vue({
    data: {
        _isActive: false,
        _selectedTileId: 1
    },

    methods: {
        onShow(params){
            this.$data._isActive = true;
            if(params && params.tileId)
                this.selectedTileId = params.tileId;
            if(this.selectedTypeName)
                setTimeout(this.$emit.bind(this, `show-${this.selectedTypeName}-settings`), 2);
        },
        onHide(){
            this.$data._isActive = false;
            if(this.selectedTypeName)
                setTimeout(this.$emit.bind(this, `hide-${this.selectedTypeName}-settings`), 1);
        },
        types(){
            let res = vTilesComponentsTypes;
            if(this.selectedTypeName && !res[this.selectedTypeName]){
                res = Object.assign(new TilesComponentsTypes(), res);
                res.add(this.selectedTypeName, {title: this.selectedTypeName + ', not instaled'});
            }
            return res;
        },
    },
    computed:{
        //isActive: () => vContent.
        tiles: ()=> vTiles.tiles,
        tilesCount: {
            get(){ return vTiles.tilesCount;},
            set(val){
                vTiles.tilesCount = val;
                if(val && this.selectedTileId > val)
                    this.selectedTileId = val;
            }
        },
        selectedTile(){
            return this.tiles[this.selectedTileId] || {}; // для старта, когда нет плиток
        },
        selectedTileId: {
            get(){ return this.$data._selectedTileId; },
            set(id){
                this.$data._selectedTileId = id;
                wscli.send(`#Tile:${id},GetType,GetParams`);
            }
        },
        selectedTypeName: {
            get: function(){ return this.selectedTile.type; },
            set: function(t){
                if(t){
                    vTiles.setType(this.selectedTileId, t);
                }
            }
        },
    },
    watch:{
        selectedTypeName: function (newVal, oldVal) {
            if(this.$data._isActive){
                if(oldVal)
                    setTimeout(this.$emit.bind(this, `hide-${oldVal}-settings`), 1);
                if(newVal)
                    setTimeout(this.$emit.bind(this, `show-${newVal}-settings`), 2);
            }
        }
    },
    created: function() {
    },
    template:`
    <div id="tab-content-tile-settings" title="Настройка">
        <div class="sProperties">
            <div>
                <div>
                    <span>Панель</span>
                    <select v-model="selectedTileId">
                        <option v-for="tile in tiles" v-bind:value="tile.id">{{tile.id}}</option>
                    </select>
                    <div class="button-inc-dec">
                        <span> из </span>
                        <button v-on:click="tilesCount--"  class="button-inc-dec">-</button>
                        <span>{{tilesCount}}</span>
                        <button v-on:click="tilesCount++"  class="button-inc-dec">+</button>
                    </div>
                </div>
            </div>
            <div>
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedTypeName">
                        <option v-for="type in types()" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            <div v-bind:is="selectedTypeName + '-settings'" v-if="selectedTypeName"
                v-bind:type="selectedTypeName + '-settings'"
                v-bind:tile="selectedTile">
            
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTileSettings, id: 'tile-settings'}, {after: 'tiles'});

wscli.context.add('tile');
wscli.commands.add({Tile: Number}, (arg) => {
        wscli.context.current = wscli.context.tile;
        vTiles.checkTile(arg);
        wscli.current.tile = arg;
        return true;
    }
);

wscli.commands.add({Type: String}, (arg)=> {
        if(wscli.context.current === wscli.context.tile){
            vTiles.checkTile(wscli.current.tile);
            if(vTiles.tiles[wscli.current.tile].type !== arg)
                Vue.set(vTiles.tiles[wscli.current.tile], "type", arg);
            return true;
        }
    }
);

wscli.commands.add({Params: Object}, (arg) =>{
        if(wscli.context.current === wscli.context.tile){
            vTiles.checkTile(wscli.current.tile);
            Vue.set(vTiles.tiles[wscli.current.tile], 'params', arg);
            return true;
        }
    }
);

wscli.commands.add({TileCount: Number}, (arg) => {
        vTiles.setTilesCount(arg);
        doResizeTilesContent();
        return true;
    }
);


// noinspection CssUnusedSymbol
document.write(`
<style type="text/css">
.tile-caption .zoomed-content{
    zoom: 1;
    --max-zoom: 2;
}
</style>
`);


function doResizeTilesContent() {
    if (doResizeTilesContent.timeoutHandle)
        clearTimeout(doResizeTilesContent.timeoutHandle);
    doResizeTilesContent.timeoutHandle = setTimeout(() => {
        doZoom('.tile-caption .zoomed-content');
    }, 100);
}

window.addEventListener('resize', doResizeTilesContent, false);


Vue.component('tile-test', {
    props: {
        tileId: Number
    },
    template: '<h3>TEST {{ tileId }}</h3>'
});

Vue.component('tile-test-settings', {
    props: {
        //tileId: Number
    },
    template: '<h3>TEST settings {{  }}</h3>'
});

Vue.component('tile-second', {
    props: {
        tileId: Number
    },
    template: '<h3>SECOND {{ tileId }}</h3>'
});
Vue.component('tile-second-settings', {
    props: {
    },
    template: '<h3>SECOND settings{{  }}</h3>'
});

}
                    
mm['tiles'] = new tiles_class();

/* sensor-data-sender v.0.0.1 */

function sensorDataSender_class(){
                        
let module = {exports: this};
wscli.commands.add({Autosend: Number}, (arg) => {
        if(wscli.context.current === wscli.context.sensor)
            return true;
    }
);

}
                    
mm['sensor-data-sender'] = new sensorDataSender_class();

/* tile-temperature-humidity-battery v.0.0.1 */

function tileTemperatureHumidityBattery_class(){
                        
let module = {exports: this};

mm.tiles.components.types.add('tile-temperature', {title: 'Температура и влажность'});

// noinspection JSUnusedLocalSymbols
// noinspection JSUnusedGlobalSymbols
Vue.component('tile-temperature', {
    data: () => {
        return {
            prevData: {},
            trends: {},
        }
    },
    computed: {
        sensorId() {
            return (this.params || {sensor: 0}).sensor;
        },
        sensor() {
            return vSensors.sensors[this.sensorId];
        },
        temperature() {
            let res = this.sensor ? this.sensor.param('temperature') : undefined;
            res = (res !== undefined) ? res / 10 : undefined;
            return res;
        },
        humidity() {
            let res = this.sensor ? this.sensor.param('humidity') : undefined;
            res = (res !== undefined) ? res : undefined;
            return res;
        }
    },
    watch: {
        sensorId(newVal, oldVal) {
            this.fetchSensorData();
            this.prevData = {};
            this.trends = {};
        },
    },
    created() {
        this.fetchSensorData();
        ws.on('open', () => {
            this.fetchSensorData();
        });
        this.$parent.$on('show', this.onShow);
    },
    methods: {
        onShow() {
            doResizeTilesContent();
        },
        fetchSensorData() {
            if (this.sensorId) {
                wscli.send(`#Sensor:0x${Number(this.sensorId).toHex()},GetName,GetData`);
                this.sendAutosend();
            }
        },
        sendAutosend() {
            clearTimeout(this.timeoutHandle);
            if (this.sensorId) {
                wscli.send(`#Sensor:0x${Number(this.sensorId).toHex()},SetAutosend:300`);
                this.timeoutHandle = setTimeout(this.sendAutosend, 60 * 1000);
            }
        },
        trend(par) {
            if (this[par] === undefined)
                return undefined;
            if (this.prevData[par] !== this[par]) {
                if (this.prevData[par] !== undefined)
                    this.trends[par] = (this.prevData[par] < this[par]);
                this.prevData[par] = this[par];
            }
            return this.trends[par];
        },
    },
    props: {
        name: String,
        params: Object
    },
    template: `
    <div class="tile tile-t-h-b">
        <div class="tile-caption">
            <div class="zoom-place">
                <div class="zoomed-content">
                    <nobr class="tile-caption-data">
                        <span>{{ sensor ? sensor.name || String(sensor) : 'no sensor'}}</span>
                        <span style="flex-grow: 1;">&nbsp;</span>
                        <span class="sensor-battery" v-if="String(params['show-battery']) === 'true' && sensor && sensor.param('battery') !== undefined"><div v-bind:class="(sensor.param('battery') ? 'ok' : 'low')"></div></span>
                    </nobr>
                </div>
            </div>
        </div>
        <div class="tile-data">
            <div v-bind:class="'tile-temperature-data' + (String(params['show-humidity']) !== 'true' ? ' only' : '')"
                v-if="String(params['show-temperature']) === 'true'">
                <div class="zoom-place">
                    <div class="zoomed-content">
                        <nobr v-bind:class="temperature === undefined ? '' : (temperature > 0 ? 'temperature warm' : 'temperature cold')">
                            {{temperature === undefined ? '-.-' : String(Number(temperature).toFixed(1)).trim()}}
                            <span v-if="trend('temperature') !== undefined" 
                                v-bind:class="trend('temperature') ? 'tile-t-h-trend-up' : 'tile-t-h-trend-down'"></span>
                         </nobr>
                    </div>
                </div>
            </div>
            <div v-bind:class="'tile-humidity-data' + (String(params['show-temperature']) !== 'true' ? ' only' : '')"
                v-if="String(params['show-humidity']) === 'true'">
                <div class="zoom-place">
                    <div class="zoomed-content">
                        <div v-bind:class="humidity === undefined ? '' : 'humidity'">
                            {{humidity === undefined ? '-.-' : String(humidity) }}
                            <span v-if="trend('humidity') !== undefined" 
                                v-bind:class="trend('humidity') ? 'tile-t-h-trend-up' : 'tile-t-h-trend-down'"></span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>

`
});

// noinspection CssUnusedSymbol
document.write(`
<style type="text/css">
.tile-temperature-data .zoomed-content{
    zoom: 1;
    --max-zoom: 5;
}
.tile-temperature-data.only .zoomed-content{
    zoom: 1;
    --max-zoom: 5;
}
.tile-humidity-data .zoomed-content{
    zoom: 1;
    --max-zoom: 5;
}
.tile-humidity-data.only .zoomed-content{
    zoom: 1;
    --max-zoom: 5;
}
</style>
`);


function doResizeTilesContent() {
    if (doResizeTilesContent.timeoutHandle)
        clearTimeout(doResizeTilesContent.timeoutHandle);
    doResizeTilesContent.timeoutHandle = setTimeout(() => {
        doZoom('.tile-temperature-data .zoomed-content');
        doZoom('.tile-temperature-data.only .zoomed-content');
        doZoom('.tile-humidity-data .zoomed-content');
        doZoom('.tile-humidity-data.only .zoomed-content');
    }, 100);
}

window.addEventListener('resize', doResizeTilesContent, false);

// noinspection JSUnusedLocalSymbols
wscli.commands.add({TileCount: Number}, (arg) => {
        doResizeTilesContent();
        return true;
    }
);


Vue.component('tile-temperature-settings', {
    props: {
        type: String,
        tile: Object,
    },
    computed: {
        params() {
            return this.tile.params;
        },
        sensors() {
            let res = vSensors.sensors.toArray().filter((sd) => (sd.param('temperature') !== undefined));
            if (this.sensor && !res.find(item => item.id === this.sensor))
                res.splice(0, 0, vSensors.sensors[this.sensor] || new SensorData(this.sensor));
            return res;
        },
        sensor: {
            get() {
                return Number(this.params.sensor);
            },
            set(val) {
                this.setParam({sensor: val});
            }
        },
        showTemperature: {
            get() {
                return String(this.params['show-temperature']) === 'true';
            },
            set(val) {
                this.setParam({'show-temperature': val});
            }
        },
        showHumidity: {
            get() {
                return String(this.params['show-humidity']) === 'true';
            },
            set(val) {
                this.setParam({'show-humidity': val});
            }
        },
        showBattery: {
            get() {
                return String(this.params['show-battery']) === 'true';
            },
            set(val) {
                this.setParam({'show-battery': val});
            }
        },
    },
    methods: {
        setParam(param) {
            let params = Object.assign(this.params);
            for (let key in param)// noinspection JSUnfilteredForInLoop
                params[key] = param[key];
            mm.tiles.setParams(this.tile.id, params);
        },
        onShow() {
            if (!this._isActive) {
                this._isActive = !this._isActive;
                sensorsInfoQuery.start();
            }
        },
        onHide() {
            if (this._isActive) {
                this._isActive = !this._isActive;
                sensorsInfoQuery.stop();
            }
        },
    },
    created() {
        this.$parent.$on('show-' + this.type, this.onShow);
        this.$parent.$on('hide-' + this.type, this.onHide);
    },
    template: `
       <div>
            <div>
                <span>Датчик</span>
                <select v-model="sensor">
                    <option v-for="sensor in sensors" v-bind:value="sensor.id">
                        {{String(sensor)}}{{sensor ? ', ' + sensor.param('temperature')/10 + '°C' : ''}}
                    </option>
                </select>
            </div>
            <div>
                <span>Отображать температуру</span>
                <input type="checkbox" v-model="showTemperature">
            </div>
            <div>
                <span>Отображать влажность</span>
                <input type="checkbox" v-model="showHumidity">
            </div>
            <div>
                <span>Отображать батарею</span>
                <input type="checkbox" v-model="showBattery">
            </div>
        </div>
    `
});

}
                    
mm['tile-temperature-humidity-battery'] = new tileTemperatureHumidityBattery_class();

/* tile-energy-monitor v.0.0.1 */

function tileEnergyMonitor_class(){
                        
let module = {exports: this};
mm.tiles.components.types.add('tile-energy-monitor', {title: 'Энергомонитор'});

// noinspection JSUnusedLocalSymbols
Vue.component('tile-energy-monitor', {
    data:()=>({
        energyTN: 0
    }),
    computed:{
        sensorId() {
            return (this.params || {}).sensor;
        },
        sensor() {
            return vSensors.sensors[this.sensorId];
        },
        voltage() {
            return this.getParam('voltage', 10);
        },
        current() {
            return this.getParam('current', 100);
        },
        power() {
            return this.getParam('power', 1);
        },
        energy() {
            return this.getParam('energy', 1000);
        },
        energyT1() {
            return this.getParam('energy-t1', 1000);
        },
        energyT2() {
            return this.getParam('energy-t2', 1000);
        },
    },
    watch:{
        sensorId(newVal, oldVal) {
            this.fetchSensorData();
        },
    },
    created(){
        this.fetchSensorData();
        ws.on('open', ()=>{
            this.fetchSensorData();
        });
        this.$parent.$on('show', this.onShow);
        setInterval(function () {
            this.energyTN++;
        }.bind(this), 4000);
    },
    methods: {
        getParam(par, div){
            let res = this.sensor ? this.sensor.param(par) : undefined;
            res = (res !== undefined) ? res / div : undefined;
            return res;
        },
        onShow(){
            doResizeTilesContent();
        },
        fetchSensorData(){
            if(this.sensorId) {
                wscli.send(`#Sensor:0x${Number(this.sensorId).toHex()},GetName,GetData`);
                this.sendAutosend();
            }
        },
        sendAutosend(){
            clearTimeout(this.timeoutHandle);
            if(this.sensorId){
                wscli.send(`#Sensor:0x${Number(this.sensorId).toHex()},SetAutosend:300`);
                this.timeoutHandle = setTimeout(this.sendAutosend, 60*1000);
            }
        },
    },
    props: {
        name: String,
        params: Object
    },
    template: `
        <div class="tile tile-energy-monitor">
            <div class="tile-caption">
                <div class="zoom-place">
                    <div class="zoomed-content">
                        <nobr class="tile-caption-data">
                            <span>{{ sensor ? sensor.name || String(sensor) : 'no sensor'}}</span>
                            <span style="flex-grow: 1;">&nbsp;</span>
                            <span class="tile-energy-monitor-data-energy">
                                <span v-if="energyTN %3 === 1" class="energy-t1">{{Number(energyT1).toFixed(0)}}</span>
                                <span v-else-if="energyTN %3 === 2" class="energy-t2">{{Number(energyT2).toFixed(0)}}</span>
                                <span v-else class="energy-t">{{Number(energy).toFixed(0)}}</span>
                            </span>
                        </nobr>
                    </div>
                </div>
            </div>
            <div class="tile-data tile-energy-monitor-data">
                <div class="tile-energy-monitor-data-voltage">
                    <div class="zoom-place">
                        <div class="zoomed-content">
                            <span>{{Number(voltage).toFixed(0)}}</span>
                        </div>
                    </div>
                </div>
                <div class="tile-energy-monitor-data-current">
                    <div class="zoom-place">
                        <div class="zoomed-content">
                            <span>{{Number(current).toFixed(1)}}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    }
);

// noinspection CssUnusedSymbol
document.write(`
<style type="text/css">
    .tile-energy-monitor-data .zoomed-content{
        zoom: 1;
        --max-zoom: 5;
    }
</style>
`);

function doResizeTilesContent() {
    setTimeout(()=>{
        doZoom('.tile-energy-monitor-data .zoomed-content');
    }, 100);
}
window.addEventListener('resize', doResizeTilesContent, false);

// noinspection JSUnusedLocalSymbols
wscli.commands.add({TileCount: Number}, (arg) => {
        doResizeTilesContent();
        return true;
    }
);


Vue.component('tile-energy-monitor-settings', {
    props: {
        type: String,
        tile: Object,
    },
    computed:{
        params(){
            return this.tile.params;
        },
        sensors(){
            let res = vSensors.sensors.toArray().filter((sd)=> (sd.param('voltage') !== undefined));
            if(this.sensor && !res.find(item => item.id === this.sensor))
                res.splice(0, 0, vSensors.sensors[this.sensor] || new SensorData(this.sensor));
            return res;
        },
        sensor: {
            get(){
                return Number(this.params.sensor);
            },
            set(val) {
                this.setParam({sensor: val});
            }
        },
    },
    methods: {
        setParam(param){
            let params = Object.assign(this.params);
            for(let key in param)// noinspection JSUnfilteredForInLoop
                params[key] = param[key];
            mm.tiles.setParams(this.tile.id, params);
        },
        onShow(){
            if(!this._isActive) {
                this._isActive = !this._isActive;
                sensorsInfoQuery.start();
            }
        },
        onHide(){
            if(this._isActive) {
                this._isActive = !this._isActive;
                sensorsInfoQuery.stop();
            }
        },
    },
    created() {
        this.$parent.$on('show-' + this.type, this.onShow);
        this.$parent.$on('hide-' + this.type, this.onHide);
    },
    template: `
           <div>
                <div>
                    <span>Датчик</span>
                    <select v-model="sensor">
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">
                            {{String(sensor)}}{{sensor ? ', ' + sensor.param('voltage')/10 + 'B' : ''}}
                        </option>
                    </select>
                </div>
            </div>
        `
});


}
                    
mm['tile-energy-monitor'] = new tileEnergyMonitor_class();
