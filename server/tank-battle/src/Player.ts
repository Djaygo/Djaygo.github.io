import type { PlayerInfo, PlayerInput, TankState } from '../../../src/lib/tank-battle/shared/types.js';
import { TANK, COLORS } from '../../../src/lib/tank-battle/shared/constants.js';

export class Player {
  public readonly id: string;
  public name: string;
  public ready: boolean = false;
  public color: string;
  public score: number = 0;
  public kills: number = 0;
  public deaths: number = 0;

  public lastInput: PlayerInput | null = null;
  public tankState: TankState | null = null;

  constructor(id: string, name: string, colorIndex: number) {
    this.id = id;
    this.name = name;
    this.color = COLORS.TANKS[colorIndex % COLORS.TANKS.length];
  }

  initTank(x: number, y: number): void {
    this.tankState = {
      id: this.id,
      x,
      y,
      angle: 0,
      turretAngle: 0,
      health: TANK.MAX_HEALTH,
      maxHealth: TANK.MAX_HEALTH,
      ammo: TANK.MAX_AMMO,
      cooldown: 0,
      velocity: { x: 0, y: 0 },
      color: this.color,
      name: this.name,
      score: this.score,
      alive: true,
    };
  }

  respawn(x: number, y: number): void {
    if (this.tankState) {
      this.tankState.x = x;
      this.tankState.y = y;
      this.tankState.health = TANK.MAX_HEALTH;
      this.tankState.ammo = TANK.MAX_AMMO;
      this.tankState.cooldown = 0;
      this.tankState.velocity = { x: 0, y: 0 };
      this.tankState.alive = true;
    }
  }

  toInfo(): PlayerInfo {
    return {
      id: this.id,
      name: this.name,
      ready: this.ready,
      color: this.color,
    };
  }
}
