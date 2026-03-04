import * as THREE from 'three';
import { MobManager } from './MobManager';
import { Entity } from './Entity';
import { Player } from '../player/Player';
import { ATTACK_COOLDOWN, ATTACK_REACH, KNOCKBACK_FORCE, PLAYER_HURT_INVINCIBILITY } from '../utils/constants';

export interface CombatHitResult {
  hit: boolean;
  entity: Entity | null;
  distance: number;
}

export class CombatSystem {
  private readonly mobManager: MobManager;
  private readonly player: Player;
  private readonly camera: THREE.PerspectiveCamera;

  private attackCooldown: number = 0;
  private lastAimedMob: Entity | null = null;

  constructor(mobManager: MobManager, player: Player, camera: THREE.PerspectiveCamera) {
    this.mobManager = mobManager;
    this.player = player;
    this.camera = camera;
  }

  update(dt: number, leftClick: boolean): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.lastAimedMob = null;

    // Check what mob the player is looking at
    const aimResult = this.getAimedMob();
    if (aimResult.hit && aimResult.entity) {
      this.lastAimedMob = aimResult.entity;
    }

    // Player attacks mob on left click
    if (leftClick && this.attackCooldown <= 0 && this.lastAimedMob) {
      this.attackMob(this.lastAimedMob);
      this.attackCooldown = ATTACK_COOLDOWN;
    }

    // Mobs attack player
    this.handleMobAttacks(dt);
  }

  private getAimedMob(): CombatHitResult {
    const origin = this.camera.position;
    const dir = this.player.getLookDirection();

    const result = this.mobManager.raycastMobs(
      origin.x, origin.y, origin.z,
      dir.x, dir.y, dir.z,
      ATTACK_REACH,
    );

    if (result) {
      return { hit: true, entity: result.entity, distance: result.distance };
    }

    return { hit: false, entity: null, distance: Infinity };
  }

  private attackMob(entity: Entity): void {
    // Calculate damage based on held item (base 1 with fist)
    const damage = this.getPlayerAttackDamage();

    // Knockback direction: from player to mob
    const kbX = entity.x - this.player.x;
    const kbZ = entity.z - this.player.z;

    entity.takeDamage(damage, kbX, kbZ, KNOCKBACK_FORCE);
  }

  private getPlayerAttackDamage(): number {
    // Base damage with fist = 1
    // Could be extended to check held weapon
    return 1;
  }

  private handleMobAttacks(dt: number): void {
    if (this.player.hurtInvincibility > 0) return;

    const attackers = this.mobManager.getAttackingMobs(
      this.player.x, this.player.y, this.player.z,
    );

    for (const mob of attackers) {
      const damage = mob.definition.attackDamage;

      // Knockback direction: from mob to player
      const kbX = this.player.x - mob.x;
      const kbZ = this.player.z - mob.z;

      this.player.takeDamage(damage, kbX, kbZ);
      break; // Only one mob can hit per frame
    }
  }

  /** Get the mob currently aimed at (for crosshair coloring) */
  getAimedMobEntity(): Entity | null {
    return this.lastAimedMob;
  }

  /** Check if player aimed at a mob within attack reach (for BlockInteraction priority) */
  isAimingAtMob(): boolean {
    return this.lastAimedMob !== null;
  }

  getAimedMobDistance(): number {
    if (!this.lastAimedMob) return Infinity;
    return this.lastAimedMob.distanceTo(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
    );
  }
}
