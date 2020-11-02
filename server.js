const net     = require('net');
const sqlite3 = require('sqlite3');
const uuid    = require('uuid');
const config  = require('./config');

const server = net.createServer();
server.maxConnections = config.MAX_CONNECTIONS;
server.listen(config.PORT, '127.0.0.1');

function logConnectionCount() {
    server.getConnections((err, count) => {
        console.log(`Active connections: ${count}`);
    });
}

/*** EVENTS ***/

server.on('connection', (socket) => {

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

        // TODO: Should only handle one request at a time per connection

        // TODO: For select queries, use all or each.
        // For all others, use exec:

        // Database#all(sql, [param, ...], [callback])
        // Database#each(sql, [param, ...], [callback], [complete])
        // Database#exec(sql, [callback])

        //receiving req here
        console.log(`Got request from connection ${socket.id}: `, req);

        //do something here
        socket.db.all(req, (err, data) => {
            if(err) {
                socket.write(err);
                return;
            }
            socket.write(JSON.stringify(data));
        });
    });

    socket.on('timeout', () => {
        console.log(`Connection timed out. Connection identifier: ${socket.id}`);
        socket.destroy();
        logConnectionCount();
    });

    socket.on('end', (data) => {
        console.log(`Connection closed. Connection identifier: ${socket.id}`);
        socket.destroy();
        logConnectionCount();
    });
});

server.on('listening', () => {
    console.log(`Server listening on port ${config.PORT}`);
});
