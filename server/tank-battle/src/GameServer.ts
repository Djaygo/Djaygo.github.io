import type { Server, Socket } from 'socket.io';
import { Room } from './Room.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomConfig,
  PlayerInput,
  ShootParams,
} from '../../../src/lib/tank-battle/shared/types.js';

export class GameServer {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  start(): void {
    this.io.on('connection', (socket) => this.handleConnection(socket));
    console.log('Game server started, waiting for connections...');
  }

  private handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    console.log(`Player connected: ${socket.id}`);

    socket.emit('lobby:roomList', this.getRoomList());

    socket.on('lobby:getRooms', (callback) => {
      callback(this.getRoomList());
    });

    socket.on('lobby:create', (config, callback) => {
      try {
        const room = this.createRoom(config);
        callback(room.id);
        this.io.emit('lobby:roomList', this.getRoomList());
      } catch (error) {
        callback(null, (error as Error).message);
      }
    });

    socket.on('lobby:join', (roomId, playerName, callback) => {
      try {
        this.joinRoom(socket, roomId, playerName);
        callback(true);
      } catch (error) {
        callback(false, (error as Error).message);
      }
    });

    socket.on('lobby:leave', () => {
      this.leaveRoom(socket);
    });

    socket.on('lobby:ready', () => {
      const roomId = this.playerRooms.get(socket.id);
      if (roomId) {
        const room = this.rooms.get(roomId);
        room?.setPlayerReady(socket.id);
      }
    });

    socket.on('game:input', (input: PlayerInput) => {
      const roomId = this.playerRooms.get(socket.id);
      if (roomId) {
        const room = this.rooms.get(roomId);
        room?.handleInput(socket.id, input);
      }
    });

    socket.on('game:shoot', (params: ShootParams) => {
      const roomId = this.playerRooms.get(socket.id);
      if (roomId) {
        const room = this.rooms.get(roomId);
        room?.handleShoot(socket.id, params);
      }
    });

    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private createRoom(config: RoomConfig): Room {
    const id = this.generateRoomId();
    const room = new Room(id, config, this.io);
    this.rooms.set(id, room);
    return room;
  }

  private joinRoom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    roomId: string,
    playerName: string
  ): void {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.isFull()) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already in progress');
    }

    if (this.playerRooms.has(socket.id)) {
      this.leaveRoom(socket);
    }

    const player = room.addPlayer(socket, playerName);
    this.playerRooms.set(socket.id, roomId);

    const players = Array.from(room.players.values()).map(p => p.toInfo());

    socket.emit('lobby:joined', room.toInfo(), socket.id, players);

    socket.to(roomId).emit('lobby:playerJoined', player.toInfo());

    this.io.emit('lobby:roomList', this.getRoomList());
  }

  private leaveRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('lobby:playerLeft', socket.id);

      if (room.players.size === 0) {
        room.destroy();
        this.rooms.delete(roomId);
      }

      this.io.emit('lobby:roomList', this.getRoomList());
    }

    this.playerRooms.delete(socket.id);
  }

  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    console.log(`Player disconnected: ${socket.id}`);
    this.leaveRoom(socket);
  }

  private getRoomList() {
    return Array.from(this.rooms.values())
      .filter(r => r.status === 'waiting')
      .map(r => r.toInfo());
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}
