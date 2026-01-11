import { Renderer } from './Renderer';
import { Terrain } from './Terrain';
import { Tank } from './Tank';
import { Projectile } from './Projectile';
import { ParticleSystem } from './Particles';
import { InputManager } from './Input';
import { NetworkClient } from './NetworkClient';
import { WeaponManager } from './WeaponManager';
import { RadialMenu } from './RadialMenu';
import { WeaponType, WEAPONS, type WeaponConfig } from '../shared/weapons';
import type {
  GameInitData,
  GameStateSnapshot,
  TankState,
  ProjectileState,
  TerrainDestructionEvent,
  PlayerInput,
  RoomInfo,
  PlayerInfo,
  PlayerHitEvent,
  PlayerDeathEvent,
  GameResults,
} from '../shared/types';
import { TANK, TERRAIN, PHYSICS } from '../shared/constants';

export type GameScreen = 'connecting' | 'lobby' | 'room' | 'playing' | 'ended';

export interface GameCallbacks {
  onScreenChange?: (screen: GameScreen) => void;
  onRoomListUpdate?: (rooms: RoomInfo[]) => void;
  onPlayersUpdate?: (players: PlayerInfo[]) => void;
  onCountdown?: (seconds: number) => void;
  onGameEnd?: (results: GameResults) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onWeaponChange?: (weapon: WeaponConfig) => void;
}

interface NapalmFire {
  x: number;
  y: number;
  life: number;
}

interface EMPEffect {
  x: number;
  y: number;
  radius: number;
  startTime: number;
}

interface PendingArtillery {
  x: number;
  delay: number;
  config: WeaponConfig;
}

export class TankGame {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private terrain: Terrain;
  private tanks: Map<string, Tank> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  private particles: ParticleSystem;
  private input: InputManager;
  private network: NetworkClient;
  private weaponManager: WeaponManager;
  private radialMenu: RadialMenu | null = null;

  private playerId: string = '';
  private currentRoom: RoomInfo | null = null;
  private players: PlayerInfo[] = [];
  private screen: GameScreen = 'connecting';

  private lastFrameTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;

  private pendingInputs: PlayerInput[] = [];
  private inputSequence: number = 0;

  private callbacks: GameCallbacks = {};

  // Free play mode (offline solo)
  private freePlayMode: boolean = false;
  private localProjectileId: number = 0;

  // Weapon effects
  private napalmFires: NapalmFire[] = [];
  private empEffects: EMPEffect[] = [];
  private pendingArtillery: PendingArtillery[] = [];

  constructor(canvas: HTMLCanvasElement, serverUrl: string, callbacks: GameCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    canvas.width = TERRAIN.WIDTH;
    canvas.height = TERRAIN.HEIGHT;

    this.renderer = new Renderer(canvas);
    this.terrain = new Terrain();
    this.particles = new ParticleSystem();
    this.input = new InputManager(canvas);
    this.network = new NetworkClient(serverUrl);
    this.weaponManager = new WeaponManager();

    this.setupNetworkHandlers();
    this.setupWeaponCallbacks();
  }

  private setupWeaponCallbacks(): void {
    this.weaponManager.setOnWeaponChange((weapon) => {
      this.callbacks.onWeaponChange?.(weapon);
    });
  }

  async connect(showConnectingScreen: boolean = false): Promise<void> {
    try {
      if (showConnectingScreen) {
        this.setScreen('connecting');
      }
      await this.network.connect();
      this.callbacks.onConnectionChange?.(true);
      if (showConnectingScreen) {
        this.setScreen('lobby');
      }
      this.refreshRooms();
    } catch (error) {
      if (showConnectingScreen) {
        this.callbacks.onError?.((error as Error).message);
        this.setScreen('lobby');
      }
      this.callbacks.onConnectionChange?.(false);
    }
  }

  async reconnect(serverUrl: string): Promise<void> {
    try {
      this.setScreen('connecting');
      await this.network.reconnect(serverUrl);
      this.callbacks.onConnectionChange?.(true);
      this.setScreen('lobby');
      this.refreshRooms();
    } catch (error) {
      this.callbacks.onError?.((error as Error).message);
      this.callbacks.onConnectionChange?.(false);
    }
  }

  private setupNetworkHandlers(): void {
    this.network.on<RoomInfo[]>('lobby:roomList', (rooms) => {
      this.callbacks.onRoomListUpdate?.(rooms);
    });

    this.network.on<{ room: RoomInfo; playerId: string; players: PlayerInfo[] }>(
      'lobby:joined',
      ({ room, playerId, players }) => {
        this.currentRoom = room;
        this.playerId = playerId;
        this.players = players;
        this.setScreen('room');
        this.callbacks.onPlayersUpdate?.(players);
      }
    );

    this.network.on<PlayerInfo>('lobby:playerJoined', (player) => {
      this.players.push(player);
      this.callbacks.onPlayersUpdate?.([...this.players]);
    });

    this.network.on<string>('lobby:playerLeft', (playerId) => {
      this.players = this.players.filter((p) => p.id !== playerId);
      this.callbacks.onPlayersUpdate?.([...this.players]);
    });

    this.network.on<string>('lobby:playerReady', (playerId) => {
      const player = this.players.find((p) => p.id === playerId);
      if (player) {
        player.ready = true;
        this.callbacks.onPlayersUpdate?.([...this.players]);
      }
    });

    this.network.on<number>('lobby:countdown', (seconds) => {
      this.callbacks.onCountdown?.(seconds);
    });

    this.network.on<GameInitData>('game:start', (data) => {
      this.initializeGame(data);
    });

    this.network.on<GameStateSnapshot>('game:state', (snapshot) => {
      this.reconcileState(snapshot);
    });

    this.network.on<TerrainDestructionEvent>('game:terrainDestruction', (event) => {
      this.terrain.createCrater(event.x, event.y, event.radius);
      const debris = this.terrain.popDebris();
      this.particles.createDebris(debris);
      this.particles.createExplosion(event.x, event.y, event.radius);
      this.renderer.addScreenShake(0.5);
    });

    this.network.on<PlayerHitEvent>('game:playerHit', (event) => {
      const tank = this.tanks.get(event.targetId);
      if (tank) {
        tank.damageFlash = 0.4;
      }
    });

    this.network.on<PlayerDeathEvent>('game:playerDeath', (event) => {
      const tank = this.tanks.get(event.victimId);
      if (tank) {
        tank.alive = false;
        this.particles.createExplosion(tank.x, tank.y, 50);
        this.renderer.addScreenShake(1);
      }
    });

    this.network.on<GameResults>('game:end', (results) => {
      this.running = false;
      this.setScreen('ended');
      this.callbacks.onGameEnd?.(results);
    });

    this.network.on<string>('error', (message) => {
      this.callbacks.onError?.(message);
    });

    this.network.on<null>('disconnected', () => {
      this.callbacks.onConnectionChange?.(false);
      if (this.running) {
        this.running = false;
        this.setScreen('connecting');
      }
    });
  }

  private setScreen(screen: GameScreen): void {
    this.screen = screen;
    this.callbacks.onScreenChange?.(screen);

    // Manage radial menu visibility
    if (screen === 'playing') {
      if (!this.radialMenu) {
        this.radialMenu = new RadialMenu(this.canvas, this.weaponManager);
      }
      this.radialMenu.attachToDOM();
    } else {
      this.radialMenu?.detachFromDOM();
    }
  }

  async refreshRooms(): Promise<void> {
    const rooms = await this.network.getRooms();
    this.callbacks.onRoomListUpdate?.(rooms);
  }

  async createRoom(name: string, playerName: string): Promise<void> {
    try {
      const roomId = await this.network.createRoom({ name, maxPlayers: 4 });
      await this.network.joinRoom(roomId, playerName);
    } catch (error) {
      this.callbacks.onError?.((error as Error).message);
    }
  }

  async joinRoom(roomId: string, playerName: string): Promise<void> {
    try {
      await this.network.joinRoom(roomId, playerName);
    } catch (error) {
      this.callbacks.onError?.((error as Error).message);
    }
  }

  leaveRoom(): void {
    if (this.freePlayMode) {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.freePlayMode = false;
      this.tanks.clear();
      this.projectiles.clear();
      this.particles.clear();
      this.napalmFires = [];
      this.empEffects = [];
      this.pendingArtillery = [];
      this.weaponManager.reset();
      this.setScreen('lobby');
      return;
    }

    this.network.leaveRoom();
    this.currentRoom = null;
    this.players = [];
    this.setScreen('lobby');
    this.refreshRooms();
  }

  setReady(): void {
    this.network.setReady();
  }

  startFreePlay(playerName: string): void {
    this.freePlayMode = true;
    this.playerId = 'local-player';

    const seed = Math.floor(Math.random() * 100000);
    this.terrain.initialize({
      width: TERRAIN.WIDTH,
      height: TERRAIN.HEIGHT,
      seed,
    });

    this.tanks.clear();
    this.projectiles.clear();
    this.particles.clear();
    this.napalmFires = [];
    this.empEffects = [];
    this.pendingArtillery = [];
    this.pendingInputs = [];
    this.inputSequence = 0;
    this.localProjectileId = 0;
    this.weaponManager.reset();

    const spawnX = TERRAIN.WIDTH / 2;
    const spawnY = this.terrain.getHeightAt(spawnX) - TANK.HEIGHT / 2;

    const tankState: TankState = {
      id: this.playerId,
      name: playerName || 'Player',
      x: spawnX,
      y: spawnY,
      angle: 0,
      turretAngle: -Math.PI / 4,
      velocity: { x: 0, y: 0 },
      health: TANK.MAX_HEALTH,
      maxHealth: TANK.MAX_HEALTH,
      ammo: TANK.MAX_AMMO,
      cooldown: 0,
      color: '#e63946',
      score: 0,
      alive: true,
    };

    const tank = new Tank(tankState);
    this.tanks.set(this.playerId, tank);

    this.setScreen('playing');
    this.start();
  }

  private initializeGame(data: GameInitData): void {
    this.terrain.initialize(data.terrain);
    this.tanks.clear();
    this.projectiles.clear();
    this.particles.clear();
    this.napalmFires = [];
    this.empEffects = [];
    this.pendingArtillery = [];
    this.pendingInputs = [];
    this.inputSequence = 0;
    this.weaponManager.reset();

    for (const tankState of data.tanks) {
      const tank = new Tank(tankState);
      this.tanks.set(tankState.id, tank);
    }

    this.setScreen('playing');
    this.start();
  }

  private start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // Update weapon system
    this.weaponManager.update(deltaTime);
    this.radialMenu?.update(deltaTime);

    const localTank = this.tanks.get(this.playerId);

    if (localTank && localTank.alive) {
      const input = this.input.getInput(localTank.x, localTank.y, ++this.inputSequence);

      if (!this.freePlayMode) {
        this.network.sendInput(input);
        this.pendingInputs.push(input);

        if (this.pendingInputs.length > 120) {
          this.pendingInputs.shift();
        }
      }

      this.applyInputLocally(localTank, input, deltaTime);

      // Only allow shooting if radial menu is closed
      const canShoot = !this.radialMenu?.isMenuOpen() && this.weaponManager.canFire();
      if (this.input.consumeShot() && canShoot) {
        const angle = input.turretAngle;

        if (this.freePlayMode) {
          this.fireWeapon(localTank, angle);
        } else {
          const weaponType = this.weaponManager.getCurrentWeapon().type;
          this.network.shoot({ angle, power: 1, weaponType });
        }

        this.weaponManager.fire();
        localTank.applyRecoil();

        const muzzleX = localTank.x + Math.cos(angle) * TANK.TURRET_LENGTH;
        const muzzleY = localTank.y + Math.sin(angle) * TANK.TURRET_LENGTH;
        this.particles.createMuzzleFlash(muzzleX, muzzleY, angle);
      }
    }

    for (const tank of this.tanks.values()) {
      if (tank.id !== this.playerId) {
        tank.update(deltaTime);
      }
    }

    // Update projectiles
    this.updateProjectiles(deltaTime);

    // Update weapon effects
    this.updateNapalmFires(deltaTime);
    this.updateEMPEffects();
    this.processPendingArtillery(deltaTime);

    this.particles.update(deltaTime);

    // Update falling sand
    const sandSteps = 3;
    for (let i = 0; i < sandSteps; i++) {
      this.terrain.updateSand();
    }

    if (Math.random() < 0.01) {
      this.terrain.cleanupSettledParticles();
    }
  }

  private fireWeapon(tank: Tank, angle: number): void {
    const config = this.weaponManager.getCurrentWeapon();

    if (config.behavior.type === 'barrage') {
      this.scheduleArtilleryBarrage(angle, config);
    } else {
      this.createLocalProjectile(tank, angle, config);
    }
  }

  private createLocalProjectile(tank: Tank, angle: number, config?: WeaponConfig): void {
    config = config || WEAPONS[WeaponType.STANDARD];

    const muzzleX = tank.x + Math.cos(angle) * TANK.TURRET_LENGTH;
    const muzzleY = tank.y + Math.sin(angle) * TANK.TURRET_LENGTH;

    const projectileState: ProjectileState = {
      id: `local-${++this.localProjectileId}`,
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(angle) * config.speed,
      vy: Math.sin(angle) * config.speed,
      ownerId: this.playerId,
      damage: config.damage,
      explosionRadius: config.explosionRadius,
      weaponType: config.type,
      behavior: config.behavior,
      gravityMultiplier: config.gravityMultiplier,
      age: 0,
      penetrationRemaining: config.behavior.penetrationDepth || 0,
    };

    // Set target for guided weapons
    if (config.behavior.type === 'guided') {
      const mousePos = this.input.getMousePosition();
      projectileState.targetX = mousePos.x;
      projectileState.targetY = mousePos.y;
    }

    const projectile = new Projectile(projectileState, config);
    this.projectiles.set(projectileState.id, projectile);
  }

  private scheduleArtilleryBarrage(angle: number, config: WeaponConfig): void {
    const { shellCount = 5, barrageSpread = 100, delayBetweenShells = 150 } = config.behavior;
    const mousePos = this.input.getMousePosition();
    const targetX = mousePos.x;

    for (let i = 0; i < shellCount; i++) {
      const offsetX = (Math.random() - 0.5) * barrageSpread;
      const delay = i * delayBetweenShells;

      this.pendingArtillery.push({
        x: targetX + offsetX,
        delay,
        config,
      });
    }
  }

  private processPendingArtillery(deltaTime: number): void {
    for (let i = this.pendingArtillery.length - 1; i >= 0; i--) {
      const shell = this.pendingArtillery[i];
      shell.delay -= deltaTime * 1000;

      if (shell.delay <= 0) {
        const projectileState: ProjectileState = {
          id: `local-${++this.localProjectileId}`,
          x: shell.x,
          y: -50,
          vx: 0,
          vy: 300,
          ownerId: this.playerId,
          damage: shell.config.damage,
          explosionRadius: shell.config.explosionRadius,
          weaponType: shell.config.type,
          behavior: { type: 'standard' },
          gravityMultiplier: shell.config.gravityMultiplier,
          age: 0,
          isBarrageShell: true,
        };

        const projectile = new Projectile(projectileState, shell.config);
        this.projectiles.set(projectileState.id, projectile);
        this.pendingArtillery.splice(i, 1);
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (const [id, projectile] of this.projectiles.entries()) {
      projectile.update(deltaTime);

      // Create missile trail for ballistic weapons
      if (projectile.behavior?.type === 'ballistic' && Math.random() < 0.5) {
        this.particles.createMissileTrail(projectile.x, projectile.y);
      }

      if (this.freePlayMode) {
        const isSolid = this.terrain.isSolid(projectile.x, projectile.y);
        const outOfBounds = projectile.x < 0 || projectile.x > TERRAIN.WIDTH || projectile.y > TERRAIN.HEIGHT;

        if (isSolid || outOfBounds) {
          // Handle bunker buster penetration
          if (projectile.canPenetrate() && isSolid) {
            projectile.reducePenetration(1);
            if (projectile.canPenetrate()) continue;
          }

          this.handleProjectileImpact(projectile);
          this.projectiles.delete(id);
        }
      }
    }
  }

  private handleProjectileImpact(projectile: Projectile): void {
    const { x, y, explosionRadius, behavior } = projectile;

    switch (behavior?.type) {
      case 'cluster':
        if (projectile.shouldSplit()) {
          this.createClusterExplosion(projectile);
        }
        break;

      case 'spreading': // Napalm
        this.createNapalmEffect(x, y, behavior.spreadRadius || 80);
        break;

      case 'emp':
        this.createEMPEffect(x, y, behavior.empRadius || 120);
        break;

      case 'penetrating': // Bunker buster - delayed underground explosion
        this.particles.createExplosion(x, y, 15);
        setTimeout(() => {
          this.terrain.createCrater(x, y + 30, explosionRadius * 1.5);
          const debris = this.terrain.popDebris();
          this.particles.createDebris(debris);
          this.particles.createExplosion(x, y + 30, explosionRadius * 1.5);
          this.renderer.addScreenShake(1.5);
        }, behavior.detonationDelay || 300);
        return;

      default:
        // Standard explosion
        this.terrain.createCrater(x, y, explosionRadius);
        const debris = this.terrain.popDebris();
        this.particles.createDebris(debris);
        this.particles.createExplosion(x, y, explosionRadius);
        this.renderer.addScreenShake(explosionRadius / 50);
    }
  }

  private createClusterExplosion(projectile: Projectile): void {
    projectile.markSplit();

    const count = projectile.behavior?.clusterCount || 6;
    const spread = projectile.behavior?.clusterSpread || Math.PI / 2;

    // Small initial explosion
    this.particles.createExplosion(projectile.x, projectile.y, 15);
    this.renderer.addScreenShake(0.3);

    // Create cluster bomblets
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i / (count - 1) - 0.5) * spread;
      const speed = 150 + Math.random() * 100;

      const bombletState: ProjectileState = {
        id: `local-${++this.localProjectileId}`,
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        ownerId: projectile.ownerId,
        damage: projectile.damage,
        explosionRadius: 20,
        weaponType: projectile.weaponType,
        behavior: { type: 'standard' },
        gravityMultiplier: 1.2,
        age: 0,
      };

      const bomblet = new Projectile(bombletState);
      bomblet.trailColor = 'rgba(255, 100, 100, 0.5)';
      bomblet.projectileColor = '#FF6666';
      bomblet.projectileSize = 0.6;
      this.projectiles.set(bombletState.id, bomblet);
    }
  }

  private createNapalmEffect(x: number, y: number, spread: number): void {
    // Initial explosion
    this.particles.createExplosion(x, y, 30);
    this.renderer.addScreenShake(0.6);

    // Create fire zones
    const fireCount = 8;
    for (let i = 0; i < fireCount; i++) {
      const fx = x + (Math.random() - 0.5) * spread;
      const fy = this.terrain.getHeightAt(fx);

      this.napalmFires.push({
        x: fx,
        y: fy,
        life: 3,
      });
    }

    // Create terrain damage in spread area
    for (let dx = -spread / 2; dx < spread / 2; dx += 15) {
      const fx = x + dx;
      const fy = this.terrain.getHeightAt(fx);
      this.terrain.createCrater(fx, fy, 10);
    }
    const debris = this.terrain.popDebris();
    this.particles.createDebris(debris);
  }

  private updateNapalmFires(deltaTime: number): void {
    for (let i = this.napalmFires.length - 1; i >= 0; i--) {
      const fire = this.napalmFires[i];
      fire.life -= deltaTime;

      // Spawn fire particles
      if (Math.random() < 0.4) {
        this.particles.createFireParticle(fire.x, fire.y);
      }

      if (fire.life <= 0) {
        this.napalmFires.splice(i, 1);
      }
    }
  }

  private createEMPEffect(x: number, y: number, radius: number): void {
    // Visual effect
    this.empEffects.push({
      x,
      y,
      radius,
      startTime: performance.now(),
    });

    // Particle effect
    this.particles.createEMPExplosion(x, y, radius);
    this.renderer.addScreenShake(0.4);

    // Small crater
    this.terrain.createCrater(x, y, 15);
    const debris = this.terrain.popDebris();
    this.particles.createDebris(debris);
  }

  private updateEMPEffects(): void {
    const now = performance.now();
    this.empEffects = this.empEffects.filter((effect) => now - effect.startTime < 500);
  }

  private applyInputLocally(tank: Tank, input: PlayerInput, deltaTime: number): void {
    if (input.moveDirection.x !== 0) {
      tank.velocity.x = input.moveDirection.x * TANK.MOVE_SPEED;
    } else {
      tank.velocity.x *= Math.pow(TANK.FRICTION, deltaTime * 60);
    }

    const newX = tank.x + tank.velocity.x * deltaTime;
    const clampedX = Math.max(TANK.WIDTH / 2, Math.min(TERRAIN.WIDTH - TANK.WIDTH / 2, newX));

    const terrainY = this.terrain.getHeightAt(clampedX);
    const oldTerrainY = this.terrain.getHeightAt(tank.x);

    const dx = clampedX - tank.x;
    if (Math.abs(dx) > 0.1) {
      const dy = terrainY - oldTerrainY;
      const slopeAngle = Math.atan2(Math.abs(dy), Math.abs(dx));

      if (slopeAngle < TANK.SLOPE_LIMIT) {
        tank.x = clampedX;
        tank.y = terrainY - TANK.HEIGHT / 2;
        const visualSlope = Math.atan2(-dy, Math.abs(dx)) * Math.sign(dx);
        tank.angle = visualSlope * 0.3;
      }
    } else {
      tank.y = this.terrain.getHeightAt(tank.x) - TANK.HEIGHT / 2;
    }

    tank.turretAngle = input.turretAngle;

    if (tank.cooldown > 0) {
      tank.cooldown = Math.max(0, tank.cooldown - deltaTime * 1000);
    }
  }

  private reconcileState(snapshot: GameStateSnapshot): void {
    for (const tankState of snapshot.tanks) {
      if (tankState.id === this.playerId) {
        this.reconcileLocalTank(tankState, snapshot.timestamp);
      } else {
        let tank = this.tanks.get(tankState.id);
        if (!tank) {
          tank = new Tank(tankState);
          this.tanks.set(tankState.id, tank);
        } else {
          tank.setTargetState(tankState);
        }
      }
    }

    const serverProjectileIds = new Set(snapshot.projectiles.map((p) => p.id));
    for (const id of this.projectiles.keys()) {
      if (!serverProjectileIds.has(id)) {
        this.projectiles.delete(id);
      }
    }

    for (const projState of snapshot.projectiles) {
      let projectile = this.projectiles.get(projState.id);
      if (!projectile) {
        projectile = new Projectile(projState);
        this.projectiles.set(projState.id, projectile);
      } else {
        projectile.setState(projState);
      }
    }
  }

  private reconcileLocalTank(serverState: TankState, serverTime: number): void {
    const localTank = this.tanks.get(this.playerId);
    if (!localTank) return;

    const inputIndex = this.pendingInputs.findIndex((i) => i.timestamp <= serverTime);

    if (inputIndex >= 0) {
      this.pendingInputs.splice(0, inputIndex + 1);
    }

    localTank.health = serverState.health;
    localTank.maxHealth = serverState.maxHealth;
    localTank.ammo = serverState.ammo;
    localTank.cooldown = serverState.cooldown;
    localTank.score = serverState.score;
    localTank.alive = serverState.alive;

    const dx = Math.abs(localTank.x - serverState.x);
    const dy = Math.abs(localTank.y - serverState.y);

    if (dx > 50 || dy > 50) {
      localTank.x = serverState.x;
      localTank.y = serverState.y;
      localTank.angle = serverState.angle;
      localTank.velocity = { ...serverState.velocity };
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawTerrain(this.terrain);

    for (const tank of this.tanks.values()) {
      this.renderer.drawTank(tank, tank.id === this.playerId);
    }

    for (const projectile of this.projectiles.values()) {
      this.renderer.drawProjectile(projectile);
    }

    // Draw napalm fires
    this.renderer.drawNapalmFires(this.napalmFires);

    // Draw EMP effects
    const now = performance.now();
    for (const effect of this.empEffects) {
      const progress = (now - effect.startTime) / 500;
      this.renderer.drawEMPEffect(effect.x, effect.y, effect.radius, progress);
    }

    this.renderer.drawParticles(this.particles);

    const localTank = this.tanks.get(this.playerId);
    if (localTank && localTank.alive && !this.radialMenu?.isMenuOpen()) {
      const config = this.weaponManager.getCurrentWeapon();
      this.renderer.drawAimingLine(localTank, this.input.getMousePosition(), config);
    }

    // Draw radial menu
    if (this.radialMenu) {
      const ctx = this.canvas.getContext('2d')!;
      this.radialMenu.render(ctx);
    }

    this.renderer.restore();
  }

  getLocalTank(): Tank | undefined {
    return this.tanks.get(this.playerId);
  }

  getWeaponManager(): WeaponManager {
    return this.weaponManager;
  }

  getLatency(): number {
    return this.network.getLatency();
  }

  getScreen(): GameScreen {
    return this.screen;
  }

  isFreePlay(): boolean {
    return this.freePlayMode;
  }

  destroy(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.radialMenu?.destroy();
    this.input.destroy();
    this.network.disconnect();
  }
}
