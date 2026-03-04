import * as THREE from 'three';
import { TextureAtlas } from '../textures/TextureAtlas';
import {
  SHADOW_MAP_SIZE,
  SHADOW_CASCADE_SPLITS,
  SHADOW_LAYER,
} from '../utils/constants';

const depthVertexShader = /* glsl */ `
  attribute float aAnimType;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const depthFragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  void main() {
    float alpha = texture2D(uAtlas, vUv).a;
    if (alpha < 0.3) discard;
  }
`;

const _biasMatrix = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

export class ShadowSystem {
  readonly shadowMaps: THREE.Texture[] = [];
  readonly shadowMatrices: THREE.Matrix4[] = [];
  enabled: boolean = true;

  private readonly cascadeCameras: THREE.OrthographicCamera[] = [];
  private readonly shadowTargets: THREE.WebGLRenderTarget[] = [];
  private readonly depthMaterial: THREE.ShaderMaterial;

  // Pre-allocated vectors to avoid GC pressure
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();
  private readonly _nearCenter = new THREE.Vector3();
  private readonly _farCenter = new THREE.Vector3();
  private readonly _center = new THREE.Vector3();
  private readonly _corners: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());
  private readonly _tmpMatrix = new THREE.Matrix4();
  private readonly _tmpVec4 = new THREE.Vector4();

  constructor(atlas: TextureAtlas) {
    this.depthMaterial = new THREE.ShaderMaterial({
      vertexShader: depthVertexShader,
      fragmentShader: depthFragmentShader,
      uniforms: { uAtlas: { value: atlas.texture } },
      side: THREE.DoubleSide,
    });
    this.depthMaterial.colorWrite = false;

    for (let i = 0; i < 3; i++) {
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
      cam.layers.set(SHADOW_LAYER);
      this.cascadeCameras.push(cam);

      const rt = new THREE.WebGLRenderTarget(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      });
      rt.depthTexture = new THREE.DepthTexture(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
      this.shadowTargets.push(rt);
      this.shadowMaps.push(rt.depthTexture);
      this.shadowMatrices.push(new THREE.Matrix4());
    }
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    sunDirection: THREE.Vector3,
    dayFactor: number,
  ): void {
    if (dayFactor < 0.05 || !this.enabled) return;

    const savedOverride = scene.overrideMaterial;
    scene.overrideMaterial = this.depthMaterial;

    const near = [camera.near, SHADOW_CASCADE_SPLITS[0], SHADOW_CASCADE_SPLITS[1]];
    const far = [SHADOW_CASCADE_SPLITS[0], SHADOW_CASCADE_SPLITS[1], SHADOW_CASCADE_SPLITS[2]];

    for (let i = 0; i < 3; i++) {
      this.renderCascade(renderer, scene, camera, sunDirection, near[i], far[i], i);
    }

    scene.overrideMaterial = savedOverride;
  }

  private renderCascade(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    sunDir: THREE.Vector3,
    nearDist: number,
    farDist: number,
    idx: number,
  ): void {
    const aspect = camera.aspect;
    const fov = camera.fov * Math.PI / 180;
    const nearH = Math.tan(fov / 2) * nearDist;
    const nearW = nearH * aspect;
    const farH = Math.tan(fov / 2) * farDist;
    const farW = farH * aspect;

    this._forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    this._nearCenter.copy(camera.position).addScaledVector(this._forward, nearDist);
    this._farCenter.copy(camera.position).addScaledVector(this._forward, farDist);

    const nc = this._nearCenter;
    const fc = this._farCenter;
    const r = this._right;
    const u = this._up;
    const c = this._corners;

    c[0].copy(nc).addScaledVector(u, nearH).addScaledVector(r, -nearW);
    c[1].copy(nc).addScaledVector(u, nearH).addScaledVector(r, nearW);
    c[2].copy(nc).addScaledVector(u, -nearH).addScaledVector(r, -nearW);
    c[3].copy(nc).addScaledVector(u, -nearH).addScaledVector(r, nearW);
    c[4].copy(fc).addScaledVector(u, farH).addScaledVector(r, -farW);
    c[5].copy(fc).addScaledVector(u, farH).addScaledVector(r, farW);
    c[6].copy(fc).addScaledVector(u, -farH).addScaledVector(r, -farW);
    c[7].copy(fc).addScaledVector(u, -farH).addScaledVector(r, farW);

    this._center.set(0, 0, 0);
    for (let i = 0; i < 8; i++) this._center.add(c[i]);
    this._center.divideScalar(8);

    let radius = 0;
    for (let i = 0; i < 8; i++) {
      radius = Math.max(radius, this._center.distanceTo(c[i]));
    }
    radius = Math.ceil(radius * 4) / 4;

    const shadowCam = this.cascadeCameras[idx];
    shadowCam.position.copy(this._center).addScaledVector(sunDir, radius + 50);
    shadowCam.lookAt(this._center);
    shadowCam.left = -radius;
    shadowCam.right = radius;
    shadowCam.top = radius;
    shadowCam.bottom = -radius;
    shadowCam.near = 0.5;
    shadowCam.far = radius * 2 + 100;
    shadowCam.updateProjectionMatrix();
    shadowCam.updateMatrixWorld(true);

    // Texel snapping to prevent shadow shimmer
    this._tmpMatrix.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);
    this._tmpVec4.set(0, 0, 0, 1).applyMatrix4(this._tmpMatrix);
    const half = SHADOW_MAP_SIZE / 2;
    const ox = Math.round(this._tmpVec4.x * half) / half - this._tmpVec4.x;
    const oy = Math.round(this._tmpVec4.y * half) / half - this._tmpVec4.y;
    shadowCam.projectionMatrix.elements[12] += ox;
    shadowCam.projectionMatrix.elements[13] += oy;

    // Render depth
    const savedTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.shadowTargets[idx]);
    renderer.clear();
    renderer.render(scene, shadowCam);
    renderer.setRenderTarget(savedTarget);

    // Shadow matrix: world -> [0,1] UV space
    this.shadowMatrices[idx]
      .copy(_biasMatrix)
      .multiply(shadowCam.projectionMatrix)
      .multiply(shadowCam.matrixWorldInverse);
  }

  dispose(): void {
    for (const rt of this.shadowTargets) {
      rt.dispose();
      if (rt.depthTexture) rt.depthTexture.dispose();
    }
    this.depthMaterial.dispose();
  }
}
