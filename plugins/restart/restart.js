'use strict';


const router = require(`uc-router`);


let urlRestart = "/restart";
router.get(urlRestart,
    function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        // language=HTML
        res.write(`
            <html>        
                <head>
                    <title>Restart</title>
                </head>
                <body>
                    <form action="/restart" method="POST">
                        <input type="submit" value="restart">
                    </form>
                </body>
            </html>`);
        res.end();
    },
    'get restart form');

router.post(urlRestart,
    function (req, res) {
        restartProcess();
    },
    'restart system');


function restartProcess(){
    child_process.fork(process.mainModule.filename, process.argv.slice(2), {
        detached: true
        ,stdio: 'inherit'
    }).unref();
    process.exit();
}
