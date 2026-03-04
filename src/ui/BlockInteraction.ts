import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from '../player/Player';
import { BlockType, BLOCK_DEFINITIONS, PLACEABLE_BLOCKS } from '../blocks/BlockTypes';
import { REACH_DISTANCE } from '../utils/constants';
import { generateBreakingTextures } from '../textures/BreakingTextures';
import { InventorySystem } from './InventorySystem';
import { blockTypeToItemType } from './ItemTypes';

export interface RaycastResult {
  hit: boolean;
  blockX: number;
  blockY: number;
  blockZ: number;
  placeX: number;
  placeY: number;
  placeZ: number;
  normal: THREE.Vector3;
  distance: number;
  blockType: BlockType;
}

export interface BlockBreakEvent {
  x: number;
  y: number;
  z: number;
  blockType: BlockType;
}

export class BlockInteraction {
  private readonly world: World;
  private readonly player: Player;
  private readonly scene: THREE.Scene;
  private readonly inventory: InventorySystem;

  private readonly highlightMesh: THREE.LineSegments;
  private lastResult: RaycastResult | null = null;

  // Breaking system
  private breakProgress: number = 0;
  private breakingBlock: { x: number; y: number; z: number } | null = null;
  private readonly breakOverlayMesh: THREE.Mesh;
  private readonly breakingTextures: THREE.Texture[];
  private readonly breakOverlayMaterial: THREE.MeshBasicMaterial;

  // Callbacks
  onBlockBreak: ((event: BlockBreakEvent) => void) | null = null;
  onBlockPlace: ((x: number, y: number, z: number, blockType: BlockType) => void) | null = null;

  constructor(world: World, player: Player, scene: THREE.Scene, inventory: InventorySystem) {
    this.world = world;
    this.player = player;
    this.scene = scene;
    this.inventory = inventory;

    // Highlight wireframe
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 });
    this.highlightMesh = new THREE.LineSegments(edges, lineMat);
    this.highlightMesh.visible = false;
    scene.add(this.highlightMesh);

    // Breaking overlay
    this.breakingTextures = generateBreakingTextures();
    this.breakOverlayMaterial = new THREE.MeshBasicMaterial({
      map: this.breakingTextures[0],
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const overlayGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    this.breakOverlayMesh = new THREE.Mesh(overlayGeo, this.breakOverlayMaterial);
    this.breakOverlayMesh.visible = false;
    scene.add(this.breakOverlayMesh);
  }

  update(
    leftClickHeld: boolean,
    rightClick: boolean,
    selectedSlot: number,
    dt: number,
  ): void {
    const result = this.raycast();
    this.lastResult = result;

    if (result.hit) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        result.blockX + 0.5,
        result.blockY + 0.5,
        result.blockZ + 0.5,
      );

      // Breaking logic
      if (leftClickHeld) {
        this.handleBreaking(result, selectedSlot, dt);
      } else {
        this.resetBreaking();
      }

      // Placing
      if (rightClick) {
        this.placeBlock(result, selectedSlot);
      }
    } else {
      this.highlightMesh.visible = false;
      this.resetBreaking();
    }
  }

  private handleBreaking(result: RaycastResult, selectedSlot: number, dt: number): void {
    const bx = result.blockX;
    const by = result.blockY;
    const bz = result.blockZ;

    // Check if targeting a different block
    if (
      !this.breakingBlock ||
      this.breakingBlock.x !== bx ||
      this.breakingBlock.y !== by ||
      this.breakingBlock.z !== bz
    ) {
      this.breakingBlock = { x: bx, y: by, z: bz };
      this.breakProgress = 0;
    }

    const blockDef = BLOCK_DEFINITIONS[result.blockType];
    if (!blockDef || blockDef.hardness === Infinity) {
      this.breakOverlayMesh.visible = false;
      return;
    }

    // Instant break for hardness 0
    if (blockDef.hardness === 0) {
      this.breakBlock(result);
      this.resetBreaking();
      return;
    }

    // Calculate break speed (tool effectiveness)
    let breakTime = blockDef.hardness;
    if (this.inventory.isToolEffective(selectedSlot, result.blockType)) {
      breakTime /= this.inventory.getHeldToolSpeed(selectedSlot);
    }

    this.breakProgress += dt / breakTime;

    // Update overlay
    const stage = Math.min(9, Math.floor(this.breakProgress * 10));
    this.breakOverlayMaterial.map = this.breakingTextures[stage];
    this.breakOverlayMaterial.needsUpdate = true;
    this.breakOverlayMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5);
    this.breakOverlayMesh.visible = true;

    // Block broken
    if (this.breakProgress >= 1.0) {
      this.breakBlock(result);
      this.resetBreaking();
    }
  }

  private resetBreaking(): void {
    this.breakProgress = 0;
    this.breakingBlock = null;
    this.breakOverlayMesh.visible = false;
  }

  private breakBlock(result: RaycastResult): void {
    const blockType = result.blockType;
    this.world.setBlock(result.blockX, result.blockY, result.blockZ, BlockType.AIR);

    // Notify drop system
    if (this.onBlockBreak) {
      this.onBlockBreak({
        x: result.blockX,
        y: result.blockY,
        z: result.blockZ,
        blockType,
      });
    }
  }

  private placeBlock(result: RaycastResult, selectedSlot: number): void {
    const stack = this.inventory.hotbar[selectedSlot];
    if (!stack) return;

    const blockType = stack.itemType as number as BlockType;
    const def = BLOCK_DEFINITIONS[blockType];
    if (!def || !PLACEABLE_BLOCKS.includes(blockType)) return;

    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    const pz = Math.floor(this.player.z);

    if (
      result.placeX === px && result.placeZ === pz &&
      (result.placeY === py || result.placeY === py + 1)
    ) {
      return;
    }

    this.world.setBlock(result.placeX, result.placeY, result.placeZ, blockType);

    if (this.onBlockPlace) {
      this.onBlockPlace(result.placeX, result.placeY, result.placeZ, blockType);
    }

    // Consume item
    stack.count--;
    if (stack.count <= 0) {
      this.inventory.hotbar[selectedSlot] = null;
    }
  }

  private raycast(): RaycastResult {
    const origin = this.player.camera.position.clone();
    const direction = this.player.getLookDirection();

    const result: RaycastResult = {
      hit: false,
      blockX: 0, blockY: 0, blockZ: 0,
      placeX: 0, placeY: 0, placeZ: 0,
      normal: new THREE.Vector3(),
      distance: 0,
      blockType: BlockType.AIR,
    };

    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = direction.x >= 0 ? 1 : -1;
    const stepY = direction.y >= 0 ? 1 : -1;
    const stepZ = direction.z >= 0 ? 1 : -1;

    const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
    const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
    const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;

    let tMaxX = direction.x !== 0
      ? ((direction.x > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX)
      : Infinity;
    let tMaxY = direction.y !== 0
      ? ((direction.y > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY)
      : Infinity;
    let tMaxZ = direction.z !== 0
      ? ((direction.z > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ)
      : Infinity;

    let lastX = x, lastY = y, lastZ = z;
    let t = 0;

    for (let i = 0; i < 100; i++) {
      if (t > REACH_DISTANCE) break;

      const block = this.world.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        result.hit = true;
        result.blockX = x;
        result.blockY = y;
        result.blockZ = z;
        result.placeX = lastX;
        result.placeY = lastY;
        result.placeZ = lastZ;
        result.normal.set(lastX - x, lastY - y, lastZ - z);
        result.distance = t;
        result.blockType = block;
        return result;
      }

      lastX = x; lastY = y; lastZ = z;

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          t = tMaxX; x += stepX; tMaxX += tDeltaX;
        } else {
          t = tMaxZ; z += stepZ; tMaxZ += tDeltaZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          t = tMaxY; y += stepY; tMaxY += tDeltaY;
        } else {
          t = tMaxZ; z += stepZ; tMaxZ += tDeltaZ;
        }
      }
    }

    return result;
  }

  getLastResult(): RaycastResult | null {
    return this.lastResult;
  }
}
