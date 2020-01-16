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
        //this.$parent.$on('show', this.onShow);
        this.$parent.$on('resize', doResizeTilesContent);
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
        /*onShow(){
            //doResizeTilesContent();
        },*/
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
                                <span>{{Number(this['energy' + (energyTN % 3 ? 'T' + (energyTN % 3) : '')]).toFixed(0)}}</span><span>T{{energyTN % 3 || ''}}</span>
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
//window.addEventListener('resize', doResizeTilesContent, false);

// noinspection JSUnusedLocalSymbols
/*wscli.commands.add({Count: Number}, (arg) => {
        if (wscli.context.current === wscli.context.tile) {
            doResizeTilesContent();
            return true;
        }
    }
);
*/

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
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">{{String(sensor)}}{{sensor ? ', ' + sensor.param('voltage')/10 + 'B' : ''}}</option>
                    </select>
                </div>
            </div>
        `
});

