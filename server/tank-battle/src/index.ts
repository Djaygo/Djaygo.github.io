import { Server } from 'socket.io';
import { createServer } from 'http';
import { GameServer } from './GameServer.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../src/lib/tank-battle/shared/types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      'http://localhost:4321',
      'http://localhost:3000',
      'http://127.0.0.1:4321',
      'https://djaygo.github.io',
    ],
    methods: ['GET', 'POST'],
  },
});

const gameServer = new GameServer(io);
gameServer.start();

httpServer.listen(PORT, () => {
  console.log(`Tank Battle Server running on http://localhost:${PORT}`);
});
