const fs = require('fs');
const util = {};
let config;

util.loadConfig = () => {
    if(config) {
        return config;
    }
    try {
        config = fs.readFileSync(`${__dirname}/../config.json`);
        config = JSON.parse(config);
        return config;
    }catch(err) {
        console.error('Config file does not exist or is malformed');
    }
}

module.exports = util;