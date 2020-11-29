/*
    global
    describe   : false,
    beforeEach : false,
    afterEach  : false,
    it         : false
*/

const chai          = require('chai');
const { Serialize } = require('../../lib/serde');
const { expect }    = chai;
const { recs1 }     = require('../mock/records.mock');

describe('Serialize', () => {

    let serializer;
    let bytes;

    beforeEach(() => {
        serializer = new Serialize();
        bytes = serializer.bytes;
    });

    afterEach(() => {
        serializer = null;
    });

    it('should properly serialize acknowlegment records', () => {
        serializer.queryId = 12345;
        serializer.begin();
        serializer.ack();
        serializer.end();
        const result = serializer.serialize();

        expect(result.byteLength).to.equal(10);
        expect(result.toString()).to.equal(`${bytes.SOH}${bytes.DC1}12345${bytes.DC1}${bytes.ACK}${bytes.EOT}`);
    });

    it('should properly serialize draining records', () => {
        serializer.begin();
        serializer.draining();
        serializer.end();
        const result = serializer.serialize();

        expect(result.byteLength).to.equal(3);
        expect(result.toString()).to.equal(`${bytes.SOH}${bytes.NAK}${bytes.EOT}`);
    });

    it('should properly serialize error records', () => {
        const err = new Error('Something went wrong');

        serializer.queryId = 23456;
        serializer.begin();
        serializer.error(err.toString());
        serializer.end();
        const result = serializer.serialize();

        expect(result.byteLength).to.equal(37);
        expect(result.toString()).to.equal(`${bytes.SOH}${bytes.DC1}23456${bytes.DC1}${bytes.BEL}${err.toString()}${bytes.EOT}`);
    });

    it('should properly serialize records for queries which return no result', () => {
        serializer.queryId = 34567;
        serializer.begin();
        serializer.end();
        serializer.end();
        const result = serializer.serialize();

        expect(result.byteLength).to.equal(10);
        expect(result.toString()).to.equal(`${bytes.SOH}${bytes.DC1}34567${bytes.DC1}${bytes.EOT}${bytes.EOT}`);
    });

    it('should properly serialize records for queries which return a result', () => {
        let result = Buffer.from('');
        serializer.queryId = 45678;

        serializer.begin();

        recs1.forEach((rec) => {
            serializer.bodyRow(rec);
            result = Buffer.concat([result, serializer.serialize()]);
            serializer.clear();
        });

        serializer.end();
        result = Buffer.concat([result, serializer.serialize()]);

        expect(result.byteLength).to.equal(85);
        // 45678firstNamelastNameJohnSmithSusanJonesAmandaCarpenter
        // expect(result.toString()).to.equal(`${bytes.SOH}${bytes.DC1}45678${bytes.DC1}${bytes.EOT}${bytes.EOT}`);
    });
});
