import express from "express";
import http from "http";
import { Server as WebSocketServer } from "ws";
import { setupWebSocket } from "./src/handlers/websocketHandlers";
import authRoutes from './src/routes/authRoutes';
import blindtestRoutes from './src/routes/blindtestRoutes';
import cors from 'cors';
import { initDB, pool } from './src/db/pool';
import { env } from './src/config/env';

const app = express();
const port = env.PORT;

// CORS configuration
app.use(cors({
  origin: env.FRONTEND_URL === '*' ? '*' : env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/blindtest', blindtestRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setupWebSocket(wss);

// Initialize database and start server
async function start() {
  try {
    await initDB();

    server.listen(port, () => {
      console.log(`\n🚀 Server running on http://localhost:${port}`);
      console.log(`📦 Database: Neon PostgreSQL`);
      console.log(`📡 WebSocket configured`);
      console.log(`💾 Tables initialized`);
      console.log(`CTRL + C to stop\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await pool.end();
  process.exit(0);
});
