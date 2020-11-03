const net     = require('net');
const sqlite3 = require('sqlite3');
const uuid    = require('uuid');
const config  = require('./config');

let reqStr = '';
const selectRe = /^\s*?select[^;]*?[\s;]*$/i;
const dmlRe = /^\s*?(insert|update|replace|delete)[^;]*?[\s;]*$/i;
const queryRe = /^.*?\0(.*)/;
const nullByteRe = /\0$/;
const server = net.createServer();

server.maxConnections = config.MAX_CONNECTIONS;
server.listen(config.PORT, '127.0.0.1');


/*** EVENTS ***/

server.on('connection', (socket) => {

    function closeConnection() {
        socket.db.close();
        socket.destroy();
        logConnectionCount();
    }

    function logConnectionCount() {
        server.getConnections((err, count) => {
            console.log(`Active connections: ${count}`);
        });
    }
    
    function processRequestData() {
        let matchResults = reqStr.match(queryRe);
        while(Array.isArray(matchResults) && matchResults.length == 2) {
            const startTime = Date.now();
            let fn;
            let req = matchResults[0].toLowerCase();
            req = req.replace(nullByteRe, '');

            reqStr = matchResults[1];

            console.log(req);
            if(selectRe.test(req)) {
                fn = 'all';
            }else if(dmlRe.test(req)) {
                fn = 'run';
            }else {
                fn = 'exec';
            }
            console.log(fn);
            //receiving req here
            console.log(`Got request from connection ${socket.id}`);

            //do something here
            socket.db[fn](req, function(err, data) {
                console.log(`Request complete for connection ${socket.id} in ${Date.now() - startTime}ms`);
                if(err) {
                    console.error(err);
                    socket.write(JSON.stringify({error: err.toString()}));
                    return;
                }
                if(fn == 'all') {
                    socket.write(JSON.stringify(data));
                }else if(fn == 'run') {
                    socket.write(JSON.stringify({ lastId: this.lastID, changes: this.changes }));
                }else {
                    socket.write('{}');
                }
            });
            matchResults = reqStr.match(queryRe);
        }
    }
    
    const db = new sqlite3.Database(config.DATABASE_FILE);
    socket.db = db;
    socket.id = uuid.v4();

    console.log(`Connection created from ${socket.remoteAddress}. Connection identifier: ${socket.id}`);
    logConnectionCount();

    //Close connections which broke on the client side
    socket.setKeepAlive(true, config.CONNECTION_TIMEOUT * 1000);

    //Close idle connections
    socket.setTimeout(config.CONNECTION_TIMEOUT * 1000);

    socket.on('data', (req) => {
        req = req.toString();
        reqStr += req;

        processRequestData();
    });

    socket.on('timeout', () => {
        console.log(`Connection timed out. Connection identifier: ${socket.id}`);
        closeConnection();
    });

    socket.on('end', (data) => {
        console.log(`Connection closed. Connection identifier: ${socket.id}`);
        closeConnection();
    });
});

server.on('listening', () => {
    console.log(`Server listening on port ${config.PORT}`);
});
