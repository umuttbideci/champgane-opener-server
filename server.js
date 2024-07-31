const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};

app.use(express.static('public'));

app.get('/create-room', (req, res) => {
  const roomId = uuidv4();
  const maxCount = parseInt(req.query.maxCount, 10);
  rooms[roomId] = { maxCount, users: [] };
  res.redirect(`/room/${roomId}`);
});

app.get('/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if (rooms[roomId]) {
    res.sendFile(__dirname + '/public/room.html');
  } else {
    res.send('Room not found');
  }
});

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, nickname }) => {
    if (rooms[roomId] && rooms[roomId].users.length < rooms[roomId].maxCount) {
      const user = { id: socket.id, name: nickname, ready: false };
      rooms[roomId].users.push(user);
      socket.join(roomId);
      io.to(roomId).emit('roomData', rooms[roomId]);

      socket.on('toggleReady', (isReady) => {
        const user = rooms[roomId].users.find(u => u.id === socket.id);
        if (user) {
          user.ready = isReady;
          const allReady = rooms[roomId].users.every(user => user.ready);
          if (allReady) {
            io.to(roomId).emit('startAnimation');
          } else {
            io.to(roomId).emit('roomData', rooms[roomId]);
          }
        }
      });

      socket.on('disconnect', () => {
        rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);
        io.to(roomId).emit('roomData', rooms[roomId]);
      });
    } else {
      socket.emit('roomFull');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
