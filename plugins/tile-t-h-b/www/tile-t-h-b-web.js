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
