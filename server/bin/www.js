#!/usr/bin/env node


const app = require('../app');
const debug = require('debug')('server:server');
const http = require('http');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

mongoose.connect(process.env.MONGODB_URL).then(() => {
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
  console.log(`mongodb connected ${process.env.MONGODB_URL}`)
}).catch(err => {
  console.log(err);
  process.exit(1);
});


function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}



function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

 
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}


function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
