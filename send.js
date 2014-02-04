var syslogProducer = require('glossy').Produce; // or wherever glossy lives
var glossy = new syslogProducer();

var OctetSyslogParser = require('./octet_syslog_parser')

var queued = [];

function send(msg) {
  console.log(glossy.produce(msg));
}

const bufferFor = 1000;

function flush() {
  var next;

  var now = new Date().getTime();
  var sendUpto = -1;
  var timeOrderedQueue = queued.reverse();
  for(var i=0; i < timeOrderedQueue.length; i++) {
    if(timeOrderedQueue[i].ingestTs+bufferFor < now) {
      sendUpto = i;
    }
  }

  for(var i=0; i <= sendUpto; i++) {
    send(timeOrderedQueue.shift())
  }

  queued = timeOrderedQueue.reverse()

  clearTimer();
  setTimer();
}


var flushTimeout;

function clearTimer() {
  if(flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

function setTimer() {
  if(!flushTimeout) flushTimeout = setTimeout(flush, bufferFor);
}

function queueMessage(parsedMessage) {
  parsedMessage.date = parsedMessage.time; // because lol glossy

  parsedMessage.ts = parsedMessage.date.getTime() * 1000 + parsedMessage.time.__micros
  parsedMessage.ingestTs = new Date().getTime()

  var insertedAt = -1;
  for(var i = 0; i < queued.length; i++) {
    if(queued[i].ts < parsedMessage.ts) {
      queued.splice(i, 0, parsedMessage);
      insertedAt = i;
      break;
    }
  }

  if(insertedAt == -1) {
    insertedAt = queued.length;
    queued.push(parsedMessage);
  }

  if(insertedAt > 0) {
    console.log("reordered", parsedMessage.message)
  }

  setTimer();
}

var p2 = new OctetSyslogParser(queueMessage);
p2.feed(new Buffer(require('fs').readFileSync('./dump', "utf8")));

var net = require('net');
var server = net.createServer(function (socket) {
  var p = new OctetSyslogParser(queueMessage);

  socket.on('data', function(data) {
    p.feed(data);
  })

  socket.on('end', function(){
    console.log('client disconnected');
  });
})

if(process.argv.length != 3) {
  console.log("usage: node bla.js <port>")
  process.exit(1);
}

var port = parseInt(process.argv[2]);
server.listen(port, "0.0.0.0");
console.log("listening on",port)
