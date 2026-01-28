export enum WeaponType {
  STANDARD = 'standard',
  CLUSTER = 'cluster',
  DRONE = 'drone',
  ORESHNIK = 'oreshnik',
  NAPALM = 'napalm',
  BUNKER_BUSTER = 'bunker_buster',
  ARTILLERY = 'artillery',
  EMP = 'emp',
}

export type BehaviorType = 'standard' | 'cluster' | 'guided' | 'ballistic' | 'spreading' | 'penetrating' | 'barrage' | 'emp';

export interface WeaponBehavior {
  type: BehaviorType;

  // Cluster-specific
  clusterCount?: number;
  clusterSpread?: number;

  // Guided-specific (drone)
  guidanceDelay?: number;
  turnRate?: number;

  // Ballistic-specific (oreshnik)
  apexHeight?: number;

  // Spreading-specific (napalm)
  spreadRadius?: number;
  burnDuration?: number;

  // Penetrating-specific (bunker buster)
  penetrationDepth?: number;
  detonationDelay?: number;

  // Barrage-specific (artillery)
  shellCount?: number;
  barrageSpread?: number;
  delayBetweenShells?: number;

  // EMP-specific
  disableDuration?: number;
  empRadius?: number;
}

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  description: string;
  icon: string;

  // Physics
  speed: number;
  damage: number;
  explosionRadius: number;
  gravityMultiplier: number;

  // Ammo
  maxAmmo: number;
  reloadTime: number;
  cooldown: number;

  // Visual
  trailColor: string;
  projectileColor: string;
  projectileSize: number;

  // Special behavior
  behavior: WeaponBehavior;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.STANDARD]: {
    type: WeaponType.STANDARD,
    name: 'Standard Shell',
    description: 'Reliable all-purpose ammunition',
    icon: '💥',
    speed: 500,
    damage: 25,
    explosionRadius: 35,
    gravityMultiplier: 1.0,
    maxAmmo: 15,
    reloadTime: 0,
    cooldown: 800,
    trailColor: 'rgba(255, 200, 100, 0.6)',
    projectileColor: '#FFD700',
    projectileSize: 1.0,
    behavior: { type: 'standard' },
  },

  [WeaponType.CLUSTER]: {
    type: WeaponType.CLUSTER,
    name: 'Cluster Bomb',
    description: 'Splits into multiple bomblets on impact',
    icon: '🎆',
    speed: 400,
    damage: 10,
    explosionRadius: 20,
    gravityMultiplier: 1.2,
    maxAmmo: 5,
    reloadTime: 3000,
    cooldown: 1500,
    trailColor: 'rgba(255, 100, 100, 0.6)',
    projectileColor: '#FF4444',
    projectileSize: 1.3,
    behavior: {
      type: 'cluster',
      clusterCount: 6,
      clusterSpread: Math.PI / 2,
    },
  },

  [WeaponType.DRONE]: {
    type: WeaponType.DRONE,
    name: 'Drone Strike',
    description: 'Flies forward then dives at target',
    icon: '🛸',
    speed: 300,
    damage: 40,
    explosionRadius: 50,
    gravityMultiplier: 0.0,
    maxAmmo: 3,
    reloadTime: 5000,
    cooldown: 2000,
    trailColor: 'rgba(100, 200, 255, 0.6)',
    projectileColor: '#44AAFF',
    projectileSize: 1.5,
    behavior: {
      type: 'guided',
      guidanceDelay: 500,
      turnRate: 3.0,
    },
  },

  [WeaponType.ORESHNIK]: {
    type: WeaponType.ORESHNIK,
    name: 'Ballistic Missile',
    description: 'High-arc ballistic with devastating explosion',
    icon: '🚀',
    speed: 600,
    damage: 60,
    explosionRadius: 80,
    gravityMultiplier: 0.3,
    maxAmmo: 2,
    reloadTime: 8000,
    cooldown: 3000,
    trailColor: 'rgba(255, 150, 50, 0.8)',
    projectileColor: '#FF6600',
    projectileSize: 2.0,
    behavior: {
      type: 'ballistic',
      apexHeight: 300,
    },
  },

  [WeaponType.NAPALM]: {
    type: WeaponType.NAPALM,
    name: 'Napalm',
    description: 'Spreads fire across terrain on impact',
    icon: '🔥',
    speed: 350,
    damage: 15,
    explosionRadius: 40,
    gravityMultiplier: 1.0,
    maxAmmo: 4,
    reloadTime: 4000,
    cooldown: 1800,
    trailColor: 'rgba(255, 100, 0, 0.7)',
    projectileColor: '#FF4400',
    projectileSize: 1.2,
    behavior: {
      type: 'spreading',
      spreadRadius: 80,
      burnDuration: 3000,
    },
  },

  [WeaponType.BUNKER_BUSTER]: {
    type: WeaponType.BUNKER_BUSTER,
    name: 'Bunker Buster',
    description: 'Penetrates terrain before detonating',
    icon: '💣',
    speed: 700,
    damage: 50,
    explosionRadius: 60,
    gravityMultiplier: 1.5,
    maxAmmo: 3,
    reloadTime: 5000,
    cooldown: 2500,
    trailColor: 'rgba(100, 100, 100, 0.8)',
    projectileColor: '#444444',
    projectileSize: 1.4,
    behavior: {
      type: 'penetrating',
      penetrationDepth: 40,
      detonationDelay: 300,
    },
  },

  [WeaponType.ARTILLERY]: {
    type: WeaponType.ARTILLERY,
    name: 'Artillery Barrage',
    description: 'Calls in multiple shells from above',
    icon: '🎯',
    speed: 400,
    damage: 20,
    explosionRadius: 30,
    gravityMultiplier: 2.0,
    maxAmmo: 2,
    reloadTime: 10000,
    cooldown: 5000,
    trailColor: 'rgba(200, 200, 200, 0.5)',
    projectileColor: '#888888',
    projectileSize: 0.8,
    behavior: {
      type: 'barrage',
      shellCount: 5,
      barrageSpread: 100,
      delayBetweenShells: 150,
    },
  },

  [WeaponType.EMP]: {
    type: WeaponType.EMP,
    name: 'EMP Blast',
    description: 'Disables enemy movement temporarily',
    icon: '⚡',
    speed: 450,
    damage: 5,
    explosionRadius: 100,
    gravityMultiplier: 0.8,
    maxAmmo: 2,
    reloadTime: 12000,
    cooldown: 4000,
    trailColor: 'rgba(100, 150, 255, 0.8)',
    projectileColor: '#6699FF',
    projectileSize: 1.3,
    behavior: {
      type: 'emp',
      disableDuration: 3000,
      empRadius: 120,
    },
  },
};

export const WEAPON_ORDER: WeaponType[] = [
  WeaponType.STANDARD,
  WeaponType.CLUSTER,
  WeaponType.DRONE,
  WeaponType.ORESHNIK,
  WeaponType.NAPALM,
  WeaponType.BUNKER_BUSTER,
  WeaponType.ARTILLERY,
  WeaponType.EMP,
];
