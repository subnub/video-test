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

    const readStream = fs.createReadStream("bunny.mp4", {
        start, 
        end
    });

    res.writeHead(206, head);

    readStream.on("data", (data) => {

        console.log("currentPOS", start, end);

        console.log(data);

        res.write(data);
        res.flushHeaders();
    });

    readStream.on("close", () => {

        res.end();
    })
})

app.get("*", (req, res) => {

    res.sendFile(path.join(publicPath,"index.html"))
})

app.listen(3000, "192.168.0.18", () => {
    console.log("listening")
});
