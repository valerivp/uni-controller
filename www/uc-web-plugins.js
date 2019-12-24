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
        tilesCount: 0
    },
    mutations: {
        setTilesCount:(state, val) => state.tilesCount = val,
    },
    strict: (location.protocol === 'file:'),

});
tiles$store.mutation = {
    setTilesCount:'setTilesCount'
};

const vTiles = new Vue({
    data: {
        currentTile: undefined,
        tiles:   [],
    },

    methods: {
        changeTileSetting(id){
            //vTileSettings.selectTile(id);
            vContent.setTab('tile-settings');
        },
        checkTile: function(t){ let tt = ( t === undefined ? this.currentTile : Number(t)); return (Boolean(tt) && this.tiles.length >= tt )},
        setTilesCount: function(count) {
            tiles$store.commit(tiles$store.mutation.setTilesCount, count);
            while (this.tiles.length <= count)
                this.tiles.push({id: this.tiles.length + 1});
            while (this.tiles.length > count)
                this.tiles.pop();
        },
        getClass(id){
            let l = [[1], [2,2], [3,3,3], [2,2,2,2], [2,2,3,3,3], [3,3,3,3,3,3], [3,3,3,4,4,4,4],[4,4,4,4,4,4,4,4]];
            let p = [[1],[1,1],[1,1,1],[1,2,2,1],[2,2,1,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,1],[2,2,2,2,2,2,2,2]];
            return `sTilesCount${this.tiles.length}`
                + ` l${l[this.tiles.length - 1][id - 1]}-in-line`
                + ` p${p[this.tiles.length - 1][id - 1]}-in-line`
            ;

        }
    },
    computed:{
        tilesCount: function(){return this.tiles.length;}
    },
    created: function() {
        ws.on('open', ()=>{
            wscli.send("#GetTilesCount");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles" v-bind:class="getClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
        <div class="sTile border3d">x</div>
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

vTilesComponentsTypes.add('test', {title: 'Компонент'});

const vTileSettings = new Vue({
    data: {
        selectedType: undefined

    },

    methods: {
        selectTile(id){

        },
        onSelectType(){},
    },
    computed:{
        types: ()=> vTilesComponentsTypes,
    },
    created: function() {
    },
    template:`
    <div id="tab-content-tile-settings" title="Настройка">
        <div class="sProperties">
            <div>
                <div>
                    <span>Компонент</span>
                    <select v-model="selectedType" v-on:change="onSelectType">
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTileSettings, id: 'tile-settings'}, {after: 'tiles'});





wscli.context.add('tile');
wscli.commands.add(
    'Tile',
    (arg) => {
        // noinspection JSUnresolvedVariable
        if(wscli.context.setCurrent(wscli.context.tile)){
            if(vTiles.checkTile(Number(arg))){
                vTiles.currentTile = Number(arg)
            }else{
                wscli.setError("Tile wrong");
            }
            return true;
        }else
            return false;
    }
);

wscli.commands.add(
    'TileCount',
    (arg) => {
        vTiles.setTilesCount(Number(arg));
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
            onFetch: () => { wscli.send("#GetTilesCount"); },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
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
