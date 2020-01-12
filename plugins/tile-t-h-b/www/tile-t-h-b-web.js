
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
