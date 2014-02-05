# Muster

Get your syslog entries in order.

Muster is a syslog "pipe" -- it acts as a client and a server. It receives syslog packets over octet-count-framed TCP, buffers them, and sends them off over octet-count-framed TCP over TLS.

What's special is that the buffer used is not FIFO. Instead, Muster reorders the packets by their syslog timestamp.

## Usage

    $ node pipe.js 5140 logs.papertrailapp.com <your_papertrail_port>
    [in a heroku app's dir]
    $ heroku drains:add syslog://<your_public_hostname>:5140

Then generate some logs for the Heroku app.

## Motivation

The Heroku platform allows attaching a syslog drain to capture application and platform logs. However, messages received over this drain are not monotonical in time. This means that it's perfectly possible for you to receive a message timestamped with `1` after you received a message timestamped with `2`.

While this behaviour may or may not be a bug in the grand scheme of things, it becomes irritating when dealing with a service that relies on log ingestion order, such as Papertrail. It also violates the definition of logs given in Heroku's 12factor app manifesto: ["Logs are the stream of aggregated, time-ordered events \[...\]"](http://12factor.net/logs).

So I decided to try and fix it.
