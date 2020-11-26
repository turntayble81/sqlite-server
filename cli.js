const net = require('net');
const readline = require('readline');
const { Deserialize } = require('./lib/serde');

const deserializer = new Deserialize();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = new net.Socket();

client.connect(9128, '127.0.0.1');
client.setKeepAlive(true, 900000);
client.setTimeout(900000);

function processCommand(req) {
    req = req.trim();
    let isCmd = false;

    switch(req) {
    case '.exit':
        isCmd = true;
        console.log('bye');
        process.exit(0);
    }

    return isCmd;
}

function processQuery(query) {
    client.write(`${query}\0`);
}

client.on('connect', () => {
    console.log('Connection established');
    prompt();
});

client.on('data', function(data) {
    data = deserializer.parse(data);
    data.forEach((res) => console.dir(res, {depth: null}));
    prompt();
});

client.on('error', (err) => {
    console.log('err!', err);
});

client.on('timeout', () => {
    console.log('socket timeout');
    client.destroy();
});

// Fired when server disconnects
client.on('end', () => {
    console.log('Connection ended');
});

// Fired when socket is fully closed
client.on('close', () => {
    console.log('Connection closed');
});

function prompt() {
    rl.question("> ", (input) => {
        if(!input) {
            prompt();
            return;
        }
        const cmdProcessed = processCommand(input);
        if(!cmdProcessed) {
            processQuery(input);
        }
    });
}
