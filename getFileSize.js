const fs = require("fs");

const getFileSize = (path) => {

    return new Promise((resolve, reject) => {

        fs.stat(path, (error, stats) => {

            if (error) {
                
                resolve(0);
            }

            resolve(stats.size);
        });
    })
}

module.exports = getFileSize;