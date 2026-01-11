import type { Server, Socket } from 'socket.io';
import { Player } from './Player.js';
import type {
  RoomConfig,
  RoomInfo,
  RoomStatus,
  GameMode,
  TankState,
  ProjectileState,
  TerrainDestructionEvent,
  GameStateSnapshot,
  PlayerInput,
  ShootParams,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../src/lib/tank-battle/shared/types.js';
import { PHYSICS, TANK, TERRAIN, GAME } from '../../../src/lib/tank-battle/shared/constants.js';

export class Room {
  public readonly id: string;
  public readonly name: string;
  public readonly maxPlayers: number;
  public readonly gameMode: GameMode;
  public status: RoomStatus = 'waiting';

  public players: Map<string, Player> = new Map();
  private projectiles: Map<string, ProjectileState> = new Map();
  private pendingDestructions: TerrainDestructionEvent[] = [];
  private terrainSeed: number;

  private gameStartTime: number = 0;
  private projectileIdCounter: number = 0;
  private gameLoopInterval: ReturnType<typeof setInterval> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;

  private terrainHeightCache: number[] = [];

  constructor(
    id: string,
    config: RoomConfig,
    private io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {
    this.id = id;
    this.name = config.name;
    this.maxPlayers = config.maxPlayers || 4;
    this.gameMode = config.gameMode || 'deathmatch';
    this.terrainSeed = Math.floor(Math.random() * 1000000);
    this.generateTerrainHeightCache();
  }

  private generateTerrainHeightCache(): void {
    const random = this.seededRandom(this.terrainSeed);
    const baseHeight = TERRAIN.HEIGHT * TERRAIN.GROUND_LEVEL;

    this.terrainHeightCache = [];
    for (let x = 0; x < TERRAIN.WIDTH; x++) {
      let height = baseHeight;
      height += Math.sin(x * 0.008 + random() * 10) * 80;
      height += Math.sin(x * 0.02 + random() * 20) * 30;
      height += Math.sin(x * 0.05 + random() * 50) * 10;
      this.terrainHeightCache.push(Math.floor(height));
    }
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  getTerrainHeightAt(x: number): number {
    const xi = Math.floor(Math.max(0, Math.min(TERRAIN.WIDTH - 1, x)));
    return this.terrainHeightCache[xi] || TERRAIN.HEIGHT * TERRAIN.GROUND_LEVEL;
  }

  addPlayer(socket: Socket<ClientToServerEvents, ServerToClientEvents>, playerName: string): Player {
    const colorIndex = this.players.size;
    const player = new Player(socket.id, playerName, colorIndex);
    this.players.set(socket.id, player);
    socket.join(this.id);
    return player;
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);

    if (this.players.size === 0 && this.status === 'playing') {
      this.endGame(null);
    }
  }

  setPlayerReady(socketId: string): void {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = true;
      this.io.to(this.id).emit('lobby:playerReady', socketId);
      this.checkStartConditions();
    }
  }

  private checkStartConditions(): void {
    if (this.status !== 'waiting') return;
    if (this.players.size < 2) return;

    const allReady = Array.from(this.players.values()).every(p => p.ready);
    if (allReady) {
      this.startCountdown();
    }
  }

  private startCountdown(): void {
    this.status = 'countdown';
    let count = GAME.COUNTDOWN_SECONDS;

    const countdownInterval = setInterval(() => {
      this.io.to(this.id).emit('lobby:countdown', count);
      count--;

      if (count < 0) {
        clearInterval(countdownInterval);
        this.startGame();
      }
    }, 1000);
  }

  private startGame(): void {
    this.status = 'playing';
    this.gameStartTime = Date.now();

    const spawnPoints = this.calculateSpawnPoints();
    let spawnIndex = 0;

    for (const player of this.players.values()) {
      const spawn = spawnPoints[spawnIndex % spawnPoints.length];
      player.initTank(spawn.x, spawn.y);
      spawnIndex++;
    }

    const tanks = Array.from(this.players.values())
      .map(p => p.tankState!)
      .filter(Boolean);

    for (const [socketId, player] of this.players) {
      this.io.to(socketId).emit('game:start', {
        terrain: {
          width: TERRAIN.WIDTH,
          height: TERRAIN.HEIGHT,
          seed: this.terrainSeed,
        },
        tanks,
        playerId: socketId,
        gameMode: this.gameMode,
      });
    }

    this.lastTickTime = performance.now();
    this.gameLoopInterval = setInterval(() => this.tick(), 1000 / 60);
    this.syncInterval = setInterval(() => this.broadcastState(), 1000 / 20);
  }

  private calculateSpawnPoints(): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const spacing = (TERRAIN.WIDTH - GAME.SPAWN_MARGIN * 2) / (this.maxPlayers + 1);

    for (let i = 1; i <= this.maxPlayers; i++) {
      const x = GAME.SPAWN_MARGIN + spacing * i;
      const y = this.getTerrainHeightAt(x) - TANK.HEIGHT / 2;
      points.push({ x, y });
    }

    return points;
  }

  handleInput(socketId: string, input: PlayerInput): void {
    const player = this.players.get(socketId);
    if (player) {
      player.lastInput = input;
    }
  }

  handleShoot(socketId: string, params: ShootParams): void {
    const player = this.players.get(socketId);
    if (!player || !player.tankState) return;

    const tank = player.tankState;
    if (!tank.alive || tank.cooldown > 0 || tank.ammo <= 0) return;

    const turretEndX = tank.x + Math.cos(params.angle) * TANK.TURRET_LENGTH;
    const turretEndY = tank.y + Math.sin(params.angle) * TANK.TURRET_LENGTH;

    const projectile: ProjectileState = {
      id: `${socketId}-${this.projectileIdCounter++}`,
      ownerId: socketId,
      x: turretEndX,
      y: turretEndY,
      vx: Math.cos(params.angle) * PHYSICS.PROJECTILE_SPEED,
      vy: Math.sin(params.angle) * PHYSICS.PROJECTILE_SPEED,
      damage: PHYSICS.PROJECTILE_DAMAGE,
      explosionRadius: PHYSICS.EXPLOSION_RADIUS,
    };

    this.projectiles.set(projectile.id, projectile);
    tank.cooldown = TANK.SHOOT_COOLDOWN;
    tank.ammo--;
  }

  private tick(): void {
    const now = performance.now();
    const deltaTime = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    this.updateTanks(deltaTime);
    this.updateProjectiles(deltaTime);
    this.checkCollisions();
    this.checkWinCondition();
  }

  private updateTanks(deltaTime: number): void {
    for (const player of this.players.values()) {
      const tank = player.tankState;
      const input = player.lastInput;
      if (!tank || !tank.alive) continue;

      if (tank.cooldown > 0) {
        tank.cooldown = Math.max(0, tank.cooldown - deltaTime * 1000);
      }

      if (input) {
        if (input.moveDirection.x !== 0) {
          tank.velocity.x += input.moveDirection.x * TANK.MOVE_SPEED * deltaTime;
        }

        tank.turretAngle = input.turretAngle;
      }

      tank.velocity.x *= TANK.FRICTION;

      const newX = tank.x + tank.velocity.x * deltaTime;
      const clampedX = Math.max(TANK.WIDTH / 2, Math.min(TERRAIN.WIDTH - TANK.WIDTH / 2, newX));

      const terrainY = this.getTerrainHeightAt(clampedX);
      const targetY = terrainY - TANK.HEIGHT / 2;

      const oldTerrainY = this.getTerrainHeightAt(tank.x);
      const slope = Math.atan2(terrainY - oldTerrainY, clampedX - tank.x);

      if (Math.abs(slope) < TANK.SLOPE_LIMIT || clampedX === tank.x) {
        tank.x = clampedX;
        tank.y = targetY;
        tank.angle = slope * 0.3;
      }

      tank.score = player.score;
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (const [id, proj] of this.projectiles) {
      proj.vy += PHYSICS.GRAVITY * deltaTime;
      proj.vx *= (1 - PHYSICS.AIR_RESISTANCE);
      proj.vy *= (1 - PHYSICS.AIR_RESISTANCE);

      proj.x += proj.vx * deltaTime;
      proj.y += proj.vy * deltaTime;

      if (proj.x < 0 || proj.x > TERRAIN.WIDTH || proj.y > TERRAIN.HEIGHT + 100) {
        this.projectiles.delete(id);
      }
    }
  }

  private checkCollisions(): void {
    for (const [id, proj] of this.projectiles) {
      const terrainY = this.getTerrainHeightAt(proj.x);
      if (proj.y >= terrainY) {
        this.createExplosion(proj);
        this.projectiles.delete(id);
        continue;
      }

      for (const player of this.players.values()) {
        const tank = player.tankState;
        if (!tank || !tank.alive || tank.id === proj.ownerId) continue;

        const dx = proj.x - tank.x;
        const dy = proj.y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < TANK.WIDTH / 2) {
          tank.health -= proj.damage;

          this.io.to(this.id).emit('game:playerHit', {
            targetId: tank.id,
            attackerId: proj.ownerId,
            damage: proj.damage,
            health: tank.health,
          });

          this.createExplosion(proj);
          this.projectiles.delete(id);

          if (tank.health <= 0) {
            this.handlePlayerDeath(tank.id, proj.ownerId);
          }
          break;
        }
      }
    }
  }

  private createExplosion(proj: ProjectileState): void {
    const destruction: TerrainDestructionEvent = {
      x: proj.x,
      y: proj.y,
      radius: proj.explosionRadius,
      timestamp: Date.now(),
    };

    this.pendingDestructions.push(destruction);
    this.io.to(this.id).emit('game:terrainDestruction', destruction);

    this.updateTerrainAfterExplosion(proj.x, proj.y, proj.explosionRadius);

    for (const player of this.players.values()) {
      const tank = player.tankState;
      if (!tank || !tank.alive || tank.id === proj.ownerId) continue;

      const dx = proj.x - tank.x;
      const dy = proj.y - tank.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < proj.explosionRadius && distance > 0) {
        const splashDamage = proj.damage * (1 - distance / proj.explosionRadius) * 0.5;
        tank.health -= splashDamage;

        if (tank.health <= 0) {
          this.handlePlayerDeath(tank.id, proj.ownerId);
        }
      }
    }
  }

  private updateTerrainAfterExplosion(x: number, y: number, radius: number): void {
    const startX = Math.max(0, Math.floor(x - radius));
    const endX = Math.min(TERRAIN.WIDTH - 1, Math.ceil(x + radius));

    for (let xi = startX; xi <= endX; xi++) {
      const dx = xi - x;
      const maxDepth = Math.sqrt(radius * radius - dx * dx);
      const currentHeight = this.terrainHeightCache[xi];

      if (y + maxDepth > currentHeight) {
        const newHeight = Math.max(currentHeight, y + maxDepth);
        this.terrainHeightCache[xi] = Math.min(TERRAIN.HEIGHT, newHeight);
      }
    }
  }

  private handlePlayerDeath(victimId: string, killerId: string): void {
    const victim = this.players.get(victimId);
    const killer = this.players.get(killerId);

    if (victim?.tankState) {
      victim.tankState.alive = false;
      victim.deaths++;
    }

    if (killer && killerId !== victimId) {
      killer.score++;
      killer.kills++;
    }

    this.io.to(this.id).emit('game:playerDeath', {
      victimId,
      killerId,
      killerScore: killer?.score || 0,
    });

    if (this.gameMode === 'deathmatch' && victim) {
      setTimeout(() => {
        const spawn = this.getRandomSpawn();
        victim.respawn(spawn.x, spawn.y);
      }, GAME.RESPAWN_DELAY);
    }
  }

  private getRandomSpawn(): { x: number; y: number } {
    const x = GAME.SPAWN_MARGIN + Math.random() * (TERRAIN.WIDTH - GAME.SPAWN_MARGIN * 2);
    const y = this.getTerrainHeightAt(x) - TANK.HEIGHT / 2;
    return { x, y };
  }

  private checkWinCondition(): void {
    if (this.gameMode === 'deathmatch') {
      for (const player of this.players.values()) {
        if (player.score >= GAME.WIN_SCORE) {
          this.endGame(player.id);
          return;
        }
      }
    } else if (this.gameMode === 'lastTankStanding') {
      const alivePlayers = Array.from(this.players.values()).filter(p => p.tankState?.alive);
      if (alivePlayers.length <= 1) {
        this.endGame(alivePlayers[0]?.id || null);
      }
    }
  }

  private endGame(winnerId: string | null): void {
    this.status = 'ended';

    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);

    const winner = winnerId ? this.players.get(winnerId) : null;

    this.io.to(this.id).emit('game:end', {
      winnerId,
      winnerName: winner?.name || null,
      scores: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
      })),
      duration: Date.now() - this.gameStartTime,
    });
  }

  private broadcastState(): void {
    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      tanks: Array.from(this.players.values())
        .map(p => p.tankState!)
        .filter(Boolean),
      projectiles: Array.from(this.projectiles.values()),
      terrainDestructions: this.pendingDestructions.splice(0),
    };

    this.io.to(this.id).emit('game:state', snapshot);
  }

  isFull(): boolean {
    return this.players.size >= this.maxPlayers;
  }

  toInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      status: this.status,
    };
  }

  destroy(): void {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
  }
}
