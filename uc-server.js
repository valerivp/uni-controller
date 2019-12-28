'use strict';

const http = require('http');
const url = require('url');
const qs = require('querystring');
const multipart = require('multipart-formdata');

const WebStatic = require('node-static');
const WebSocket = require('ws');

//authentication.
const authentication = require('./uc-auth');

let router = undefined;


function requestListener(request, response){

    const URL = url.parse(request.url, true);
    request.pathname = URL.pathname;
    request.query = URL.query;

    //let auth = (request.pathname.indexOf('/na/') == 0 ? undefined: authentication.get());
    const auth = authentication.get(request.pathname);
    if (auth && !auth(request, response)) {
        response.end();
    }else if(! response.finished){
        if(request.method === 'GET') {

            if (!router.route(request, response))
                files.serve(request, response, function (err, res) {
                    if (err) { // An error as occured
                        console.error("> Error serving " + request.url + " - " + err.message);
                        response.writeHead(err.status, err.headers);
                        response.end();
                    } else { // The file was served successfully
                        console.log("> " + request.url + " - " + res.message);
                    }
                });
        }else if(request.method === 'POST'){

            let body = '';
            request.on('data', function (data) {
                body += data;
                // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                if (body.length > 1e6) {
                    // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                    request.connection.destroy();
                }
            });
            request.on('end', function () {
                if(request.headers['content-type'] && request.headers['content-type'].indexOf('multipart/form-data; boundary=') === 0){
                    let boundary = request.headers['content-type'].substr(String('multipart/form-data; boundary=').length);
                    let tmp = multipart.parse(body, boundary);
                    request.body = {};

                    tmp.forEach(function (field) {
                        request.body[field.name] = field.field;
                    })
                }else{
                    request.body = qs.parse(body);
                }
                if(!router.route(request, response)){
                    response.writeHead(404);
                    response.end();
                }

            });
        }
    }
}


const files = new WebStatic.Server('www', { cache: 7200, headers: {'X-Hello':'World!'}, indexFile: 'index.htm', gzip: true});


const httpServer = new http.createServer(function (request, response){
    try {
        requestListener(request, response)
    }catch(err){
        let message = err.message + '\nurl:' + request.url + '\n' + err.stack;
        response.writeHead(500, {'Content-Type': 'text/plain'});
        response.write(message);
        response.end();
        console.error(message);
    }
});

httpServer.on('upgrade', function (request, socket) {
    let code = undefined;
    let stub = {end: function () {}, writeHead: function (c) {code = c;}, setHeader: function () {}};
    let auth = authentication.get();
    if (auth && !auth(request, stub)) {
        socket.write('HTTP/1.1 ' + code);
        socket.destroy();//socket.end(401);
    }
});

const ws = new WebSocket.Server({ server: httpServer });
module.exports.ws = ws;

ws.broadcast = function broadcast(data) {
    if(data.indexOf("#time"))
        console.log('b: %s', data.trim());
    ws.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

ws.send = function send(client, data) {
    console.log('c: %s', data.trim());
    if (client.readyState === WebSocket.OPEN) {
        client.send(data);
    }
};

function ping() {
    let n = 0;
    ws.clients.forEach(function each(client) {
        if (client.isAlive === false){
            console.log("A dead client is terminated");
            return client.terminate();
        }
        client.isAlive = false;
        client.ping(function () {});
        n++;
    });
    console.log("Amount of live clients: " + n);
}


function init(port, r){
    if(!router){
        router = r;
        httpServer.listen(port);
        setInterval(ping, 30000);
    }
    return module.exports;
}
module.exports.init = init;

