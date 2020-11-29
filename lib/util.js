const os = require('os');
const fs = require('fs');
const util = {};
let config;

const defaultCfg = `${os.homedir()}/.sqlite-server.cnf`;

util.loadConfig = (confFilePath=defaultCfg, forceReload=false) => {
    if(config && !forceReload) {
        return config;
    }

    config = {};
    try {
        fs.readFileSync(confFilePath)
            .toString()
            .split('\n')
            .filter(Boolean)
            .forEach((cfg) => {
                if(/^\s*#/.test(cfg)) {
                    return;
                }

                cfg = cfg.split('=').map((x) => x.trim());

                if(cfg.length != 2) {
                    throw new Error();
                }
                if(/^[0-9]+$/.test(cfg[1])) {
                    cfg[1] = parseInt(cfg[1]);
                }
                config[cfg[0]] = cfg[1];
            });

        return config;
    }catch(err) {
        throw new Error(`
            Config file does not exist or is malformed. File must be located at ${confFilePath}
        `);
    }
};

module.exports = util;