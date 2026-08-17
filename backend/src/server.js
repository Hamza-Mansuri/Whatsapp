import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socket.js';

const startServer = async () => {
  // Establish MongoDB database connection
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  const PORT = config.port;
  server.listen(PORT, () => {
    console.log(`WhatsApp Server is running in [${config.nodeEnv}] mode on port: ${PORT}`);
  });
};

startServer();
