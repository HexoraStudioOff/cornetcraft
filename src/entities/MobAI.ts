import { MobDefinition } from './MobTypes';

export enum AIState {
  IDLE = 0,
  WANDER = 1,
  CHASE = 2,
  ATTACK = 3,
  FLEE = 4,
  PANIC = 5,
}

interface AIEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  yaw: number;
  grounded: boolean;
  isDead: boolean;
  definition: MobDefinition;
}

export class MobAI {
  private readonly definition: MobDefinition;

  state: AIState = AIState.IDLE;
  private stateTimer: number = 0;
  private attackCooldownTimer: number = 0;

  // Wander target direction
  private wanderDirX: number = 0;
  private wanderDirY: number = 0;
  private wanderDirZ: number = 0;

  // Whether mob just took damage (for flee/panic)
  private justDamaged: boolean = false;
  canAttackPlayer: boolean = false;

  // Aquatic: target swim depth and bobbing
  private swimTargetY: number = 30;
  private swimBobTimer: number = Math.random() * Math.PI * 2;

  constructor(definition: MobDefinition) {
    this.definition = definition;
    this.stateTimer = 1 + Math.random() * 3;
  }

  update(dt: number, entity: AIEntity, playerX: number, playerY: number, playerZ: number): void {
    if (entity.isDead) {
      entity.vx = 0;
      entity.vz = 0;
      return;
    }

    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    this.stateTimer -= dt;
    this.canAttackPlayer = false;

    const distToPlayer = this.distXZ(entity.x, entity.z, playerX, playerZ);

    if (this.definition.aquatic) {
      this.updateAquatic(dt, entity, playerX, playerY, playerZ, distToPlayer);
    } else if (this.definition.hostile) {
      this.updateHostile(dt, entity, playerX, playerY, playerZ, distToPlayer);
    } else {
      this.updatePassive(dt, entity, playerX, playerZ, distToPlayer);
    }

    // Face movement direction
    if (Math.abs(entity.vx) > 0.1 || Math.abs(entity.vz) > 0.1) {
      const targetYaw = Math.atan2(-entity.vx, -entity.vz);
      let diff = targetYaw - entity.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entity.yaw += diff * Math.min(1, dt * 8);
    }

    this.justDamaged = false;
  }

  private updateHostile(
    dt: number,
    entity: AIEntity,
    playerX: number,
    playerY: number,
    playerZ: number,
    distToPlayer: number,
  ): void {
    switch (this.state) {
      case AIState.IDLE: {
        entity.vx = 0;
        entity.vz = 0;
        if (distToPlayer < this.definition.detectionRange) {
          this.transitionTo(AIState.CHASE);
          return;
        }
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.WANDER);
        }
        break;
      }
      case AIState.WANDER: {
        entity.vx = this.wanderDirX * this.definition.speed * 0.4;
        entity.vz = this.wanderDirZ * this.definition.speed * 0.4;
        this.tryAutoJump(entity);
        if (distToPlayer < this.definition.detectionRange) {
          this.transitionTo(AIState.CHASE);
          return;
        }
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.IDLE);
        }
        break;
      }
      case AIState.CHASE: {
        if (distToPlayer > this.definition.detectionRange * 1.5) {
          this.transitionTo(AIState.IDLE);
          return;
        }
        if (distToPlayer <= this.definition.attackRange) {
          this.transitionTo(AIState.ATTACK);
          return;
        }
        const dx = playerX - entity.x;
        const dz = playerZ - entity.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          entity.vx = (dx / len) * this.definition.speed;
          entity.vz = (dz / len) * this.definition.speed;
        }
        this.tryAutoJump(entity);
        break;
      }
      case AIState.ATTACK: {
        entity.vx = 0;
        entity.vz = 0;
        // Face player
        entity.yaw = Math.atan2(-(playerX - entity.x), -(playerZ - entity.z));
        if (distToPlayer > this.definition.attackRange * 1.3) {
          this.transitionTo(AIState.CHASE);
          return;
        }
        if (this.attackCooldownTimer <= 0) {
          this.canAttackPlayer = true;
          this.attackCooldownTimer = this.definition.attackCooldown;
        }
        break;
      }
      default: {
        this.transitionTo(AIState.IDLE);
      }
    }
  }

  private updatePassive(
    dt: number,
    entity: AIEntity,
    playerX: number,
    playerZ: number,
    distToPlayer: number,
  ): void {
    switch (this.state) {
      case AIState.IDLE: {
        entity.vx = 0;
        entity.vz = 0;
        if (this.justDamaged) {
          this.transitionTo(AIState.PANIC);
          return;
        }
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.WANDER);
        }
        break;
      }
      case AIState.WANDER: {
        entity.vx = this.wanderDirX * this.definition.speed * 0.4;
        entity.vz = this.wanderDirZ * this.definition.speed * 0.4;
        this.tryAutoJump(entity);
        if (this.justDamaged) {
          this.transitionTo(AIState.PANIC);
          return;
        }
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.IDLE);
        }
        break;
      }
      case AIState.FLEE: {
        const dx = entity.x - playerX;
        const dz = entity.z - playerZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          entity.vx = (dx / len) * this.definition.speed * 1.5;
          entity.vz = (dz / len) * this.definition.speed * 1.5;
        }
        this.tryAutoJump(entity);
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.IDLE);
        }
        break;
      }
      case AIState.PANIC: {
        entity.vx = this.wanderDirX * this.definition.speed * 1.8;
        entity.vz = this.wanderDirZ * this.definition.speed * 1.8;
        this.tryAutoJump(entity);
        if (this.stateTimer <= 0) {
          // Switch direction mid-panic
          if (Math.random() < 0.3) {
            this.transitionTo(AIState.IDLE);
          } else {
            this.pickRandomDirection();
            this.stateTimer = 1 + Math.random() * 2;
          }
        }
        break;
      }
      default: {
        this.transitionTo(AIState.IDLE);
      }
    }
  }

  private updateAquatic(
    dt: number,
    entity: AIEntity,
    playerX: number,
    playerY: number,
    playerZ: number,
    distToPlayer: number,
  ): void {
    this.swimBobTimer += dt;

    switch (this.state) {
      case AIState.IDLE: {
        // Gentle bobbing in place
        entity.vx *= 0.92;
        entity.vz *= 0.92;
        entity.vy = Math.sin(this.swimBobTimer * 0.8) * 0.3;
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.WANDER);
        }
        break;
      }
      case AIState.WANDER: {
        const swimSpeed = this.definition.speed * 0.5;
        entity.vx = this.wanderDirX * swimSpeed;
        entity.vz = this.wanderDirZ * swimSpeed;
        // Gentle vertical undulation
        const targetY = this.swimTargetY + Math.sin(this.swimBobTimer * 0.5) * 1.5;
        entity.vy = (targetY - entity.y) * 0.8;
        entity.vy = Math.max(-2, Math.min(2, entity.vy));

        if (this.stateTimer <= 0) {
          this.transitionTo(Math.random() < 0.4 ? AIState.IDLE : AIState.WANDER);
        }
        break;
      }
      case AIState.CHASE: {
        // Hostile aquatic: swim toward player
        if (distToPlayer > this.definition.detectionRange * 1.5) {
          this.transitionTo(AIState.WANDER);
          return;
        }
        if (distToPlayer <= this.definition.attackRange) {
          this.transitionTo(AIState.ATTACK);
          return;
        }
        const dx = playerX - entity.x;
        const dy = playerY - entity.y;
        const dz = playerZ - entity.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0) {
          entity.vx = (dx / len) * this.definition.speed;
          entity.vy = (dy / len) * this.definition.speed * 0.5;
          entity.vz = (dz / len) * this.definition.speed;
        }
        break;
      }
      case AIState.ATTACK: {
        entity.vx *= 0.9;
        entity.vz *= 0.9;
        entity.yaw = Math.atan2(-(playerX - entity.x), -(playerZ - entity.z));
        if (distToPlayer > this.definition.attackRange * 1.5) {
          this.transitionTo(AIState.CHASE);
          return;
        }
        if (this.attackCooldownTimer <= 0) {
          this.canAttackPlayer = true;
          this.attackCooldownTimer = this.definition.attackCooldown;
        }
        break;
      }
      case AIState.FLEE:
      case AIState.PANIC: {
        entity.vx = this.wanderDirX * this.definition.speed * 1.5;
        entity.vz = this.wanderDirZ * this.definition.speed * 1.5;
        entity.vy = this.wanderDirY * this.definition.speed * 0.5;
        if (this.stateTimer <= 0) {
          this.transitionTo(AIState.WANDER);
        }
        break;
      }
      default: {
        this.transitionTo(AIState.WANDER);
      }
    }

    // Detect hostile aquatic chasing player in water
    if (this.definition.hostile && this.state !== AIState.CHASE && this.state !== AIState.ATTACK) {
      if (distToPlayer < this.definition.detectionRange) {
        this.transitionTo(AIState.CHASE);
      }
    }
  }

  private transitionTo(newState: AIState): void {
    this.state = newState;

    switch (newState) {
      case AIState.IDLE:
        this.stateTimer = 2 + Math.random() * 4;
        break;
      case AIState.WANDER:
        this.pickRandomDirection();
        this.stateTimer = 3 + Math.random() * 5;
        break;
      case AIState.CHASE:
        this.stateTimer = 0;
        break;
      case AIState.ATTACK:
        this.stateTimer = 0;
        break;
      case AIState.FLEE:
        this.stateTimer = 3 + Math.random() * 3;
        break;
      case AIState.PANIC:
        this.pickRandomDirection();
        this.stateTimer = 1 + Math.random() * 2;
        break;
    }
  }

  private pickRandomDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirX = Math.cos(angle);
    this.wanderDirZ = Math.sin(angle);
    this.wanderDirY = (Math.random() - 0.5) * 0.5;
  }

  private tryAutoJump(entity: AIEntity): void {
    if (entity.grounded && (Math.abs(entity.vx) > 0.1 || Math.abs(entity.vz) > 0.1)) {
      // Simple check: if velocity was zeroed out by collision, try jumping
      if (entity.grounded) {
        const speed = Math.sqrt(entity.vx * entity.vx + entity.vz * entity.vz);
        if (speed < this.definition.speed * 0.2 && speed > 0) {
          entity.vy = 7;
        }
      }
    }
  }

  setSwimTargetY(y: number): void {
    this.swimTargetY = y;
  }

  onDamaged(): void {
    this.justDamaged = true;
    if (!this.definition.hostile) {
      this.transitionTo(AIState.PANIC);
    }
  }

  private distXZ(x1: number, z1: number, x2: number, z2: number): number {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
