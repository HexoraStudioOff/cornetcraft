import { MobType, isHostileMob, isPassiveMob, isAquaticMob } from './MobTypes';
import { Entity } from './Entity';
import { World } from '../world/World';
import { BlockType } from '../blocks/BlockTypes';
import {
  MAX_HOSTILE_MOBS,
  MAX_PASSIVE_MOBS,
  MAX_AQUATIC_MOBS,
  MOB_SPAWN_MIN_RANGE,
  MOB_SPAWN_MAX_RANGE,
  MOB_DESPAWN_RANGE,
  MOB_SPAWN_INTERVAL,
  INITIAL_PASSIVE_SPAWN,
  INITIAL_AQUATIC_SPAWN,
  SEA_LEVEL,
} from '../utils/constants';

const HOSTILE_TYPES: MobType[] = [MobType.ZOMBIE, MobType.SKELETON, MobType.CREEPER, MobType.SPIDER];
const PASSIVE_TYPES: MobType[] = [MobType.PIG, MobType.COW, MobType.SHEEP, MobType.HORSE];
const AQUATIC_TYPES: MobType[] = [MobType.SHARK, MobType.FISH, MobType.DOLPHIN];

export class MobSpawner {
  private spawnTimer: number = 0;
  private initialSpawnDone: boolean = false;

  update(
    dt: number,
    mobs: Entity[],
    world: World,
    playerX: number,
    playerY: number,
    playerZ: number,
    dayFactor: number,
  ): Entity[] {
    const spawned: Entity[] = [];

    // Spawn initial batch on first tick
    if (!this.initialSpawnDone) {
      this.initialSpawnDone = true;
      for (let i = 0; i < INITIAL_PASSIVE_SPAWN; i++) {
        const type = PASSIVE_TYPES[Math.floor(Math.random() * PASSIVE_TYPES.length)];
        const mob = this.trySpawnLand(type, world, playerX, playerY, playerZ);
        if (mob) spawned.push(mob);
      }
      for (let i = 0; i < INITIAL_AQUATIC_SPAWN; i++) {
        const type = AQUATIC_TYPES[Math.floor(Math.random() * AQUATIC_TYPES.length)];
        const mob = this.trySpawnAquatic(type, world, playerX, playerZ);
        if (mob) spawned.push(mob);
      }
      return spawned;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer < MOB_SPAWN_INTERVAL) return spawned;
    this.spawnTimer -= MOB_SPAWN_INTERVAL;

    const hostileCount = mobs.filter(m => !m.isDead && isHostileMob(m.mobType) && !isAquaticMob(m.mobType)).length;
    const passiveCount = mobs.filter(m => !m.isDead && isPassiveMob(m.mobType) && !isAquaticMob(m.mobType)).length;
    const aquaticCount = mobs.filter(m => !m.isDead && isAquaticMob(m.mobType)).length;

    const isNight = dayFactor < 0.3;

    // Spawn hostiles at night
    if (isNight && hostileCount < MAX_HOSTILE_MOBS) {
      const type = HOSTILE_TYPES[Math.floor(Math.random() * HOSTILE_TYPES.length)];
      const mob = this.trySpawnLand(type, world, playerX, playerY, playerZ);
      if (mob) spawned.push(mob);
    }

    // Spawn passives (up to 2 at a time)
    if (passiveCount < MAX_PASSIVE_MOBS) {
      const count = Math.min(2, MAX_PASSIVE_MOBS - passiveCount);
      for (let i = 0; i < count; i++) {
        const type = PASSIVE_TYPES[Math.floor(Math.random() * PASSIVE_TYPES.length)];
        const mob = this.trySpawnLand(type, world, playerX, playerY, playerZ);
        if (mob) spawned.push(mob);
      }
    }

    // Spawn aquatic
    if (aquaticCount < MAX_AQUATIC_MOBS) {
      const count = Math.min(2, MAX_AQUATIC_MOBS - aquaticCount);
      for (let i = 0; i < count; i++) {
        const type = AQUATIC_TYPES[Math.floor(Math.random() * AQUATIC_TYPES.length)];
        const mob = this.trySpawnAquatic(type, world, playerX, playerZ);
        if (mob) spawned.push(mob);
      }
    }

    return spawned;
  }

  shouldDespawn(entity: Entity, playerX: number, playerZ: number): boolean {
    return entity.distanceToXZ(playerX, playerZ) > MOB_DESPAWN_RANGE;
  }

  private trySpawnLand(
    type: MobType,
    world: World,
    playerX: number,
    _playerY: number,
    playerZ: number,
  ): Entity | null {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = MOB_SPAWN_MIN_RANGE + Math.random() * (MOB_SPAWN_MAX_RANGE - MOB_SPAWN_MIN_RANGE);
      const wx = Math.floor(playerX + Math.cos(angle) * dist);
      const wz = Math.floor(playerZ + Math.sin(angle) * dist);

      let surfaceY = -1;
      for (let y = 120; y > 1; y--) {
        const blockBelow = world.getBlock(wx, y - 1, wz);
        const blockAt = world.getBlock(wx, y, wz);
        const blockAbove = world.getBlock(wx, y + 1, wz);
        if (
          blockBelow !== BlockType.AIR && blockBelow !== BlockType.WATER &&
          blockAt === BlockType.AIR &&
          blockAbove === BlockType.AIR
        ) {
          surfaceY = y;
          break;
        }
      }

      if (surfaceY < 0) continue;

      const surfaceBlock = world.getBlock(wx, surfaceY - 1, wz);
      if (surfaceBlock === BlockType.WATER) continue;

      // Passive mobs prefer grass but also accept dirt/sand
      if (isPassiveMob(type)) {
        if (surfaceBlock !== BlockType.GRASS && surfaceBlock !== BlockType.DIRT && surfaceBlock !== BlockType.SAND) continue;
      }

      return new Entity(type, wx + 0.5, surfaceY, wz + 0.5);
    }

    return null;
  }

  private trySpawnAquatic(
    type: MobType,
    world: World,
    playerX: number,
    playerZ: number,
  ): Entity | null {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = MOB_SPAWN_MIN_RANGE + Math.random() * (MOB_SPAWN_MAX_RANGE - MOB_SPAWN_MIN_RANGE);
      const wx = Math.floor(playerX + Math.cos(angle) * dist);
      const wz = Math.floor(playerZ + Math.sin(angle) * dist);

      // Check for water at sea level range
      const testY = SEA_LEVEL - 2 - Math.floor(Math.random() * 8);
      if (testY < 5) continue;

      const blockAt = world.getBlock(wx, testY, wz);
      const blockAbove = world.getBlock(wx, testY + 1, wz);

      if (blockAt === BlockType.WATER && blockAbove === BlockType.WATER) {
        const entity = new Entity(type, wx + 0.5, testY + 0.3, wz + 0.5);
        // Set the swim target Y based on spawn position
        entity.ai.setSwimTargetY(testY + 0.3);
        return entity;
      }
    }

    return null;
  }
}
