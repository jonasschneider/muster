var syslog_producer = new (require('glossy').Produce)();
var OctetSyslogParser = require('./octet_syslog_parser')

var queued = [];

var lastSentTs = 0;
function send(msg) {
  var x = syslog_producer.produce({
    facility: msg.facility,
    severity: msg.severity,
    //host: msg.host,
    host: "<snip>",
    appName: msg.appName,
    pid: msg.pid,
    date: msg.date,
    message: msg.message
  });

  logClient.write(''+x.length+' '+x)

  // check what we actually set out to correct
  if(msg.ts < lastSentTs) {
    console.error("grump. i just sent a misordered thing.", ts, lastSentTs, msg)
  }
  lastSentTs = ts;
}

function flush() {
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

  console.log(queued.length, "messages still queued")

  if(queued.length > 0)
    setTimer(1000);
}

var flushTimer;

function clearTimer() {
  if(flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function setTimer(time) {
  time = time || bufferFor
  if(!flushTimer) flushTimer = setTimeout(flush, time);
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
    console.log("reordered", require('util').inspect(parsedMessage.message))
  }

  setTimer();
}

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
  console.log("usage: node bla.js <listningport>")
  process.exit(1);
}

var port = parseInt(process.argv[2]);
const bufferFor = 30000; // 30 secs

var logClient = require('tls').connect(32440, "logs.papertrailapp.com", { rejectUnauthorized: false}, function() {
  server.listen(port, "0.0.0.0");
  console.log("listening on",port)
});
