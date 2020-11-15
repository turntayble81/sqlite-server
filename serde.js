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
        this.headerRowWritten = false;
    }

    serialize() {
        return Buffer.from(this.result, 'utf8');
    };
}


class Deserialize {

}

module.exports = { Serialize, Deserialize };

