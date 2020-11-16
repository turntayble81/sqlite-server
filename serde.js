const NUL = '\u0000';
const SOH = '\u0001';
const STX = '\u0002';
const ETX = '\u0003';
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
        this.headerRowWritten = true;
    }

    bodyRow(row) {
        const rowData = Object.values(row).join(COL_SEPARATOR);

        if(!this.headerRowWritten) {
            this.headerRow(row);
            this.result += `${STX}${rowData}`;
        }else {
            this.result += `${ROW_SEPARATOR}${rowData}`;
        }
    }

    closeBody() {
        this.result += ETX;
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
        this._state = 'idle';
        this._currentRecType = '';
        this._dataBuf = Buffer.from([]);
    }

    parse(data, _result = []) {
        if(data.byteLength) {
            this._dataBuf = Buffer.concat([this._dataBuf, data]);
        }

        if(!this._dataBuf.byteLength) {
            return;
        }

        // is a record currently being processed?
        if(this._state == 'idle') {
            if(this._dataBuf[0] == SOH) {
                this._state == 'processing';
                this._dataBuf = this._dataBuf.slice(1);
                this._process();
            }else {
                throw 'Malformed data';
            }
        }

        if(!this._currentRecType) {
            const recTypeByte = this._dataBuf[0];
            if(recTypeByte == SOH) {
                this._currentRecType = 'Result';
            }else if(recTypeByte == 'NAK') {
                this._currentRecType = 'Draining';
            }else if(recTypeByte == 'BEL') {
                this._currentRecType = 'Error';
            }else {
                throw 'Invalid record type';
            }
            this._dataBuf = this._dataBuf.slice(1);
        }

        const result = this[`_process${this._currentRecType}`]();
        if(result) {
            _result.push(result);

            if(this._dataBuf.byteLength > 0) {
                this.parse(null, _result);
            }
        }
        return this._result;
    }

    _processResult() {

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
        return result;
    }

    _processError() {

    }
}

module.exports = { Serialize, Deserialize };

