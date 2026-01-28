import type { ProjectileState } from '../shared/types';
import { PHYSICS } from '../shared/constants';
import type { WeaponConfig, WeaponBehavior, WeaponType } from '../shared/weapons';

export class Projectile {
  public id: string;
  public ownerId: string;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public damage: number;
  public explosionRadius: number;

  public trail: Array<{ x: number; y: number; age: number }> = [];
  private readonly TRAIL_LENGTH = 12;

  // Weapon-specific fields
  public weaponType?: WeaponType;
  public behavior?: WeaponBehavior;
  public gravityMultiplier: number = 1.0;
  public age: number = 0;
  public targetX?: number;
  public targetY?: number;
  public hasSplit: boolean = false;
  public penetrationRemaining: number = 0;
  public isBarrageShell: boolean = false;

  // Visual customization
  public trailColor: string = 'rgba(255, 200, 100, 0.6)';
  public projectileColor: string = '#FFD700';
  public projectileSize: number = 1.0;

  constructor(state: ProjectileState, config?: WeaponConfig) {
    this.id = state.id;
    this.ownerId = state.ownerId;
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.damage = state.damage;
    this.explosionRadius = state.explosionRadius;

    // Weapon-specific initialization
    this.weaponType = state.weaponType;
    this.behavior = state.behavior;
    this.gravityMultiplier = state.gravityMultiplier ?? 1.0;
    this.age = state.age ?? 0;
    this.targetX = state.targetX;
    this.targetY = state.targetY;
    this.hasSplit = state.hasSplit ?? false;
    this.penetrationRemaining = state.penetrationRemaining ?? 0;
    this.isBarrageShell = state.isBarrageShell ?? false;

    // Apply visual config if provided
    if (config) {
      this.trailColor = config.trailColor;
      this.projectileColor = config.projectileColor;
      this.projectileSize = config.projectileSize;
    }
  }

  update(deltaTime: number): void {
    this.age += deltaTime * 1000;

    // Update trail
    this.trail.unshift({ x: this.x, y: this.y, age: 0 });
    if (this.trail.length > this.TRAIL_LENGTH) {
      this.trail.pop();
    }
    for (const point of this.trail) {
      point.age += deltaTime;
    }

    // Apply behavior-specific physics
    switch (this.behavior?.type) {
      case 'guided':
        this.updateGuidedBehavior(deltaTime);
        break;
      case 'ballistic':
        this.updateBallisticBehavior(deltaTime);
        break;
      default:
        this.updateStandardPhysics(deltaTime);
    }
  }

  private updateStandardPhysics(deltaTime: number): void {
    this.vy += PHYSICS.GRAVITY * this.gravityMultiplier * deltaTime;

    // Apply air resistance in a frame-rate independent way
    const airResistanceFactor = Math.pow(1 - PHYSICS.AIR_RESISTANCE, deltaTime * 60);
    this.vx *= airResistanceFactor;
    this.vy *= airResistanceFactor;

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  private updateGuidedBehavior(deltaTime: number): void {
    const { guidanceDelay, turnRate } = this.behavior!;

    if (this.age < (guidanceDelay ?? 500)) {
      // Initial flight phase - no gravity, straight line
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
    } else if (this.targetX !== undefined && this.targetY !== undefined) {
      // Guidance phase - turn toward target
      const targetAngle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
      const currentAngle = Math.atan2(this.vy, this.vx);

      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxTurn = (turnRate ?? 3) * deltaTime;
      const actualTurn = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);

      const newAngle = currentAngle + actualTurn;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;

      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
    } else {
      // No target - just fly straight
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
    }
  }

  private updateBallisticBehavior(deltaTime: number): void {
    // High arc ballistic - reduced gravity at apex for dramatic arc
    const apexFactor = Math.abs(this.vy) < 50 ? 0.3 : 1.0;

    this.vy += PHYSICS.GRAVITY * this.gravityMultiplier * apexFactor * deltaTime;

    // Apply reduced air resistance in a frame-rate independent way
    const airResistanceFactor = Math.pow(1 - PHYSICS.AIR_RESISTANCE * 0.5, deltaTime * 60);
    this.vx *= airResistanceFactor;
    this.vy *= airResistanceFactor;

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  setState(state: ProjectileState): void {
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
  }

  getAngle(): number {
    return Math.atan2(this.vy, this.vx);
  }

  // Check if this projectile should split (cluster)
  shouldSplit(): boolean {
    return this.behavior?.type === 'cluster' && !this.hasSplit;
  }

  markSplit(): void {
    this.hasSplit = true;
  }

  // Check if bunker buster should continue penetrating
  canPenetrate(): boolean {
    return this.behavior?.type === 'penetrating' && this.penetrationRemaining > 0;
  }

  reducePenetration(amount: number): void {
    this.penetrationRemaining = Math.max(0, this.penetrationRemaining - amount);
  }
}
