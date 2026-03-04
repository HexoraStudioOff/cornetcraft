import * as THREE from 'three';

const MAX_PARTICLES = 200;
const PARTICLE_LIFETIME = 1.2;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;

  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float circle = smoothstep(0.5, 0.15, dist);
    // Blue-white water color
    vec3 color = mix(vec3(0.6, 0.8, 1.0), vec3(0.9, 0.95, 1.0), circle);
    gl_FragColor = vec4(color, vAlpha * circle * 0.7);
  }
`;

interface WaterParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  size: number;
}

export class WaterParticleSystem {
  private readonly particles: WaterParticle[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private readonly posAttr: THREE.Float32BufferAttribute;
  private readonly sizeAttr: THREE.Float32BufferAttribute;
  private readonly alphaAttr: THREE.Float32BufferAttribute;

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const alphas = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.Float32BufferAttribute(positions, 3);
    this.sizeAttr = new THREE.Float32BufferAttribute(sizes, 1);
    this.alphaAttr = new THREE.Float32BufferAttribute(alphas, 1);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Emit a burst of water particles at position */
  emitBurst(x: number, y: number, z: number, count: number, intensity: number = 1.0): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 2.0) * intensity;
      const upSpeed = (1.0 + Math.random() * 3.0) * intensity;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + Math.random() * 0.2,
        z: z + (Math.random() - 0.5) * 0.3,
        vx: Math.cos(angle) * speed,
        vy: upSpeed,
        vz: Math.sin(angle) * speed,
        age: 0,
        size: (1.5 + Math.random() * 2.5) * intensity,
      });
    }
  }

  /** Emit continuous trail particles */
  emitTrail(x: number, y: number, z: number, vx: number, vz: number): void {
    if (this.particles.length >= MAX_PARTICLES - 2) return;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.2,
      y: y + Math.random() * 0.1,
      z: z + (Math.random() - 0.5) * 0.2,
      vx: -vx * 0.1 + (Math.random() - 0.5) * 0.3,
      vy: 0.5 + Math.random() * 1.0,
      vz: -vz * 0.1 + (Math.random() - 0.5) * 0.3,
      age: 0,
      size: 1.0 + Math.random() * 1.5,
    });
  }

  update(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= PARTICLE_LIFETIME) {
        this.particles.splice(i, 1);
        continue;
      }

      // Gravity
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Air resistance
      p.vx *= 0.98;
      p.vz *= 0.98;
    }

    // Write to GPU
    const posArr = this.posAttr.array as Float32Array;
    const sizeArr = this.sizeAttr.array as Float32Array;
    const alphaArr = this.alphaAttr.array as Float32Array;

    const count = Math.min(this.particles.length, MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;
      posArr[i3] = p.x;
      posArr[i3 + 1] = p.y;
      posArr[i3 + 2] = p.z;

      sizeArr[i] = p.size;

      const life = 1 - (p.age / PARTICLE_LIFETIME);
      alphaArr[i] = life * life;
    }

    // Zero out unused slots
    for (let i = count; i < MAX_PARTICLES; i++) {
      sizeArr[i] = 0;
      alphaArr[i] = 0;
    }

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }
}
