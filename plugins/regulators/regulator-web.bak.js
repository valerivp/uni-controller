const RegulatorComponentsTypes = function () {
};
RegulatorComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;

};
utils.defineProperty_length(RegulatorComponentsTypes);

const vRegulatorComponentsTypes = new RegulatorComponentsTypes;
module.exports.components = {types: vRegulatorComponentsTypes};

function Regulator(pId) {
    this.params = {};
    this._id = pId;
    this._type = undefined;
    this.name = '';
}
Object.defineProperty(Regulator.prototype, 'id', {
    get() { return this._id; },
    set(val) { throw('Property is read only'); },
});
Object.defineProperty(Regulator.prototype, 'type', {
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
Regulator.prototype.toString = function(){
    return this.name.trim() === '' ? this.id : this.name;
};


function Regulators() {
}
utils.defineProperty_length(Regulators);



const vRegulatorSettings = new Vue({
    data: {
        _selectedRegulatorId: 0,
        Regulators: new Regulators(),
        schemaTypes:[],
        selectedSchemaTypeName:0
    },

    methods: {
        onShow(params){
            if(params && params.RegulatorId)
                this.selectedRegulatorId = params.RegulatorId;
            this.fetchInfo();
        },
        onHide(){
        },
        fetchInfo(){
            wscli.send("#Regulator,GetCount,GetName,GetType");
        },
        checkRegulator(t, allowZero){
            return wscli.checkInRange(t, allowZero ? 0 : 1, this.Regulators.length, "Regulator id");
        },
        setRegulatorsCount(val){
            let count = this.Regulators.length;
            if(count !== val) {
                while (count < val){
                    count++;
                    Vue.set(this.Regulators, count, new Regulator(count));
                    wscli.send(`#Regulator:${count},GetName`);
                }
                while (count > val)
                    Vue.delete(this.Regulators, count--);
            }
            if(val && !this.selectedRegulatorId)
                this.selectedRegulatorId = 1;
            else if(!val)
                this.selectedRegulatorId = 0;
            else if(val < this.selectedRegulatorId)
                this.selectedRegulatorId = val;

        },
        setName(id, name){
            let data = `#Regulator:${id},SetName:${wscli.data.toString(name)}`;
            wscli.send(data);
        },
        setType(){
            wscli.send(`#Regulator:${this.selectedRegulatorId},SetType:${this.selectedTypeName}`);
        },
        setParams(dow, item){
            let data = this.dowData[dow].data;
            data = data
                .map((item)=>({
                    time: item.timeToData(),
                    value: vRegulatorSettings.typeInfo.valueToData(item.value)
                }))
                .filter((item)=>(item.time !== undefined ));
            let data1 = {};
            data1[`dow=${dow}`] = data.map((item)=>wscli.data.toString(item));
            wscli.send(`#Regulator:${this.selectedRegulatorId},SetParams:${wscli.data.toString(data1)}`);
        },
        checkRegulator(t, allowZero){
            return wscli.checkInRange(t, allowZero ? 0 : 1, this.Regulators.length, "Regulator id");
        },

    },
    computed:{
        typeInfo(){
            return vRegulatorComponentsTypes[this.selectedRegulator.type];
        },
        types(){
            let res = vRegulatorComponentsTypes;
            if(this.selectedTypeName && !res[this.selectedTypeName]){
                res = Object.assign(new RegulatorComponentsTypes(), res);
                res.add(this.selectedTypeName, {title: this.selectedTypeName + ', not installed'});
            }
            return res;
        },
        RegulatorsCount: {
            get(){ return this.Regulators.length;},
            set(val){
                wscli.send(`#Regulator,SetCount:${val}`);
            }
        },
        selectedRegulator(){
            return this.Regulators[this.selectedRegulatorId] || {}; // для старта, когда нет схем
        },
        selectedRegulatorId: {
            get(){ return this.$data._selectedRegulatorId; },
            set(id){
                this.$data._selectedRegulatorId = id;
                if(id)
                    wscli.send(`#Regulator:${id},GetName,GetType,GetParams`);
            }
        },
        selectedRegulatorName: {
            get(){
                return (this.selectedRegulatorId && this.Regulators[this.selectedRegulatorId])
                    ? this.Regulators[this.selectedRegulatorId].name
                    : ''; },
            set(val){ this.setName(this.selectedRegulatorId, val); }
        },
        selectedTypeName: {
            get: function(){ return this.selectedRegulator.type; },
            set: function(val){
                if(val && this.selectedRegulator.type !== val){
                    wscli.send(`#Regulator:${this.selectedRegulatorId},SetType:${val}`);
                }
            }
        },
    },
    watch:{
        selectedTypeName: function (newVal, oldVal) {
            if(newVal)
                wscli.send(`#Regulator:${this.selectedRegulatorId},GetParams`);
        }
    },
    created: function() {
        ws.on('open', this.fetchInfo);

    },
    template:`
    <div id="tab-content-regulator-settings" title="Настройка регуляторов">
        <div class="sProperties">
            <div>
                <div>
                    <span>Регулятор</span>
                    <select v-model="selectedRegulatorId">
                        <option disabled value="0" v-if="!Regulators.length">не выбрано</option>
                        <option v-for="Regulator in Regulators" v-bind:value="Regulator.id">{{String(Regulator)}}</option>
                    </select>
                    <div class="button-inc-dec">
                        <span> из </span>
                        <button v-on:click="RegulatorsCount--" class="button-inc-dec">-</button>
                        <span>{{RegulatorsCount}}</span>
                        <button v-on:click="RegulatorsCount++" class="button-inc-dec">+</button>
                    </div>
                </div>
                <div v-show="selectedRegulatorId">
                    <span>Название регулятора</span>
                    <input type="text" v-model.lazy="selectedRegulatorName">
                </div>
            </div>
            <div v-show="selectedRegulatorId">
                <div>
                    <span>Тип регулятора</span>
                    <select v-model="selectedTypeName">
                        <option disabled value="" v-if="!types.length">не выбрано</option>
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            
        </div>
    </div>`

});

vContent.addTab({component: vRegulatorSettings, id: 'regulator-settings'}, {before: 'time-schema-settings'});

wscli.context.add('regulator');
wscli.commands.add({Regulator: Number}, (arg) => {
        wscli.context.current = wscli.context.regulator;
        vRegulatorSettings.checkRegulator(arg, true);
        wscli.current.regulator = arg;
        return true;
    }
);

wscli.commands.add({Count: Number}, (arg) => {
        if (wscli.context.current === wscli.context.regulator) {
            wscli.checkInRange(wscli.current.regulator, 0, 0, 'Regulator');
            vRegulatorSettings.setRegulatorCount(arg);
            return true;
        }
    }
);
