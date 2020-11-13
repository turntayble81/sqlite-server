const net        = require('net');
const config     = require('./config');
const Connection = require('./connection');

// TODO: Set up queue system to ensure each
// connection only processes one request at a time

// TODO: Move the config to a json file for easier external maintainance

// TODO: Add support for data compression

// TODO: Implement graceful shutdown handler. Use to close all connections, perform any required cleanup

// TODO: Add mocha, eslint and write tests

class SqliteServer {

    constructor() {
        this.server       = net.createServer();
        this._connections = {};

        this.server.maxConnections = config.MAX_CONNECTIONS;
        this.server.listen(config.PORT, '127.0.0.1');

        this.server.on('listening', () => {
            console.log(`Server listening on port ${config.PORT}`);
        });

        this.server.on('connection', (socket) => {
            const conn = new Connection({ socket, onClose: this._onConnClose.bind(this)});
            this._connections[conn.id] = conn;
            this.logConnectionCount();
        });
    }

    _onConnClose(conn) {
        delete this._connections[conn.id];
        this.logConnectionCount();
    }

    logConnectionCount() {
        const connCount = Object.keys(this._connections).length;
        console.log(`Active connections: ${connCount}`);
    }
}

new SqliteServer();