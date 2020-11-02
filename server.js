const net = require('net');
const uuid = require('uuid');
const config = require('./config');

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
    socket.id = uuid.v4();

    console.log(`Connection created from ${socket.remoteAddress}. Connection identifier: ${socket.id}`);
    logConnectionCount();

    //Close connections which broke on the client side
    socket.setKeepAlive(true, config.CONNECTION_TIMEOUT * 1000);

    //Close idle connections
    socket.setTimeout(config.CONNECTION_TIMEOUT * 1000);

    socket.on('data', (data) => {

        ///receiving data here
        console.log(`Got request from connection ${socket.id}: `, data.toString());

        //do something here

        //send response here
	    socket.write('Response from server: foo');
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
