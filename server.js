const net     = require('net');
const sqlite3 = require('sqlite3');
const uuid    = require('uuid');
const config  = require('./config');

class SqliteServer {

    // TODO: pass config vars to constructor
    constructor() {
        this.server = net.createServer();
        this.reqStr = '';


        this.server.maxConnections = config.MAX_CONNECTIONS;
        this.server.listen(config.PORT, '127.0.0.1');

        this.server.on('listening', () => {
            console.log(`Server listening on port ${config.PORT}`);
        });

        this.server.on('connection', (socket) => {this.newConnection(socket)});
    }

    newConnection(socket) {
        this.socket = socket;

        const db = new sqlite3.Database(config.DATABASE_FILE);
        this.socket.db = db;
        this.socket.id = uuid.v4();

        console.log(`Connection created from ${this.socket.remoteAddress}. Connection identifier: ${this.socket.id}`);
        this.logConnectionCount();

        //Close connections which broke on the client side
        this.socket.setKeepAlive(true, config.CONNECTION_TIMEOUT * 1000);

        //Close idle connections
        this.socket.setTimeout(config.CONNECTION_TIMEOUT * 1000);

        this.socket.on('data', (req) => {
            req = req.toString();
            this.reqStr += req;

            this.processRequestData();
        });

        this.socket.on('timeout', () => {
            console.log(`Connection timed out. Connection identifier: ${this.socket.id}`);
            this.closeConnection();
        });

        this.socket.on('end', (data) => {
            console.log(`Connection closed. Connection identifier: ${this.socket.id}`);
            this.closeConnection();
        });
    }

    closeConnection() {
        this.socket.db.close();
        this.socket.destroy();
        this.logConnectionCount();
    }

    processRequestData() {
        const _this = this;
        let matchResults = this.reqStr.match(SqliteServer.queryRe);

        while(Array.isArray(matchResults) && matchResults.length == 2) {
            const startTime = Date.now();
            let fn;
            let req = matchResults[0].toLowerCase();
            req = req.replace(SqliteServer.nullByteRe, '');

            this.reqStr = matchResults[1];

            console.log(req);
            if(SqliteServer.selectRe.test(req)) {
                fn = 'all';
            }else if(SqliteServer.dmlRe.test(req)) {
                fn = 'run';
            }else {
                fn = 'exec';
            }
            console.log(fn);
            //receiving req here
            console.log(`Got request from connection ${this.socket.id}`);

            //do something here
            this.socket.db[fn](req, function(err, data) {
                console.log(`Request complete for connection ${_this.socket.id} in ${Date.now() - startTime}ms`);
                if(err) {
                    console.error(err);
                    _this.socket.write(JSON.stringify({error: err.toString()}));
                    return;
                }
                if(fn == 'all') {
                    _this.socket.write(JSON.stringify(data));
                }else if(fn == 'run') {
                    _this.socket.write(JSON.stringify({ lastId: this.lastID, changes: this.changes }));
                }else {
                    _this.socket.write('{}');
                }
            });
            matchResults = this.reqStr.match(SqliteServer.queryRe);
        }
    }

    logConnectionCount() {
        this.server.getConnections((err, count) => {
            console.log(`Active connections: ${count}`);
        });
    }
}

SqliteServer.selectRe = /^\s*?select[^;]*?[\s;]*$/i;
SqliteServer.dmlRe = /^\s*?(insert|update|replace|delete)[^;]*?[\s;]*$/i;
SqliteServer.queryRe = /^.*?\0(.*)/;
SqliteServer.nullByteRe = /\0$/;

new SqliteServer();