import type { TankState } from '../shared/types';
import { TANK } from '../shared/constants';

export class Tank {
  public id: string;
  public x: number;
  public y: number;
  public angle: number;
  public turretAngle: number;
  public health: number;
  public maxHealth: number;
  public ammo: number;
  public cooldown: number;
  public velocity: { x: number; y: number };
  public color: string;
  public name: string;
  public score: number;
  public alive: boolean;

  private targetState: TankState | null = null;
  private interpolationProgress: number = 0;
  private readonly INTERPOLATION_SPEED = 12;

  public trackOffset: number = 0;
  public recoilOffset: number = 0;
  public damageFlash: number = 0;

  constructor(state: TankState) {
    this.id = state.id;
    this.x = state.x;
    this.y = state.y;
    this.angle = state.angle;
    this.turretAngle = state.turretAngle;
    this.health = state.health;
    this.maxHealth = state.maxHealth;
    this.ammo = state.ammo;
    this.cooldown = state.cooldown;
    this.velocity = { ...state.velocity };
    this.color = state.color;
    this.name = state.name;
    this.score = state.score;
    this.alive = state.alive;
  }

  setState(state: TankState): void {
    this.x = state.x;
    this.y = state.y;
    this.angle = state.angle;
    this.turretAngle = state.turretAngle;
    this.health = state.health;
    this.maxHealth = state.maxHealth;
    this.ammo = state.ammo;
    this.cooldown = state.cooldown;
    this.velocity = { ...state.velocity };
    this.score = state.score;
    this.alive = state.alive;
  }

  setTargetState(state: TankState): void {
    this.targetState = state;
    this.interpolationProgress = 0;

    if (state.health < this.health) {
      this.damageFlash = 0.3;
    }
  }

  update(deltaTime: number): void {
    if (this.targetState) {
      this.interpolationProgress += deltaTime * this.INTERPOLATION_SPEED;
      const t = Math.min(1, this.interpolationProgress);

      this.x = this.lerp(this.x, this.targetState.x, t);
      this.y = this.lerp(this.y, this.targetState.y, t);
      this.angle = this.lerpAngle(this.angle, this.targetState.angle, t);
      this.turretAngle = this.lerpAngle(this.turretAngle, this.targetState.turretAngle, t);

      if (t >= 1) {
        this.health = this.targetState.health;
        this.maxHealth = this.targetState.maxHealth;
        this.ammo = this.targetState.ammo;
        this.cooldown = this.targetState.cooldown;
        this.score = this.targetState.score;
        this.alive = this.targetState.alive;
        this.targetState = null;
      }
    }

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - deltaTime * 1000);
    }

    const speed = Math.abs(this.velocity.x);
    this.trackOffset = (this.trackOffset + speed * deltaTime * 0.15) % 12;

    this.recoilOffset *= 0.85;
    this.damageFlash *= 0.9;
  }

  applyRecoil(): void {
    this.recoilOffset = TANK.RECOIL_DISTANCE;
  }

  canShoot(): boolean {
    return this.cooldown <= 0 && this.ammo > 0 && this.alive;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}
