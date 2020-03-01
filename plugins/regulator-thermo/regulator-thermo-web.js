const regulators = require('regulators');
const timeSchemas = require('time-schema');

const REGULATOR_TYPE = 'thermo';


regulators.components.types.add(`regulator-${REGULATOR_TYPE}`, {title: 'Регулятор температуры'});



Vue.component(`regulator-${REGULATOR_TYPE}-settings`, {
    data:()=>({
        timeSchemas: timeSchemas.TimeSchemas,
        timeSchema: 0,
        sensor: 0,
        temperatureDeviation: 0,
        temperatureTolerance: 0
    }),
    props: {
        type: String,
        component: Object,
        parent: Object,
        regulatorID: Number,
    },
    computed: {
        sensors() {
            let res = vSensors.sensors.toArray().filter((sd) => (sd.param('temperature') !== undefined));
            if (Number(this.sensor) && !res.find(item => item.id === this.sensor))
                res.splice(0, 0, vSensors.sensors[this.sensor] || new SensorData(this.sensor));
            return res;
        },
    },
    methods: {
        setParam(param) {
            wscli.send(`#Regulator:${this.regulatorID},SetParams:${wscli.data.toString(param)}`);

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
        setDelta(field, delta){
            let params = {};
            params[field] = Math.trunc(10 * (Number(this[field]) + delta));
            this.setParam(params);
        }
    },
    created() {
        this.$parent.$on(`show-regulator-${REGULATOR_TYPE}`, this.onShow);
        this.$parent.$on(`hide-regulator-${REGULATOR_TYPE}`, this.onHide);

        this.cbParams = wscli.commands.add({Params: Object}, (arg)=>{
            if(wscli.context.current === wscli.context.regulator && wscli.current.regulator === this.regulatorID){
                for(let key in arg){
                    let val = arg[key];
                    switch(key.toCamel()){
                        case 'temperatureDeviation': val = Number(val / 10).toFixed(1); break;
                        case 'temperatureTolerance': val = Number(val / 10).toFixed(1); break;
                    }
                    this[key.toCamel()] = val;
                }
                return true;
            }
        });
    },
    beforeDestroy(){
        this.$parent.$off(`show-regulator-${REGULATOR_TYPE}`, this.onShow);
        this.$parent.$off(`hide-regulator-${REGULATOR_TYPE}`, this.onHide);

        wscli.commands.remove(this.cbParams);

    },
    template: `
           <div class="regulator-thermo">
               <div>
                    <span>Схема</span>
                    <select v-model="timeSchema" v-on:change="setParam({timeSchema: timeSchema})">
                        <option disabled value="0" v-if="!timeSchemas.length">не выбрана</option>
                        <option v-for="timeSchema in timeSchemas" v-bind:value="timeSchema.id">{{String(timeSchema)}}</option>
                    </select>
                </div>
                <div>
                    <span>Датчик</span>
                    <select v-model="sensor" v-on:change="setParam({sensor: sensor})">
                        <option disabled value="0" v-if="!sensors.length">не выбран</option>
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">{{String(sensor)}}{{sensor ? ', ' + sensor.param('temperature')/10 + '°C' : ''}}</option>
                    </select>
                </div>
                <div>
                    <span>Допустимое отклонение температуры, &deg;C</span>
                    <span class="button-inc-dec">
                        <button v-on:click="setDelta('temperatureTolerance', -0.5)">-</button>
                        <input type="text" v-model="temperatureTolerance" placeholder="±0.0"
                           v-on:change="setDelta('temperatureTolerance', 0)">
                        <button v-on:click="setDelta('temperatureTolerance', 0.5)">+</button>
                    </span>
                </div>
                <div>
                    <span>Смещение целевой температуры, &deg;C</span>
                    <span class="button-inc-dec">
                        <button v-on:click="setDelta('temperatureDeviation', -0.5)">-</button>
                        <input type="text" v-model="temperatureDeviation" placeholder="±0.0"
                           v-on:change="setDelta('temperatureDeviation', 0)">
                        <button v-on:click="setDelta('temperatureDeviation', 0.5)">+</button>
                    </span>
                </div>
                
            </div>
        `
});


