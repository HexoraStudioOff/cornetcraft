import { World } from '../world/World';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../utils/constants';

export interface AABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

export interface CollisionResult {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
}

/**
 * Simple AABB vs voxel collision detection.
 * Resolves movement axis by axis to prevent corner glitches.
 */
export class Physics {
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  /** Create an AABB from feet position with custom dimensions */
  getEntityAABB(x: number, y: number, z: number, width: number, height: number): AABB {
    const hw = width / 2;
    return {
      minX: x - hw,
      minY: y,
      minZ: z - hw,
      maxX: x + hw,
      maxY: y + height,
      maxZ: z + hw,
    };
  }

  /** Create player AABB from feet position */
  getPlayerAABB(x: number, y: number, z: number): AABB {
    return this.getEntityAABB(x, y, z, PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  /** Check if an AABB collides with any solid block */
  collidesWithWorld(aabb: AABB): boolean {
    const startX = Math.floor(aabb.minX);
    const endX = Math.floor(aabb.maxX);
    const startY = Math.floor(aabb.minY);
    const endY = Math.floor(aabb.maxY);
    const startZ = Math.floor(aabb.minZ);
    const endZ = Math.floor(aabb.maxZ);

    for (let bx = startX; bx <= endX; bx++) {
      for (let by = startY; by <= endY; by++) {
        for (let bz = startZ; bz <= endZ; bz++) {
          if (this.world.isSolid(bx, by, bz)) {
            if (aabb.maxX > bx && aabb.minX < bx + 1 &&
                aabb.maxY > by && aabb.minY < by + 1 &&
                aabb.maxZ > bz && aabb.minZ < bz + 1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /** Generic entity collision movement with custom dimensions */
  moveEntityWithCollision(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    dt: number,
    width: number,
    height: number,
  ): CollisionResult {
    let newX = x;
    let newY = y;
    let newZ = z;
    let newVx = vx;
    let newVy = vy;
    let newVz = vz;
    let grounded = false;

    // Move Y axis first (gravity)
    newY = y + vy * dt;
    let aabb = this.getEntityAABB(newX, newY, newZ, width, height);
    if (this.collidesWithWorld(aabb)) {
      if (vy < 0) {
        newY = Math.floor(y) + (y === Math.floor(y) ? 0 : 0);
        for (let checkY = Math.floor(newY); checkY >= Math.floor(newY) - 1; checkY--) {
          const testAABB = this.getEntityAABB(newX, checkY, newZ, width, height);
          if (!this.collidesWithWorld(testAABB)) {
            newY = checkY;
            break;
          }
        }
        grounded = true;
      } else {
        newY = Math.ceil(newY) - height - 0.001;
      }
      newVy = 0;
    }

    // Move X axis
    newX = x + vx * dt;
    aabb = this.getEntityAABB(newX, newY, newZ, width, height);
    if (this.collidesWithWorld(aabb)) {
      newX = x;
      newVx = 0;
    }

    // Move Z axis
    newZ = z + vz * dt;
    aabb = this.getEntityAABB(newX, newY, newZ, width, height);
    if (this.collidesWithWorld(aabb)) {
      newZ = z;
      newVz = 0;
    }

    // Final ground check
    const groundCheckAABB = this.getEntityAABB(newX, newY - 0.05, newZ, width, height);
    if (this.collidesWithWorld(groundCheckAABB)) {
      grounded = true;
    }

    return { x: newX, y: newY, z: newZ, vx: newVx, vy: newVy, vz: newVz, grounded };
  }

  /**
   * Move the player with collision detection.
   * Returns the new position after resolving collisions.
   * Also returns whether the player is grounded.
   */
  moveWithCollision(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    dt: number
  ): CollisionResult {
    return this.moveEntityWithCollision(x, y, z, vx, vy, vz, dt, PLAYER_WIDTH, PLAYER_HEIGHT);
  }
}
