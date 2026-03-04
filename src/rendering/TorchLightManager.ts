import * as THREE from 'three';

const MAX_LIGHTS = 8;
const MAX_FLAME_PARTICLES = 200;
const MAX_SMOKE_PARTICLES = 180;
const TORCH_LIGHT_RADIUS = 14;

// Flame particle shader (additive blending for fire glow)
const flameVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (120.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const flameFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float dist = length(c);
    if (dist > 0.5) discard;
    // Bright core, soft falloff
    float intensity = 1.0 - dist * 2.0;
    intensity = intensity * intensity * intensity;
    gl_FragColor = vec4(vColor * intensity, vAlpha * intensity);
  }
`;

// Smoke particle shader (normal blending for dark smoke)
const smokeVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (250.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 96.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const smokeFragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float dist = length(c);
    if (dist > 0.5) discard;
    // Soft round puff shape
    float edge = 1.0 - smoothstep(0.15, 0.5, dist);
    float alpha = vAlpha * edge;
    // Black smoke
    vec3 smokeColor = vec3(0.02, 0.02, 0.02);
    gl_FragColor = vec4(smokeColor, alpha);
  }
`;

interface SmokeParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  maxAge: number;
  size: number;
  alive: boolean;
}

interface FlameParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  maxAge: number;
  size: number;
  color: [number, number, number];
  alive: boolean;
}

interface TorchPosition {
  x: number;
  y: number;
  z: number;
}

export class TorchLightManager {
  // Placed torch tracking
  private readonly torchMap: Map<string, TorchPosition> = new Map();
  private heldTorch: boolean = false;

  // Light data (pre-allocated for uniforms)
  private readonly lightPositions: THREE.Vector3[] = Array.from(
    { length: MAX_LIGHTS }, () => new THREE.Vector3(),
  );
  private readonly lightColors: THREE.Vector3[] = Array.from(
    { length: MAX_LIGHTS }, () => new THREE.Vector3(),
  );
  private lightCount: number = 0;

  // Flame particle system
  private readonly particles: FlameParticle[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private readonly posAttr: THREE.Float32BufferAttribute;
  private readonly sizeAttr: THREE.Float32BufferAttribute;
  private readonly alphaAttr: THREE.Float32BufferAttribute;
  private readonly colorAttr: THREE.Float32BufferAttribute;

  // Smoke particle system
  private readonly smokeParticles: SmokeParticle[] = [];
  private readonly smokeGeometry: THREE.BufferGeometry;
  private readonly smokePoints: THREE.Points;
  private readonly smokePosAttr: THREE.Float32BufferAttribute;
  private readonly smokeSizeAttr: THREE.Float32BufferAttribute;
  private readonly smokeAlphaAttr: THREE.Float32BufferAttribute;

  // Reusable temp vectors
  private readonly _tmpVec = new THREE.Vector3();
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();

  // Sorted torch list (reused each frame)
  private readonly _sortedTorches: { pos: TorchPosition; dist: number }[] = [];

  constructor(scene: THREE.Scene) {
    // Pre-allocate flame particles
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      this.particles.push({
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 999, maxAge: 1,
        size: 1,
        color: [1, 0.7, 0.3],
        alive: false,
      });
    }

    // GPU buffers
    const pos = new Float32Array(MAX_FLAME_PARTICLES * 3);
    const sizes = new Float32Array(MAX_FLAME_PARTICLES);
    const alphas = new Float32Array(MAX_FLAME_PARTICLES);
    const colors = new Float32Array(MAX_FLAME_PARTICLES * 3);

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.Float32BufferAttribute(pos, 3);
    this.sizeAttr = new THREE.Float32BufferAttribute(sizes, 1);
    this.alphaAttr = new THREE.Float32BufferAttribute(alphas, 1);
    this.colorAttr = new THREE.Float32BufferAttribute(colors, 3);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);

    const mat = new THREE.ShaderMaterial({
      vertexShader: flameVertexShader,
      fragmentShader: flameFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // --- Smoke particle system ---
    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      this.smokeParticles.push({
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 999, maxAge: 1,
        size: 4,
        alive: false,
      });
    }

    const smokePos = new Float32Array(MAX_SMOKE_PARTICLES * 3);
    const smokeSizes = new Float32Array(MAX_SMOKE_PARTICLES);
    const smokeAlphas = new Float32Array(MAX_SMOKE_PARTICLES);

    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokePosAttr = new THREE.Float32BufferAttribute(smokePos, 3);
    this.smokeSizeAttr = new THREE.Float32BufferAttribute(smokeSizes, 1);
    this.smokeAlphaAttr = new THREE.Float32BufferAttribute(smokeAlphas, 1);

    this.smokeGeometry.setAttribute('position', this.smokePosAttr);
    this.smokeGeometry.setAttribute('aSize', this.smokeSizeAttr);
    this.smokeGeometry.setAttribute('aAlpha', this.smokeAlphaAttr);

    const smokeMat = new THREE.ShaderMaterial({
      vertexShader: smokeVertexShader,
      fragmentShader: smokeFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.smokePoints = new THREE.Points(this.smokeGeometry, smokeMat);
    this.smokePoints.frustumCulled = false;
    scene.add(this.smokePoints);
  }

  addTorch(x: number, y: number, z: number): void {
    this.torchMap.set(`${x},${y},${z}`, { x, y, z });
  }

  removeTorch(x: number, y: number, z: number): void {
    this.torchMap.delete(`${x},${y},${z}`);
  }

  setHeldTorch(active: boolean): void {
    this.heldTorch = active;
  }

  update(
    dt: number,
    camera: THREE.Camera,
    time: number,
  ): void {
    const camPos = camera.position;

    // Find nearest torches
    this._sortedTorches.length = 0;
    for (const pos of this.torchMap.values()) {
      const dx = pos.x + 0.5 - camPos.x;
      const dy = pos.y + 0.5 - camPos.y;
      const dz = pos.z + 0.5 - camPos.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < TORCH_LIGHT_RADIUS * TORCH_LIGHT_RADIUS * 4) {
        this._sortedTorches.push({ pos, dist });
      }
    }
    this._sortedTorches.sort((a, b) => a.dist - b.dist);

    // Build light array
    this.lightCount = 0;

    // Held torch light (slot 0)
    if (this.heldTorch) {
      this._forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const heldPos = this._tmpVec.copy(camPos)
        .addScaledVector(this._forward, 0.4)
        .addScaledVector(this._right, 0.4);
      heldPos.y -= 0.2;

      // Flicker
      const flicker = 0.9 + Math.sin(time * 13.7) * 0.06 + Math.sin(time * 23.1) * 0.04;

      this.lightPositions[0].copy(heldPos);
      this.lightColors[0].set(1.0 * flicker, 0.72 * flicker, 0.32 * flicker);
      this.lightCount = 1;

      // Spawn held torch flame particles + smoke
      this.spawnFlameAt(heldPos.x, heldPos.y + 0.3, heldPos.z, 3, dt);
      this.spawnSmokeAt(heldPos.x, heldPos.y + 0.55, heldPos.z, 5, dt);
    }

    // Placed torch lights
    const maxPlaced = MAX_LIGHTS - this.lightCount;
    const count = Math.min(this._sortedTorches.length, maxPlaced);
    for (let i = 0; i < count; i++) {
      const torch = this._sortedTorches[i];
      const idx = this.lightCount;

      // Unique flicker per torch based on position hash
      const hash = torch.pos.x * 73.13 + torch.pos.y * 37.17 + torch.pos.z * 57.31;
      const flicker = 0.88 + Math.sin(time * 11.3 + hash) * 0.07
        + Math.sin(time * 19.7 + hash * 1.3) * 0.05;

      this.lightPositions[idx].set(
        torch.pos.x + 0.5,
        torch.pos.y + 0.7,
        torch.pos.z + 0.5,
      );
      this.lightColors[idx].set(1.0 * flicker, 0.72 * flicker, 0.32 * flicker);
      this.lightCount++;

      // Spawn flame + smoke particles for nearby torches
      if (torch.dist < 30 * 30) {
        this.spawnFlameAt(
          torch.pos.x + 0.5,
          torch.pos.y + 0.65,
          torch.pos.z + 0.5,
          8, dt,
        );
        this.spawnSmokeAt(
          torch.pos.x + 0.5,
          torch.pos.y + 0.9,
          torch.pos.z + 0.5,
          8, dt,
        );
      }
    }

    // Zero out unused light slots
    for (let i = this.lightCount; i < MAX_LIGHTS; i++) {
      this.lightPositions[i].set(0, 0, 0);
      this.lightColors[i].set(0, 0, 0);
    }

    // Update flame particles
    this.updateParticles(dt, time);

    // Update smoke particles
    this.updateSmokeParticles(dt, time);
  }

  private spawnFlameAt(x: number, y: number, z: number, budget: number, dt: number): void {
    let spawned = 0;
    for (let i = 0; i < MAX_FLAME_PARTICLES && spawned < budget; i++) {
      const p = this.particles[i];
      if (p.alive) continue;

      // Stochastic spawn rate (~20-40 per second per torch)
      if (Math.random() > dt * 30) continue;

      const spread = 0.04;
      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y;
      p.z = z + (Math.random() - 0.5) * spread;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = 0.6 + Math.random() * 0.8;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.age = 0;
      p.maxAge = 0.25 + Math.random() * 0.45;
      p.size = 1.5 + Math.random() * 2.5;

      // Random flame color: bright yellow → orange → red
      const colorT = Math.random();
      if (colorT < 0.3) {
        p.color = [1.0, 0.9, 0.4]; // bright yellow
      } else if (colorT < 0.7) {
        p.color = [1.0, 0.6, 0.15]; // orange
      } else {
        p.color = [0.9, 0.35, 0.08]; // red-orange
      }

      p.alive = true;
      spawned++;
    }
  }

  private updateParticles(dt: number, time: number): void {
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.alive) {
        this.posAttr.setXYZ(i, 0, -1000, 0);
        this.sizeAttr.setX(i, 0);
        this.alphaAttr.setX(i, 0);
        continue;
      }

      p.age += dt;
      if (p.age >= p.maxAge) {
        p.alive = false;
        this.posAttr.setXYZ(i, 0, -1000, 0);
        this.sizeAttr.setX(i, 0);
        this.alphaAttr.setX(i, 0);
        continue;
      }

      // Turbulence
      const turb = Math.sin(time * 15 + i * 3.7) * 0.08;
      p.x += (p.vx + turb) * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + Math.cos(time * 12 + i * 2.3) * 0.06) * dt;

      // Particles accelerate upward slightly and shrink
      p.vy += dt * 0.5;

      const lifeT = p.age / p.maxAge;

      // Fade: quick rise then fade
      let alpha = 1.0;
      if (lifeT < 0.15) alpha = lifeT / 0.15;
      else if (lifeT > 0.5) alpha = 1.0 - (lifeT - 0.5) / 0.5;
      alpha *= 0.85;

      // Size shrinks as particle ages
      const size = p.size * (1.0 - lifeT * 0.6);

      this.posAttr.setXYZ(i, p.x, p.y, p.z);
      this.sizeAttr.setX(i, size);
      this.alphaAttr.setX(i, alpha);
      this.colorAttr.setXYZ(i, p.color[0], p.color[1], p.color[2]);
    }

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }

  private spawnSmokeAt(x: number, y: number, z: number, budget: number, dt: number): void {
    let spawned = 0;
    for (let i = 0; i < MAX_SMOKE_PARTICLES && spawned < budget; i++) {
      const p = this.smokeParticles[i];
      if (p.alive) continue;

      // Higher spawn rate (~25-35 per second per torch)
      if (Math.random() > dt * 30) continue;

      const spread = 0.08;
      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y;
      p.z = z + (Math.random() - 0.5) * spread;
      p.vx = (Math.random() - 0.5) * 0.25;
      p.vy = 0.4 + Math.random() * 0.6;
      p.vz = (Math.random() - 0.5) * 0.25;
      p.age = 0;
      p.maxAge = 1.0 + Math.random() * 1.5;
      p.size = 8.0 + Math.random() * 10.0;
      p.alive = true;
      spawned++;
    }
  }

  private updateSmokeParticles(dt: number, time: number): void {
    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      const p = this.smokeParticles[i];
      if (!p.alive) {
        this.smokePosAttr.setXYZ(i, 0, -1000, 0);
        this.smokeSizeAttr.setX(i, 0);
        this.smokeAlphaAttr.setX(i, 0);
        continue;
      }

      p.age += dt;
      if (p.age >= p.maxAge) {
        p.alive = false;
        this.smokePosAttr.setXYZ(i, 0, -1000, 0);
        this.smokeSizeAttr.setX(i, 0);
        this.smokeAlphaAttr.setX(i, 0);
        continue;
      }

      // Drift & turbulence
      const turb = Math.sin(time * 5 + i * 2.1) * 0.12;
      p.x += (p.vx + turb) * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + Math.cos(time * 4 + i * 1.7) * 0.1) * dt;

      // Slow down and expand as it rises
      p.vy *= 1.0 - dt * 0.8;
      p.vx *= 1.0 - dt * 1.5;
      p.vz *= 1.0 - dt * 1.5;

      const lifeT = p.age / p.maxAge;

      // Fade in then out
      let alpha: number;
      if (lifeT < 0.08) {
        alpha = lifeT / 0.08;
      } else if (lifeT > 0.35) {
        alpha = 1.0 - (lifeT - 0.35) / 0.65;
      } else {
        alpha = 1.0;
      }
      alpha *= 0.7;

      // Grow significantly as it ages (big puffy smoke)
      const size = p.size * (1.0 + lifeT * 2.5);

      this.smokePosAttr.setXYZ(i, p.x, p.y, p.z);
      this.smokeSizeAttr.setX(i, size);
      this.smokeAlphaAttr.setX(i, alpha);
    }

    this.smokePosAttr.needsUpdate = true;
    this.smokeSizeAttr.needsUpdate = true;
    this.smokeAlphaAttr.needsUpdate = true;
  }

  updateMaterialUniforms(material: THREE.ShaderMaterial): void {
    material.uniforms.uPointLightCount.value = this.lightCount;
    const uPos = material.uniforms.uPointLights.value as THREE.Vector3[];
    const uCol = material.uniforms.uPointLightColors.value as THREE.Vector3[];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      uPos[i].copy(this.lightPositions[i]);
      uCol[i].copy(this.lightColors[i]);
    }
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.smokeGeometry.dispose();
    (this.smokePoints.material as THREE.Material).dispose();
  }
}
