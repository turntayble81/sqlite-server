const net        = require('net');
const util       = require('./lib/util');
const Connection = require('./lib/connection');

const config = util.loadConfig();

// TODO: Add mocha and write tests
// TODO: Add support for data compression

class SqliteServer {

    constructor() {
        this.server       = net.createServer();
        this._connections = {};
        this._state       = 'running';

        this.server.maxConnections = config.MAX_CONNECTIONS;
        this.server.listen(config.PORT, '127.0.0.1');

        this.server.on('listening', () => {
            console.log(`Server listening on port ${config.PORT}`);
        });

        this.server.on('connection', (socket) => {
            const conn = new Connection({ socket, onClose: this._onConnClose.bind(this)});
            this._connections[conn.id] = conn;
            console.log(`Active connections: ${this.getConnectionCount()}`);
        });

        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
    }

    getConnectionCount() {
        return Object.keys(this._connections).length;
    }

    shutdown(signal) {
        console.log(`Received ${signal}. Draining connections`);
        this._state = 'shutting down';
        if(this.getConnectionCount() == 0) {
            process.exit();
        }
        Object.values(this._connections).forEach((conn) => {
            conn.close();
        });
    }

    _onConnClose(conn) {
        delete this._connections[conn.id];
        const connCount = this.getConnectionCount();
        console.log(`Active connections: ${connCount}`);
        if(this._state == 'shutting down' && connCount == 0) {
            process.exit();
        }
    }
}

new SqliteServer();