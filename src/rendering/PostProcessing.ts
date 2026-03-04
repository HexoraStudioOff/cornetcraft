import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAORenderPass } from './SSAOPass';
import { SHADOW_LAYER } from '../utils/constants';

const FinalComposeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.2 },
    uVignetteStrength: { value: 0.35 },
    uSunScreenPos: { value: new THREE.Vector2(0.5, 0.7) },
    uGodRayStrength: { value: 0.25 },
    uDayFactor: { value: 1.0 },
    uSaturation: { value: 1.0 },
    uWarmth: { value: 0.0 },
    uUnderwaterFactor: { value: 0.0 },
    uTime: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uVignetteStrength;
    uniform vec2 uSunScreenPos;
    uniform float uGodRayStrength;
    uniform float uDayFactor;
    uniform float uSaturation;
    uniform float uWarmth;
    uniform float uUnderwaterFactor;
    uniform float uTime;

    varying vec2 vUv;

    vec3 ACESFilm(vec3 x) {
      float a = 2.51; float b = 0.03;
      float c = 2.43; float d = 0.59; float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      vec2 uv = vUv;

      // Underwater distortion: wavy screen effect
      if (uUnderwaterFactor > 0.01) {
        float distortStr = uUnderwaterFactor * 0.008;
        uv.x += sin(uv.y * 25.0 + uTime * 2.5) * distortStr;
        uv.y += cos(uv.x * 20.0 + uTime * 1.8) * distortStr * 0.7;
        // Chromatic aberration underwater
        float caStr = uUnderwaterFactor * 0.002;
        uv = clamp(uv, 0.0, 1.0);
      }

      vec4 color = texture2D(tDiffuse, uv);
      vec3 col = color.rgb;

      // Underwater chromatic aberration
      if (uUnderwaterFactor > 0.01) {
        float caStr = uUnderwaterFactor * 0.003;
        float r = texture2D(tDiffuse, uv + vec2(caStr, 0.0)).r;
        float b = texture2D(tDiffuse, uv - vec2(caStr, 0.0)).b;
        col.r = mix(col.r, r, uUnderwaterFactor * 0.6);
        col.b = mix(col.b, b, uUnderwaterFactor * 0.6);
      }

      // God rays (radial blur from sun position) - reduced underwater
      float godRayMult = 1.0 - uUnderwaterFactor * 0.8;
      if (uGodRayStrength > 0.01 && uDayFactor > 0.1 && godRayMult > 0.01) {
        vec2 deltaUv = vUv - uSunScreenPos;
        float dist = length(deltaUv);
        vec2 dir = deltaUv / max(dist, 0.001);

        vec3 godRay = vec3(0.0);
        float decay = 1.0;
        vec2 sampleUv = vUv;
        float stepSize = 0.015;

        for (int i = 0; i < 16; i++) {
          sampleUv -= dir * stepSize;
          vec3 s = texture2D(tDiffuse, clamp(sampleUv, 0.0, 1.0)).rgb;
          float brightness = dot(s, vec3(0.299, 0.587, 0.114));
          godRay += s * decay * smoothstep(0.5, 1.5, brightness);
          decay *= 0.93;
        }
        godRay /= 16.0;

        float falloff = smoothstep(0.8, 0.0, dist);
        col += godRay * uGodRayStrength * falloff * uDayFactor * godRayMult;
      }

      // Underwater caustics on the scene (light patterns)
      if (uUnderwaterFactor > 0.01) {
        float cx = uv.x * 12.0 + uTime * 0.8;
        float cy = uv.y * 10.0 + uTime * 0.6;
        float caustic = sin(cx) * sin(cy) * 0.5 + 0.5;
        caustic *= sin(cx * 1.3 + 0.7) * sin(cy * 0.9 + 1.1) * 0.5 + 0.5;
        caustic = pow(caustic, 2.0) * 0.2;
        col += vec3(0.1, 0.2, 0.25) * caustic * uUnderwaterFactor;
      }

      col *= uExposure;
      col = ACESFilm(col);

      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);

      col.r += uWarmth * 0.05;
      col.b -= uWarmth * 0.03;

      // Underwater color grading: blue-green tint, reduced red
      if (uUnderwaterFactor > 0.01) {
        // Tint towards deep ocean blue-green
        vec3 waterTint = vec3(0.05, 0.18, 0.28);
        col = mix(col, col * vec3(0.55, 0.75, 0.95) + waterTint * 0.15, uUnderwaterFactor * 0.65);

        // Fog / murk: blend towards deep water color at edges
        float fogDist = distance(uv, vec2(0.5));
        float fog = smoothstep(0.15, 0.65, fogDist) * uUnderwaterFactor * 0.4;
        vec3 fogColor = vec3(0.02, 0.1, 0.18);
        col = mix(col, fogColor, fog);

        // Reduce saturation slightly underwater
        float uwGray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(uwGray), uUnderwaterFactor * 0.15);

        // Animated light rays from above
        float ray1 = sin(uv.x * 8.0 + uTime * 0.5) * 0.5 + 0.5;
        float ray2 = sin(uv.x * 12.0 - uTime * 0.3 + 1.0) * 0.5 + 0.5;
        float rays = pow(ray1 * ray2, 3.0) * (1.0 - uv.y) * 0.12;
        col += vec3(0.15, 0.25, 0.3) * rays * uUnderwaterFactor;
      }

      // Circular vignette — stronger underwater
      float vigDist = distance(uv, vec2(0.5));
      float vigStr = mix(uVignetteStrength, 0.65, uUnderwaterFactor);
      float vig = 1.0 - smoothstep(0.25, 0.8, vigDist) * vigStr;
      col *= vig;

      col = pow(col, vec3(1.0 / 2.2));

      // Underwater bubble particles (procedural)
      if (uUnderwaterFactor > 0.3) {
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float bx = fract(sin(fi * 127.1 + 1.7) * 43758.5453);
          float by = fract(sin(fi * 269.5 + 3.3) * 43758.5453);
          float speed = 0.08 + fract(sin(fi * 419.2) * 43758.5453) * 0.12;
          float size = 0.003 + fract(sin(fi * 531.7) * 43758.5453) * 0.004;

          // Animate bubble position
          float bxAnim = bx + sin(uTime * 0.7 + fi * 2.1) * 0.03;
          float byAnim = fract(by + uTime * speed);

          float d = distance(uv, vec2(bxAnim, 1.0 - byAnim));
          float bubble = smoothstep(size, size * 0.3, d);

          // Shiny bubble highlight
          float highlight = smoothstep(size * 0.7, size * 0.2, d) * 0.5;

          col += vec3(0.3, 0.5, 0.6) * bubble * uUnderwaterFactor * 0.25;
          col += vec3(0.6, 0.8, 0.9) * highlight * uUnderwaterFactor * 0.2;
        }
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// Depth-only material for the SSAO prepass (terrain-compatible)
const depthVertexShader = /* glsl */ `
  attribute float aAnimType;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const depthFragmentShader = /* glsl */ `
  void main() { }
`;

export class PostProcessing {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly finalPass: ShaderPass;
  private readonly ssaoPass: SSAORenderPass;
  private depthTarget: THREE.WebGLRenderTarget;
  private readonly depthMaterial: THREE.ShaderMaterial;

  // Reusable vectors to avoid GC pressure
  private readonly _sunWorldPos = new THREE.Vector3();
  private readonly _sunScreen = new THREE.Vector3();
  private readonly _camDir = new THREE.Vector3();

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = renderer.getPixelRatio();

    // Separate depth render target for SSAO at half resolution (cheaper prepass)
    const depthScale = 0.5;
    this.depthTarget = new THREE.WebGLRenderTarget(
      Math.floor(w * pr * depthScale),
      Math.floor(h * pr * depthScale),
    );
    this.depthTarget.depthTexture = new THREE.DepthTexture(
      Math.floor(w * pr * depthScale),
      Math.floor(h * pr * depthScale),
    );

    this.depthMaterial = new THREE.ShaderMaterial({
      vertexShader: depthVertexShader,
      fragmentShader: depthFragmentShader,
      side: THREE.DoubleSide,
    });
    this.depthMaterial.colorWrite = false;

    // Standard EffectComposer (NO depth texture on its render targets)
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // SSAO reads from the separate depth target
    this.ssaoPass = new SSAORenderPass(camera, w * pr, h * pr);
    this.ssaoPass.setDepthTexture(this.depthTarget.depthTexture);
    this.composer.addPass(this.ssaoPass);

    // Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.15,
      0.5,
      0.9,
    );
    this.composer.addPass(this.bloomPass);

    // Final compose
    this.finalPass = new ShaderPass(FinalComposeShader);
    this.composer.addPass(this.finalPass);
  }

  setBloomEnabled(enabled: boolean): void {
    this.bloomPass.enabled = enabled;
  }

  setSsaoEnabled(enabled: boolean): void {
    this.ssaoPass.enabled = enabled;
  }

  private godRaysEnabled: boolean = true;

  setGodRaysEnabled(enabled: boolean): void {
    this.godRaysEnabled = enabled;
  }

  render(): void {
    // Depth prepass: render terrain depth to a SEPARATE target for SSAO
    const savedMask = this.camera.layers.mask;
    this.camera.layers.set(SHADOW_LAYER);
    const savedOverride = this.scene.overrideMaterial;
    this.scene.overrideMaterial = this.depthMaterial;
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = savedOverride;
    this.camera.layers.mask = savedMask;
    this.renderer.setRenderTarget(null);

    // EffectComposer: RenderPass -> SSAO -> Bloom -> FinalCompose
    this.composer.render();
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
    this.ssaoPass.setSize(width, height);
    const pr = this.renderer.getPixelRatio();
    const depthScale = 0.5;
    this.depthTarget.setSize(
      Math.floor(width * pr * depthScale),
      Math.floor(height * pr * depthScale),
    );
  }

  updateSunScreenPos(camera: THREE.Camera, sunDirection: THREE.Vector3): void {
    this._sunWorldPos.copy(sunDirection).multiplyScalar(200).add(camera.position);
    this._sunScreen.copy(this._sunWorldPos).project(camera);
    this.finalPass.uniforms.uSunScreenPos.value.set(
      this._sunScreen.x * 0.5 + 0.5,
      this._sunScreen.y * 0.5 + 0.5,
    );
    this._camDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const sunDot = this._camDir.dot(sunDirection);
    const strength = (sunDot > 0 && this.godRaysEnabled) ? sunDot * 0.3 : 0;
    this.finalPass.uniforms.uGodRayStrength.value = strength;
  }

  setDayFactor(dayFactor: number): void {
    this.finalPass.uniforms.uDayFactor.value = dayFactor;
    this.finalPass.uniforms.uExposure.value = dayFactor > 0.5 ? 1.2 : 1.3;
    this.finalPass.uniforms.uSaturation.value = 0.95 + dayFactor * 0.05;

    const warmth = (1 - Math.abs(dayFactor - 0.5) * 2) * 2;
    this.finalPass.uniforms.uWarmth.value = Math.max(0, warmth - 0.5);
  }

  setUnderwaterFactor(factor: number): void {
    this.finalPass.uniforms.uUnderwaterFactor.value = factor;

    // Adjust bloom underwater: more bloom for the dreamy underwater feel
    if (factor > 0.01) {
      this.bloomPass.strength = 0.15 + factor * 0.35;
      this.bloomPass.radius = 0.9 + factor * 0.4;
    } else {
      this.bloomPass.strength = 0.15;
      this.bloomPass.radius = 0.9;
    }
  }

  setTime(time: number): void {
    this.finalPass.uniforms.uTime.value = time;
  }
}
