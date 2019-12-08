'use strict';

const child_process = require('child_process');

const Router = function () {
    this.routes = {
        'GET': {},
        'POST': {},
        'PUT': {},
        'PATCH': {},
        'DELETE': {}
    };
    this.help = '';
};

const router = new Router;
module.exports = router;

Router.prototype.addInfo = function(method, url, text){
    if(text)
        this.help += `${method}\t${url}:\t${text}\n`;
};
Router.prototype.getInfo = function(){
    return this.help;
};

Router.prototype.route = function (request, response) {
    /** @namespace this.routes */
    let routeFunction = this.routes[request.method][request.pathname];
    if(!routeFunction)
        return false;

    try {
        routeFunction(request, response);
    }catch(err){
        let message = err.message + '\nurl:' + request.url + '\n' + err.stack;
        response.writeHead(500, {'Content-Type': 'text/plain'});
        response.write(message);
        response.end();
        console.error(message);
    }
    return true;
};

Router.prototype.get = function (route, cb, about) {
    this.routes.GET[route] = cb;
    this.addInfo('GET', route, about);
};


Router.prototype.post = function (route, cb, about) {
    this.routes.POST[route] = cb;
    this.addInfo('POST', route, about);
};

Router.prototype.put = function (route, cb, about) {
    this.routes.PUT[route] = cb;
    this.addInfo('PUT', route, about);
};

Router.prototype.patch = function (route, cb, about) {
    this.routes.PATCH[route] = cb;
    this.addInfo('PATCH', route, about);
};

Router.prototype.delete = function (route, cb, about) {
    this.routes.DELETE[route] = cb;
    this.addInfo('DELETE', route, about);
};

router.get('/help',
    function (req, res) {
        res.write(router.help);
        res.end();
    },
    'get list allow URLs');

router.get('/err',
    function (req, res) {
        throw new Error('Test error')
    },
    'test internal error');

router.get('/info',
    function (req, res) {
        let output = '';
        output += "MCU:Onion Omega 2\n";
        //output += "ChipID:" + ESP_getChipIdStr() + '\n';
        //output += String(F("FreeHeap:")) + String(ESP.getFreeHeap()) + '\n';
        //output += String(F("DemoMode:true\n"));

        res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
        res.write(output);
        res.end();
    },
    'get system info');

router.get('/uptime',
    function (req, res) {
        let uptime = process.uptime();
        let uptimeDate = new Date(uptime * 1000);
        let uptimeString = '' + Math.round(uptime / 24 / 60 / 60) + uptimeDate.toFormatString('Dhhiiss', true);
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(uptimeString);
        res.end();
    },
    'get uptime as string (eg: 123D123456)');



//simple user config
const urlUser = "/user";
router.get(urlUser,
    function (req, res) {
        let data, contentType;
        if (req.query.format === "json") {
            contentType = 'text/json';
            data = JSON.stringify({name: authentication.User});
        }else if (req.query.format === "text"){
            contentType = 'text/plain';
            data = "name:" + authentication.User + '\n';
        }else{
            contentType = 'text/html';
            // language=HTML
            data = `
                <html>
                    <head>
                        <title>Config User</title>
                    </head>
                    <body>
                        <form method="post" action="user">
                            <input name="name" maxlength="15" placeholder="name">
                            <input name="password" maxlength="15" type="password" placeholder="password">
                            <button type="submit">save</button>
                        </form>
                    </body>
                </html>`;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.write(data);
        res.end();
    },
    'get user settings form or data (?[format=json|text])');

const authentication = require('./uc-auth');
router.post(urlUser,
    function (req, res) {
        try{
            authentication.set(req.body.name, req.body.password);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write("Authentication set");

        }catch (err){
            res.writeHead(400);
            res.write(err.message);
        }
        res.end();
    },
    'set user settings');

/*
help_info += "/user-info ? [format=json]: get user info as text or json. Allow methods: HTTP_GET\n";
router.get("/user-info", function (req, res){
    let data;
    if (req.query.format === "json") {
        data = JSON.stringify({name: authentication.User});
        res.writeHead(200, {'Content-Type': 'text/json'});
    }else {
        data = "name:" + authentication.User + '\n';
        res.writeHead(200, {'Content-Type': 'text/plain'});
    }
    res.write(data);
    res.end();
});
*/

let urlReboot = "/reboot";
router.get(urlReboot,
    function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        // language=HTML
        res.write(`
            <html>        
                <head>
                    <title>Reboot</title>
                </head>
                <body>
                    <form action="/reboot" method="POST">
                        <input type="submit" value="reboot">
                    </form>
                </body>
            </html>`);
        res.end();
    },
    'get reboot form');

router.post(urlReboot,
    function (req, res) {
        let child = child_process.spawn("reboot");
        child.on('error', (err) => {console.log('Failed to start child process: reboot');});
        if(!child.pid){
            child = child_process.spawn("shutdown", ['/r', '/t', '0']);
            child.on('error', (err) => {console.log(`Failed to start child process: shutdown (${err.message})`);});
        }

        if(child.pid){
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(`Ok. Wait for restart:  ${child.spawnfile}`);

        }else{
            res.writeHead(400);
            /** @namespace child.spawnfile */
            res.write(`Failed to start child process: ${child.spawnfile}`);

        }
        res.end();
    },
    'restart system');

