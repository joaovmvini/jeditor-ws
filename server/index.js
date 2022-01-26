const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const path = require('path');

app.use(express.json());
app.use(express.static(path.resolve('./public')));

io.on('connection', (socket) => {    
    socket.on('NEW_USER', (message) => {
        socket.broadcast.emit('NEW_USER', message);
    });

    socket.on('ON_CURSOR_UPDATE', (message) => {
        socket.broadcast.emit('ON_CURSOR_UPDATE', message);
    });

    socket.on('ON_SELECTION', (message) => {
        console.log(message);
        socket.broadcast.emit('ON_SELECTION', message);
    });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});