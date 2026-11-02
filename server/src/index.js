import 'dotenv/config';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`[BravoMail Server] Running at http://${HOST}:${PORT}`);
  console.log(`[BravoMail Server] Health check available at http://${HOST}:${PORT}/health`);
});

const gracefulShutdown = () => {
  console.log('\n[BravoMail Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[BravoMail Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
