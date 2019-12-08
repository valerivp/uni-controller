'use strict';

const db = require("./uc-db");

const wscli = module.exports;

wscli.context = {
    _current: undefined,
    none: undefined,
    getCurrent: function(){
        return this._current;
    },
    setCurrent: function(c){
        if ( !this._current || !c)
            return (this._current = c);
        else
            wscli.setError("Context already set");
        return undefined;
    },
    add: function(item){
        if(!this.hasOwnProperty(item))
            this[item] = item;
        else
            throw(`Contexts item alredy present: ${item}`);
    }

};



let WebSocket;
wscli.init = function (ws) {
    if(!WebSocket) {
        WebSocket = ws;

        ws.on('connection', function connection(client) {
            client.isAlive = true;
            client.on('pong', function () {
                this.isAlive = true;
            });
            client.on('message', function incoming(message) {
                console.log('>: %s', message);
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
    wscli._client = client;

    (String(cmdStrings).match(/(^#.*$)|((^[?][\s\S]*))/gm) || []).forEach(
        function (cmdString) {
            wscli.context.setCurrent(wscli.context.none);
            wscli.setError('');

            if (cmdString.slice(0, 1) === '#'){

                let cmdArray = cmdString.slice(1).match(/(?:[^,\\]+|\\.)+/gm);
                for (let i = 0; i < cmdArray.length; i++) {
                    let cmd = cmdArray[i].trim();
                    if(cmd && !executeCmd(cmd)){
                        console.log(`Cmd executing error: ${cmd}`);
                        break;
                    }

                }
                wscli.sendData();

            }else if(cmdString.slice(0, 1) === '?'){
                let data = '';
                try{
                    let rows = db.querySync(cmdString.slice(1));
                    data = JSON.stringify(rows);
                } catch (err) {
                    data = err.toString();
                }
                wscli.sendClientData(data);
                wscli.sendData();
            }
        });

}
//module.exports.onCommand = wscli.onCommand;



wscli.commands = {
    add: function (name, func, about) {
        const _name = 'cmd-' + name.toLowerCase();

        if(!this[_name])
            this[_name] = {name: name, funcs: [], about: []};
        this[_name].funcs.push(func);
        this[_name].about.push(about);
    }
};

wscli.commands.add(
    'Help',
    function (arg) {
        let data = '';
        for (let key in wscli.commands) {
            // noinspection JSUnfilteredForInLoop
            if (key.slice(0, 4) === 'cmd-'){
                // noinspection JSUnfilteredForInLoop
                data += `${wscli.commands[key].name}: \t${wscli.commands[key].about.join()}\n`;
            }
        }
        wscli.sendClientData(data);
        return true;
    },
    'Show commands list');

wscli.commands.add(
    'Time',
    function (arg) {
        let data = '#Time:' + (new Date()).toFormatString('yyyymmddThhiiss', false);
        wscli.sendClientData(data);
        return true;
    },
    'Get time from server');

setInterval(function () {
        wscli.sendData('#time:' + (new Date()).toFormatString('yyyymmddThhiiss', false));
        wscli.sendData();
    },
    1000);


let error = '';
wscli.setError = function(err) {
    error = err;
};

function executeCmd(cmdText) {
    // разбор строки с разделителями
    // ^#.*$ - решетка и перенос строки
    // ^[?](.|\n)*;$ - многострочный текст с ; в конце
    // (?<=^|,)(?:"[^"]*+"|[^,"])*+ - запятая
    // (?<=^|:)(?:"[^"]*+"|[^:"])*+ - двоеточие
    let cmd = cmdText.match(/(?:[^:\\]+|\\.)+/)[0];
    let arg = cmdText.slice(cmd.length + 1);

    let result = undefined;
    let command = wscli.commands['cmd-' + cmd.toLowerCase()];
    if(command){
        for(let i = 0; i < command.funcs.length; i++) {
            let res = command.funcs[i](arg);
            if (res === false){
                result = false;
                wscli.sendClientData(`#Cmd:${command.name},Value:${arg},CmdRes:Error,Error:${error}`);
                break;
            } else if (res === true) {
                wscli.sendClientData(`#Cmd:${command.name},CmdRes:Ok`);
                result = true;
            }
        }
        if(result === undefined){
            result = false;
            wscli.sendClientData(`#Cmd:${command.name},CmdRes:Error,Error:NotProcessed`);
        }
    }else {
        result = false;
        wscli.sendClientData(`#Cmd:${cmd},CmdRes:NoCmd`);
    }
    return result;
}

wscli.checkInRange = function (arg, lv, rv, desc){
    if ((lv <= arg) && (arg <= rv))
        return true;
    if (desc) {
        let err = desc + ' ' + arg + ' not in range ' + lv + '-' + rv;
        wscli.setError(err);
    }
    return false;
};

let sendDataBuffer = undefined, sendClientDataBuffer = undefined;

wscli.sendData = function (data) {
    if(sendDataBuffer === undefined)
        sendDataBuffer = '';
    if(sendClientDataBuffer === undefined)
        sendClientDataBuffer = '';

    if(data !== undefined) {
        if (data.length && !data.endsWith('\n'))
            data += '\n';
        sendDataBuffer += data;

    }else{
        if(sendDataBuffer){
            sendDataBroadcastDirect(sendDataBuffer);
            sendDataBuffer = '';
        }
        if(sendClientDataBuffer){
            sendClientDataDirect(wscli._client, sendClientDataBuffer);
            sendClientDataBuffer = '';
        }
    }
};

wscli.sendClientData = function (data) {
    if (data.length && !data.endsWith('\n'))
        data += '\n';
    sendClientDataBuffer += data;
};

function sendDataBroadcastDirect(data) {
    if(!data)
        return;
    WebSocket.broadcast(data);
}

function sendClientDataDirect(client, data) {
    if(!data)
        return;
    WebSocket.send(client, data);
}


