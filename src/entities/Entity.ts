import * as THREE from 'three';
import { MobType, MobDefinition, MOB_DEFINITIONS } from './MobTypes';
import { MobModel, createMobModel, animateMobModel, disposeMobModel } from './MobModelFactory';
import { MobAI } from './MobAI';
import { Physics, AABB } from '../player/Physics';
import { World } from '../world/World';
import { GRAVITY, TERMINAL_VELOCITY } from '../utils/constants';
import { clamp } from '../utils/math';

export class Entity {
  readonly mobType: MobType;
  readonly definition: MobDefinition;
  readonly model: MobModel;
  readonly ai: MobAI;

  // Position (feet position)
  x: number;
  y: number;
  z: number;

  // Velocity
  vx: number = 0;
  vy: number = 0;
  vz: number = 0;

  // Rotation
  yaw: number = 0;

  // State
  grounded: boolean = false;
  health: number;
  readonly maxHealth: number;
  isDead: boolean = false;
  markedForRemoval: boolean = false;

  // Timers
  hurtTimer: number = 0;
  deathTimer: number = 0;
  private readonly HURT_FLASH_DURATION = 0.3;
  private readonly DEATH_DURATION = 1.0;

  // Riding
  rider: { x: number; y: number; z: number } | null = null;

  constructor(type: MobType, x: number, y: number, z: number) {
    this.mobType = type;
    this.definition = MOB_DEFINITIONS[type];
    this.x = x;
    this.y = y;
    this.z = z;
    this.health = this.definition.maxHealth;
    this.maxHealth = this.definition.maxHealth;
    this.yaw = Math.random() * Math.PI * 2;
    this.model = createMobModel(type);
    this.ai = new MobAI(this.definition);
    this.updateModelPosition();
  }

  update(dt: number, physics: Physics, playerX: number, playerY: number, playerZ: number): void {
    if (this.isDead) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.DEATH_DURATION) {
        this.markedForRemoval = true;
      }
      this.updateAnimation(dt, false);
      this.updateModelPosition();
      return;
    }

    // Hurt timer
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }

    // AI update
    this.ai.update(dt, this, playerX, playerY, playerZ);

    if (this.definition.aquatic) {
      // Aquatic: no gravity, free movement in water
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      // Dampen velocity slightly (water resistance)
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.vz *= 0.98;
      this.grounded = false;
    } else {
      // Apply gravity
      this.vy -= GRAVITY * dt;
      this.vy = clamp(this.vy, -TERMINAL_VELOCITY, TERMINAL_VELOCITY);

      // Physics collision
      const result = physics.moveEntityWithCollision(
        this.x, this.y, this.z,
        this.vx, this.vy, this.vz,
        dt,
        this.definition.width,
        this.definition.height,
      );

      this.x = result.x;
      this.y = result.y;
      this.z = result.z;
      this.vx = result.vx;
      this.vy = result.vy;
      this.vz = result.vz;
      this.grounded = result.grounded;
    }

    // Animation
    const isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vz) > 0.1 || (this.definition.aquatic && Math.abs(this.vy) > 0.1);
    this.updateAnimation(dt, isMoving);
    this.updateModelPosition();
  }

  private updateAnimation(dt: number, isMoving: boolean): void {
    animateMobModel(
      this.model,
      dt,
      this.definition.speed,
      isMoving,
      this.hurtTimer > 0,
      this.isDead,
      Math.min(1, this.deathTimer / this.DEATH_DURATION),
    );
  }

  private updateModelPosition(): void {
    this.model.group.position.set(this.x, this.y, this.z);
    this.model.group.rotation.y = this.yaw;
    // Aquatic mobs pitch when moving vertically
    if (this.definition.aquatic) {
      const speed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
      if (speed > 0.1) {
        this.model.group.rotation.x = clamp(-this.vy * 0.15, -0.4, 0.4);
      } else {
        this.model.group.rotation.x *= 0.9;
      }
    }
  }

  takeDamage(amount: number, knockbackX: number, knockbackZ: number, knockbackForce: number): void {
    if (this.isDead) return;

    this.health -= amount;
    this.hurtTimer = this.HURT_FLASH_DURATION;

    // Apply knockback
    const len = Math.sqrt(knockbackX * knockbackX + knockbackZ * knockbackZ);
    if (len > 0) {
      this.vx = (knockbackX / len) * knockbackForce;
      this.vz = (knockbackZ / len) * knockbackForce;
      this.vy = knockbackForce * 0.4;
    }

    // Notify AI of damage
    this.ai.onDamaged();

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.deathTimer = 0;
    }
  }

  getAABB(): AABB {
    const hw = this.definition.width / 2;
    return {
      minX: this.x - hw,
      minY: this.y,
      minZ: this.z - hw,
      maxX: this.x + hw,
      maxY: this.y + this.definition.height,
      maxZ: this.z + hw,
    };
  }

  distanceTo(px: number, py: number, pz: number): number {
    const dx = this.x - px;
    const dy = (this.y + this.definition.height / 2) - py;
    const dz = this.z - pz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  distanceToXZ(px: number, pz: number): number {
    const dx = this.x - px;
    const dz = this.z - pz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Check if a ray from origin in direction hits this entity's AABB */
  rayIntersects(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number {
    const aabb = this.getAABB();
    let tmin = 0;
    let tmax = maxDist;

    // X slab
    if (Math.abs(dx) < 1e-8) {
      if (ox < aabb.minX || ox > aabb.maxX) return -1;
    } else {
      const invD = 1 / dx;
      let t1 = (aabb.minX - ox) * invD;
      let t2 = (aabb.maxX - ox) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }

    // Y slab
    if (Math.abs(dy) < 1e-8) {
      if (oy < aabb.minY || oy > aabb.maxY) return -1;
    } else {
      const invD = 1 / dy;
      let t1 = (aabb.minY - oy) * invD;
      let t2 = (aabb.maxY - oy) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }

    // Z slab
    if (Math.abs(dz) < 1e-8) {
      if (oz < aabb.minZ || oz > aabb.maxZ) return -1;
    } else {
      const invD = 1 / dz;
      let t1 = (aabb.minZ - oz) * invD;
      let t2 = (aabb.maxZ - oz) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }

    return tmin >= 0 ? tmin : -1;
  }

  dispose(): void {
    disposeMobModel(this.model);
  }
}
