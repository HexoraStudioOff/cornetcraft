import * as THREE from 'three';
import { DroppedItem } from './DroppedItem';
import { World } from './World';
import { Player } from '../player/Player';
import { InventorySystem } from '../ui/InventorySystem';
import { TextureAtlas } from '../textures/TextureAtlas';
import { ItemType, ITEM_DEFINITIONS, blockTypeToItemType } from '../ui/ItemTypes';
import { BlockType, BLOCK_DEFINITIONS } from '../blocks/BlockTypes';

const PICKUP_DISTANCE = 1.8;

export class DroppedItemManager {
  private readonly items: DroppedItem[] = [];
  private readonly scene: THREE.Scene;
  private readonly world: World;
  private readonly atlas: TextureAtlas;

  constructor(scene: THREE.Scene, world: World, atlas: TextureAtlas) {
    this.scene = scene;
    this.world = world;
    this.atlas = atlas;
  }

  /** Spawn a dropped item from a broken block */
  spawnFromBlock(x: number, y: number, z: number, blockType: BlockType): void {
    const blockDef = BLOCK_DEFINITIONS[blockType];
    if (!blockDef) return;

    // Determine what to drop
    let dropType: BlockType | null;
    if (blockDef.drops === null) return; // Drops nothing
    if (blockDef.drops === undefined) dropType = blockType; // Drops itself
    else dropType = blockDef.drops;

    const itemType = blockTypeToItemType(dropType);
    if (itemType === null) return;

    this.spawnItem(x, y, z, itemType, 1);
  }

  /** Spawn a dropped item entity */
  spawnItem(x: number, y: number, z: number, itemType: ItemType, count: number): void {
    const mesh = this.createItemMesh(itemType);
    if (!mesh) return;

    this.scene.add(mesh);
    const item = new DroppedItem(x, y, z, itemType, count, mesh);
    this.items.push(item);
  }

  private createItemMesh(itemType: ItemType): THREE.Mesh | null {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def) return null;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    let material: THREE.MeshBasicMaterial;

    if (def.isBlock && def.textureIndex !== undefined && def.textureIndex >= 0) {
      // Block item: create 6 face materials using atlas textures for proper look
      const texCanvas = this.atlas.getTextureCanvas(def.textureIndex);

      // Create a bigger canvas for better visibility at small scale
      const upscaled = document.createElement('canvas');
      upscaled.width = 64;
      upscaled.height = 64;
      const uctx = upscaled.getContext('2d')!;
      uctx.imageSmoothingEnabled = false;
      uctx.drawImage(texCanvas, 0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(upscaled);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      material = new THREE.MeshBasicMaterial({
        map: texture,
      });
    } else {
      // Non-block item: colored cube
      let color = 0x8B6914;
      if (itemType === ItemType.STONE_PICKAXE || itemType === ItemType.STONE_SWORD) {
        color = 0x888888;
      }
      material = new THREE.MeshBasicMaterial({ color });
    }

    return new THREE.Mesh(geo, material);
  }

  update(dt: number, player: Player, inventory: InventorySystem): void {
    const isSolid = (x: number, y: number, z: number): boolean => {
      return this.world.isSolid(x, y, z);
    };

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const alive = item.update(dt, isSolid);

      if (!alive) {
        this.removeItem(i);
        continue;
      }

      // Pickup check
      if (item.canPickup()) {
        const dist = item.distanceTo(player.x, player.y + 0.8, player.z);
        if (dist < PICKUP_DISTANCE) {
          const leftover = inventory.addItem(item.itemType, item.count);
          if (leftover < item.count) {
            if (leftover <= 0) {
              this.removeItem(i);
            } else {
              item.count = leftover;
            }
          }
        }
      }
    }
  }

  private removeItem(index: number): void {
    const item = this.items[index];
    this.scene.remove(item.mesh);
    item.dispose();
    this.items.splice(index, 1);
  }

  dispose(): void {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      item.dispose();
    }
    this.items.length = 0;
  }
}
