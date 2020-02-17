const regulators = require('regulators');
regulators.components.types.add('regulator-thermo', {title: 'Регулятор температуры'});

const timeSchemas = require('time-schema');
const TimeSchemas = timeSchemas.TimeSchemas;


Vue.component('regulator-thermo-settings', {
    data:()=>({

    }),
    props: {
        type: String,
        component: Object,
        parent: Object
    },
    computed: {
        timeSchemas: ()=>timeSchemas.TimeSchemas,
        params() {
            return this.component.params;
        },
        timeSchema: {
            get(){
                return Number(this.params.timeSchema);
            },
            set(val) {
                this.setParam({timeSchema: val});
            }
        },

    },
    methods: {
        setParam(param) {
            let params = Object.assign(this.params);
            for (let key in param)// noinspection JSUnfilteredForInLoop
                params[key] = param[key];
            this.parent.setParams(this.component.id, params);
        },
    },
    created() {
    },
    template: `
           <div>
                <div>
                    <div>
                        <span>Схема</span>
                        <select v-model="timeSchema">
                            <option disabled value="0" v-if="!timeSchemas.length">не выбрано</option>
                            <option v-for="timeSchema in timeSchemas" v-bind:value="timeSchema.id">{{String(timeSchema)}}</option>
                        </select>
                    </div>
                </div>
            </div>
        `
});


