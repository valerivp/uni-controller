
mm["time-schema"].components.types.add('time-schema-temperature', {title: 'Температура'});

function DataItem() {
    this.time = undefined;
    this.value = undefined;
//    this.index = (par || {}).index;
/*    this.check = function () {
        let v = Number.parseFloat(item.value);
        this.value = isNaN(v) ? undefined : Number(v).toFixed(1);
        let t = String(item.time).replaceAll(':', '');
        t = Number.parseInt(t) % 10000;
        this.time = isNaN(t) ? undefined
            : `${String('00' + Math.trunc(t / 100)).slice(-2)}:${String('00' + (t % 100)).slice(-2)}`;
        return this;
    }
*/
}

DataItem.prototype._toString = DataItem.prototype.toString;
DataItem.prototype.toString = function(par){
    if(par === undefined)
        return this._toString();
    else if(par === 'time'){
        if(this.time !== undefined) {
            let t = String(this.time).replaceAll(':', '');
            t = Number.parseInt(t) % 10000;
            t = isNaN(t) ? undefined : (t > 2359 ? 2359 : (t < 0 ? 0 : t));
            t = t === undefined ? undefined
                : `${String('00' + Math.trunc(t / 100)).slice(-2)}:${String('00' + (t % 100)).slice(-2)}`;
            return t;
        }
    }else if(par === 'value'){
        if(this.value !== undefined) {
            let v = Number.parseFloat(this.value);
            v = isNaN(v) ? undefined : v;
            v = v === undefined ? undefined
                : Number(v).toFixed(1);
            return v;
        }
    }
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


Vue.component('time-schema-temperature', {
    data: function(){ return {
            dowData:[]
        };
    },
    props: {
        type: String,
        timeSchema: Object,
        timeSchemaId: Number,
    },
    computed: {
    },
    methods: {
        onShow() {
            if (!this._isActive) {
                this._isActive = !this._isActive;
                wscli.send(`#TimeSchema:${this.timeSchemaId},GetParams`);
            }
        },
        onHide() {
            if (this._isActive) {
                this._isActive = !this._isActive;
            }

        },
        setDOWs(){
            let mask = "";
            for (var dow = 0; dow < 7; dow++) {
                mask = (this.dowData[dow + 1].use ? "1" : "0") + mask;
            }
            mask = Number('0b' + mask);
            wscli.send(`#TimeSchema:${this.timeSchemaId},SetParams:${wscli.data.toString({DOWs: mask})}`);
        },
        setParams(dow, item){
            let data = this.dowData[dow].data;
            data = data
                .filter((item)=>(item.time !== undefined ||item.value !== undefined))
                .map((item)=>{
                    let t = item.toString('time'), v = item.toString('value');
                    return {
                        time: t === undefined ? undefined : String(t).replaceAll(':', ''),
                        value: v === undefined ? undefined : 10 * v
                    }
                });
            let data1 = {};
            data1[`dow=${dow}`] = data.map((item)=>wscli.data.toString(item));
            wscli.send(`#TimeSchema:${this.timeSchemaId},SetParams:${wscli.data.toString(data1)}`);

        },
        setCmdParams(arg){
            if(wscli.context.current === wscli.context.timeSchema){
                if(wscli.current.timeSchema === this.timeSchemaId){
                    for(let key in arg){
                        if(key === 'DOWs'){
                            let use = arg.DOWs | 0;
                            Vue.set(this.dowData[0], 'use', true);
                            for(let i = 0; i < 7; i++)
                                Vue.set(this.dowData[i + 1], 'use', (use & (0x1 << i)) !== 0);
                        }else if(key.startsWith('dow=')){
                            let dow = wscli.data.fromString(key, Object).dow;
                            let data = wscli.data.fromString(arg[key], Array);
                            data = data.map((item) => wscli.data.fromString(item, Object));
                            data = data.map((item, index) => {
                                let obj = new DataItem();
                                obj.time = item.time;
                                obj.time = obj.toString('time');
                                obj.value = item.value / 10;
                                obj.value = obj.toString('value');
                                return obj;
                            });

                            data = data.filter((item)=>( item.time !== undefined || item.value !== undefined))
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

                            Vue.set(this.dowData[dow], 'data', data);
                        }
                    }
                    return true;
                }
            }
        }
    },
    created() {
        this.$parent.$on(`show-${this.type}-settings`, this.onShow);
        this.$parent.$on(`hide-${this.type}-settings`, this.onHide);
        for(let i = 0; i <= 7; i++)
            this.dowData.push(new DOWData(i));

        wscli.commands.add({Params: Object}, this.setCmdParams);
    },
    watch:{
        timeSchemaId: function (newVal, oldVal) {
            if(newVal)
                wscli.send(`#TimeSchema:${newVal},GetParams`);

        }
    },
    template: `
        <div  class="sProperties">
            <div v-for="dow in dowData" class="values-short" style="border-style: none;">
                <div> 
                    <label><input v-if="dow.dow >= 1" type="checkbox" v-model="dow.use" 
                        v-on:change="setDOWs()">
                    <span>{{['Общая настройка', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][dow.dow]}}</span>
                    </label>
                </div>
            
                <div v-show="(!dow.dow) || dow.use">
                    <span>время</span>
                    <div>
                        <input v-for="item in dow.data" type="text" placeholder="hh:mm"
                              v-model="item.time" v-on:change="setParams(dow.dow, item)">
                    </div>
                </div>
                <div v-show="(!dow.dow) || dow.use">
                    <span>температура<span style="font-size: 0.75em; margin: 0;">,&deg;C</span></span>
                    <div>
                        <input v-for="item in dow.data" type="text" placeholder="00.0"
                              v-model="item.value" v-on:change="setParams(dow.dow, item)">
                    </div>
                </div>
            </div>
        </div>`
});


