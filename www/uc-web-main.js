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

moveElement('main-menu-button', 'main-menu-button-place');

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
        clear: function (event) {
            this.ReceivedText = ''
        },
        send: function (event) {
            wscli.send(this.TextForSend);
            if(this.cmdHistory[this.cmdHistoryPos] !== this.TextForSend) {
                if(this.cmdHistory[this.cmdHistory.length - 1] !== this.TextForSend)
                    this.cmdHistory.push(this.TextForSend);
                this.cmdHistoryPos = this.cmdHistory.length;
            }else
                this.cmdHistoryPos++;

            this.TextForSend = '';
        },
        prevCmd: function (event) {
            if(this.cmdHistoryPos) {
                this.cmdHistoryPos--;
                this.TextForSend = this.cmdHistory[this.cmdHistoryPos];
            }
        },
        nextCmd: function (event) {
            if((this.cmdHistoryPos + 1) < this.cmdHistory.length) {
                this.cmdHistoryPos++;
                this.TextForSend = this.cmdHistory[this.cmdHistoryPos];
            }
        },
        writeLog: function (text) {
            if (String(text).indexOf("#time:") === 0) {
                if (this.NoPeriodicInfoLog)
                    return;
            }
            this.ReceivedText += text;
            this.ReceivedText = this.ReceivedText.split('\n').slice(-500).join('\n');
            if (this.AutoScroll) {
                let el = document.getElementById('terminal-received-text');
                el.scrollTop = el.scrollHeight;
            }
        },
        log: function(text) {this.writeLog(text + '\n');},
    }
});

vContent.addTab({component: vTerminal, id: 'terminal'});


function SensorData(id) {
    this.id = id;
    this.type = undefined;
    this.name = '';
    this.editName = false;
    this.timeLabel = 0;
    this.id2hex = () => '0x' + Number(this.id).toHex();

    this.toString = ()=> (this.name === '' ? '' : this.name +', ') + this.id2hex();
    this.dataAge =  ()=> (this.timeLabel ? ($store.state.time - this.timeLabel) / 1000 : '-');
    this.timelabel2string = ()=> this.timeLabel ? this.timeLabel.toLocaleString() : '–';
    this.nameInputElementId = 'sensorNameInput_' + this.id2hex();

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
    this._sendTextSensorsInfo = () => wscli.send('#SensorsData:>' + vSensors.maxTimeLabel);
    this.count = 0;
    this.start = () => {
        if(!this.count++){
            wscli.send("#SensorsNames");
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
        currentSensor : 0,
        sensors: new Sensors(),
    },

    methods: {
        onShow: ()=> {sensorsInfoQuery.start();},
        onHide: ()=> {sensorsInfoQuery.stop();},
        setName(sensor) {
            wscli.send("#Sensor:" + sensor.id2hex() + ",SetName:" + sensor.name);
            sensor.editName = false;
        },
        doEditName(sensor){
            sensor.editName = true;
            setTimeout(function () {
                document.getElementById(sensor.nameInputElementId).focus();
            }, 1);
        },
        getCurrentSensor: function(){
            if(!this.currentSensor)
                return undefined;
            /*
            for(let s = 0; s < this.sensors.length; s++){
                if(this.sensors[s].id === this.currentSensor)
                    return this.sensors[s];
            }
            this.sensors.push(new SensorData(this.currentSensor));
            return this.sensors.last();*/
            let sensor = this.sensors[this.currentSensor];
            if(!sensor){
                sensor = new SensorData(this.currentSensor);
                Vue.set(this.sensors, this.currentSensor, sensor);
            }
            return sensor;
        },
        setSensorInfo: function (param, val){
            if(wscli.context.current === wscli.context.sensor)
                Vue.set(vSensors.getCurrentSensor(), param, val);
            else
                return false;
        },
        eraseCurrentSensor(what){
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
        },
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
        }},
        computed: {
            time: () => $store.state.time,

        },
        methods: {
            fetchInfo() {
                axios.get(`http://${serverLocation}/system`).then(response => {
                    this.platform = response.data.trim();
                }).catch(function (error) {vToasts.addHttpError(error); console.log(error);});
            },
            fetchUptime() {
                axios.get(`http://${serverLocation}/uptime`).then(response => {
                    this.uptimeText = response.data;
                }).catch(function (error) {vToasts.addHttpError(error); console.log(error);});
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
                        console.log(response);
                        vToasts.add(response.data);})
                    .catch(function (error) {
                        vToasts.addHttpError(error);
                        console.log(error);});
            },
            onFetch: function () {
                axios.get(`http://${serverLocation}/user?format=json`)
                    .then(response => {
                        this.httpUserName = response.data.name;})
                    .catch(function (error) {
                        vToasts.addHttpError(error); console.log(error);});
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
        data:()=> {return {httpUserPassword: '', httpUserName:''}},
        methods: {
            sendReboot:()=>{
                axios.post(`http://${serverLocation}/reboot`)
                    .then((response) => { console.log(response); vToasts.add(response.data);})
                    .catch((error) => {console.log(error);});
            },
        },
        template: "#settings-reboot"
    })
);



const ws = new WSConnection(serverLocation, vTerminal);
const wscli = new WSCli(ws);

document.addEventListener('DOMContentLoaded', wscli.init);


wscli.context.add('cmd');
wscli.commands.add(
    'Cmd',
    (arg) => {
        if(wscli.context.current = (wscli.context.cmd)){
            wscli.lastCmd = arg;
            return true;
        }else
            return false;
    }
);

wscli.commands.add(
    'CmdRes',
    (arg) => true
);
wscli.commands.add(
    'Value',
    (arg) => true
);

wscli.commands.add(
    'Error',
    (arg) => {
        if(wscli.context.current === wscli.context.cmd){
            vToasts.add(`Cmd ${wscli.lastCmd} error: ${arg}`);
            return true;
        }
    }
);

wscli.commands.add(
    'Time',
    (arg) => {$store.commit($store.mutation.setTime, DateFromShotXMLString(arg)); return true}
);



wscli.context.add('sensor');
wscli.commands.add(
    'Sensor',
    (arg) => {
        /** @namespace wscli.context.sensor */
        if(wscli.context.current = (wscli.context.sensor)){
            vSensors.currentSensor = Number(arg);
            return true;
        }else
            return false;
    }
);
wscli.commands.add(
    'Type',
    (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            Vue.set(vSensors.getCurrentSensor(), 'type', String(arg).toUpperCase());
            return true;
        }
    }
);
wscli.commands.add(
    'TimeLabel',
    (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            Vue.set(vSensors.getCurrentSensor(), 'timeLabel', DateFromShotXMLString(arg));
            if(arg > vSensors.maxTimeLabel)
                vSensors.maxTimeLabel = arg;
            return true;
        }
    }
);

wscli.commands.add(
    'SensorData',
    (arg) => {
        if(wscli.context.current === wscli.context.sensor){

            let arr = String(arg).match(/(?:[^;\\]+|\\.)+/gm) || [];
            let params = {};
            arr.forEach(function (item) {
                let param = item.match(/(?:[^=\\]+|\\.)+/)[0];
                params[param.toLowerCase()] = item.slice(param.length + 1);
            });
            Vue.set(vSensors.getCurrentSensor(), 'params', params);
            return true;
        }
    }
);

wscli.commands.add(
    'Name',
    (arg) => {
        if(wscli.context.current === wscli.context.sensor){
            Vue.set(vSensors.getCurrentSensor(), 'name', arg);
            return true;
        }
    }
);



function WSCli (ws){
    this.ws = ws;

    this.lastCmd = undefined;

    this.commands = {
        add: function (name, func) {
            const _name = 'cmd-' + name.toLowerCase();

            if(!this[_name])
                this[_name] = {name: name, funcs: []};
            this[_name].funcs.push(func);
        }
    };

    this.send = function(text){
        if(this.ws)
            this.ws._SendText(text);
    };

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
            if ( !this._current || !val)
                this._current = val;
            else
                throw("Context already set");
        }});

    //this.setError = (err) => this._error = err;

    this._onCommand = function(cmdStrings) {
        (String(cmdStrings).match(/(^#.*$)/gm) || []).forEach(
             (cmdString)=> {
                this.context.current = this.context.none;
                //this.setError('');

                if (cmdString.slice(0, 1) === '#'){

                    let cmdArray = cmdString.slice(1).match(/(?:[^,\\]+|\\.)+/gm);
                    for (let i = 0; i < cmdArray.length; i++) {
                        let cmd = cmdArray[i].trim();
                        if(cmd) {
                            try {
                                this.executeCmd(cmd);
                            } catch (err) {
                                let message = `Cmd executing error: ${cmd} ${err.message || err}`;
                                vToasts.add(message);
                                console.error(message);
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
                let res = command.funcs[i](arg);
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

    this.checkInRange = function (arg, lv, rv, desc){
        if ((lv <= arg) && (arg <= rv))
            return true;
        let err = desc + ' ' + arg + ' not in range ' + lv + '-' + rv;
        throw(err);
    };

}


function doOnResizeStateItems() {
    let rule = getCssRule('vInnerZoneHeader');
    if(rule) rule.style.width = 'auto';
    doZoom('vZoneHeader', 2);
    if(rule) rule.style.width = '100%';

    doZoom('vCurrentStateInner', 5);
}
window.addEventListener('resize', doOnResizeStateItems , false );


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

        this._terminal.log(String(String(text).replace('#', '>')).trim());
    };

    this._SendText = (text)=> {
        text += (String(text).endsWith('\n') ? '' : '\n');

/*        if(this._textBufferForSend && this._textBufferForSend.endsWith('\n')) {
            this._textBufferForSend = this._textBufferForSend.substr(0, this._textBufferForSend.length - 1) + ',';
            text = text.substr(1);
        }
*/        this._textBufferForSend = this._textBufferForSend ? this._textBufferForSend + text : text;

        setTimeout(this._SendTextBuffer, 0);
    };

    this.init = ()=> {
        this.connect();
        setInterval(this._checkConnection, 2000);
        window.addEventListener("unload", this.disconnect);
    };

}
