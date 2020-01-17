

const config = {};


function TimeSchema(pId) {
    this.params = {};
    this._id = pId;
    this._name = '';
}
Object.defineProperty(TimeSchema.prototype, 'id', {
    get() { return this._id; },
    set(val) { throw('Property is read only'); },
});
Object.defineProperty(TimeSchema.prototype, 'name', {
    get() {
        return this._name;
    },
    set(val) {
        this._name = val;
    },
});


function TimeSchemas() {
}

TimeSchemas.prototype.toArray = function () {
    let res = [];
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach((id)=>res.push(this[id]));
    return res;
};
TimeSchemas.prototype.length = function () {
    let res = 0;
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach(() => res++);
    return res;
};

function DataItem() {
    this.time = 0;
    this.value = undefined;
}
function DOWData(pdow) {
    this._dow = pdow;
    this.use = false;
    this.data = [new DataItem(), new DataItem()];
}
Object.defineProperty(DOWData.prototype, 'dow', {
    get() { return this._dow; },
    set(val) { throw('Property is read only'); },
});


const vTimeSchemaSettings = new Vue({
    data: {
        //_isActive: false,
        _selectedTimeSchemaId: undefined,
        timeSchemas: new TimeSchemas(),
        dowData:[]
    },

    methods: {
        onShow(params){
            //this.$data._isActive = true;
            if(params && params.TimeSchemaId)
                this.selectedTimeSchemaId = params.TimeSchemaId;
        },
        onHide(){
            //this.$data._isActive = false;
        },
        checkTimeSchema(t, allowZero){
            return checkInRange(t, allowZero ? 0 : 1, this.timeSchemas.length(), "Time schema id");
        },
        setTimeSchemasCount(val){
            let count = this.timeSchemas.length();
            if(count !== val) {
                while (count < val){
                    count++;
                    Vue.set(this.timeSchemas, count, new TimeSchema(count));
                    wscli.send(`#TimeSchema:${count},GetName,GetParams`);
                }
                while (count > val)
                    Vue.delete(this.timeSchemas, count--);
            }
            if(val && !this.selectedTimeSchemaId)
                this.selectedTimeSchemaId = 1;
            else if(!val)
                this.selectedTimeSchemaId = 0;

        },
        setParams(id, params){
            let data = `#TimeSchema:${id},SetParams:${wscli.data.toString(params)}`;
            wscli.send(data);
        },
        setName(id, name){
            let data = `#TimeSchema:${id},SetName:${wscli.data.toString(name)}`;
            wscli.send(data);
        },
    },
    computed:{
        timeSchemasCount: {
            get(){ return this.timeSchemas.length();},
            set(val){
                wscli.send(`#TimeSchema,SetCount:${val}`);
                if(val && this.selectedTimeSchemaId > val)
                    this.selectedTimeSchemaId = val;
            }
        },
        selectedTimeSchema(){
            return this.TimeSchemas[this.selectedTimeSchemaId] || {}; // для старта, когда нет схем
        },
        selectedTimeSchemaId: {
            get(){ return this.$data._selectedTimeSchemaId; },
            set(id){
                this.$data._selectedTimeSchemaId = id;
                if(id)
                    wscli.send(`#TimeSchema:${id},GetName,GetParams`);
            }
        },
        selectedTimeSchemaName: {
            get(){
                return (this.selectedTimeSchemaId && this.timeSchemas[this.selectedTimeSchemaId])
                    ? this.timeSchemas[this.selectedTimeSchemaId].name
                    : ''; },
            set(val){ this.setName(this.selectedTimeSchemaId, val); }
        },
    },
    created: function() {
        for(let i = 0; i <= 7; i++)
            this.dowData.push(new DOWData(i));
    },
    template:`
    <div id="tab-content-time-schema-settings" title="Настройка схемы">
        <div class="sProperties">
            <div>
                <div>
                    <span>Схема</span>
                    <select v-model="selectedTimeSchemaId">
                        <option v-for="timeSchema in timeSchemas" v-bind:value="timeSchema.id">{{timeSchema.id}}</option>
                    </select>
                    <div class="button-inc-dec">
                        <span> из </span>
                        <button v-on:click="timeSchemasCount--" class="button-inc-dec">-</button>
                        <span>{{timeSchemasCount}}</span>
                        <button v-on:click="timeSchemasCount++" class="button-inc-dec">+</button>
                    </div>
                </div>
                <div v-show="selectedTimeSchemaId">
                    <span>Название схемы</span>
                    <input type="text" v-model.lazy="selectedTimeSchemaName">
                </div>
            </div>
            <div v-for="dow in dowData" v-show="selectedTimeSchemaId" class="values-short">
                <div> <!--v-on:change="setParams(dow.)"-->
                    <input v-if="dow.dow >= 1" type="checkbox" v-model="dow.use" >
                    <span>{{['Общая настройка', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][dow.dow]}}</span>
                </div>

                <div v-show="(!dow.dow) || dow.use">
                    <span>время</span>
                    <div>
                    <!--v-model="settings[dow - 1][(int - 1)].begin_time"
                               v-on:change="set_begin_time(dow - 1, int)"v-m    odel="settings[dow - 1][(int - 1)].temperature"
                               v-on:change="set_temperature(dow - 1, int)"
                    -->
                        <input v-for="item in dow.data" type="text" placeholder="hh:mm"
                               >
                    </div>
                </div>
                <div v-show="(!dow.dow) || dow.use">
                    <span>температура,&deg;C</span>
                    <div>
                        <input v-for="item in dow.data" type="text" placeholder="00.0"
                               >
                    </div>
                </div>

            </div>
            
        </div>
    </div>`

});

vContent.addTab({component: vTimeSchemaSettings, id: 'time-schema-settings'}, {before: 'sensors'});

wscli.context.add('timeSchema');
wscli.commands.add({TimeSchema: Number}, (arg) => {
        wscli.context.current = wscli.context.timeSchema;
        vTimeSchemaSettings.checkTimeSchema(arg, true);
        wscli.current.timeSchema = arg;
        return true;
    }
);

wscli.commands.add({Name: String}, (arg)=> {
        if(wscli.context.current === wscli.context.timeSchema){
            vTimeSchemaSettings.checkTimeSchema(wscli.current.timeSchema);
            Vue.set(vTimeSchemaSettings.timeSchemas[wscli.current.timeSchema], "name", arg);
            return true;
        }
    }
);

wscli.commands.add({Params: Object}, (arg) =>{
        if(wscli.context.current === wscli.context.timeSchema){
            vTimeSchemaSettings.checkTimeSchema(wscli.current.timeSchema);
            Vue.set(vTimeSchemaSettings.timeSchemas[wscli.current.timeSchema], 'params', arg);
            return true;
        }
    }
);

wscli.commands.add({Count: Number}, (arg) => {
        if (wscli.context.current === wscli.context.timeSchema) {
            checkInRange(wscli.current.timeSchema, 0, 0, 'Time schema');
            vTimeSchemaSettings.setTimeSchemasCount(arg);
            return true;
        }
    }
);
