import type { WeaponType, WeaponBehavior } from './weapons';

// ===== Room and Lobby Types =====
export interface RoomConfig {
  name: string;
  maxPlayers?: number;
  gameMode?: GameMode;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
}

export interface PlayerInfo {
  id: string;
  name: string;
  ready: boolean;
  color: string;
}

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'ended';
export type GameMode = 'deathmatch' | 'lastTankStanding';

// ===== Game State Types =====
export interface TankState {
  id: string;
  x: number;
  y: number;
  angle: number;
  turretAngle: number;
  health: number;
  maxHealth: number;
  ammo: number;
  cooldown: number;
  velocity: { x: number; y: number };
  color: string;
  name: string;
  score: number;
  alive: boolean;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  explosionRadius: number;

  // Weapon-specific fields
  weaponType?: WeaponType;
  behavior?: WeaponBehavior;
  gravityMultiplier?: number;
  age?: number;
  targetX?: number;
  targetY?: number;
  hasSplit?: boolean;
  penetrationRemaining?: number;
  isBarrageShell?: boolean;
}

export interface TerrainDestructionEvent {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
}

export interface TerrainInitData {
  width: number;
  height: number;
  seed: number;
}

export interface GameStateSnapshot {
  timestamp: number;
  tanks: TankState[];
  projectiles: ProjectileState[];
  terrainDestructions: TerrainDestructionEvent[];
}

export interface GameInitData {
  terrain: TerrainInitData;
  tanks: TankState[];
  playerId: string;
  gameMode: GameMode;
}

// ===== Input Types =====
export interface PlayerInput {
  timestamp: number;
  sequenceNumber: number;
  moveDirection: { x: number; y: number };
  turretAngle: number;
  shooting: boolean;
}

export interface ShootParams {
  angle: number;
  power: number;
  weaponType?: WeaponType;
}

// ===== Event Types =====
export interface PlayerHitEvent {
  targetId: string;
  attackerId: string;
  damage: number;
  health: number;
}

export interface PlayerDeathEvent {
  victimId: string;
  killerId: string;
  killerScore: number;
}

export interface GameResults {
  winnerId: string | null;
  winnerName: string | null;
  scores: Array<{ id: string; name: string; score: number; kills: number; deaths: number }>;
  duration: number;
}

// ===== Client -> Server Events =====
export interface ClientToServerEvents {
  'lobby:create': (config: RoomConfig, callback: (roomId: string | null, error?: string) => void) => void;
  'lobby:join': (roomId: string, playerName: string, callback: (success: boolean, error?: string) => void) => void;
  'lobby:leave': () => void;
  'lobby:ready': () => void;
  'lobby:getRooms': (callback: (rooms: RoomInfo[]) => void) => void;
  'game:input': (input: PlayerInput) => void;
  'game:shoot': (params: ShootParams) => void;
  'ping': (timestamp: number) => void;
}

// ===== Server -> Client Events =====
export interface ServerToClientEvents {
  'lobby:roomList': (rooms: RoomInfo[]) => void;
  'lobby:joined': (room: RoomInfo, playerId: string, players: PlayerInfo[]) => void;
  'lobby:playerJoined': (player: PlayerInfo) => void;
  'lobby:playerLeft': (playerId: string) => void;
  'lobby:playerReady': (playerId: string) => void;
  'lobby:countdown': (seconds: number) => void;
  'game:start': (data: GameInitData) => void;
  'game:state': (snapshot: GameStateSnapshot) => void;
  'game:terrainDestruction': (event: TerrainDestructionEvent) => void;
  'game:playerHit': (event: PlayerHitEvent) => void;
  'game:playerDeath': (event: PlayerDeathEvent) => void;
  'game:end': (results: GameResults) => void;
  'error': (message: string) => void;
  'pong': (timestamp: number) => void;
}
