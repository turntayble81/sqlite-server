const NUL = '\u0000';
const SOH = '\u0001';
const EOT = '\u0004';
const ACK = '\u0006';
const BEL = '\u0007';
const NAK = '\u0015';
const RS  = '\u001e';
const US  = '\u001f';

const COL_SEPARATOR = `${NUL}${RS}${NUL}`;
const ROW_SEPARATOR = `${NUL}${US}${NUL}`;


class Serialize {
    constructor() {
        this.result = '';
        this.headerRowWritten = false;
    }

    begin() {
        this.clear();
        this.result = SOH;
    }

    end() {
        this.result += EOT;
    }

    headerRow(row) {
        this.result += SOH;
        this.result += Object.keys(row).join(COL_SEPARATOR);
        this.result += ROW_SEPARATOR;
        this.headerRowWritten = true;
    }

    bodyRow(row) {
        const rowData = Object.values(row).join(COL_SEPARATOR);

        if(!this.headerRowWritten) {
            this.headerRow(row);
        }
        this.result += `${rowData}${ROW_SEPARATOR}`;
    }

    ack() {
        this.result += ACK;
    }

    draining() {
        this.result += NAK;
    }

    col() {
        this.result += COL_SEPARATOR;
    }

    row() {
        this.result += ROW_SEPARATOR;
    }

    error(errText) {
        this.result += `${BEL}${errText}`;
    }

    clear() {
        this.result = '';
    }

    init() {
        this.clear();
        this.headerRowWritten = false;
    }

    serialize() {
        return Buffer.from(this.result, 'utf8');
    };
}


// record types:
// result set
// error
// draining

class Deserialize {
    constructor(recordHandler) {
        this.init();
        this._dataBuf = Buffer.from([]);
    }

    init() {
        this._state = 'idle';
        this._currentRecType = '';
        this._headerRow = false;
    }

    parse(data, _result = []) {

        if(Buffer.isBuffer(data) && data.byteLength) {
            this._dataBuf = Buffer.concat([this._dataBuf, data]);
        }

        if(!this._dataBuf.byteLength) {
            return;
        }

        // is a record currently being processed?
        if(this._state == 'idle') {
            if(String.fromCharCode(this._dataBuf[0]) == SOH) {
                this._state = 'processing';
                this._dataBuf = this._dataBuf.slice(1);
            }else {
                throw 'Malformed data';
            }
        }

        if(!this._currentRecType) {
            const recTypeByte = String.fromCharCode(this._dataBuf[0]);
            if(recTypeByte == SOH) {
                this._currentRecType = 'Result';
            }else if(recTypeByte == NAK) {
                this._currentRecType = 'Draining';
            }else if(recTypeByte == BEL) {
                this._currentRecType = 'Error';
            }else {
                throw 'Invalid record type';
            }
            this._dataBuf = this._dataBuf.slice(1);
        }

        if(!this._dataBuf.byteLength) {
            return;
        }

        const result = this[`_process${this._currentRecType}`]();
        if(result) {
            _result.push(result);
            if(this._dataBuf.byteLength > 0) {
                this.parse(null, _result);
            }
        }
        return _result;
    }

    _processResult() {
        const result = [];
        let data;
        let eolIdx;
        let eotIdx = this._dataBuf.indexOf(EOT);

        if(eotIdx != -1) {
            data = this._dataBuf.slice(0, eotIdx+1);
            this._dataBuf = this._dataBuf.slice(eotIdx+1);
        }else {
            data = this._dataBuf.slice(0);
            this._dataBuf = Buffer.from([]);
        }
        
        eolIdx = data.indexOf(ROW_SEPARATOR);
        while(eolIdx != -1) {
            const row = data.slice(0, eolIdx).toString().split(COL_SEPARATOR)
            if(!this._headerRow) {
                this._headerRow = row;
            }else {
                result.push({
                    _type : 'resultRow',
                    mesg  : this._headerRow.map((col, idx) => ({ [col]: row[idx]}))
                });
            }

            data = data.slice(eolIdx+ROW_SEPARATOR.length);
            eolIdx = data.indexOf(ROW_SEPARATOR);
        }

        if(data.indexOf(EOT) === 0) {
            this.init();
        }
        return result.length ? result : null;
    }

    _processDraining() {
        let result;
        if(this._dataBuf[0] == EOT) {
            result = {
                _type: 'draining'
            };
            this._dataBuf = this._dataBuf.slice(1);
        }else {
            throw 'Malformed data for draining record';
        }
        this.init();
        return result;
    }

    _processError() {
        const eotIdx = this._dataBuf.indexOf(EOT);
        if(eotIdx == -1) {
            return;
        }

        const result = {
            _type : 'error',
            mesg  : this._dataBuf.slice(0, eotIdx).toString()
        }
        this._dataBuf = this._dataBuf.slice(eotIdx+1);
        this.init();
        return result;
    }
}

module.exports = { Serialize, Deserialize };

