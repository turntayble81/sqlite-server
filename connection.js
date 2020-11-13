const sqlite3 = require('sqlite3');
const uuid    = require('uuid');
const config  = require('./config');

// TODO: when closing, reject any future requests, and shut down once query queue is drained

class Connection {

    constructor({socket, onClose=()=>{}}={}) {

        this.id          = uuid.v4();
        this._onClose    = onClose;
        this._db         = new sqlite3.Database(config.DATABASE_FILE);
        this._socket     = socket;
        this._reqDataBuf = '';
        this._queryQueue = [];
        this._state      = 'open';

        console.log(`Conn ${this.id}: Connection created from ${this._socket.remoteAddress}`);

        //Close connections which broke on the client side
        this._socket.setKeepAlive(true, config.CONNECTION_TIMEOUT * 1000);

        //Close idle connections
        this._socket.setTimeout(config.CONNECTION_TIMEOUT * 1000);

        this._socket.on('data', (data) => {
            this._reqDataBuf += data.toString();

            // If the request data buffer contains null bytes, pop queries out
            // of buffer and push into query queue
            let matchResults = this._reqDataBuf.match(Connection.queryRe);

            while(Array.isArray(matchResults) && matchResults.length == 2) {
                let query = matchResults[0].toLowerCase();
                query = query.replace(Connection.nullByteRe, '');
                this._queryQueue.push(query);
                this._processQueryQueue();

                this._reqDataBuf = matchResults[1];
                matchResults = this._reqDataBuf.match(Connection.queryRe);
            }
        });

        this._socket.on('error', (err) => {
            console.error(`Conn ${this.id}: Socket error: ${err}`);
            this.close(false);
        });

        this._socket.on('timeout', () => {
            console.log(`Conn ${this.id}: Connection timed out.`);
            this.close(false);
        });

        this._socket.on('end', (data) => {
            console.log(`Conn ${this.id}: Connection closed.`);
            this.close(false);
        });
    }

    close(graceful=true) {
        if(graceful && this._state == 'processing') {
            console.log(`Conn ${this.id}: Initiating graceful shutdown`);
            this._state = 'closing';
            return;
        }
        this._db.close();
        this._socket.destroy();
        this._state = 'closed';
        this._onClose(this);
    }

    _write(data) {
        if(this._state == 'open') {
            this._socket.write(data);
        }
    }

    _processQueryQueue() {
        // if connection is closing, close now and return 
        // prior to processing any additional requests
        if(this._state == 'closing') {
            this.close(false);
            return;
        }

        // pop next request off query queue. Return if
        // no more requests to process
        let query = this._queryQueue.splice(0, 1);
        if(!query.length == 1) {
            return;
        }

        // start processing request
        this._state == 'processing';
        query = query[0];
        const _this = this;
        const startTime = Date.now();
        let fn;

        if(Connection.selectRe.test(query)) {
            fn = 'each';
        }else if(Connection.dmlRe.test(query)) {
            fn = 'run';
        }else {
            fn = 'exec';
        }

        console.log(`Conn ${this.id}: Processing query`);

        function queryHandler(err, data) {
            if(err) {
                console.error(`Conn ${_this.id}: Got an error from db: ${err}`);
                _this._write(JSON.stringify({error: err.toString()}));
                this._state == 'open';
                _this._processQueryQueue();
                return;
            }

            // TODO: generate delimited data for all fn types
            if(fn == 'each') {
                _this._write(JSON.stringify(data));
            }else {
                const elapsedTime = Date.now() - startTime;
                console.log(`Conn ${_this.id}: Request complete in ${elapsedTime}ms`);

                if(fn == 'run') {
                    _this._write(JSON.stringify({ lastId: this.lastID, changes: this.changes }));
                }else {
                    _this._write('{}');
                }
                this._state == 'open';
                _this._processQueryQueue();
            }
        }

        function doneHandler(err, resultCount) {
            if(err) {
                console.error(`Conn ${_this.id}: Got an error from db: ${err}`);
                _this._write(JSON.stringify({error: err.toString()}));
                this._state == 'open';
                _this._processQueryQueue();
                return;
            }
            const elapsedTime = Date.now() - startTime;
            console.log(`Conn ${_this.id}: Request complete in ${elapsedTime}ms. Records returned: ${resultCount}`);
            this._state == 'open';
            _this._processQueryQueue();
        }

        if(fn == 'each') {
            this._db[fn](query, queryHandler, doneHandler);
        }else {
            this._db[fn](query, queryHandler);
        }

    }
}

Connection.selectRe = /^\s*?select[^;]*?[\s;]*$/i;
Connection.dmlRe = /^\s*?(insert|update|replace|delete)[^;]*?[\s;]*$/i;
Connection.queryRe = /^.*?\0(.*)/;
Connection.nullByteRe = /\0$/;

module.exports = Connection;