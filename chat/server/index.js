

// initialize express app and socket.io server
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const ChatServer = require("./chat");

// create express app and http server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));


// initialize chat server
new ChatServer(io);


// start listening
const PORT = process.env.PORT || 3456;
const HOST = "0.0.0.0"; 
server.listen(PORT, HOST, () => {
    console.log(`running at http://${HOST}:${PORT}`);
});