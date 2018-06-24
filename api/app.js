var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var players = {};

io.on('connection', function (socket){
  socket.on('push', function (data) {
    players[socket.id] = data;
    socket.emit('feed', {
      playerId: socket.id,
      players: players
    });
  })
  socket.on('hit', function (data) {
    io.emit('explosion', data)
  })
  socket.on('kill', function (data) {
    delete players[data.playerId]
    io.emit('dead', {
      playerId: data.playerId
    })
  })
  socket.on('fire', function (data) {
    io.emit('bullet', data)
  })
  socket.on('disconnect', function () {
    delete players[socket.id]
    io.emit('dead', {
      playerId: socket.id
    });
  })
});

http.listen(8081, function (){
  console.log('listening on *:8081');
});
