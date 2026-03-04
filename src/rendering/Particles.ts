import * as THREE from 'three';

const PARTICLE_COUNT = 150;
const SPREAD = 40; // spawn area around player
const MIN_Y_OFFSET = 5;
const MAX_Y_OFFSET = 25;
const FALL_SPEED = 1.2;
const LIFETIME = 12; // seconds

const particleVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Soft circle shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Leaf-like shape: wider than tall
    float leafShape = smoothstep(0.5, 0.2, dist);

    gl_FragColor = vec4(vColor, vAlpha * leafShape);
  }
`;

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  maxAge: number;
  size: number;
  color: [number, number, number];
  phase: number;
}

export class ParticleSystem {
  private readonly particles: Particle[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;

  private readonly positionAttr: THREE.Float32BufferAttribute;
  private readonly sizeAttr: THREE.Float32BufferAttribute;
  private readonly alphaAttr: THREE.Float32BufferAttribute;
  private readonly colorAttr: THREE.Float32BufferAttribute;

  constructor(scene: THREE.Scene) {
    // Pre-allocate buffers
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.Float32BufferAttribute(positions, 3);
    this.sizeAttr = new THREE.Float32BufferAttribute(sizes, 1);
    this.alphaAttr = new THREE.Float32BufferAttribute(alphas, 1);
    this.colorAttr = new THREE.Float32BufferAttribute(colors, 3);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Initialize particle pool
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(this.createDeadParticle());
    }
  }

  private createDeadParticle(): Particle {
    return { x: 0, y: -1000, z: 0, vx: 0, vy: 0, vz: 0, age: 999, maxAge: 1, size: 1, color: [0, 0, 0], phase: 0 };
  }

  private spawnParticle(px: number, py: number, pz: number): Particle {
    const leafColors: [number, number, number][] = [
      [0.25, 0.55, 0.15], // green
      [0.4, 0.6, 0.1],    // yellow-green
      [0.6, 0.5, 0.1],    // golden
      [0.5, 0.3, 0.05],   // brown-orange
      [0.3, 0.5, 0.12],   // dark green
    ];
    const color = leafColors[Math.floor(Math.random() * leafColors.length)];

    return {
      x: px + (Math.random() - 0.5) * SPREAD,
      y: py + MIN_Y_OFFSET + Math.random() * MAX_Y_OFFSET,
      z: pz + (Math.random() - 0.5) * SPREAD,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -FALL_SPEED * (0.5 + Math.random() * 0.5),
      vz: (Math.random() - 0.5) * 0.5,
      age: 0,
      maxAge: LIFETIME * (0.5 + Math.random() * 0.5),
      size: 2 + Math.random() * 3,
      color,
      phase: Math.random() * Math.PI * 2,
    };
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, windStrength: number): void {
    const time = performance.now() / 1000;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.maxAge) {
        // Respawn with ~30% probability per frame
        if (Math.random() < 0.03) {
          this.particles[i] = this.spawnParticle(playerX, playerY, playerZ);
        }
        continue;
      }

      // Wind oscillation
      const windX = Math.sin(time * 1.5 + p.phase) * 0.8 * windStrength;
      const windZ = Math.cos(time * 1.1 + p.phase * 0.7) * 0.6 * windStrength;

      p.x += (p.vx + windX) * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + windZ) * dt;

      // Gentle spiraling
      p.x += Math.sin(time * 2.0 + p.phase) * 0.15 * dt;
      p.z += Math.cos(time * 1.7 + p.phase) * 0.15 * dt;
    }

    // Update GPU buffers
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      const alive = p.age < p.maxAge;

      this.positionAttr.setXYZ(i, p.x, p.y, p.z);
      this.sizeAttr.setX(i, alive ? p.size : 0);

      // Fade in and out
      let alpha = 0;
      if (alive) {
        const lifeT = p.age / p.maxAge;
        alpha = lifeT < 0.1 ? lifeT / 0.1 : lifeT > 0.8 ? (1 - lifeT) / 0.2 : 1;
        alpha *= 0.6;
      }
      this.alphaAttr.setX(i, alpha);
      this.colorAttr.setXYZ(i, p.color[0], p.color[1], p.color[2]);
    }

    this.positionAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}
