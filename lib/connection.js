const sqlite3       = require('sqlite3');
const uuid          = require('uuid');
const util          = require('./util');
const { Serialize } = require('./serde');

const config = util.loadConfig();


class Connection {

    constructor({socket, onClose=()=>{}}={}) {

        this.id          = uuid.v4().replace(Connection.uuidRe, '');
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
            if(this._state != 'open') {
                // Write negative acknowledgement byte to socket notifying
                // other party that connection is draining and not accepting
                // new requests

                const serializer = new Serialize();
                serializer.begin();
                serializer.draining();
                serializer.end();
                this._write(serializer.serialize());
                return;
            }
            this._reqDataBuf += data.toString();

            // If the request data buffer contains null bytes, pop queries out
            // of buffer and push into query queue
            let matchResults = this._reqDataBuf.match(Connection.queryRe);

            while(Array.isArray(matchResults) && matchResults.length == 2) {
                let query = matchResults[0];
                const queryId = uuid.v4().replace(Connection.uuidRe, '');

                query = query.replace(Connection.nullByteRe, '');
                this._queryQueue.push({
                    query,
                    id: queryId
                });

                const serializer = new Serialize(queryId);
                serializer.begin();
                serializer.ack();
                serializer.end();
                this._write(serializer.serialize());

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

        this._socket.on('end', () => {
            console.log(`Conn ${this.id}: Connection closed.`);
            this.close(false);
        });
    }

    close(graceful=true) {
        if(graceful && this._queryQueue.length) {
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

        // pop next request off query queue. Return if
        // no more requests to process
        let query = this._queryQueue.splice(0, 1);

        // If query queue is empty:
        if(!query.length == 1) {
            // if connection is closing, close connection now
            if(this._state == 'closing') {
                this.close(false);
            }
            return;
        }

        // start processing request
        let queryId = query[0].id;
        query = query[0].query;

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

        console.log(`Conn ${this.id}: Processing query ${queryId}`);
        const serializer = new Serialize(queryId);
        serializer.begin();

        function queryHandler(err, data) {
            if(err) {
                console.error(`Conn ${_this.id}: Got an error from db: ${err}`);

                serializer.error(err.toString());
                serializer.end();
                _this._write(serializer.serialize());

                _this._state == 'open';
                _this._processQueryQueue();
                return;
            }

            if(fn == 'each') {
                serializer.bodyRow(data);
                _this._write(serializer.serialize());
                serializer.clear();
            }else {
                const elapsedTime = Date.now() - startTime;
                console.log(`Conn ${_this.id}: Request complete in ${elapsedTime}ms`);

                if(fn == 'run') {
                    serializer.bodyRow({ lastId: this.lastID, changes: this.changes });
                    serializer.end();
                    _this._write(serializer.serialize());
                }else {
                    serializer.end();
                    serializer.end();
                    _this._write(serializer.serialize());
                }
                _this._state == 'open';
                _this._processQueryQueue();
            }
        }

        function doneHandler(err, resultCount) {
            if(err) {
                console.error(`Conn ${_this.id}: Got an error from db: ${err}`);
                serializer.error(err.toString());
                serializer.end();

                _this._write(serializer.serialize());
                _this._state == 'open';
                _this._processQueryQueue();
                return;
            }
            const elapsedTime = Date.now() - startTime;
            console.log(`Conn ${_this.id}: Request complete in ${elapsedTime}ms. Records returned: ${resultCount}`);

            serializer.end();
            _this._write(serializer.serialize());

            _this._state == 'open';
            _this._processQueryQueue();
        }

        if(fn == 'each') {
            this._db[fn](query, queryHandler, doneHandler);
        }else {
            this._db[fn](query, queryHandler);
        }

    }
}

Connection.selectRe = /^\s*?(select|pragma)[^;=]*?[\s;]*$/i;
Connection.dmlRe = /^\s*?(insert|update|replace|delete)[^;]*?[\s;]*$/i;
Connection.queryRe = /^.*?\u0000(.*)/;
Connection.nullByteRe = /\u0000$/;
Connection.uuidRe = /-/g;

module.exports = Connection;