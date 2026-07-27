import express from "express";
import http from "http";
import { Server as WebSocketServer } from "ws";
import { setupWebSocket } from "./src/handlers/websocketHandlers";
import authRoutes from './src/routes/authRoutes';
import dotenv from 'dotenv';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Attention : Les variables d'environnement SUPABASE sont manquantes !");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/auth', authRoutes);


const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setupWebSocket(wss);

server.listen(port, () => {
  console.log(`Serveur écoute sur http://localhost:${port}`);
  console.log(`🚀 Base de données : Supabase (PostgreSQL)`);
  console.log(`📡 WebSocket configuré`);
  console.log(`CTRL + C pour arrêter le serveur`);
});
