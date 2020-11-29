/*
    global
    describe   : false,
    beforeEach : false,
    afterEach  : false,
    it         : false
*/

const fs            = require('fs');
const chai          = require('chai');
const sinon         = require('sinon');
const util          = require('../../lib/util');
const { expect }    = chai;


describe('util.loadConfig', () => {

    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.spy(fs, "readFileSync");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should parse a valid config file', () => {
        const config = util.loadConfig(`${__dirname}/../mock/valid.mock.cnf`, true);
        expect(fs.readFileSync.calledOnce).to.be.true;
        expect(config).to.deep.equal({
            MAX_MEM_PERCENTAGE: 10,
            CONNECTION_TIMEOUT: 900,
            MAX_CONNECTIONS: 10,
            PORT: 9128,
            DATABASE_FILE: './main.db',
            LOG_FILE: './server.log'
        });
    });

    it('should return cached config if it was already loaded', () => {
        const config = util.loadConfig(`${__dirname}/../mock/valid.mock.cnf`);
        expect(fs.readFileSync.notCalled).to.be.true;
        expect(config).to.deep.equal({
            MAX_MEM_PERCENTAGE: 10,
            CONNECTION_TIMEOUT: 900,
            MAX_CONNECTIONS: 10,
            PORT: 9128,
            DATABASE_FILE: './main.db',
            LOG_FILE: './server.log'
        });
    });

    it('should throw an error if config file is malformed', () => {
        try {
            util.loadConfig(`${__dirname}/../mock/invalid.mock.cnf`, true);
        }catch(err) {
            expect(fs.readFileSync.calledOnce).to.be.true;
            expect(err).to.be.an('error');
            expect(err.message).to.be.a('string');
            expect(err.message.trim()).to.equal('Config file does not exist or is malformed. File must be located at /src/sqlite-server/test/lib/../mock/invalid.mock.cnf');
        }
    });
});