const TimeSchemaComponentsTypes = function () {
};
TimeSchemaComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;

};
TimeSchemaComponentsTypes.prototype.length = function () {
    let res = 0;
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach(() => res++);
    return res;
};

const vTimeSchemaComponentsTypes = new TimeSchemaComponentsTypes;
module.exports.components = {types: vTimeSchemaComponentsTypes};


function DataItem(par) {
    this.time = (par || {}).time;
    this.value = (par || {}).value;
}
DataItem.prototype._toString = DataItem.prototype.toString;

DataItem.prototype.parseTime = function(){
    if(this.time !== undefined) {
        let t = String(this.time).replaceAll(':', '');
        t = Number.parseInt(t) % 10000;
        t = isNaN(t) ? undefined : (t > 2359 ? 2359 : (t < 0 ? 0 : t));
        t = t === undefined ? undefined
            : `${String('00' + Math.trunc(t / 100)).slice(-2)}:${String('00' + (t % 100)).slice(-2)}`;
        return t;
    }
};
DataItem.prototype.timeToData = function(){
    let t = this.parseTime();
    return t === undefined ? undefined : String(t).replaceAll(':', '');
};

function DOWData(pdow) {
    this._dow = pdow;
    this.use = false;
    this.data = [];
}
Object.defineProperty(DOWData.prototype, 'dow', {
    get() { return this._dow; },
    set(val) { throw('Property is read only'); },
});


function TimeSchema(pId) {
    this.params = {};
    this._id = pId;
    this._type = undefined;
    this.name = '';
}
Object.defineProperty(TimeSchema.prototype, 'id', {
    get() { return this._id; },
    set(val) { throw('Property is read only'); },
});
Object.defineProperty(TimeSchema.prototype, 'type', {
    get() {
        return this._type;
    },
    set(val) {
        if(val !== this._type){
            this.params = {};
            this._type = val;
        }
    },
});
TimeSchema.prototype.toString = function(){
    return this.name.trim() === '' ? this.id : this.name;
};


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



const vTimeSchemaSettings = new Vue({
    data: {
        // _isActive: false,
        _selectedTimeSchemaId: 0,
        timeSchemas: new TimeSchemas(),
        dowData:[]
    },

    methods: {
        onShow(params){
            if(params && params.TimeSchemaId)
                this.selectedTimeSchemaId = params.TimeSchemaId;
        },
        onHide(){
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
                    wscli.send(`#TimeSchema:${count},GetName`);
                }
                while (count > val)
                    Vue.delete(this.timeSchemas, count--);
            }
            if(val && !this.selectedTimeSchemaId)
                this.selectedTimeSchemaId = 1;
            else if(!val)
                this.selectedTimeSchemaId = 0;

        },
        setName(id, name){
            let data = `#TimeSchema:${id},SetName:${wscli.data.toString(name)}`;
            wscli.send(data);
        },
        setType(){
            wscli.send(`#TimeSchema:${this.selectedTimeSchemaId},SetType:${this.selectedTypeName}`);
        },
        setParams(dow, item){
            let data = this.dowData[dow].data;
            data = data
                .map((item)=>({
                    time: item.timeToData(),
                    value: vTimeSchemaSettings.typeInfo.valueToData(item.value)
                }))
                .filter((item)=>(item.time !== undefined ));
            let data1 = {};
            data1[`dow=${dow}`] = data.map((item)=>wscli.data.toString(item));
            wscli.send(`#TimeSchema:${this.selectedTimeSchemaId},SetParams:${wscli.data.toString(data1)}`);
        },

        setDOWmask(){
            let mask = "";
            for (var dow = 0; dow < 7; dow++) {
                mask = (this.dowData[dow + 1].use ? "1" : "0") + mask;
            }
            mask = Number('0b' + mask);
            wscli.send(`#TimeSchema:${this.selectedTimeSchemaId},SetParams:${wscli.data.toString({DOWmask: mask})}`);
        },
    },
    computed:{
        typeInfo(){
            return vTimeSchemaComponentsTypes[this.selectedTimeSchema.type];
        },
        types(){
            let res = vTimeSchemaComponentsTypes;
            if(this.selectedTypeName && !res[this.selectedTypeName]){
                res = Object.assign(new TimeSchemaComponentsTypes(), res);
                res.add(this.selectedTypeName, {title: this.selectedTypeName + ', not installed'});
            }
            return res;
        },
        timeSchemasCount: {
            get(){ return this.timeSchemas.length();},
            set(val){
                wscli.send(`#TimeSchema,SetCount:${val}`);
            }
        },
        selectedTimeSchema(){
            return this.timeSchemas[this.selectedTimeSchemaId] || {}; // для старта, когда нет схем
        },
        selectedTimeSchemaId: {
            get(){ return this.$data._selectedTimeSchemaId; },
            set(id){
                this.$data._selectedTimeSchemaId = id;
                if(id)
                    wscli.send(`#TimeSchema:${id},GetName,GetType,GetParams`);
            }
        },
        selectedTimeSchemaName: {
            get(){
                return (this.selectedTimeSchemaId && this.timeSchemas[this.selectedTimeSchemaId])
                    ? this.timeSchemas[this.selectedTimeSchemaId].name
                    : ''; },
            set(val){ this.setName(this.selectedTimeSchemaId, val); }
        },
        selectedTypeName: {
            get: function(){ return this.selectedTimeSchema.type; },
            set: function(val){
                if(val && this.selectedTimeSchema.type !== val){
                    wscli.send(`#TimeSchema:${this.selectedTimeSchemaId},SetType:${val}`);
                }
            }
        },
    },
    watch:{
        selectedTypeName: function (newVal, oldVal) {
            if(newVal)
                wscli.send(`#TimeSchema:${this.selectedTimeSchemaId},GetParams`);
        }
    },
    created: function() {
        for(let i = 0; i <= 7; i++)
            this.dowData.push(new DOWData(i));
    },
    template:`
    <div id="tab-content-time-schema-settings" title="Настройка схем">
        <div class="sProperties">
            <div>
                <div>
                    <span>Схема</span>
                    <select v-model="selectedTimeSchemaId">
                        <option disabled value="0" v-if="!timeSchemas.length()">не выбрано</option>
                        <option v-for="timeSchema in timeSchemas" v-bind:value="timeSchema.id">{{String(timeSchema)}}</option>
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
            <div v-show="selectedTimeSchemaId">
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedTypeName">
                        <option disabled value="" v-if="!types.length()">не выбрано</option>
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            
            <div v-for="dow in dowData" class="values-short" v-if="selectedTypeName">
            
                <div> 
                    <label><input v-if="dow.dow >= 1" type="checkbox" v-model="dow.use" 
                        v-on:change="setDOWmask()">
                    <span>{{['Общая настройка', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][dow.dow]}}</span>
                    </label>
                </div>
                <div v-if="(!dow.dow) || dow.use" class="time-value">
                    <div>
                        <span>время</span>
                        <span>{{typeInfo.caption}}<span style="font-size: 0.75em; margin: 0;">{{(typeInfo.unit ? (', ' + typeInfo.unit) : '') }}</span></span>
                    </div>
                    <div v-for="item in dow.data">
                        <input type="text" placeholder="hh:mm"
                            style="text-align: center;"
                            v-model="item.time" v-on:change="setParams(dow.dow, item)">
                        <input type="checkbox" v-if="typeInfo.type === Boolean"
                            v-bind:style="typeInfo.style"
                            v-show="item.time !== undefined"
                            v-model="item.value" v-on:change="setParams(dow.dow, item)">
                        <input type="text" v-if="typeInfo.type !== Boolean"
                            v-bind:placeholder="typeInfo.placeholder"
                            v-show="item.time !== undefined"
                            v-bind:style="typeInfo.style"
                            v-model="item.value" v-on:change="setParams(dow.dow, item)">
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

function SetInfo(info, arg) {
    if(wscli.context.current === wscli.context.timeSchema){
        vTimeSchemaSettings.checkTimeSchema(wscli.current.timeSchema);
        Vue.set(vTimeSchemaSettings.timeSchemas[wscli.current.timeSchema], info, arg);
        return true;
    }
}


wscli.commands.add({Name: String}, SetInfo.bind(undefined, 'name'));
wscli.commands.add({Type: String}, SetInfo.bind(undefined, 'type'));

wscli.commands.add({Count: Number}, (arg) => {
        if (wscli.context.current === wscli.context.timeSchema) {
            checkInRange(wscli.current.timeSchema, 0, 0, 'Time schema');
            vTimeSchemaSettings.setTimeSchemasCount(arg);
            return true;
        }
    }
);

wscli.commands.add({Params: Object}, (arg)=>{
    if(wscli.context.current === wscli.context.timeSchema){
        vTimeSchemaSettings.checkTimeSchema(wscli.current.timeSchema);
        for(let key in arg){
            if(key === 'DOWmask'){
                let use = arg.DOWmask | 0;
                Vue.set(vTimeSchemaSettings.dowData[0], 'use', true);
                for(let i = 0; i < 7; i++)
                    Vue.set(vTimeSchemaSettings.dowData[i + 1], 'use', (use & (0x1 << i)) !== 0);
            }else if(key.startsWith('dow=')){
                let dow = wscli.data.fromString(key, Object).dow;
                let data = wscli.data.fromString(arg[key], Array);

                data = data.map((item) => wscli.data.fromString(item, Object));
                data = data.map((item) => {
                    let obj = new DataItem(item);
                    return new DataItem({
                        time: obj.parseTime(),
                        value: vTimeSchemaSettings.typeInfo.valueFromData(obj.value)
                    });
                });

                data = data.filter((item)=>( item.time !== undefined))
                    .sort((item1, item2)=> {
                        if(item1.time === item2.time)
                            return 0;
                        else if(item1.time === undefined)
                            return -1;
                        else if(item2.time === undefined)
                            return -1;
                        else
                            return item1.time < item2.time ? -1 : 1;
                    })
                    .concat(new DataItem());

                Vue.set(vTimeSchemaSettings.dowData[dow], 'data', data);
            }
        }
        return true;
    }
});
