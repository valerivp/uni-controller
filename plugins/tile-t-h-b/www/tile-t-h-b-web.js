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
    props: {
        type: String,
    },
    computed:{
        params(){
            return vTileSettings.selectedTile.params;
        },
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
                return this.params.sensor;
            },
            set(val) {
                this.setParam({sensor: val});
            }
        },
        showTemperature: {
            get(){
                return String(this.params['show-temperature']) === 'true';
            },
            set(val) {
                this.setParam({'show-temperature': val});
            }
        },
        showHumidity: {
            get(){
                return String(this.params['show-humidity']) === 'true';
            },
            set(val) {
                this.setParam({'show-humidity': val});
            }
        },
        showBattery: {
            get(){
                return String(this.params['show-battery']) === 'true';
            },
            set(val) {
                this.setParam({'show-battery': val});
            }
        },
    },
    methods: {
        setParam(param){
            let params = Object.assign(this.params);
            for(let key in param)
                params[key] = param[key];
            vTiles.setParams(vTileSettings.selectedTileId, params);
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
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">{{sensor.toString()}}</option>
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
