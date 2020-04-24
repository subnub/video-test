const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const password = "hellothere";
const initVect = Buffer.from("605e9d9e27aadba7ec3c9561d02efc1d", "hex");
const hashedPassword = crypto.createHash('sha256').update(password).digest();

const originalFileSize = 5510872;
const encryptedFileSize = 5510880

const app = express();
const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/video", async(req, res) => {

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

    const chunkStart = start === 0 ? 0 : fixStartChunkLength(start);
    // If the requests asks for 0, leave it at 0. 

    let chunkEnd = fixChunkLength(end);
    if (chunkEnd === 16) chunkEnd = 15;
    // 0 index will mess up the calculation, so if its 16, we must 
    // Change it down to 15, or I get the wrong block size error

    if (chunkStart !== 0) {
    
        IV = await getPrevIV(chunkStart - 16);
        console.log("New IV", IV);
        // Here I check for the IV if the start is not 0, 
        // I use the fixed chunkStart, then check 16 bytes for it
        // And return those bytes. 
    }

    const readStream = fs.createReadStream("ebunny.mp4", {
        start: chunkStart,
        end: chunkEnd,
    });

    const CIPHER_KEY = crypto.createHash('sha256').update(password).digest()        

    const decipher = crypto.createDecipheriv('aes256', CIPHER_KEY, currentIV);

    decipher.setAutoPadding(false);

    res.writeHead(206, head);

    readStream.pipe(decipher);

    decipher.on("data", (data) => {

        res.write(data);
        // At the moment I am not stripping off the extra data, i'm not 
        // Sure how to do this, but such little bytes might not matter
    })

    decipher.on("end", () => {
        res.end();
    })
})

app.get("*", (req, res) => {

    res.sendFile(path.join(publicPath,"index.html"))
})

app.listen(3000, () => {
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

