

export enum UnitType {
  WARRIOR = 'WARRIOR',
  ARCHER = 'ARCHER',
  AXEMAN = 'AXEMAN',
  LANCER = 'LANCER',
  BASE = 'BASE',
  GATE = 'GATE'
}

export enum Team {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY'
}

export enum SkillType {
  FIREBALL = 'FIREBALL',
  CANNON = 'CANNON',
  INVISIBILITY = 'INVISIBILITY',
  INVINCIBLE = 'INVINCIBLE'
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface GameEntity {
  id: string;
  type: UnitType;
  team: Team;
  position: Vector3;
  rotation: number; // Y-axis rotation
  hp: number;
  maxHp: number;
  mp?: number; // Only player usually has MP
  maxMp?: number;
  targetId: string | null;
  lastAttackTime: number;
  isDead: boolean;
  deathTime?: number; // Timestamp when unit died
  isMoving: boolean;
  isAttacking: boolean;
  radius: number; // Collision radius
  level: number; // Unit Level
  // Visual states
  isInvisible?: boolean;
  isInvincible?: boolean; // New: Invincible state
  // Status effects
  lastBurnTime?: number;
  speedMultiplier?: number; // For slow effects (transient, resets every frame)
  // Logic states
  isRallying?: boolean; // For Lancers waiting to group up
}

export interface Projectile {
  id: string;
  ownerTeam: Team;
  startPos: Vector3;
  targetId: string | null; // Null for directional skills
  targetPos: Vector3; 
  position: Vector3;
  speed: number;
  damage: number;
  progress: number; // 0 to 1
  visualType?: 'ARROW' | 'FIREBALL' | 'CANNONBALL';
  radius?: number; // For collision
  explosionRadius?: number; // For AoE
}

export interface FireWall {
  id: string;
  position: Vector3;
  radius: number;
  createdAt: number;
  duration: number;
}

export interface Crater {
  id: string;
  position: Vector3;
  radius: number;
  createdAt: number;
  duration: number;
}

export interface PlayerState extends GameEntity {
  mp: number;
  maxMp: number;
  learnedSkills: SkillType[];
  skillCooldowns: Record<SkillType, number>; // Timestamp when ready
}

export type GameOutcome = 'VICTORY' | 'DEFEAT' | null;

export type UnitCounts = {
  [Team.PLAYER]: Record<string, number>;
  [Team.ENEMY]: Record<string, number>;
};

export const GAME_CONFIG = {
  PLAYER_SPEED: 0.15,
  UNIT_SPEED: 0.08,
  SPAWN_RATE_MS: 3100, // Changed to 3.1s base spawn rate
  ATTACK_COOLDOWN: 1000,
  ATTACK_RANGE_MELEE: 2.5,
  ATTACK_RANGE_RANGED: 12,
  ATTACK_RANGE_BASE: 5,
  MAP_SIZE: 90, 
  BOUNDS: 85, 
  CASTLE_Z: 65, 
  BASE_HP: 1500,
  ARROW_SPEED: 0.5,
  GOLD_REWARD_UNIT: 15,
  GOLD_REWARD_BASE: 500,
  UPGRADE_COST: 100,
  MP_ON_KILL: 10,
  REGEN_INTERVAL: 2000, // 2 seconds
};

export const SKILL_STATS: Record<SkillType, { damage: number, cost: number, cooldown: number, speed: number, duration?: number, explosionRadius?: number, unlockCost: number }> = {
  [SkillType.FIREBALL]: { damage: 50, cost: 30, cooldown: 3000, speed: 0.4, explosionRadius: 4.5, unlockCost: 100 }, 
  [SkillType.CANNON]: { damage: 150, cost: 60, cooldown: 6000, speed: 0.6, explosionRadius: 7.0, unlockCost: 300 }, 
  [SkillType.INVISIBILITY]: { damage: 0, cost: 50, cooldown: 5000, speed: 0, duration: 5000, unlockCost: 200 },
  [SkillType.INVINCIBLE]: { damage: 0, cost: 80, cooldown: 15000, speed: 0, duration: 6000, unlockCost: 400 } 
};
