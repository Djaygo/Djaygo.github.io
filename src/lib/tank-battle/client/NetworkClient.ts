import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomConfig,
  RoomInfo,
  PlayerInfo,
  PlayerInput,
  ShootParams,
  GameInitData,
  GameStateSnapshot,
  TerrainDestructionEvent,
  PlayerHitEvent,
  PlayerDeathEvent,
  GameResults,
} from '../shared/types';

type EventCallback<T> = (data: T) => void;

export class NetworkClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private eventHandlers: Map<string, Set<EventCallback<unknown>>> = new Map();
  private latency: number = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connected: boolean = false;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: false,
    });

    this.setupBaseHandlers();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.connect();

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.startPingMeasurement();
        resolve();
      });

      this.socket.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.socket.disconnect();
    this.connected = false;
  }

  reconnect(serverUrl: string): Promise<void> {
    this.disconnect();
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: false,
    });
    this.setupBaseHandlers();
    return this.connect();
  }

  private setupBaseHandlers(): void {
    this.socket.on('lobby:roomList', (rooms) => this.emit('lobby:roomList', rooms));
    this.socket.on('lobby:joined', (room, playerId, players) =>
      this.emit('lobby:joined', { room, playerId, players })
    );
    this.socket.on('lobby:playerJoined', (player) => this.emit('lobby:playerJoined', player));
    this.socket.on('lobby:playerLeft', (playerId) => this.emit('lobby:playerLeft', playerId));
    this.socket.on('lobby:playerReady', (playerId) => this.emit('lobby:playerReady', playerId));
    this.socket.on('lobby:countdown', (seconds) => this.emit('lobby:countdown', seconds));
    this.socket.on('game:start', (data) => this.emit('game:start', data));
    this.socket.on('game:state', (snapshot) => this.emit('game:state', snapshot));
    this.socket.on('game:terrainDestruction', (event) => this.emit('game:terrainDestruction', event));
    this.socket.on('game:playerHit', (event) => this.emit('game:playerHit', event));
    this.socket.on('game:playerDeath', (event) => this.emit('game:playerDeath', event));
    this.socket.on('game:end', (results) => this.emit('game:end', results));
    this.socket.on('error', (message) => this.emit('error', message));

    this.socket.on('pong', (timestamp) => {
      this.latency = Math.round((Date.now() - timestamp) / 2);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.emit('disconnected', null);
    });
  }

  private startPingMeasurement(): void {
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.socket.emit('ping', Date.now());
      }
    }, 2000);
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback as EventCallback<unknown>);

    return () => {
      this.eventHandlers.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach((cb) => cb(data));
  }

  getRooms(): Promise<RoomInfo[]> {
    return new Promise((resolve) => {
      this.socket.emit('lobby:getRooms', (rooms) => {
        resolve(rooms);
      });
    });
  }

  createRoom(config: RoomConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket.emit('lobby:create', config, (roomId, error) => {
        if (error || !roomId) {
          reject(new Error(error || 'Failed to create room'));
        } else {
          resolve(roomId);
        }
      });
    });
  }

  joinRoom(roomId: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('lobby:join', roomId, playerName, (success, error) => {
        if (success) {
          resolve();
        } else {
          reject(new Error(error || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(): void {
    this.socket.emit('lobby:leave');
  }

  setReady(): void {
    this.socket.emit('lobby:ready');
  }

  sendInput(input: PlayerInput): void {
    this.socket.emit('game:input', input);
  }

  shoot(params: ShootParams): void {
    this.socket.emit('game:shoot', params);
  }

  getLatency(): number {
    return this.latency;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
