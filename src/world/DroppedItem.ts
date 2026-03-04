import * as THREE from 'three';
import { ItemType } from '../ui/ItemTypes';

export class DroppedItem {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly itemType: ItemType;
  count: number;
  readonly mesh: THREE.Mesh;
  lifetime: number = 300;
  pickupDelay: number = 0.5;
  private bobPhase: number;
  private readonly rotationSpeed: number;

  constructor(
    x: number, y: number, z: number,
    itemType: ItemType, count: number,
    mesh: THREE.Mesh,
  ) {
    this.position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      3 + Math.random() * 2,
      (Math.random() - 0.5) * 2,
    );
    this.itemType = itemType;
    this.count = count;
    this.mesh = mesh;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.rotationSpeed = 1.5 + Math.random() * 1.0;

    mesh.position.copy(this.position);
    mesh.scale.setScalar(0.25);
  }

  update(dt: number, getBlock: (x: number, y: number, z: number) => boolean): boolean {
    this.lifetime -= dt;
    if (this.lifetime <= 0) return false;

    this.pickupDelay -= dt;

    // Gravity
    this.velocity.y -= 15 * dt;
    if (this.velocity.y < -20) this.velocity.y = -20;

    // Move X
    this.position.x += this.velocity.x * dt;
    if (getBlock(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z))) {
      this.position.x -= this.velocity.x * dt;
      this.velocity.x *= -0.3;
    }

    // Move Y
    this.position.y += this.velocity.y * dt;
    const blockBelow = getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y - 0.15),
      Math.floor(this.position.z),
    );
    if (blockBelow && this.velocity.y < 0) {
      this.position.y = Math.floor(this.position.y - 0.15) + 1.15;
      this.velocity.y *= -0.2;
      if (Math.abs(this.velocity.y) < 0.5) this.velocity.y = 0;
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // Move Z
    this.position.z += this.velocity.z * dt;
    if (getBlock(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z))) {
      this.position.z -= this.velocity.z * dt;
      this.velocity.z *= -0.3;
    }

    // Bob animation
    this.bobPhase += dt * 2.5;
    const bobOffset = Math.sin(this.bobPhase) * 0.08;

    // Update mesh
    this.mesh.position.set(
      this.position.x,
      this.position.y + bobOffset,
      this.position.z,
    );
    this.mesh.rotation.y += this.rotationSpeed * dt;

    // Fade out near end of lifetime
    if (this.lifetime < 10) {
      const mat = this.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = this.lifetime / 10;
    }

    return true;
  }

  canPickup(): boolean {
    return this.pickupDelay <= 0;
  }

  distanceTo(px: number, py: number, pz: number): number {
    const dx = this.position.x - px;
    const dy = this.position.y - py;
    const dz = this.position.z - pz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
