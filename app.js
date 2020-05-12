const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const tempStorage = require("./tempStorage");
const getFileSize = require("./getFileSize");
const uuid = require("uuid");

const password = "hellothere";
const initVect = Buffer.from("605e9d9e27aadba7ec3c9561d02efc1d", "hex");



const app = express();
const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/video/:uuid", async(req, res) => {

    const originalFileSize = await getFileSize("./ebunny.mp4");
    const paramsUUID = req.params.uuid;
    const currentUUID = uuid.v4();
    tempStorage[paramsUUID] = currentUUID; 

    //console.log("file size", originalFileSize);
    console.log("File Request");

    const headers = req.headers;

    const range = headers.range
    const parts = range.replace(/bytes=/, "").split("-")
    let start = parseInt(parts[0], 10)
    let end = parts[1] 
        ? parseInt(parts[1], 10)
        : originalFileSize-1
    const chunksize = (end-start)+1

    let currentIV = initVect;

    let head = {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + originalFileSize,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'}


    let fixedStart = start % 16 === 0 ? start : fixStartChunkLength(start);
    
    if (+start === 0) {

        fixedStart = 0;
    }
    // If it starts at 0, stay at 0, this is pretty ugly and can be improved. 

    // Sometimes It would miss the last byte of data when fixing the chunk length,
    // So I add 16 extra just incase, I should probably improve this, but it works atm
    const fixedEnd = end % 16 === 0 ? end + 15: (fixChunkLength(end) - 1) + 16;

    const differenceEnd = fixedEnd - end;
    const differenceStqart = start - fixedStart;

    if (fixedStart !== 0 && start !== 0) {
    
        currentIV = await getPrevIV(fixedStart - 16);
        //console.log("New IV", currentIV);
        // If this is not the start, get the new IV.
    }

    const readStream = fs.createReadStream("ebunny.mp4", {
        start: fixedStart,
        end: fixedEnd,
    });

    const CIPHER_KEY = crypto.createHash('sha256').update(password).digest()        

    const decipher = crypto.createDecipheriv('aes256', CIPHER_KEY, currentIV);

    decipher.setAutoPadding(false);

    res.writeHead(206, head);

    readStream.pipe(decipher);

    let firstBytesRemoved = false;
    let sizeCounter = 0;

    decipher.on("data", (data) => {

        if (tempStorage[paramsUUID] !== currentUUID) {

            console.log("Destoying old stream");
            readStream.destroy();
            decipher.destroy();
            console.log("Read Stream Destroyed");
            return;
        }

        if (+start === 0 && +end === 1) {

            // If Apple requests the first bytes of data, 
            // I just get the first encrypted 16 bytes, 
            // And splice off the extra data
                
            const dataCoverted = data.toString("hex");
            
            let neededData = dataCoverted.substring(0, 4);

            const dataBack = Buffer.from(neededData, "hex");

            res.write(dataBack);
            res.flushHeaders();

            console.log("Sent Apple Data", dataBack);
            return;
        }

        if (!firstBytesRemoved) {

            // Removes the first extra bytes

            //console.log("Removing First Bytes");
            const dataCoverted = data.toString("hex");

            let neededData = dataCoverted.substring(differenceStqart * 2);

            const dataBack = Buffer.from(neededData, "hex");

            //console.log("data with first bytes removed", dataBack);

            firstBytesRemoved = true;

            sizeCounter += dataBack.length;

            res.write(dataBack);
            res.flushHeaders();

            //console.log("First bytes removed", dataBack);
            return;
        }

        // Just return the bytes normally here. 
        res.write(data);
        res.flushHeaders();

        sizeCounter += data.length;
        // I keep a size counter, just incase in the future I want to shave 
        // Off the last extra bytes at the end, but it seems like it only cares about 
        // The first bytes being correct, and having extra bytes 
        // At the end will still allow it to work fine.
    })

    decipher.on("end", () => {
        console.log("File Request Finished")
        res.end();
    })
})

app.get("*", (req, res) => {

    res.sendFile(path.join(publicPath,"index.html"))
})

app.listen(3000, "64.227.2.37", () => {
    console.log("listening")
});


const fixChunkLength = (length) => {

    return Math.floor((length-1) / 16) * 16 + 16;
}

const fixStartChunkLength = (length) => {

    return Math.floor((length-1) / 16) * 16 - 16;
}

const getPrevIV = (start) => {

    return new Promise((resolve, reject) => {

        const stream = fs.createReadStream("./ebunny.mp4", {
            start,
            end: start + 15
        })

        stream.on("data", (data) => {

            resolve(data);
        })
    })
}


