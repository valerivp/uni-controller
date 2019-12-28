'use strict';


/* clock-at-logo v.0.0.6 */

addElement("div", "main-logo").id = "clock-at-logo";

new Vue({
    el: '#clock-at-logo',
    computed: {
        time: ()=> $store.state.time,
    },
    template: `
    <div id="clock-at-logo" onclick="vContent.setTab(0)">
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
const tiles$store = new Vuex.Store({
    state: {
        tilesCount: 0,
        tiles: [],
        selectedTile: 0,
    },
    mutations: {
        setTilesCount:(state, val) => {
            if(state.tilesCount !== val) {
                state.tilesCount = val;
                let tiles = state.tiles;
                while (tiles.length <= val)
                    tiles.push({id: tiles.length + 1});
                while (tiles.length > val)
                    tiles.pop();
            }
        },
        setSelectedTile:(state, val) => {
            if(state.selectedTile !== val)
                state.selectedTile = val;
        },
        setTileData: (state, val) => {
            let tmp = state.tiles[val.id - 1];
            for(let key in val) // noinspection JSUnfilteredForInLoop
                tmp[key] = val[key];
            Vue.set(state.tiles, val.id - 1, tmp);
        }
    },
    strict: (location.protocol === 'file:'),
});
tiles$store.mutation = {
    setTilesCount: 'setTilesCount',
    setSelectedTile: 'setSelectedTile',
    setTileData: 'setTileData'
};

// noinspection HtmlUnknownAttribute
const vTiles = new Vue({
    data: {
        currentTile: undefined,
    },

    methods: {
        setTilesCount: (count)=> tiles$store.commit(tiles$store.mutation.setTilesCount, count),
        changeTileSetting: (id)=>{
            tiles$store.commit(tiles$store.mutation.setSelectedTile, id);
            vContent.setTab('tile-settings');
        },
        checkTile:(t)=> wscli.checkInRange(t, 1, tiles$store.state.tilesCount, "Tile id"),

        getClass: (id) =>{
            let tilesCount = tiles$store.state.tilesCount;
            let l = [[1], [2,2], [3,3,3], [2,2,2,2], [2,2,3,3,3], [3,3,3,3,3,3], [3,3,3,4,4,4,4],[4,4,4,4,4,4,4,4]];
            let p = [[1],[1,1],[1,1,1],[1,2,2,1],[2,2,1,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,1],[2,2,2,2,2,2,2,2]];
            return `sTilesCount${tilesCount}`
                + ` l${l[tilesCount - 1][id - 1]}-in-line`
                + ` p${p[tilesCount - 1][id - 1]}-in-line`
            ;
        },
        setType: (id, type)=>{
            if(tiles$store.state.tiles[id - 1].type !== type)
                wscli.send(`#Tile:${id},SetType:${type},GetParams`);
        },
/*        setName: (id, name)=>{
            if(tiles$store.state.tiles[id - 1].name !== name)
                wscli.send(`#Tile:${id},SetName:${name}`);
        },
*/        setParams: (id, params)=>{
            let data = `#Tile:${id},SetParams:`;
            let delimiter = '';
            for(let key in params){ // noinspection JSUnfilteredForInLoop
                data += `${delimiter}${key}=${params[key]}`;
                delimiter = '/';
            }
            wscli.send(data);
        }
    },
    computed:{
        tiles: ()=> tiles$store.state.tiles,
    },
    created: function() {
        ws.on('open', ()=>{
            wscli.send("#GetTilesCount,Tile,GetType,GetParams");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles" v-bind:class="getClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
            <div class="sTile border3d">{{tile.name}}: {{tile.id}} x {{tile.type}}
                <div v-bind:params="tile.params" v-bind:is="tile.type">
                
                </div>
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTiles, id: 'tiles'}, {before: 'sensors'});

const tTilesComponentsTypes = function () {
};
tTilesComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;
};
const vTilesComponentsTypes = new tTilesComponentsTypes;

vTilesComponentsTypes.add('tile-test', {title: 'Компонент'});
vTilesComponentsTypes.add('tile-second', {title: 'Второй'});

const vTileSettings = new Vue({
    data: {
        tmpName:''
    },

    methods: {
        onShow(){
            this.$emit('fetch');
        },
        onHide(){
            this.$emit('drop');
        },
        onSelectTile(arg){
            //this.selectedType = vTiles.tiles[this.selectedTile - 1].type;
        },
        onSelectType(){
            //this.$emit('fetch');
            //vTiles.setType(this.selectedTile, this.selectedType);
        },
/*        onChangeName(arg){
            if(this.tmpName)
                vTiles.setName(this.selectedTile, this.tmpName);
            //this.$emit('fetch');
            //vTiles.setType(this.selectedTile, this.selectedType);
        },
*/    },
    computed:{
        tiles: ()=> tiles$store.state.tiles,
        types: ()=> vTilesComponentsTypes,
        selectedTile: {
            get: ()=> tiles$store.state.selectedTile,
            set: function(id){
                this.$emit('drop');
                tiles$store.commit(tiles$store.mutation.setSelectedTile, id);
                this.$emit('fetch');
            }
        },
        selectedType: {
            get: function(){ return (this.tiles[this.selectedTile - 1] || {}).type; },
            set: function(t){
                this.$emit('drop');
                if(t)
                    vTiles.setType(this.selectedTile, t);
                this.$emit('fetch');
            }
        },
/*        selectedTileName: {
            get: function(){ return (this.tiles[this.selectedTile - 1] || {}).name; },
            set: function(n){
                this.tmpName = n;
            }
        },
*/    },
    created: function() {
    },
    template:`
    <div id="tab-content-tile-settings" title="Настройка">
        <div class="sProperties">
            <div>
                <div>
                    <span>Панель</span>
                    <select v-model="selectedTile">
                        <option v-for="tile in tiles" v-bind:value="tile.id">{{tile.id}}</option>
                    </select>
                </div>
                <!--<div>
                    <span>Наименование</span>
                    <input v-model="selectedTileName" maxlength="32" v-on:change="onChangeName">
                </div>-->
            </div>
            <div>
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedType">
                        <option v-for="type in types" v-bind:value="type.name">{{type.name}}, {{type.title}}</option>
                    </select>
                </div>
            </div>
            <div v-bind:is="selectedType + '-settings'" v-if="selectedType">
            
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
                vTiles.currentTile = arg;
                res = true;
            }
        }
        return res;
    }
);
//wscli.commands.add('Name', receiveSensorInfo.bind(undefined, 'name'));
wscli.commands.add('Type', function (arg) {
        if(wscli.context.getCurrent() === wscli.context.tile){
            let res = false;
            if(vTiles.checkTile(vTiles.currentTile)){
                let data = {id: vTiles.currentTile};
                data.type = arg;
                tiles$store.commit(tiles$store.mutation.setTileData, data);
                res = true;
            }
            return res;
        }
    }
);

wscli.commands.add('Params', function (arg) {
        if(wscli.context.getCurrent() === wscli.context.tile){
            let res = false;
            if(vTiles.checkTile(vTiles.currentTile)){
                let data = {id: vTiles.currentTile};
                let arr = String(arg).match(/(?:[^\/\\]+|\\.)+/gm) || [];
                let params = {};
                arr.forEach(function (item) {
                    let param = item.match(/(?:[^=\\]+|\\.)+/)[0];
                    params[param.toLowerCase()] = item.slice(param.length + 1);
                });
                data.params = params;
                tiles$store.commit(tiles$store.mutation.setTileData, data);
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

vSettings.add(
    Vue.component('settings-tiles-count', {
        computed: {
            tilesCount: () => tiles$store.state.tilesCount,
        },
        methods: {
            changeTilesCount: function(delta){
                wscli.send(`#SetTilesCount:${this.tilesCount + delta}`);
            },
            //onFetch: () => {  },
        },
        created: function() {
            //this.$parent.$on('fetch', this.onFetch);
            wscli.send("#GetTilesCount");
            ws.on('open', ()=>{
                wscli.send("#GetTilesCount");
            });
        },
        template:`
    <div>
        <div>
            <span>Количество плиток</span>
            <div class="button-inc-dec">
                <button v-on:click="changeTilesCount(-1)">-</button>
                <span>{{tilesCount}}</span>
                <button v-on:click="changeTilesCount(+1)">+</button>
            </div>
        </div>
    </div>`
    }),
    {after: 'settings-select-theme'}
);

vTilesComponentsTypes.add('tile-temperature', {title: 'Температура'});

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
    data: ()=>{ return {
            params: {},
            isActive: false,
        }
    },
    computed:{
        sensors: ()=>vSensors.sensors.toArray().filter((sd)=> (sd.param('temperature') !== undefined)),
        sensor: {
            get: () => (tiles$store.state.tiles[tiles$store.state.selectedTile - 1].params || {}).sensor,
            set: function (s) {
                this.params.sensor = s;
                vTiles.setParams(tiles$store.state.selectedTile, this.params);
            }
        },
    },
    methods: {
        onFetch(){
            if(!this.isActive) {
                this.isActive = !this.isActive;
                sensorsInfoQuery.start();
            }
        },
        onDrop(){
            if(this.isActive) {
                this.isActive = !this.isActive;
                sensorsInfoQuery.stop();
            }
        },
    },
    created: function() {
        this.$parent.$on('fetch', this.onFetch);
        this.$parent.$on('drop', this.onDrop);
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