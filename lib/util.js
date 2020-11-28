const os = require('os');
const fs = require('fs');
const util = {};
let config;

util.loadConfig = (confFilePath=`${os.homedir()}/.sqlite-server.cnf`) => {
    if(config) {
        return config;
    }

    try {
        config = fs.readFileSync(confFilePath);
        config = JSON.parse(config);
        return config;
    }catch(err) {
        throw new Error(`
            Config file does not exist or is malformed. File must be located at
            ${confFilePath} and must be valid json.
        `);
    }
};

module.exports = util;