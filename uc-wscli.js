'use strict';

const utils = require("./uc-utils").init(false);
const db = require("./uc-db");

const wscli = module.exports;

/*
Use:
wscli.sendData("#Cmd");
wscli.sendClientData("#Cmd2");
 */
let _wscliCurrentObject = {};
Object.defineProperty(wscli, 'current', {
    get:()=> _wscliCurrentObject,
    set: (val) => {throw("Property is read only");}
});

function Context() {
    this._current = undefined;
    this.none = null;
}
Object.defineProperty(Context.prototype, 'current', {
    get() {
        return this._current;
    },
    set(val) {
        if ( !this._current || !val) {
            this._current = val;
            _wscliCurrentObject = {};
            if(val)
                _wscliCurrentObject[val] = undefined;
            Object.seal(_wscliCurrentObject);
        }else
            throw("Context already set");
    }
});

wscli.context = new Context;

Context.prototype.add = function(item){
    if(!this.hasOwnProperty(item))
        this[item] = item;
    else
        throw(`Context item alredy present: ${item}`);
};



let ws;
wscli.init = function (pws) {
    if(!ws) {
        ws = pws;

        ws.on('connection', function connection(client) {
            client.isAlive = true;
            client.on('pong', function () {
                this.isAlive = true;
            });
            client.on('message', function incoming(message) {
                console.log(`>: ${message.trim()}`);
                onCommand(client, message);
            });
            onConnection(client);
        });
    }
    return module.exports;
};

function onConnection(client) {

    client.send('Hello!\nType #help for command list\n');

}

function onCommand(client, cmdStrings) {
    // (^#.*$)|((^[?][\s\S]*)) - режем на команды и запросы
    wscli._currentClient = client;

    (String(cmdStrings).match(/(^#.*$)|((^[?][\s\S]*))/gm) || []).forEach(
        function (cmdString) {
            wscli.context.current = wscli.context.none;

            if (cmdString.slice(0, 1) === '#'){

                let cmdArray = cmdString.slice(1).match(/(?:[^,\\]+|\\.)+/gm);
                for (let i = 0; i < cmdArray.length; i++) {
                    let cmd = cmdArray[i].trim();
                    if(cmd){
                        try{
                            executeCmd(cmd);
                        }catch (err){
                            let error = err.message || err;
                            wscli.sendClientData(`#Cmd:${cmd},CmdRes:Error,Error:${wscli.data.toString(error)}`);
                            console.error(`Cmd executing error: ${cmd}: ${error}`);
                            break;
                        }
                    }
                }
            }else if(cmdString.slice(0, 1) === '?'){
                let data = '';
                try{
                    let rows = db.querySync(cmdString.slice(1));
                    data = JSON.stringify(rows);
                } catch (err) {
                    data = err.toString();
                }
                wscli.sendClientData(data);
            }
            sendBuffers();
        });

}
//module.exports.onCommand = wscli.onCommand;



wscli.commands = {
    add: function (nameAndArgType, func, about) {
        let name, type;
        for(name in nameAndArgType)
            type = nameAndArgType[name];

        const _name = 'cmd-' + name.toLowerCase();

        if(!this[_name])
            this[_name] = {name: name, funcs: [], about: []};
        //else if(this[_name].type !== type)
        //    throw new Error(`Command is already registered with a different type of parameter: ${name}`)
        this[_name].funcs.push({cb: func, type: type});
        this[_name].about.push(about);
    }
};

wscli.commands.add({Help: null}, (arg)=> {
        let data = '';
        for (let key in wscli.commands) {
            // noinspection JSUnfilteredForInLoop
            if (key.slice(0, 4) === 'cmd-'){
                // noinspection JSUnfilteredForInLoop
                let command = wscli.commands[key];
                data += `${command.name}: \t${command.about.join(' ')}\n`;
            }
        }
        wscli.sendClientData(data);
        return true;
    },
    'Show commands list.');

wscli.commands.add({GetTime: null}, (arg)=> {
        let data = '#Time:' + wscli.data.toString(new Date());
        wscli.sendClientData(data);
        return true;
    },
    'Get time from server.'
);

setInterval(function () {
        wscli.sendData('#time:' + wscli.data.toString(new Date()));
    },
    1000);



function executeCmd(cmdText) {
    // разбор строки с разделителями
    // ^#.*$ - решетка и перенос строки
    // ^[?](.|\n)*;$ - многострочный текст с ; в конце
    // (?<=^|,)(?:"[^"]*+"|[^,"])*+ - запятая
    // (?<=^|:)(?:"[^"]*+"|[^:"])*+ - двоеточие
    let cmd = cmdText.match(/(?:[^:\\]+|\\.)+/)[0];
    let arg = cmdText.slice(cmd.length + 1);

    let command = wscli.commands['cmd-' + cmd.toLowerCase()];
    if(command){
        let result = undefined;
        for(let i = 0; i < command.funcs.length; i++) {
            let func = command.funcs[i];
            let arg1 = wscli.data.fromString(arg, func.type);
            let res = func.cb(arg1);
            if (res === true) {
                wscli.sendClientData(`#Cmd:${command.name},CmdRes:Ok`);
                result = true;
            }else if(res !== undefined)
                throw('Unknown error');
        }
        if(result === undefined)
            throw('Not processed');
    }else
        throw('No cmd');
}

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

let dataBuffer = '';

let handleTimeout = undefined;

wscli.sendData = function (data) {
    dataBuffer += data.trim() + '\n';
    clearTimeout(handleTimeout);
    handleTimeout = setTimeout(sendBuffers);
};

wscli.sendClientData = function (data) {
    wscli._currentClient.dataBuffer = (wscli._currentClient.dataBuffer || '') +  data.trim() + '\n';
    clearTimeout(handleTimeout);
    handleTimeout = setTimeout(sendBuffers);
};

function sendBuffers() {
    handleTimeout = undefined;
    if(dataBuffer){
        ws.broadcast(dataBuffer);
        dataBuffer = '';
    }

    ws.clients.forEach(function(client) {
        if (client.dataBuffer) {
            ws.send(client, client.dataBuffer);
            client.dataBuffer = '';
        }
    });
}


wscli.data = {
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
            res = utils.DateFromShotXMLString(data);
        }else if(type !== null)
            throw new Error(`Unknown type of parameter: ${type}`);

        return res;
    }
};





