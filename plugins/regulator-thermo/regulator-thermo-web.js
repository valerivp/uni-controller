const regulators = require('regulators');
const timeSchemas = require('time-schema');

const REGULATOR_TYPE = 'thermo';


regulators.components.types.add(`regulator-${REGULATOR_TYPE}`, {title: 'Регулятор температуры'});



Vue.component(`regulator-${REGULATOR_TYPE}-settings`, {
    data:()=>({
        timeSchemas: timeSchemas.TimeSchemas,
        params: {
            timeSchema: 0,
            sensor: 0
        }

    }),
    props: {
        type: String,
        component: Object,
        parent: Object,
        regulatorID: Number,
    },
    computed: {
        timeSchema: {
            get(){
                return Number(this.params.timeSchema);
            },
            set(val) {
                this.setParam({timeSchema: val});
            }
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
    },
    created() {
        this.$parent.$on(`show-regulator-${REGULATOR_TYPE}`, this.onShow);
        this.$parent.$on(`hide-regulator-${REGULATOR_TYPE}`, this.onHide);

        this.cbParams = wscli.commands.add({Params: Object}, (arg)=>{
            if(wscli.context.current === wscli.context.regulator && wscli.current.regulator === this.regulatorID){
                for(let key in arg)
                    this.params[key.toCamel()] = arg[key];
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
           <div>
               <div>
                    <span>Схема</span>
                    <select v-model="timeSchema">
                        <option disabled value="0" v-if="!timeSchemas.length">не выбрана</option>
                        <option v-for="timeSchema in timeSchemas" v-bind:value="timeSchema.id">{{String(timeSchema)}}</option>
                    </select>
                </div>
                <div>
                    <span>Датчик</span>
                    <select v-model="sensor">
                        <option disabled value="0" v-if="!sensors.length">не выбран</option>
                        <option v-for="sensor in sensors" v-bind:value="sensor.id">{{String(sensor)}}{{sensor ? ', ' + sensor.param('temperature')/10 + '°C' : ''}}</option>
                    </select>
                </div>
                
            </div>
        `
});


