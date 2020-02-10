'use strict';

const serverLocation = location.protocol === 'file:' ? 'localhost:8080' : location.host;
//const serverLocation = 'localhost:8080';

if (!Array.prototype.last){ Array.prototype.last = function(){ return this[this.length - 1]; } }


const $store = new Vuex.Store({
    state: {
        time: undefined,
        isConnected:false,
    },
    mutations: {
        setTime:(state, val) => state.time = val,
        setConnected:(state, val) => state.isConnected = val,
    },
    strict: (location.protocol === 'file:'),

});
$store.mutation = {
    setTime:'setTime',
        setConnected: 'setConnected'
};

const vConnectionSplash = new Vue({
    el: '#splash-not-connected',
    computed: {
        isShowNotConnected: () => !$store.state.isConnected,
    }
});


const vContent = new Vue({
    el: '#main-content',
    data: {
        tabsList:[],
        isMenuShow: false,
        currentTab: undefined,
    },
    methods: {
        addTab: function(tabInfo, pos){
            let find = false;
            for(let i = 0; pos && (pos.before || pos.after) && i < this.tabsList.length; i++){
                let tabId = this.tabsList[i].id;
                if(tabId === pos.before){
                    this.tabsList.splice(i, 0, tabInfo);
                    find = true;
                    break;
                }else if(tabId === pos.after){
                    this.tabsList.splice(i + 1, 0, tabInfo);
                    find = true;
                    break;
                }
            }
            if(!find)
                this.tabsList.push(tabInfo);

            if(!tabInfo.onShow)
                tabInfo.onShow = tabInfo.component.onShow;
            if(!tabInfo.onHide)
                tabInfo.onHide = tabInfo.component.onHide;

            setTimeout(function () {
                tabInfo.component.$mount('#tab-' + tabInfo.id);
                if(!tabInfo.title){
                    let el = tabInfo.el || document.getElementById('tab-content-' + tabInfo.id);
                    tabInfo.title = (el.attributes.title ? el.attributes.title.value : tabInfo.id);
                }
            }, 0);


        },
        getTab: function (tabId){
            for(let i = 0; i < this.tabsList.length; i++)
                if(this.tabsList[i].id === tabId)
                    return this.tabsList[i];
        },
        _setTab: function (tabId, params) {
            this.isMenuShow = false;

            if(!this.getTab(tabId))
                throw(`Tab not found: '${tabId}'`);
            if(this.currentTab && this.currentTab.id === tabId)
                return;

            let addHistory = (params || {}).addHistory === undefined ? true : params.addHistory;
            if(this.isMenuShow && addHistory)
                navigationHistory.replaceState(this.currentTab);
            else if(addHistory)
                navigationHistory.pushState(this.currentTab);

            let onHide = (this.currentTab ? this.getTab(this.currentTab).onHide : undefined);
            if(onHide) onHide();
            this.currentTab = tabId;
            let onShow = this.getTab(tabId).onShow;
            if(onShow) setTimeout(onShow.bind(this, params), 0);

        },
        setTab: function (tabId, params) {
            setTimeout(this._setTab.bind(this, tabId, params), 1);
        },
        isShow:function (tab) {return this.currentTab === tab.id},
        toggleMenu: function (){
            if(!this.isMenuShow){
                this.isMenuShow = true;
                navigationHistory.pushState('close-menu');
            }else{
                this.isMenuShow = false;
                navigationHistory.popState();
            }

        }
    },
    computed:{
    }
});

utils.moveElement('main-menu-button', 'main-menu-button-place');

setTimeout(function () {vContent.setTab(vContent.tabsList[0].id)}, 1);

window.addEventListener('popstate', function(e){
    let data = navigationHistory.popState();
    switch (data){
        case null: break;
        case 'close-menu': vContent.isMenuShow = false; break;
        default: vContent.setTab(data, {addHistory:false});
    }
});

const vToasts = new Vue({
    el: '#toasts',
    data: {
        toasts: []
    },
    methods: {
        add(text){
            let pos = document.activeElement.getBoundingClientRect().top;
            pos = (pos ? 'calc(100vh - ' + pos + 'px)' : '50vh');
            this.toasts.push({title:text.split('\n')[0], pos: pos});
            setTimeout(this.del, 4000);
        },
        addHttpError(err){
            if(err.response)
                this.add(
                    `${err.response.status}: ${err.response.statusText}${(err.response.data ? ' (' + err.response.data + ')' : '')}`
                );
            else
                this.add(err.message);
        },
        del(){this.toasts.splice(0, 1);},
    }
});

const vTerminal = new Vue({
    template: '#tab-content-terminal',
    data: {
        TextForSend: '',
        ReceivedText: '',
        NoPeriodicInfoLog: true,
        AutoScroll: true,
        cmdHistory:[],
        cmdHistoryPos:0,
    },
    methods: {
        clear(event) {
            this.ReceivedText = ''
        },
        send(event) {
            wscli.send(this.TextForSend);
            if(this.cmdHistory[this.cmdHistoryPos] !== this.TextForSend) {
                if(this.cmdHistory[this.cmdHistory.length - 1] !== this.TextForSend)
                    this.cmdHistory.push(this.TextForSend);
                this.cmdHistoryPos = this.cmdHistory.length;
            }else
                this.cmdHistoryPos++;

            this.TextForSend = '';
        },
        prevCmd(event) {
            if(this.cmdHistoryPos) {
                this.cmdHistoryPos--;
                this.TextForSend = this.cmdHistory[this.cmdHistoryPos];
            }
        },
        nextCmd(event) {
            if((this.cmdHistoryPos + 1) < this.cmdHistory.length) {
                this.cmdHistoryPos++;
                this.TextForSend = this.cmdHistory[this.cmdHistoryPos];
            }
        },
        writeLog(text) {
            if (String(text).indexOf("#time:") === 0) {
                if (this.NoPeriodicInfoLog)
                    return;
            }
            this.ReceivedText += text;
            this.ReceivedText = this.ReceivedText.split('\n').slice(-500).join('\n');
            if (this.AutoScroll) {
                let el = document.getElementById('terminal-received-text');
                if(el)
                    el.scrollTop = el.scrollHeight;
            }
        },
        log(text) {
            this.writeLog(text + '\n');
        },
    }
});

vContent.addTab({component: vTerminal, id: 'terminal'});


function SensorData(id) {
    this.id = Number(id);
    wscli.checkInRange(this.id, 1, 0xFFFF, 'Sensor');

    this.type = undefined;
    this.name = '';
    this.editName = false;
    this.timeLabel = 0;
    this.id2hex = () => '0x' + Number(this.id).toHex();

    this.toString = ()=> (this.name === '' ? '' : this.name +', ') + this.id2hex();
    this.dataAge =  ()=> (this.timeLabel ? ($store.state.time - this.timeLabel) / 1000 : '-');
    this.timelabel2string = ()=> this.timeLabel ? this.timeLabel.toLocaleString() : '–';
    this.nameInputElementId = 'sensor-name-input-' + this.id2hex();

    this.params = {};
    this.param = (pname) => this.params[pname.toLowerCase()];
}

const sensorsTypes = {
    add: function (type, info) {
        let key = (type ? type.toLowerCase() : 'undefined');
        this[key] = info;
        this[key]._type = String(type);
    },
    data: function (type) {
        let key = (type ? type.toLowerCase() : 'undefined');
        let res = this[key];
        if(!res)
            res = this['undefined'];

        let arr = [];
        for(let key in res){
            if(key.slice(0, 1) !== '_')
                arr.push(res[key]);
        }
        return arr;
    },
    known: function (type) {
        let key = (type ? type.toLowerCase() : 'undefined');
        return this[key] !== undefined && key !== 'undefined';
    },
    types: function() {
        let arr = [];
        for(let key in this){
            // noinspection JSUnfilteredForInLoop
            if('function' !== typeof this[key]) { // noinspection JSUnfilteredForInLoop
                arr.push(this[key]._type);
            }
        }
        return arr.sort((a, b) => (a === 'undefined' ? 1 : (b === 'undefined' ? -1 : (a <= b ? -1 : 1))));
    }
};

sensorsTypes.add( undefined, {
    type: {
        title: 'Тип',
        align: 'left',
        data: (sd) => sd.type
    },
    timeLabel: {
        title: 'Данные получены',
        align: 'right',
        data: (sd) => sd.timelabel2string()
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
    });

const sensorsInfoQuery = new function(){
    this._timerHandle = undefined;
    this._sendTextSensorsInfo = () => wscli.send('#Sensor,GetData:>' + wscli.data.toString(vSensors.maxTimeLabel));
    this.count = 0;
    this.start = () => {
        if(!this.count++){
            wscli.send("#Sensor,GetName,GetData");
            this._timerHandle = setInterval(this._sendTextSensorsInfo, 3000);
            console.log("Start fetching sensors data");
        }
    };
    this.stop  = () => {
        if(! --this.count){
            if(this._timerHandle)
                clearInterval(this._timerHandle);
            this._timerHandle = undefined;
            console.log("Stop fetching sensors data");
        }
    };
};

function Sensors() {
}
Sensors.prototype.toArray = function () {
    let res = [];
    Object.keys(this).forEach((id)=>res.push(this[id]));
    return res;
};

const vSensors = new Vue({
    template: '#tab-content-sensors',
    data: {
        types: sensorsTypes,
        maxTimeLabel: '0',
        sensors: new Sensors(),
    },

    methods: {
        onShow: ()=> {sensorsInfoQuery.start();},
        onHide: ()=> {sensorsInfoQuery.stop();},
        setName(sensor) {
            wscli.send("#Sensor:" + sensor.id2hex() + ",SetName:" + wscli.data.toString(sensor.name));
            sensor.editName = false;
        },
        doEditName(sensor){
            sensor.editName = true;
            setTimeout(function () {
                document.getElementById(sensor.nameInputElementId).focus();
            }, 1);
        },
        /*getSensor: function(id, addToSensors){
            addToSensors = addToSensors === undefined ? true : addToSensors;
            if(!id)
                return undefined;
            let sensor = this.sensors[id];
            if(!sensor){
                sensor = new SensorData(id);
                if(addToSensors)
                    Vue.set(this.sensors, id, sensor);
            }
            return sensor;
        },*/
        setSensorInfo(id, param, val){
            let sensor = this.sensors[id];
            if(!sensor){
                sensor = new SensorData(id);
                Vue.set(this.sensors, id, sensor);
            }
            Vue.set(sensor, param, val);
/*            if(wscli.context.current === wscli.context.sensor)
                Vue.set(vSensors.getCurrentSensor(), param, val);
            else
                return false;*/
        },
        /*eraseCurrentSensor(what){
            if(this.currentSensor){
                let sensor = this.sensors[this.currentSensor];
                if(sensor){
                    Vue.delete(this.sensors, this.currentSensor);
                    this.currentSensor = 0;
                    if(what === 'name')
                        wscli.send('#SensorsInfo:' + sensor.idHex);
                    else if(what === 'sensor')
                        wscli.send('#SensorsNames:' + sensor.idHex);
                }
            }
        },*/
        getSensorsByType(type){

            let arr = this.sensors.toArray().filter((item) =>
                (String(type) === 'undefined') ? !this.types.known(item.type) : String(item.type).toLowerCase() === String(type).toLowerCase()
            );
            arr = arr.sort((a, b) => ((a.name < b.name) ? -1 : ( (a.name > b.name) ? 1 : 0)));
            return arr;
        }
    }
});

vContent.addTab({component: vSensors, id: 'sensors'}, {before: 'terminal'});

const vtProperties = {
    data: function () {
        return {
            items: [],
            id: '',
            _id: ''
        };
    },
    computed:{
    },
    beforeMount () {
        this._id = this.$el.id;
    },
    mounted(){
        this.id = this._id;
    },
    methods: {
        add(name, params) {
            let item = params || {};
            item.name = typeof name === 'function' ? name.options.name : name;

            let find = false;
            for(let i = 0; params && (params.before || params.after) && i < this.items.length; i++){
                let itemId = this.items[i].name;
                if(itemId === params.before){
                    this.items.splice(i, 0, item);
                    find = true;
                    break;
                }else if(itemId === params.after){
                    this.items.splice(i + 1, 0, item);
                    find = true;
                    break;
                }
            }
            if(!find)
                this.items.push(item);
        },
        onShow() {
            this.$emit('fetch');
        }
    },
    template:    "#properties-panel"

};


const vAbout = new Vue(vtProperties);//).$mount("#about");

vContent.addTab({component: vAbout, id: 'about', title: "О системе"});


const vcPropetiesPanelText = Vue.component('properties-panel-text', {
    props: ['params'],
    computed:{
        content: function () {
            let el = document.getElementById(this.params.content);
            return el.innerHTML;
        }
    },
    template: '#properties-panel-text',
});

vAbout.add(vcPropetiesPanelText, {content: 'content-about-developer'});
vAbout.add(vcPropetiesPanelText, {content: 'content-about-thanks'});

vAbout.add(
    Vue.component('about-system', {
        data:()=> {return {
            platform:'',
            chipID:'',
            uptimeText:'',
            plugins:[],
        }},
        computed: {
            time: () => $store.state.time,

        },
        methods: {
            fetchInfo() {
                axios.get(`http://${serverLocation}/system`).then(response => {
                    this.platform = response.data.trim();
                }).catch(function (error) {vToasts.addHttpError(error); vTerminal.log(error);});
            },
            fetchUptime() {
                axios.get(`http://${serverLocation}/uptime`).then(response => {
                    this.uptimeText = response.data;
                }).catch(function (error) {vToasts.addHttpError(error); vTerminal.log(error);});
            },
            onFetch: function () {
                this.fetchInfo();
                this.fetchUptime();
            },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template:    "#about-system"
    })
);


vAbout.add(
    Vue.component('about-plugins', {
        data:()=> {return {
            plugins:[],
        }},
        methods: {
            fetchPlugins() {
                axios.get(`http://${serverLocation}/plugins`).then(response => {
                    this.plugins = response.data;
                }).catch(function (error) {vToasts.addHttpError(error); vTerminal.log(error);});
            },
            onFetch: function () {
                this.fetchPlugins();
            },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template:    "#about-plugins"
    })
);

vAbout.add(vcPropetiesPanelText, {content: 'content-about-fullscreen'});


const vSettings = new Vue(vtProperties);

vContent.addTab({component: vSettings, id: 'settings', title: "Параметры"}, {after: 'terminal'});


const themes = [];
themes.push({name:'', title: 'Белая'});
themes.push({name:'turquoise', title: 'Бирюзовая'});
themes.push({name:'dark', title: 'Темная'});

vSettings.add(
    Vue.component('settings-select-theme', {
        data:()=> {return {themes:themes, selectedTheme: ''}},
        methods: {
            onSelectTheme: function () {
                if(!this.selectedTheme && this.selectedTheme !== '')
                    this.selectedTheme = '';
                localStorage.setItem('color-theme', this.selectedTheme);
                let body = document.getElementsByTagName('body')[0];
                for(let i = 0; i < this.themes.length; i++)
                    if(this.themes[i].name && body.classList.contains(this.themes[i].name))
                        body.classList.remove(this.themes[i].name);
                if(this.selectedTheme)
                    body.classList.add(this.selectedTheme);
            },
            onFetch: function () {
                //this.onSelectTheme();
            },
        },
        created: function() {
            this.selectedTheme = localStorage.getItem('color-theme');
            this.onSelectTheme();
        },
        template: "#settings-select-theme"
    })
);



vSettings.add(
    Vue.component('settings-set-auth', {
        data:()=> {return {httpUserPassword: '', httpUserName:''}},
        methods: {
            sendHttpAuth(){
                let bodyFormData = new FormData();
                bodyFormData.append('name', this.httpUserName);
                bodyFormData.append('password', this.httpUserPassword);
                axios({
                        url: `http://${serverLocation}/user`,
                        method: 'post',
                        data: bodyFormData,
                        config: { headers: {'Content-Type': 'multipart/form-data' }}})
                    .then(function (response) {
                        vTerminal.log(response);
                        vToasts.add(response.data);})
                    .catch(function (error) {
                        vToasts.addHttpError(error);
                        vTerminal.log(error);});
            },
            onFetch: function () {
                axios.get(`http://${serverLocation}/user?format=json`)
                    .then(response => {
                        this.httpUserName = response.data.name;})
                    .catch(function (error) {
                        vToasts.addHttpError(error); vTerminal.log(error);});
            },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template: "#settings-set-auth"
    })
);

// noinspection JSUnusedGlobalSymbols
vSettings.add(
    Vue.component('settings-reboot', {
        methods: {
            sendReboot:()=>{
                axios.post(`http://${serverLocation}/reboot`)
                    .then((response) => { vTerminal.log(response); vToasts.add(response.data);})
                    .catch((error) => {vTerminal.log(error);});
            },
        },
        template: "#settings-reboot"
    })
);

/*
vSettings.add(
    Vue.component('settings-restart', {
        methods: {
            sendRestart:()=>{
                axios.post(`http://${serverLocation}/restart`)
                    .then((response) => { vTerminal.log(response); vToasts.add(response.data);location.reload(true);})
                    .catch((error) => {vTerminal.log(error);});
            },
        },
        template: "#settings-restart"
    })
);
*/


const ws = new WSConnection(serverLocation, vTerminal);
const wscli = new WSCli(ws);

document.addEventListener('DOMContentLoaded', wscli.init);


wscli.context.add('cmd');
wscli.commands.add({Cmd: String}, (arg) => {
        wscli.context.current = wscli.context.cmd;
        wscli.current.cmd = arg;
        return true;
    }
);

wscli.commands.add({CmdRes: String}, (arg) => true);
wscli.commands.add({Error: String}, (arg) => {
        if(wscli.context.current === wscli.context.cmd){
            vToasts.add(`Cmd '${wscli.current.cmd}' error: ${arg}`);
            return true;
        }
    }
);

wscli.commands.add({Time: Date}, (arg) => {
        $store.commit($store.mutation.setTime, arg); return true;
    }
);



wscli.context.add('sensor');
wscli.commands.add({Sensor: Number}, (arg) => {
        /** @namespace wscli.context.sensor */
        wscli.context.current = wscli.context.sensor;
        wscli.current.sensor = arg;
        return true;
    }
);
wscli.commands.add({Type: String},  (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            vSensors.setSensorInfo(wscli.current.sensor, 'type', arg.toUpperCase());
            return true;
        }
    }
);
wscli.commands.add({TimeLabel: Date}, (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            vSensors.setSensorInfo(wscli.current.sensor, 'timeLabel', arg);
            if(arg > vSensors.maxTimeLabel)
                vSensors.maxTimeLabel = arg;
            return true;
        }
    }
);

wscli.commands.add({Data: Object}, (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            vSensors.setSensorInfo(wscli.current.sensor, 'params', arg);
            return true;
        }
    }
);

wscli.commands.add({Name: String}, (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            if(arg)
                vSensors.setSensorInfo(wscli.current.sensor,  'name', arg);
            else if (vSensors.sensors[wscli.current.sensor] && !vSensors.sensors[wscli.current.sensor].type)
                Vue.delete(vSensors.sensors, wscli.current.sensor);
            return true;
        }
    }
);

wscli.checkInRange = function (arg, lv, rv, desc){

    if(lv instanceof Array){
        if(!lv.some(item=> ((item[0] <= arg) && (arg <= item[1])) )){
            let arrDesc = lv.map(item => item[0] === item[1] ? `${item[0]}` : `${item[0]}…${item[1]}`).join(', ');
            throw(`${rv} ${arg} not in range (${arrDesc})`);
        }
    }else
    if (!((lv <= arg) && (arg <= rv)))
        throw(`${desc} ${arg} not in range ${lv}…${rv}`);
    return true;
};

function WSCli (ws){
    this.ws = ws;
    this._wscliCurrentObject = {};

    this.commands = {
        add: function (nameAndArgType, func) {
            let name, type;
            for(name in nameAndArgType)
                type = nameAndArgType[name];

            const _name = 'cmd-' + name.toLowerCase();

            if(!this[_name])
                this[_name] = {name: name, funcs: []};
            //else if(this[_name].type !== type)
            //    throw new Error(`Command is already registered with a different type of parameter: ${name}`)

            this[_name].funcs.push({cb: func, type: type});
        }
    };

    this.send = function(text){
        if(this.ws)
            this.ws._SendText(text);
    };

    Object.defineProperty(this, 'current', {
        get() {return this._wscliCurrentObject;},
        set: (val) => {throw("Property is read only");}
    });

    this.context = {
        _current: undefined,
        none: null,
        add: function(item){
            if(!this.hasOwnProperty(item))
                this[item] = item;
            else
                throw(`Contexts item alredy present: ${item}`);
        }
    };
    Object.defineProperty(this.context, 'current', {
        get() {
            return this._current;
        },
        set(val) {
            if ( !this._current || !val) {
                this._current = val;
                wscli._wscliCurrentObject = {};
                if(val)
                    wscli._wscliCurrentObject[val] = undefined;
                Object.seal(wscli._wscliCurrentObject);

            }else
                throw("Context already set");
        }
    });

    this._onCommand = function(cmdStrings) {
        (String(cmdStrings).match(/(^#.*$)/gm) || []).forEach(
             (cmdString)=> {
                this.context.current = this.context.none;

                if (cmdString.slice(0, 1) === '#'){

                    let cmdArray = cmdString.slice(1).match(/(?:[^,\\]+|\\.)+/gm);
                    for (let i = 0; i < cmdArray.length; i++) {
                        let cmd = cmdArray[i].trim();
                        if(cmd) {
                            try {
                                this.executeCmd(cmd);
                            } catch (err) {
                                let message = `Cmd executing error: ${cmd} ${err.message || err}`;
                                vTerminal.log(message);
                                vToasts.add(message);
                                break;
                            }
                        }
                    }
                }
            }
        );
    };

    this.executeCmd = function(cmdText) {
        // разбор строки с разделителями
        // ^#.*$ - решетка и перенос строки
        // ^[?](.|\n)*;$ - многострочный текст с ; в конце
        // (?<=^|,)(?:"[^"]*+"|[^,"])*+ - запятая
        // (?<=^|:)(?:"[^"]*+"|[^:"])*+ - двоеточие
        let cmd = cmdText.match(/(?:[^:\\]+|\\.)+/)[0];
        let arg = cmdText.slice(cmd.length + 1);

        let command = this.commands['cmd-' + cmd.toLowerCase()];
        if(command){
            let result = undefined;
            for(let i = 0; i < command.funcs.length; i++) {
                let func = command.funcs[i];
                let arg1 = this.data.fromString(arg, func.type);
                let res = func.cb(arg1);
                if (res === true) {
                    result = true;
                }else if(res !== undefined)
                    throw('Unknown error');
            }
            if(result === undefined)
                throw('Not processed');
        }else
            throw('No cmd');
    };

    this.onMessage = (msg) => this._onCommand(msg);

    this.init = () => {
        this.ws.on('message', this.onMessage);
        this.ws.init();
    };

    this.data = {
        _charsForShielding: '\\,:=;',
        toString(data) {
            let res;
            if(typeof data === "string" || data instanceof String){
                res = data;
                for (let i = 0; i < this._charsForShielding.length; i++)
                    res = res.replaceAll(this._charsForShielding[i], '\\' + this._charsForShielding[i]);

            }else if(typeof data === "date" || data instanceof Date){
                 res = new Date(data).toFormatString('yyyymmddThhiiss');

            }else if(typeof data === "array" || data instanceof Array){
                res = data.map((item)=>this.toString(item)).join(',');

            }else{
                let arr = [];
                for (let key in data)
                    arr.push(`${this.toString(String(key))}=${this.toString(String(data[key]))}`);
                res = arr.join(';');
            }
            return res;
        },
        fromString(data, type) {
            let res;
            if (type === Object) {
                let arr = String(data).match(/(?:[^;\\]+|\\.)+/gm) || [];
                res = {};
                arr.forEach(function (item) {
                    let key = item.match(/(?:[^=\\]+|\\.)+/)[0];

                    let val = wscli.data.fromString(item.slice(key.length + 1), String);
                    if (val === "undefined")
                        val = undefined;
                    else if (val === "true")
                        val = true;
                    else if (val === "false")
                        val = false;

                    res[wscli.data.fromString(key, String)] = val;
                });
            }else if(type === Array){
                res = String(data).match(/(?:[^,\\]+|\\.)+/gm) || [];

            } else if(type === String){
                res = data;
                for (let i = 0; i < this._charsForShielding.length; i++)
                    res = res.replaceAll('\\' + this._charsForShielding[i], this._charsForShielding[i]);
            } else if(type === Number){
                res = 0 | data;
            } else if(type === Date){
                res = Date.parse(data);
            }else
                throw new Error(`Unknown type of parameter: ${type}`);

            return res;
        }
    };

}

function WSConnection (server, terminal) {
    this._server = server;
    this._events = {};
    this._terminal = terminal;

    this.on = (event, func) => {
        let en = 'on' +  event.toLowerCase();
        if(!this._events[en])
            this._events[en] = [];
        this._events[en].push(func);
    };
    this.off = (event, func) => {
        let en = 'on' +  event.toLowerCase();
        if(!this._events[en])
            this._events[en] = [];
        let i = this._events[en].indexOf(func);
        if(i >= 0)
            this._events[en].splice(i, 1);
    };
    this.emit = (event, data) => {
        let en = 'on' +  event.toLowerCase();
        if(!this._events[en])
            this._events[en] = [];
        this._events[en].forEach((func)=>{func(data);});
    };

    this.connect = ()=> {
        this.disconnect();
        this._socket = new WebSocket(`ws://${this._server}/`);
        this._lastConnectTimelabel = new Date();
        this._lastMsgTimelabel = 0;
        
        this._socket.onopen = () => {
            this._terminal.log('WebSocket Ok');
            this.emit('open');
        };
        this._socket.onerror = (error) => {
            this._terminal.log('WebSocket error', error);
            /** @namespace this._events.onError */
            this.emit('error', error);
        };
        this._socket.onmessage = (msg) => {
            this._lastMsgTimelabel = new Date();
            this._terminal.log(String(msg.data).trim());
            this.emit('message', msg.data);
        };
        this._socket.onclose = () => {
            this._terminal.log('WebSocket Closed');
            this.emit('close');
        };
    };
    this.disconnect = ()=> {
        if (this._socket !== undefined){
            this._socket.close();
            this._socket = undefined;
        }
    };
    this._checkConnection = () => {
        let date = new Date();

        $store.commit($store.mutation.setConnected, (date - this._lastMsgTimelabel) <= 5000);

        if( (!this._lastConnectTimelabel || ( (date - this._lastConnectTimelabel) > 4000))
            && (date - this._lastMsgTimelabel) > 7000) {
            this.connect();
        }
    };

    this._SendTextBuffer = () => {
        if (!this._textBufferForSend)
            return;
        let text = this._textBufferForSend;
        this._textBufferForSend = undefined;

        if(this._socket.readyState)
            this._socket.send(text);
        else
            this._terminal.log('WebSocket not connected');

        this._terminal.log(String('\n' + text).replaceAll('\n#', '\n>').trim());
    };

    this._SendText = (text)=> {
        text += (String(text).endsWith('\n') ? '' : '\n');
        this._textBufferForSend = this._textBufferForSend ? this._textBufferForSend + text : text;

        setTimeout(this._SendTextBuffer, 0);
    };

    this.init = ()=> {
        this.connect();
        setInterval(this._checkConnection, 2000);
        window.addEventListener("unload", this.disconnect);
    };

}
