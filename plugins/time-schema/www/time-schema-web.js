
let vComponent = {
    data: {
        dowData:[new DOWData(0), new DOWData(1), new DOWData(2), new DOWData(3), new DOWData(4), new DOWData(5), new DOWData(6), new DOWData(7)]
    },
    methods: {
        setParams(dow, item){
            let data = this.dowData[dow].data;
            data = data
                .map((item)=>({
                    time: item.timeToData(),
                    value: this.typeInfo.valueToData(item.value)
                }))
                .filter((item)=>(item.time !== undefined ));
            let data1 = {};
            data1[`dow=${dow}`] = data.map((item)=>wscli.data.toString(item));
            wscli.send(`#TimeSchema:${this.selectedComponentId},SetParams:${wscli.data.toString(data1)}`);
        },

        setDOWmask(){
            let mask = "";
            for (var dow = 0; dow < 7; dow++) {
                mask = (this.dowData[dow + 1].use ? "1" : "0") + mask;
            }
            mask = Number('0b' + mask);
            wscli.send(`#TimeSchema:${this.selectedComponentId},SetParams:${wscli.data.toString({DOWmask: mask})}`);
        },
    },
    created: function() {

        module.exports.TimeSchemas = this.TimeSchemas;

    },
    template:`
    <template>
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
    </template>`


};

let template = new TemplatePluginSettings('TimeSchema', 'TimeSchemas',
    {name:true, title: 'Настройка схем', representation: 'Схема', component: vComponent});




const vTimeSchemasSettings = new Vue(template.vTimeSchemasSettingsComponent);
template.initWscli(vTimeSchemasSettings);

Object.assign(module.exports, template.exports);



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


vContent.addTab({component: vTimeSchemasSettings, id: 'time-schemas-settings'}, {before: 'sensors'});


wscli.commands.add({Params: Object}, (arg)=>{
    if(wscli.context.current === wscli.context.timeSchema){
        vTimeSchemasSettings.checkInRange(wscli.current.timeSchema);
        for(let key in arg){
            if(key === 'DOWmask'){
                let use = arg.DOWmask | 0;
                Vue.set(vTimeSchemasSettings.dowData[0], 'use', true);
                for(let i = 0; i < 7; i++)
                    Vue.set(vTimeSchemasSettings.dowData[i + 1], 'use', (use & (0x1 << i)) !== 0);
            }else if(key.startsWith('dow=')){
                let dow = wscli.data.fromString(key, Object).dow;
                let data = wscli.data.fromString(arg[key], Array);

                data = data.map((item) => wscli.data.fromString(item, Object));
                data = data.map((item) => {
                    let obj = new DataItem(item);
                    return new DataItem({
                        time: obj.parseTime(),
                        value: vTimeSchemasSettings.typeInfo.valueFromData(obj.value)
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

                Vue.set(vTimeSchemasSettings.dowData[dow], 'data', data);
            }
        }
        return true;
    }
});
