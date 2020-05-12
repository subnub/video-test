console.log("hello");

const randomUUID = Math.floor((Math.random() * 100) + 1);

const url = `http://64.227.2.37:3000/video/${randomUUID}`;

const videoElement = document.getElementById("video_player");

videoElement.src = url;