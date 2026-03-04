import * as THREE from "three";

export type WeatherType = "CLEAR" | "RAIN" | "THUNDER" | "SNOW";

interface WeatherColors {
  sky: THREE.Color;
  fog: THREE.Color;
  ambient: number;
}

const CLEAR_COLORS: WeatherColors = {
  sky: new THREE.Color(0.6, 0.8, 1.0),
  fog: new THREE.Color(0.8, 0.9, 1.0),
  ambient: 0.4,
};

const RAIN_COLORS: WeatherColors = {
  sky: new THREE.Color(0.35, 0.4, 0.5),
  fog: new THREE.Color(0.4, 0.45, 0.55),
  ambient: 0.2,
};

const THUNDER_COLORS: WeatherColors = {
  sky: new THREE.Color(0.2, 0.22, 0.3),
  fog: new THREE.Color(0.25, 0.27, 0.35),
  ambient: 0.15,
};

const SNOW_COLORS: WeatherColors = {
  sky: new THREE.Color(0.7, 0.78, 0.9),
  fog: new THREE.Color(0.85, 0.9, 0.98),
  ambient: 0.35,
};

const RAIN_COUNT = 1500;
const SNOW_COUNT = 600;
const PARTICLE_RADIUS = 30;
const TRANSITION_DURATION = 3;
const LIGHTNING_FLASH_DURATION = 0.15;
const CAMERA_SHAKE_AMOUNT = 0.15;

export class WeatherSystem {
  private readonly scene: THREE.Scene;
  private currentWeather: WeatherType = "CLEAR";
  private targetWeather: WeatherType = "CLEAR";
  private transitionProgress = 1;
  private weatherIntensity = 0;
  private lightningFlash = 0;
  private lightningFlashDecay = 0;
  private cameraShake = new THREE.Vector3(0, 0, 0);

  private rainMesh: THREE.InstancedMesh | null = null;
  private snowMesh: THREE.InstancedMesh | null = null;
  private rainMaterial: THREE.MeshBasicMaterial | null = null;
  private snowMaterial: THREE.MeshBasicMaterial | null = null;

  private weatherTimer = 0;
  private nextWeatherDuration = 0;
  private lightningCooldown = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly rainPositions: Float32Array;
  private readonly rainSpeeds: Float32Array;
  private readonly snowPositions: Float32Array;
  private readonly snowSpeeds: Float32Array;
  private readonly snowDrift: Float32Array;

  private fogColor = new THREE.Color(0.8, 0.9, 1.0);
  private skyColor = new THREE.Color(0.6, 0.8, 1.0);
  private ambientIntensity = 0.4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rainPositions = new Float32Array(RAIN_COUNT * 3);
    this.rainSpeeds = new Float32Array(RAIN_COUNT);
    this.snowPositions = new Float32Array(SNOW_COUNT * 3);
    this.snowSpeeds = new Float32Array(SNOW_COUNT);
    this.snowDrift = new Float32Array(SNOW_COUNT);

    this.initRain();
    this.initSnow();
    this.scheduleNextWeather();
  }

  private initRain(): void {
    const geometry = new THREE.BoxGeometry(0.02, 0.4, 0.02);
    this.rainMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488cc,
      transparent: true,
      opacity: 0.8,
    });
    this.rainMesh = new THREE.InstancedMesh(
      geometry,
      this.rainMaterial,
      RAIN_COUNT
    );
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);

    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      this.rainPositions[i * 3 + 1] = Math.random() * 80 + 20;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      this.rainSpeeds[i] = 15 + Math.random() * 15;
    }
  }

  private initSnow(): void {
    const geometry = new THREE.SphereGeometry(0.08, 4, 4);
    this.snowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.snowMesh = new THREE.InstancedMesh(
      geometry,
      this.snowMaterial,
      SNOW_COUNT
    );
    this.snowMesh.frustumCulled = false;
    this.snowMesh.visible = false;
    this.scene.add(this.snowMesh);

    for (let i = 0; i < SNOW_COUNT; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      this.snowPositions[i * 3 + 1] = Math.random() * 60 + 10;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      this.snowSpeeds[i] = 2 + Math.random() * 4;
      this.snowDrift[i] = (Math.random() - 0.5) * 2;
    }
  }

  private getColorsForWeather(weather: WeatherType): WeatherColors {
    switch (weather) {
      case "CLEAR":
        return CLEAR_COLORS;
      case "RAIN":
      case "THUNDER":
        return weather === "THUNDER" ? THUNDER_COLORS : RAIN_COLORS;
      case "SNOW":
        return SNOW_COLORS;
      default:
        return CLEAR_COLORS;
    }
  }

  private scheduleNextWeather(): void {
    if (this.currentWeather === "CLEAR") {
      const types: WeatherType[] = ["RAIN", "THUNDER", "SNOW"];
      this.targetWeather = types[Math.floor(Math.random() * types.length)];
      this.nextWeatherDuration = 120 + Math.random() * 180;
    } else {
      this.targetWeather = "CLEAR";
      this.nextWeatherDuration = 180 + Math.random() * 300;
    }
    this.transitionProgress = 0;
    this.weatherTimer = 0;
  }

  private maybeLightning(): void {
    if (this.currentWeather !== "THUNDER" || this.lightningCooldown > 0) return;
    if (Math.random() < 0.008) {
      this.lightningFlash = 1;
      this.lightningFlashDecay = 1;
      this.lightningCooldown = 0.5 + Math.random() * 2;
    }
  }

  update(dt: number, playerPos: THREE.Vector3, _cameraDir: THREE.Vector3): void {
    this.weatherTimer += dt;
    this.lightningCooldown = Math.max(0, this.lightningCooldown - dt);

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(
        1,
        this.transitionProgress + dt / TRANSITION_DURATION
      );
      if (this.transitionProgress >= 1) {
        this.currentWeather = this.targetWeather;
      }
    }

    if (this.weatherTimer >= this.nextWeatherDuration) {
      this.scheduleNextWeather();
    }

    const startIntensity = this.currentWeather === "CLEAR" ? 0 : 1;
    const targetIntensity = this.targetWeather === "CLEAR" ? 0 : 1;
    this.weatherIntensity =
      startIntensity + (targetIntensity - startIntensity) * this.transitionProgress;

    this.maybeLightning();

    if (this.lightningFlashDecay > 0) {
      this.lightningFlashDecay -= dt / LIGHTNING_FLASH_DURATION;
      this.lightningFlash = Math.min(1, this.lightningFlashDecay);
      if (this.lightningFlash > 0.5) {
        const shake = CAMERA_SHAKE_AMOUNT * (1 - (this.lightningFlash - 0.5) * 2);
        this.cameraShake.set(
          (Math.random() - 0.5) * shake * 2,
          (Math.random() - 0.5) * shake * 2,
          (Math.random() - 0.5) * shake * 2
        );
      } else {
        this.cameraShake.set(0, 0, 0);
      }
    } else {
      this.lightningFlash = 0;
      this.cameraShake.set(0, 0, 0);
    }

    const fromColors = this.getColorsForWeather(this.currentWeather);
    const toColors = this.getColorsForWeather(this.targetWeather);
    const t = this.transitionProgress;
    this.skyColor.lerpColors(fromColors.sky, toColors.sky, t);
    this.fogColor.lerpColors(fromColors.fog, toColors.fog, t);
    this.ambientIntensity = fromColors.ambient + (toColors.ambient - fromColors.ambient) * t;

    const rainIntensity = this.isRaining() ? this.weatherIntensity : 0;
    const snowIntensity = this.isSnowing() ? this.weatherIntensity : 0;

    if (this.rainMesh && this.rainMaterial) {
      this.rainMesh.visible = rainIntensity > 0.01;
      this.rainMaterial.opacity = rainIntensity * 0.8;
      if (this.rainMesh.visible) {
        this.updateRain(dt, playerPos);
      }
    }

    if (this.snowMesh && this.snowMaterial) {
      this.snowMesh.visible = snowIntensity > 0.01;
      this.snowMaterial.opacity = snowIntensity * 0.9;
      if (this.snowMesh.visible) {
        this.updateSnow(dt, playerPos);
      }
    }
  }

  private updateRain(dt: number, playerPos: THREE.Vector3): void {
    if (!this.rainMesh) return;

    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;

    for (let i = 0; i < RAIN_COUNT; i++) {
      let x = this.rainPositions[i * 3];
      let y = this.rainPositions[i * 3 + 1];
      let z = this.rainPositions[i * 3 + 2];

      y -= this.rainSpeeds[i] * dt;

      const dx = x - px;
      const dz = z - pz;
      const distSq = dx * dx + dz * dz;
      if (distSq > PARTICLE_RADIUS * PARTICLE_RADIUS || y < -5) {
        x = px + (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
        y = py + Math.random() * 60 + 20;
        z = pz + (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      }

      this.rainPositions[i * 3] = x;
      this.rainPositions[i * 3 + 1] = y;
      this.rainPositions[i * 3 + 2] = z;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.rainMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;
  }

  private updateSnow(dt: number, playerPos: THREE.Vector3): void {
    if (!this.snowMesh) return;

    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;

    for (let i = 0; i < SNOW_COUNT; i++) {
      let x = this.snowPositions[i * 3];
      let y = this.snowPositions[i * 3 + 1];
      let z = this.snowPositions[i * 3 + 2];

      y -= this.snowSpeeds[i] * dt;
      x += this.snowDrift[i] * dt;
      z += this.snowDrift[i] * 0.7 * dt;

      const dx = x - px;
      const dz = z - pz;
      const distSq = dx * dx + dz * dz;
      if (distSq > PARTICLE_RADIUS * PARTICLE_RADIUS || y < -5) {
        x = px + (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
        y = py + Math.random() * 50 + 15;
        z = pz + (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
      }

      this.snowPositions[i * 3] = x;
      this.snowPositions[i * 3 + 1] = y;
      this.snowPositions[i * 3 + 2] = z;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.snowMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.snowMesh.instanceMatrix.needsUpdate = true;
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  setWeather(type: WeatherType): void {
    this.currentWeather = type;
    this.targetWeather = type;
    this.transitionProgress = 1;
    this.weatherIntensity = type === "CLEAR" ? 0 : 1;
    this.scheduleNextWeather();
  }

  getWeatherIntensity(): number {
    return this.weatherIntensity;
  }

  getLightningFlash(): number {
    return this.lightningFlash;
  }

  isRaining(): boolean {
    return this.currentWeather === "RAIN" || this.currentWeather === "THUNDER";
  }

  isSnowing(): boolean {
    return this.currentWeather === "SNOW";
  }

  getFogColor(): THREE.Color {
    return this.fogColor;
  }

  getSkyColor(): THREE.Color {
    return this.skyColor;
  }

  getAmbientIntensity(): number {
    return this.ambientIntensity;
  }

  getCameraShake(): THREE.Vector3 {
    return this.cameraShake;
  }

  dispose(): void {
    if (this.rainMesh) {
      this.scene.remove(this.rainMesh);
      this.rainMesh.geometry.dispose();
      this.rainMaterial?.dispose();
    }
    if (this.snowMesh) {
      this.scene.remove(this.snowMesh);
      this.snowMesh.geometry.dispose();
      this.snowMaterial?.dispose();
    }
  }
}
