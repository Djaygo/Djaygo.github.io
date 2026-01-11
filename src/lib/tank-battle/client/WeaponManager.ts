import { WeaponType, WEAPONS, WEAPON_ORDER, type WeaponConfig } from '../shared/weapons';

export interface WeaponState {
  type: WeaponType;
  ammo: number;
  cooldown: number;
  reloadProgress: number;
}

export class WeaponManager {
  private currentWeapon: WeaponType = WeaponType.STANDARD;
  private weaponStates: Map<WeaponType, WeaponState> = new Map();
  private isReloading: boolean = false;
  private reloadStartTime: number = 0;

  private onWeaponChange?: (weapon: WeaponConfig) => void;
  private onAmmoChange?: (ammo: number, maxAmmo: number) => void;

  constructor() {
    this.initializeWeapons();
  }

  private initializeWeapons(): void {
    for (const type of WEAPON_ORDER) {
      const config = WEAPONS[type];
      this.weaponStates.set(type, {
        type,
        ammo: config.maxAmmo,
        cooldown: 0,
        reloadProgress: 1,
      });
    }
  }

  getCurrentWeapon(): WeaponConfig {
    return WEAPONS[this.currentWeapon];
  }

  getCurrentState(): WeaponState {
    return this.weaponStates.get(this.currentWeapon)!;
  }

  getWeaponState(type: WeaponType): WeaponState {
    return this.weaponStates.get(type)!;
  }

  getAllWeaponStates(): Map<WeaponType, WeaponState> {
    return this.weaponStates;
  }

  selectWeapon(type: WeaponType): void {
    if (type === this.currentWeapon) return;

    const config = WEAPONS[type];
    const state = this.weaponStates.get(type)!;

    this.currentWeapon = type;

    // Start reload if not full ammo
    if (state.ammo < config.maxAmmo && config.reloadTime > 0) {
      this.isReloading = true;
      this.reloadStartTime = performance.now();
      state.reloadProgress = 0;
    } else {
      this.isReloading = false;
    }

    this.onWeaponChange?.(config);
    this.onAmmoChange?.(state.ammo, config.maxAmmo);
  }

  selectWeaponByIndex(index: number): void {
    const safeIndex = ((index % WEAPON_ORDER.length) + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    const type = WEAPON_ORDER[safeIndex];
    this.selectWeapon(type);
  }

  nextWeapon(): void {
    const currentIndex = WEAPON_ORDER.indexOf(this.currentWeapon);
    this.selectWeaponByIndex(currentIndex + 1);
  }

  previousWeapon(): void {
    const currentIndex = WEAPON_ORDER.indexOf(this.currentWeapon);
    this.selectWeaponByIndex(currentIndex - 1);
  }

  canFire(): boolean {
    const state = this.getCurrentState();
    return state.ammo > 0 && state.cooldown <= 0 && !this.isReloading;
  }

  fire(): boolean {
    if (!this.canFire()) return false;

    const config = this.getCurrentWeapon();
    const state = this.getCurrentState();

    state.ammo--;
    state.cooldown = config.cooldown;

    this.onAmmoChange?.(state.ammo, config.maxAmmo);
    return true;
  }

  update(deltaTime: number): void {
    // Update cooldowns for all weapons
    for (const state of this.weaponStates.values()) {
      if (state.cooldown > 0) {
        state.cooldown = Math.max(0, state.cooldown - deltaTime * 1000);
      }
    }

    // Update reload for current weapon
    if (this.isReloading) {
      const config = this.getCurrentWeapon();
      const state = this.getCurrentState();
      const elapsed = performance.now() - this.reloadStartTime;

      state.reloadProgress = Math.min(1, elapsed / config.reloadTime);

      if (state.reloadProgress >= 1) {
        state.ammo = config.maxAmmo;
        this.isReloading = false;
        this.onAmmoChange?.(state.ammo, config.maxAmmo);
      }
    }
  }

  isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  getReloadProgress(): number {
    return this.getCurrentState().reloadProgress;
  }

  setOnWeaponChange(callback: (weapon: WeaponConfig) => void): void {
    this.onWeaponChange = callback;
  }

  setOnAmmoChange(callback: (ammo: number, maxAmmo: number) => void): void {
    this.onAmmoChange = callback;
  }

  reset(): void {
    this.currentWeapon = WeaponType.STANDARD;
    this.isReloading = false;
    this.initializeWeapons();
  }

  getWeaponCount(): number {
    return WEAPON_ORDER.length;
  }

  getWeaponAtIndex(index: number): WeaponConfig {
    return WEAPONS[WEAPON_ORDER[index]];
  }

  getCurrentWeaponIndex(): number {
    return WEAPON_ORDER.indexOf(this.currentWeapon);
  }
}
