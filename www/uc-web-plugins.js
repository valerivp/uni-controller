'use strict';


/* clock-at-logo v.0.0.6 */

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
/* sensors-wth433 v.0.0.1 */
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

/* sensors-ds18b20 v.0.0.1 */
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

/* sensors-pzem004t v.0.0.1 */
sensorsTypes.add( 'PZEM004T', {
    voltage: {
        title: 'Напря\u00ADжение, В',
        align: 'right',
        data: (sd) => Number(sd.param('voltage') / 10).toFixed(1)
    },
    current: {
        title: 'Ток, А',
        align: 'right',
        data: (sd) => Number(sd.param('current') / 100).toFixed(2)
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
        data: (sd) => Number(sd.param('energyT1') / 1000).toFixed(1)
    },
    energyT2: {
        title: 'Энергия Т2, кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energyT2') / 1000).toFixed(1)
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
});

/* mqtt-udp-publicator v.0.0.1 */
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

/* tiles v.0.0.1 */

const TilesComponentsTypes = function () {
};
TilesComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;
};
const vTilesComponentsTypes = new TilesComponentsTypes;

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
        currentTileId: undefined,
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
                    Vue.set(this.tiles, tilesCount, {id: tilesCount});
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
            return wscli.checkInRange(t, 1, this.tiles.length(), "Tile id");
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
            let data = `#Tile:${id},SetParams:`;
            let delimiter = '';
            for(let key in params){ // noinspection JSUnfilteredForInLoop
                data += `${delimiter}${key}=${params[key]}`;
                delimiter = '/';
            }
            wscli.send(data);
        }
    },
    created: function() {
        ws.on('open', ()=>{
            wscli.send("#GetTilesCount,Tile,GetType,GetParams");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles.toArray()" v-bind:class="getCSSClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
            <div class="sTile border3d">{{tile.name}}: {{tile.id}} x {{tile.type}}
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
        _selectedTileId: undefined
    },

    methods: {
        onShow(params){
            if(params && params.tileId)
                this.selectedTileId = params.tileId;
            if(this.selectedTypeName)
                setTimeout(this.$emit.bind(this, `show-${this.selectedTypeName}-settings`), 2);
        },
        onHide(){
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
            return this.tiles[this.selectedTileId];
        },
        selectedTileId: {
            get(){ return this.$data._selectedTileId; },
            set(id){
                this.$data._selectedTileId = id;
                wscli.send(`#Tile:${id},GetType,GetParams`);
            }
        },
        selectedTypeName: {
            get: function(){ return (this.tiles[this.selectedTileId] || {}).type; },
            set: function(t){
                if(t){
                    vTiles.setType(this.selectedTileId, t);
                }
            }
        },
    },
    watch:{
        selectedTypeName: function (newVal, oldVal) {
            if(oldVal)
                setTimeout(this.$emit.bind(this, `hide-${oldVal}-settings`), 1);
            if(newVal)
                setTimeout(this.$emit.bind(this, `show-${newVal}-settings`), 2);
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
                <!--<div>
                    <span>Наименование</span>
                    <input v-model="selectedTileName" maxlength="32" v-on:change="onChangeName">
                </div>-->
            </div>
            <div>
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedTypeName">
                        <option v-for="type in types()" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            <div v-bind:is="selectedTypeName + '-settings'" v-if="selectedTypeName" v-bind:type="selectedTypeName + '-settings'">
            
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTileSettings, id: 'tile-settings'}, {after: 'tiles'});

wscli.context.add('tile');
wscli.commands.add(
    'Tile',
    (arg) => {
        arg = 0 | arg;
        let res = false;
        if(wscli.context.setCurrent(wscli.context.tile)){
            if(vTiles.checkTile(arg)){
                vTiles.currentTileId = arg;
                res = true;
            }
        }
        return res;
    }
);

wscli.commands.add('Type', function (arg) {
        if(wscli.context.getCurrent() === wscli.context.tile){
            let res = false;
            if(vTiles.checkTile(vTiles.currentTileId)){
                if(vTiles.tiles[vTiles.currentTileId].type !== arg)
                    Vue.set(vTiles.tiles, vTiles.currentTileId, {id: vTiles.currentTileId, type: arg});
                res = true;
            }
            return res;
        }
    }
);

wscli.commands.add('Params', function (arg) {
        if(wscli.context.getCurrent() === wscli.context.tile){
            let res = false;
            if(vTiles.checkTile(vTiles.currentTileId)){
                //let data = {id: vTiles.currentTileId};
                let arr = String(arg).match(/(?:[^\/\\]+|\\.)+/gm) || [];
                let params = {};
                arr.forEach(function (item) {
                    let param = item.match(/(?:[^=\\]+|\\.)+/)[0];
                    params[param.toLowerCase()] = item.slice(param.length + 1);
                });
                //data.params = params;
                Vue.set(vTiles.tiles[vTiles.currentTileId], 'params', params);
                res = true;
            }
            return res;
        }
    }
);

wscli.commands.add(
    'TileCount',
    (arg) => {
        arg = 0 | arg;
        vTiles.setTilesCount(arg);
        return true;
    }
);


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
/*
setTimeout(()=>console.log(3), 3);
setTimeout(()=>console.log(2), 2);
setTimeout(()=>console.log(4), 4);
setTimeout(()=>console.log(0), 0);
*/
/* sensor-data-sender v.0.0.1 */
wscli.commands.add(
    'Autosend',
    (arg) => {
        arg = 0 | arg;
        if(wscli.context.getCurrent() === wscli.context.sensor)
            return true;
    }
);

/* tile-temperature-humidity-battery v.0.0.1 */
vTilesComponentsTypes.add('tile-temperature', {title: 'Температура и влажность'});

Vue.component('tile-temperature', {
    computed:{
        sensor: function () {
            return this.params ? vSensors.sensors[this.params.sensor] || {} : {};
        },
        temperature: function () {
            let temperature = this.sensor.param ? this.sensor.param('temperature') : undefined;
            return (temperature !== undefined) ? temperature / 10 : undefined;
        }
    },
    props: {
        name: String,
        params: Object
    },
    template: `
        <div><h3>temperature {{ sensor.name }} {{ params }}</h3>
        {{temperature === undefined ? '-.-' : Number(temperature).toFixed(1) }}
        </div>`
});

Vue.component('tile-temperature-settings', {
    data: ()=>({
        params: {},
        //_isActive: false
    }),
    props: {
        type: String,
    },
    computed:{
        sensors(){
            let res = vSensors.sensors.toArray().filter((sd)=> (sd.param('temperature') !== undefined));
            if(this.sensor && !res[this.sensor]){
                res = res.slice();
                res.splice(0, 0, new SensorData(this.sensor));
            }
            return res;
        },
        sensor: {
            get(){
                return (vTileSettings.selectedTile.params || {}).sensor
            },
            set(s) {
                this.params.sensor = s;
                vTiles.setParams(vTileSettings.selectedTileId, this.params);
            }
        },
    },
    methods: {
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
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">{{sensor.toString()}}</option>
                    </select>
                </div>
            </div>
        `
});
