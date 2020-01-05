'use strict';

const utils = require("./uc-utils").init(false);
const db = require("./uc-db");

const wscli = module.exports;

/*
Use:
wscli.sendData("#Cmd");
wscli.sendClientData("#Cmd2");
 */

function Context() {
    this._current = undefined;
    this.none = null;
}
Object.defineProperty(Context.prototype, 'current', {
    get() {
        return this._current;
    },
    set(val) {
        if ( !this._current || !val)
            this._current = val;
        else
            throw("Context already set");
    }});

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
                console.log('>: %s', message.trim());
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
            wscli.error = '';

            if (cmdString.slice(0, 1) === '#'){

                let cmdArray = cmdString.slice(1).match(/(?:[^,\\]+|\\.)+/gm);
                for (let i = 0; i < cmdArray.length; i++) {
                    let cmd = cmdArray[i].trim();
                    if(cmd){
                        try{
                            executeCmd(cmd);
                        }catch (err){
                            let error = err.message || err;
                            wscli.sendClientData(`#Cmd:${cmd},CmdRes:Error,Error:${error}`);
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
    add: function (name, pfunc, pabout) {
        let func = ('function' === typeof pfunc ? pfunc : pabout);
        let about = ('function' === typeof pfunc ? pabout : pfunc);

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
        let data = '#Time:' + utils.DateToShotXMLString(new Date());
        wscli.sendClientData(data);
        return true;
    },
    'Get time from server');

setInterval(function () {
        wscli.sendData('#time:' + utils.DateToShotXMLString(new Date()));
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
            let res = command.funcs[i](arg);
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
    if ((lv <= arg) && (arg <= rv))
        return true;
    let err = desc + ' ' + arg + ' not in range ' + lv + '-' + rv;
    throw(err);
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

/*
function sendDataBroadcastDirect(data) {
    if(!data)
        return;
    WebSocket.broadcast(data);
}

function sendClientDataDirect(client, data) {
    if(!data)
        return;
    WebSocket.send(client, data);
}*/


