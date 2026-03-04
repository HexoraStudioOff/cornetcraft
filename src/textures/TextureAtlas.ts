import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';
import { TEXTURE_SIZE } from '../utils/constants';

export class TextureAtlas {
  readonly texture: THREE.CanvasTexture;
  readonly textureCount: number;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  private readonly cols: number;

  constructor() {
    const generator = new TextureGenerator(TEXTURE_SIZE);
    const textures = generator.generateAll();
    this.textureCount = textures.length;

    // Layout: single row for simplicity
    this.cols = textures.length;
    this.atlasWidth = this.cols * TEXTURE_SIZE;
    this.atlasHeight = TEXTURE_SIZE;

    const canvas = document.createElement('canvas');
    canvas.width = this.atlasWidth;
    canvas.height = this.atlasHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw each texture into atlas
    for (let i = 0; i < textures.length; i++) {
      ctx.putImageData(textures[i], i * TEXTURE_SIZE, 0);
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;
  }

  /** Get UV coordinates [u0, v0, u1, v1] for a texture index */
  getUVs(textureIndex: number): [number, number, number, number] {
    const u0 = (textureIndex * TEXTURE_SIZE) / this.atlasWidth;
    const u1 = ((textureIndex + 1) * TEXTURE_SIZE) / this.atlasWidth;
    const v0 = 0;
    const v1 = 1;
    return [u0, v0, u1, v1];
  }

  /** Get individual texture as canvas for HUD display */
  getTextureCanvas(textureIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d')!;

    // Extract from atlas source
    const srcCanvas = (this.texture.image as HTMLCanvasElement);
    ctx.drawImage(
      srcCanvas,
      textureIndex * TEXTURE_SIZE, 0, TEXTURE_SIZE, TEXTURE_SIZE,
      0, 0, TEXTURE_SIZE, TEXTURE_SIZE
    );
    return canvas;
  }
}
