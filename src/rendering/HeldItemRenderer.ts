import * as THREE from 'three';
import { TextureAtlas } from '../textures/TextureAtlas';
import { BLOCK_DEFINITIONS, BlockType } from '../blocks/BlockTypes';
import { ITEM_DEFINITIONS, ItemType } from '../ui/ItemTypes';
import { BlockRegistry } from '../blocks/BlockRegistry';

export class HeldItemRenderer {
  private readonly group: THREE.Group;
  private readonly atlas: TextureAtlas;
  private readonly registry: BlockRegistry;

  private currentItem: THREE.Object3D | null = null;
  private currentItemType: number = -1;
  private bobPhase: number = 0;
  private swingPhase: number = 0;
  private isSwinging: boolean = false;

  // Base position in camera space (bottom-right)
  private readonly basePos = new THREE.Vector3(0.56, -0.48, -0.65);
  private readonly baseRot = new THREE.Euler(-0.15, -0.45, 0.1);

  constructor(camera: THREE.Camera, scene: THREE.Scene, atlas: TextureAtlas) {
    this.atlas = atlas;
    this.registry = BlockRegistry.getInstance();

    this.group = new THREE.Group();
    this.group.position.copy(this.basePos);
    this.group.rotation.copy(this.baseRot);

    camera.add(this.group);
    // Camera must be in scene for children to render
    if (!camera.parent) {
      scene.add(camera);
    }
  }

  update(itemType: number, dt: number, isWalking: boolean): void {
    if (itemType !== this.currentItemType) {
      this.setItem(itemType);
      this.currentItemType = itemType;
    }

    if (!this.currentItem) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Walking bob
    const bobSpeed = isWalking ? 7.5 : 1.2;
    const bobAmount = isWalking ? 0.025 : 0.006;
    this.bobPhase += dt * bobSpeed;
    const bobY = Math.sin(this.bobPhase) * bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * bobAmount * 0.5;

    this.group.position.set(
      this.basePos.x + bobX,
      this.basePos.y + bobY,
      this.basePos.z,
    );

    // Swing animation
    if (this.isSwinging) {
      this.swingPhase += dt * 12;
      if (this.swingPhase > Math.PI) {
        this.isSwinging = false;
        this.swingPhase = 0;
      }
      const swing = Math.sin(this.swingPhase) * 0.6;
      this.group.rotation.set(
        this.baseRot.x - swing,
        this.baseRot.y,
        this.baseRot.z + swing * 0.3,
      );
    } else {
      this.group.rotation.copy(this.baseRot);
    }
  }

  triggerSwing(): void {
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingPhase = 0;
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private setItem(itemType: number): void {
    // Remove old item
    if (this.currentItem) {
      this.group.remove(this.currentItem);
      this.disposeObject(this.currentItem);
      this.currentItem = null;
    }

    if (itemType < 0) return;

    const itemDef = ITEM_DEFINITIONS[itemType];
    if (!itemDef) return;

    if (itemDef.isBlock && itemDef.blockType !== undefined) {
      if (itemDef.blockType === BlockType.TORCH) {
        this.currentItem = this.createTorchMesh();
      } else {
        this.currentItem = this.createBlockMesh(itemDef.blockType);
      }
    } else {
      this.currentItem = this.createToolMesh(itemType as ItemType);
    }

    if (this.currentItem) {
      this.group.add(this.currentItem);
    }
  }

  private createBlockMesh(blockType: BlockType): THREE.Mesh {
    const def = BLOCK_DEFINITIONS[blockType];
    if (!def) return this.createFallbackMesh();

    const topIdx = def.textures.length === 1 ? def.textures[0] : def.textures[0];
    const botIdx = def.textures.length === 1 ? def.textures[0] : def.textures[1];
    const sideIdx = def.textures.length === 1 ? def.textures[0] : def.textures[2];

    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const faceTexIdx = [sideIdx, sideIdx, topIdx, botIdx, sideIdx, sideIdx];

    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const uvAttr = geo.getAttribute('uv') as THREE.Float32BufferAttribute;

    for (let face = 0; face < 6; face++) {
      const [u0, , u1] = this.atlas.getUVs(faceTexIdx[face]);
      const base = face * 4;
      // BoxGeometry default UVs per face: (0,1) (1,1) (0,0) (1,0)
      for (let v = 0; v < 4; v++) {
        const ou = uvAttr.getX(base + v); // 0 or 1
        const ov = uvAttr.getY(base + v); // 0 or 1
        uvAttr.setXY(base + v, u0 + ou * (u1 - u0), ov);
      }
    }
    uvAttr.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      map: this.atlas.texture,
      transparent: true,
      alphaTest: 0.1,
    });

    return new THREE.Mesh(geo, mat);
  }

  private createTorchMesh(): THREE.Group {
    const torchGroup = new THREE.Group();

    // --- Wooden stick (bottom part) ---
    const stickW = 0.05;
    const stickH = 0.36;
    const stickGeo = new THREE.BoxGeometry(stickW, stickH, stickW);
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x8B5E2B });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = stickH * 0.5;
    torchGroup.add(stick);

    // Darker wood grain strip on one side
    const grainGeo = new THREE.BoxGeometry(stickW + 0.002, stickH, stickW * 0.3);
    const grainMat = new THREE.MeshBasicMaterial({ color: 0x6B4423 });
    const grain = new THREE.Mesh(grainGeo, grainMat);
    grain.position.y = stickH * 0.5;
    grain.position.z = stickW * 0.36;
    torchGroup.add(grain);

    // --- Flame core (bright inner part) ---
    const flameInnerW = 0.045;
    const flameInnerH = 0.08;
    const flameInnerGeo = new THREE.BoxGeometry(flameInnerW, flameInnerH, flameInnerW);
    const flameInnerMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 });
    const flameInner = new THREE.Mesh(flameInnerGeo, flameInnerMat);
    flameInner.position.y = stickH + flameInnerH * 0.5;
    torchGroup.add(flameInner);

    // --- Flame outer glow (slightly bigger, more orange) ---
    const flameOuterW = 0.065;
    const flameOuterH = 0.11;
    const flameOuterGeo = new THREE.BoxGeometry(flameOuterW, flameOuterH, flameOuterW);
    const flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xFF8800,
      transparent: true,
      opacity: 0.6,
    });
    const flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMat);
    flameOuter.position.y = stickH + flameOuterH * 0.45;
    torchGroup.add(flameOuter);

    // --- Flame tip (small, bright yellow-white) ---
    const flameTipW = 0.025;
    const flameTipH = 0.04;
    const flameTipGeo = new THREE.BoxGeometry(flameTipW, flameTipH, flameTipW);
    const flameTipMat = new THREE.MeshBasicMaterial({ color: 0xFFFFA0 });
    const flameTip = new THREE.Mesh(flameTipGeo, flameTipMat);
    flameTip.position.y = stickH + flameOuterH + flameTipH * 0.3;
    torchGroup.add(flameTip);

    // Position the whole torch centered lower for hand grip
    torchGroup.position.set(0, -0.12, 0);
    torchGroup.scale.setScalar(1.4);

    return torchGroup;
  }

  private createToolMesh(type: ItemType): THREE.Mesh {
    // Flat quad with procedural icon texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    this.drawToolIcon(ctx, type);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;

    const geo = new THREE.PlaneGeometry(0.32, 0.32);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geo, mat);
  }

  private drawToolIcon(ctx: CanvasRenderingContext2D, type: ItemType): void {
    switch (type) {
      case ItemType.STICK:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 2, 2, 12);
        ctx.fillStyle = '#A07828';
        ctx.fillRect(7, 2, 1, 12);
        break;
      case ItemType.WOODEN_PICKAXE:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillStyle = '#B4924A';
        ctx.fillRect(3, 2, 10, 3);
        break;
      case ItemType.STONE_PICKAXE:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillStyle = '#888';
        ctx.fillRect(3, 2, 10, 3);
        break;
      case ItemType.WOODEN_SWORD:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 10, 2, 5);
        ctx.fillStyle = '#B4924A';
        ctx.fillRect(6, 3, 4, 8);
        ctx.fillStyle = '#5C4420';
        ctx.fillRect(5, 9, 6, 2);
        break;
      case ItemType.STONE_SWORD:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 10, 2, 5);
        ctx.fillStyle = '#888';
        ctx.fillRect(6, 3, 4, 8);
        ctx.fillStyle = '#5C4420';
        ctx.fillRect(5, 9, 6, 2);
        break;
    }
  }

  private createFallbackMesh(): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    return new THREE.Mesh(geo, mat);
  }

  dispose(): void {
    if (this.currentItem) {
      this.disposeObject(this.currentItem);
    }
  }
}
