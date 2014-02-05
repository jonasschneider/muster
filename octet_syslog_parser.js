var glossy = require('glossy');

module.exports = function OctetSyslogParser(onPacket) {
  var buf = new Buffer(0);

  this.feed = function(data) {
    var newbuf = new Buffer(buf.length + data.length)
    buf.copy(newbuf, 0)
    data.copy(newbuf, buf.length)
    buf = newbuf

    while((spaceIdx = detectSpace(buf)) > -1) {
      //console.log("buffer contents")
      //console.dir(buf.toString())
      //console.log("detected space at ",spaceIdx)
      //console.log("lenstring:",buf.toString('utf8', 0, spaceIdx))
      var frameLen = parseInt(buf.toString('utf8', 0, spaceIdx));
      var frameEnd = spaceIdx + frameLen + 1;

      if(frameEnd < buf.length + 1) { // we never access the 1 byte that's too much, since...
        var packet = buf.slice(spaceIdx+1, frameEnd) // .. the byte count is exclusive
        //console.log("get",packet)
        console.dir(packet.toString())
        onPacket(parseSyslog(packet));

        buf = buf.slice(frameEnd, buf.length)
      } else {
        //console.log("incomplete packet")
        break;
      }
    }
    //console.log("no more packets, remaining buffer:")
    //console.log("buffer contents")
    //console.dir(buf.toString())
  }

  function detectSpace(buf) {
    var spaceIdx = -1;
    for(var i = 0; i < buf.length; i++) {
      if(buf[i] == 0x20) {
        spaceIdx = i;
        break;
      }
    }
    return spaceIdx;
  }

  function parseSyslog(buf) {
    return glossy.Parse.parse(buf.toString('utf8', 0));
  }
}
