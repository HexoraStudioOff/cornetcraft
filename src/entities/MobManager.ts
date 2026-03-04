import * as THREE from 'three';
import { Entity } from './Entity';
import { MobType, isAquaticMob } from './MobTypes';
import { MobSpawner } from './MobSpawner';
import { Physics } from '../player/Physics';
import { World } from '../world/World';
import { WaterParticleSystem } from '../rendering/WaterParticles';
import { SEA_LEVEL } from '../utils/constants';

export class MobManager {
  private readonly mobs: Entity[] = [];
  private readonly spawner: MobSpawner;
  private readonly scene: THREE.Scene;
  private readonly physics: Physics;
  private readonly world: World;
  readonly waterParticles: WaterParticleSystem;
  private particleTimer: number = 0;

  constructor(scene: THREE.Scene, physics: Physics, world: World) {
    this.scene = scene;
    this.physics = physics;
    this.world = world;
    this.spawner = new MobSpawner();
    this.waterParticles = new WaterParticleSystem(scene);
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    dayFactor: number,
  ): void {
    // Spawn new mobs
    const newMobs = this.spawner.update(dt, this.mobs, this.world, playerX, playerY, playerZ, dayFactor);
    for (const mob of newMobs) {
      this.addMob(mob);
    }

    // Update existing mobs
    for (const mob of this.mobs) {
      mob.update(dt, this.physics, playerX, playerY, playerZ);
    }

    // Emit water particles for aquatic mobs near surface
    this.particleTimer += dt;
    if (this.particleTimer >= 0.08) {
      this.particleTimer = 0;
      for (const mob of this.mobs) {
        if (mob.isDead || !isAquaticMob(mob.mobType)) continue;
        const speed = Math.sqrt(mob.vx * mob.vx + mob.vz * mob.vz);
        // Trail particles when swimming
        if (speed > 0.5) {
          this.waterParticles.emitTrail(mob.x, mob.y + mob.definition.height * 0.5, mob.z, mob.vx, mob.vz);
        }
        // Splash when near water surface
        if (mob.y > SEA_LEVEL - 3 && speed > 1.0) {
          this.waterParticles.emitBurst(mob.x, SEA_LEVEL - 1, mob.z, 2, 0.5);
        }
      }
    }

    // Update water particles
    this.waterParticles.update(dt);

    // Remove dead/despawned mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (mob.markedForRemoval || this.spawner.shouldDespawn(mob, playerX, playerZ)) {
        this.removeMobAt(i);
      }
    }
  }

  spawnMob(type: MobType, x: number, y: number, z: number): Entity {
    const entity = new Entity(type, x, y, z);
    this.addMob(entity);
    return entity;
  }

  private addMob(entity: Entity): void {
    this.mobs.push(entity);
    this.scene.add(entity.model.group);
  }

  private removeMobAt(index: number): void {
    const mob = this.mobs[index];
    this.scene.remove(mob.model.group);
    mob.dispose();
    this.mobs.splice(index, 1);
  }

  getMobs(): readonly Entity[] {
    return this.mobs;
  }

  getAliveMobs(): Entity[] {
    return this.mobs.filter(m => !m.isDead);
  }

  /** Raycast against all alive mobs, returns closest hit */
  raycastMobs(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): { entity: Entity; distance: number } | null {
    let closest: { entity: Entity; distance: number } | null = null;

    for (const mob of this.mobs) {
      if (mob.isDead) continue;
      const t = mob.rayIntersects(ox, oy, oz, dx, dy, dz, maxDist);
      if (t >= 0 && (!closest || t < closest.distance)) {
        closest = { entity: mob, distance: t };
      }
    }

    return closest;
  }

  /** Get mobs within attack range of a position */
  getMobsInRange(x: number, y: number, z: number, range: number): Entity[] {
    return this.mobs.filter(m => !m.isDead && m.distanceTo(x, y, z) <= range);
  }

  /** Get mobs that want to attack the player this frame */
  getAttackingMobs(playerX: number, playerY: number, playerZ: number): Entity[] {
    return this.mobs.filter(m => {
      if (m.isDead || !m.definition.hostile) return false;
      if (!m.ai.canAttackPlayer) return false;
      return m.distanceTo(playerX, playerY + 0.8, playerZ) <= m.definition.attackRange;
    });
  }

  /** Find nearest rideable mob to position */
  findNearestRideable(x: number, y: number, z: number, maxDist: number): Entity | null {
    let closest: Entity | null = null;
    let closestDist = maxDist;

    for (const mob of this.mobs) {
      if (mob.isDead || !mob.definition.rideable) continue;
      const dist = mob.distanceTo(x, y, z);
      if (dist < closestDist) {
        closest = mob;
        closestDist = dist;
      }
    }

    return closest;
  }

  getMobCount(): number {
    return this.mobs.length;
  }

  dispose(): void {
    for (const mob of this.mobs) {
      this.scene.remove(mob.model.group);
      mob.dispose();
    }
    this.mobs.length = 0;
  }
}
