/**
*
* Use the node HID module to get gamepads and their data
*
**/

var HID = require('node-hid');

// Get the first game pad for simplicity
var pad,pads = HID.devices().filter(function(d){
  return (/gamepad/i).test(d.product)
});

if (pads != undefined && pads.length > 0) {
  pad = new HID.HID(pads[0].path);
}

pad.read(function(err,data){}); // discard the first read

var last = [-1,-1,-1]; // empty state to begin with
var ReadPad = function(callback){
  pad.read(function(err,data){
    // Data is as follows: [128,128,0] => [x-axis,y-axis,buttons(0 for none)]
    var state = {
      x:data[0]==128 ? 0.5 : data[0]/255.0,
      y:data[1]==128 ? 0.5 : data[1]/255.0,
      button:data[2],
      changed:[]
    };
    if(data[0] != last[0]) {
      state.changed.push({name:"x",state:state.x});
    }
    if(data[1] != last[1]) {
      state.changed.push({name:"y",state:state.y});
    }
    if(data[2] != 0 && data[2] != last[2]) {
      state.changed.push({name:"button",state:state.button});
    }
    last = data;
    console.log(data,state);
    callback(err,state);

    ReadPad(callback);
  });
}

/**
*
* Simple WebSocket Server with Socket.IO
*
**/

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(4242);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  ReadPad(function(err, data){
    socket.emit('gamepad',data)
    data.changed.map(function(prop){
      socket.emit('gamepad.'+prop.name,prop.state);
    });
  });
});

