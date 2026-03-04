import * as THREE from 'three';
import { DAY_CYCLE_DURATION } from '../utils/constants';
import { lerp, smoothstep } from '../utils/math';

// --- Sky Dome Shader ---
const skyVertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    gl_Position.z = gl_Position.w; // always at far plane
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uDayFactor;
  uniform float uTime;
  uniform vec3 uDayZenith;
  uniform vec3 uDayHorizon;
  uniform vec3 uSunsetColor;
  uniform vec3 uNightZenith;
  uniform vec3 uNightHorizon;

  varying vec3 vWorldDir;

  // Hash for stars
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = dir.y;
    float horizonFactor = smoothstep(-0.05, 0.3, y);

    // Day sky gradient
    vec3 dayColor = mix(uDayHorizon, uDayZenith, horizonFactor);

    // Sunset/sunrise color near horizon
    float sunDot = dot(dir, uSunDir);
    float sunsetGlow = smoothstep(0.0, 0.15, y) * smoothstep(0.3, 0.0, y);
    sunsetGlow *= smoothstep(0.5, 1.0, sunDot) * (1.0 - uDayFactor * 0.3);
    dayColor = mix(dayColor, uSunsetColor, sunsetGlow * 0.6);

    // Sun disc
    float sunAngle = acos(clamp(sunDot, -1.0, 1.0));
    float sunDisc = smoothstep(0.03, 0.015, sunAngle);
    float sunGlow = smoothstep(0.3, 0.0, sunAngle) * 0.3;
    dayColor += (sunDisc * 3.0 + sunGlow) * vec3(1.0, 0.95, 0.8);

    // Night sky
    vec3 nightColor = mix(uNightHorizon, uNightZenith, horizonFactor);

    // Stars (only at night)
    float nightFactor = 1.0 - uDayFactor;
    if (nightFactor > 0.01 && y > 0.0) {
      vec2 starUv = dir.xz / (y + 0.001) * 5.0;
      vec2 starId = floor(starUv);
      float starBright = hash(starId);
      if (starBright > 0.92) {
        vec2 starPos = fract(starUv) - 0.5;
        float starDist = length(starPos);
        float starSize = (starBright - 0.92) * 12.0;
        float star = smoothstep(0.08 * starSize, 0.0, starDist);
        float twinkle = sin(uTime * 3.0 + starBright * 100.0) * 0.3 + 0.7;
        nightColor += star * twinkle * nightFactor * vec3(0.9, 0.9, 1.0);
      }
    }

    // Moon (opposite sun)
    vec3 moonDir = -uSunDir;
    moonDir.y = abs(moonDir.y);
    float moonDot = dot(dir, normalize(moonDir));
    float moonAngle = acos(clamp(moonDot, -1.0, 1.0));
    float moonDisc = smoothstep(0.04, 0.025, moonAngle) * nightFactor;
    float moonGlow = smoothstep(0.2, 0.0, moonAngle) * 0.15 * nightFactor;
    nightColor += (moonDisc * 1.5 + moonGlow) * vec3(0.8, 0.85, 1.0);

    // Shooting stars
    float shootTime = mod(uTime * 0.15, 1.0);
    if (nightFactor > 0.3 && shootTime < 0.08) {
      float st = shootTime / 0.08;
      vec3 shootDir = normalize(vec3(
        sin(floor(uTime * 0.15) * 7.13) * 0.5,
        0.3 + sin(floor(uTime * 0.15) * 3.77) * 0.2,
        cos(floor(uTime * 0.15) * 5.91) * 0.5
      ));
      vec3 shootPos = shootDir + normalize(vec3(0.3, -0.5, 0.2)) * st * 0.4;
      float shootDot = dot(dir, normalize(shootPos));
      float trail = smoothstep(0.997, 1.0, shootDot);
      nightColor += trail * (1.0 - st) * nightFactor * vec3(1.0, 1.0, 0.9) * 3.0;
    }

    // Blend day/night
    vec3 skyColor = mix(nightColor, dayColor, uDayFactor);

    // Below horizon: darker
    if (y < 0.0) {
      skyColor *= smoothstep(-0.3, 0.0, y);
    }

    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

// --- Cloud Shader ---
const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = (modelMatrix * vec4(position, 1.0)).xz * 0.002;
    vec4 mvPos = viewMatrix * modelMatrix * vec4(position, 1.0);
    vDepth = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const cloudFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uDayFactor;
  uniform vec3 uSunColor;
  varying vec2 vUv;
  varying float vDepth;

  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i); float b = hash2(i + vec2(1,0));
    float c = hash2(i + vec2(0,1)); float d = hash2(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise2(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv + vec2(uTime * 0.003, uTime * 0.001);
    float density = fbm(uv * 8.0);
    density = smoothstep(0.4, 0.7, density);

    vec3 cloudColor = mix(vec3(0.8, 0.85, 0.95), uSunColor, 0.2) * (0.5 + uDayFactor * 0.5);
    float alpha = density * 0.45 * smoothstep(500.0, 100.0, vDepth);

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

// --- Rainbow Shader (proper spectral arc) ---
const rainbowVertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec2 vUv;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const rainbowFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vPos;
  varying vec2 vUv;

  vec3 rainbow(float t) {
    // Smooth 7-color spectrum
    vec3 c;
    if (t < 0.143)      c = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.5, 0.0), t / 0.143);
    else if (t < 0.286) c = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.143) / 0.143);
    else if (t < 0.429) c = mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 0.9, 0.0), (t - 0.286) / 0.143);
    else if (t < 0.571) c = mix(vec3(0.0, 0.9, 0.0), vec3(0.0, 0.7, 1.0), (t - 0.429) / 0.143);
    else if (t < 0.714) c = mix(vec3(0.0, 0.7, 1.0), vec3(0.2, 0.2, 1.0), (t - 0.571) / 0.143);
    else if (t < 0.857) c = mix(vec3(0.2, 0.2, 1.0), vec3(0.56, 0.0, 1.0), (t - 0.714) / 0.143);
    else                c = mix(vec3(0.56, 0.0, 1.0), vec3(0.8, 0.0, 0.8), (t - 0.857) / 0.143);
    return c;
  }

  void main() {
    // vUv.x goes along the arc, vUv.y goes across the band width
    float band = vUv.y;
    vec3 col = rainbow(band);
    // Soft edges
    float edgeFade = smoothstep(0.0, 0.08, band) * smoothstep(1.0, 0.92, band);
    // Fade near ends of the arc
    float arcFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    float alpha = uOpacity * edgeFade * arcFade * 0.55;
    gl_FragColor = vec4(col, alpha);
  }
`;

// --- Bird helpers ---
interface BirdFlock {
  mesh: THREE.InstancedMesh;
  centerX: number;
  centerZ: number;
  radius: number;
  speed: number;
  altitude: number;
  phase: number;
  count: number;
  wingPhases: Float32Array;
}

function createBirdGeometry(): THREE.BufferGeometry {
  // Simple V-shaped bird: two triangles forming wings
  const verts = new Float32Array([
    // Left wing
    -1.2,  0.0,  0.0,
    -0.1,  0.0, -0.3,
     0.0,  0.0,  0.1,
    // Right wing
     0.0,  0.0,  0.1,
     0.1,  0.0, -0.3,
     1.2,  0.0,  0.0,
    // Body
    -0.1,  0.0, -0.3,
     0.1,  0.0, -0.3,
     0.0,  0.0,  0.5,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

export class Sky {
  readonly sunDirection: THREE.Vector3 = new THREE.Vector3();
  readonly sunColor: THREE.Vector3 = new THREE.Vector3();
  readonly ambientColor: THREE.Vector3 = new THREE.Vector3();
  readonly fogColor: THREE.Vector3 = new THREE.Vector3();
  readonly skyColorTop: THREE.Vector3 = new THREE.Vector3();

  private timeOfDay: number = 0.35;
  private dayFactor: number = 1;

  private readonly skyDomeMaterial: THREE.ShaderMaterial;
  private readonly skyDomeMesh: THREE.Mesh;
  private readonly cloudMaterial: THREE.ShaderMaterial;
  private readonly cloudMesh: THREE.Mesh;

  // Rainbow
  private readonly rainbowMesh: THREE.Mesh;
  private rainbowOpacity: number = 0;
  private rainbowTimer: number = 0;
  private showRainbow: boolean = true;

  // Birds
  private readonly birdFlocks: BirdFlock[] = [];
  private readonly scene: THREE.Scene;
  private birdTime: number = 0;

  // Reusable objects
  private readonly _mat4 = new THREE.Matrix4();
  private readonly _pos = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3(1, 1, 1);
  private readonly _lookTarget = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Sky dome (inverted sphere)
    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    this.skyDomeMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
        uDayFactor: { value: 1 },
        uTime: { value: 0 },
        uDayZenith: { value: new THREE.Vector3(0.25, 0.48, 0.95) },
        uDayHorizon: { value: new THREE.Vector3(0.7, 0.82, 1.0) },
        uSunsetColor: { value: new THREE.Vector3(1.0, 0.45, 0.2) },
        uNightZenith: { value: new THREE.Vector3(0.005, 0.01, 0.04) },
        uNightHorizon: { value: new THREE.Vector3(0.02, 0.03, 0.08) },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeo, this.skyDomeMaterial);
    this.skyDomeMesh.renderOrder = -10;
    scene.add(this.skyDomeMesh);

    // Clouds
    const cloudGeo = new THREE.PlaneGeometry(800, 800, 1, 1);
    cloudGeo.rotateX(-Math.PI / 2);
    this.cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDayFactor: { value: 1 },
        uSunColor: { value: new THREE.Vector3(1, 0.95, 0.8) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cloudMesh = new THREE.Mesh(cloudGeo, this.cloudMaterial);
    this.cloudMesh.position.y = 100;
    this.cloudMesh.renderOrder = -5;
    scene.add(this.cloudMesh);

    // Giant rainbow arc - built as a custom tube following a semicircle
    this.rainbowMesh = this.createRainbowMesh();
    this.rainbowMesh.visible = false;
    scene.add(this.rainbowMesh);

    // Create bird flocks
    this.createBirdFlocks(scene);
  }

  private createRainbowMesh(): THREE.Mesh {
    const segments = 64;
    const bandWidth = 12;
    const radius = 180;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI;
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;

      // Direction perpendicular to the arc (radial outward)
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);

      // Inner and outer edges of the rainbow band
      for (let j = 0; j <= 8; j++) {
        const band = j / 8;
        const r = radius + (band - 0.5) * bandWidth;
        positions.push(nx * r, ny * r, 0);
        uvs.push(t, band);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < 8; j++) {
        const a = i * 9 + j;
        const b = a + 1;
        const c = a + 9;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const mat = new THREE.ShaderMaterial({
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      uniforms: { uOpacity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -3;
    return mesh;
  }

  private createBirdFlocks(scene: THREE.Scene): void {
    const birdGeo = createBirdGeometry();
    const birdMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      side: THREE.DoubleSide,
    });

    const flockConfigs = [
      { count: 7,  radius: 60,  speed: 0.35, altitude: 75,  phase: 0.0 },
      { count: 12, radius: 90,  speed: 0.25, altitude: 85,  phase: 2.1 },
      { count: 5,  radius: 45,  speed: 0.45, altitude: 68,  phase: 4.2 },
      { count: 9,  radius: 75,  speed: 0.3,  altitude: 92,  phase: 1.0 },
      { count: 6,  radius: 55,  speed: 0.4,  altitude: 72,  phase: 3.5 },
    ];

    for (const cfg of flockConfigs) {
      const mesh = new THREE.InstancedMesh(birdGeo, birdMat, cfg.count);
      mesh.frustumCulled = false;
      mesh.renderOrder = -2;
      scene.add(mesh);

      const wingPhases = new Float32Array(cfg.count);
      for (let i = 0; i < cfg.count; i++) {
        wingPhases[i] = Math.random() * Math.PI * 2;
      }

      this.birdFlocks.push({
        mesh,
        centerX: 0,
        centerZ: 0,
        radius: cfg.radius,
        speed: cfg.speed,
        altitude: cfg.altitude,
        phase: cfg.phase,
        count: cfg.count,
        wingPhases,
      });
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.timeOfDay = (this.timeOfDay + dt / DAY_CYCLE_DURATION) % 1.0;

    const sunAngle = this.timeOfDay * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);

    this.sunDirection.set(sunX * 0.5, sunY, 0.3).normalize();
    this.dayFactor = smoothstep(-0.1, 0.2, sunY);

    const horizonFactor = 1 - Math.abs(sunY);

    this.sunColor.set(
      lerp(0.1, lerp(1.0, 0.95, horizonFactor * 0.5), this.dayFactor),
      lerp(0.1, lerp(0.95, 0.6, horizonFactor * 0.8), this.dayFactor),
      lerp(0.15, lerp(0.8, 0.3, horizonFactor), this.dayFactor),
    );

    this.ambientColor.set(
      lerp(0.06, 0.42, this.dayFactor),
      lerp(0.06, 0.45, this.dayFactor),
      lerp(0.14, 0.55, this.dayFactor),
    );

    this.fogColor.set(
      lerp(0.02, lerp(0.85, 0.6, horizonFactor * this.dayFactor), this.dayFactor),
      lerp(0.02, lerp(0.85, 0.5, horizonFactor * this.dayFactor), this.dayFactor),
      lerp(0.05, lerp(0.95, 0.7, horizonFactor * this.dayFactor), this.dayFactor),
    );

    this.skyColorTop.set(
      lerp(0.01, 0.4, this.dayFactor),
      lerp(0.02, 0.6, this.dayFactor),
      lerp(0.06, 0.95, this.dayFactor),
    );

    // Update sky dome
    this.skyDomeMesh.position.set(playerX, 0, playerZ);
    this.skyDomeMaterial.uniforms.uSunDir.value.copy(this.sunDirection);
    this.skyDomeMaterial.uniforms.uDayFactor.value = this.dayFactor;
    this.skyDomeMaterial.uniforms.uTime.value += dt;

    // Clouds
    this.cloudMesh.position.set(playerX, 100, playerZ);
    this.cloudMaterial.uniforms.uTime.value += dt;
    this.cloudMaterial.uniforms.uDayFactor.value = this.dayFactor;
    this.cloudMaterial.uniforms.uSunColor.value.set(this.sunColor.x, this.sunColor.y, this.sunColor.z);

    // Rainbow logic - shows frequently during daytime
    this.rainbowTimer += dt;
    if (this.rainbowTimer > 45 && this.dayFactor > 0.5) {
      this.showRainbow = Math.random() < 0.5;
      this.rainbowTimer = 0;
    }
    if (this.showRainbow && this.dayFactor > 0.4) {
      this.rainbowOpacity = Math.min(1, this.rainbowOpacity + dt * 0.4);
    } else {
      this.rainbowOpacity = Math.max(0, this.rainbowOpacity - dt * 0.3);
    }
    this.rainbowMesh.visible = this.rainbowOpacity > 0.01;
    // Position rainbow opposite to the sun, far away
    const rbAngle = Math.atan2(-this.sunDirection.z, -this.sunDirection.x);
    this.rainbowMesh.position.set(
      playerX + Math.cos(rbAngle) * 200,
      -20,
      playerZ + Math.sin(rbAngle) * 200,
    );
    this.rainbowMesh.rotation.set(0, -rbAngle + Math.PI / 2, 0);
    (this.rainbowMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.rainbowOpacity;

    // Birds
    this.birdTime += dt;
    this.updateBirds(dt, playerX, playerZ);
  }

  private updateBirds(dt: number, playerX: number, playerZ: number): void {
    const t = this.birdTime;

    for (const flock of this.birdFlocks) {
      // Hide birds at night
      flock.mesh.visible = this.dayFactor > 0.15;
      if (!flock.mesh.visible) continue;

      // Flock center orbits slowly around the player
      const orbitAngle = t * flock.speed * 0.3 + flock.phase;
      const driftX = Math.sin(t * 0.05 + flock.phase) * 30;
      const driftZ = Math.cos(t * 0.07 + flock.phase * 0.7) * 30;
      flock.centerX = playerX + Math.cos(orbitAngle) * flock.radius + driftX;
      flock.centerZ = playerZ + Math.sin(orbitAngle) * flock.radius + driftZ;

      for (let i = 0; i < flock.count; i++) {
        // Each bird orbits the flock center in a small circle
        const birdAngle = t * flock.speed + (i / flock.count) * Math.PI * 2 + flock.phase;
        const spreadRadius = 8 + i * 2.5;
        const bx = flock.centerX + Math.cos(birdAngle) * spreadRadius;
        const bz = flock.centerZ + Math.sin(birdAngle) * spreadRadius;
        const by = flock.altitude + Math.sin(t * 1.5 + flock.wingPhases[i]) * 3;

        this._pos.set(bx, by, bz);

        // Bird faces direction of movement
        const nextAngle = birdAngle + 0.05;
        this._lookTarget.set(
          flock.centerX + Math.cos(nextAngle) * spreadRadius,
          by,
          flock.centerZ + Math.sin(nextAngle) * spreadRadius,
        );

        // Calculate rotation
        const dx = this._lookTarget.x - bx;
        const dz = this._lookTarget.z - bz;
        const heading = Math.atan2(dx, dz);

        // Wing flap: tilt via rotation on X axis
        const wingFlap = Math.sin(t * 8.0 + flock.wingPhases[i]) * 0.35;

        this._quat.setFromEuler(new THREE.Euler(wingFlap, heading, 0, 'YXZ'));

        const birdScale = 0.7 + (i % 3) * 0.15;
        this._scale.set(birdScale, birdScale, birdScale);

        this._mat4.compose(this._pos, this._quat, this._scale);
        flock.mesh.setMatrixAt(i, this._mat4);
      }
      flock.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  getTimeOfDay(): number { return this.timeOfDay; }
  getDayFactor(): number { return this.dayFactor; }
  getTimeLabel(): string {
    if (this.timeOfDay > 0.15 && this.timeOfDay < 0.85) return 'Day';
    return 'Night';
  }
}
