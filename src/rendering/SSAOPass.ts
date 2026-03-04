import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { SSAO_RADIUS, SSAO_BIAS, SSAO_INTENSITY, NEAR_PLANE, FAR_PLANE } from '../utils/constants';

const KERNEL_SIZE = 8;
const NOISE_SIZE = 4;

function generateKernel(): THREE.Vector3[] {
  const kernel: THREE.Vector3[] = [];
  for (let i = 0; i < KERNEL_SIZE; i++) {
    const v = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random(),
    );
    v.normalize();
    let scale = i / KERNEL_SIZE;
    scale = 0.1 + scale * scale * 0.9;
    v.multiplyScalar(scale);
    kernel.push(v);
  }
  return kernel;
}

function generateNoiseTexture(): THREE.DataTexture {
  const size = NOISE_SIZE * NOISE_SIZE;
  const data = new Float32Array(size * 4);
  for (let i = 0; i < size; i++) {
    data[i * 4] = Math.random() * 2 - 1;
    data[i * 4 + 1] = Math.random() * 2 - 1;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 1;
  }
  const tex = new THREE.DataTexture(data, NOISE_SIZE, NOISE_SIZE, THREE.RGBAFormat, THREE.FloatType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

const ssaoShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform sampler2D tNoise;
    uniform vec3 uKernel[${KERNEL_SIZE}];
    uniform mat4 uProjection;
    uniform mat4 uInverseProjection;
    uniform vec2 uResolution;
    uniform float uRadius;
    uniform float uBias;
    uniform float uIntensity;
    uniform float uNear;
    uniform float uFar;

    varying vec2 vUv;

    float linearizeDepth(float d) {
      float z = d * 2.0 - 1.0;
      return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
    }

    vec3 getViewPos(vec2 uv) {
      float d = texture2D(tDepth, uv).r;
      vec4 ndc = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec4 vp = uInverseProjection * ndc;
      return vp.xyz / vp.w;
    }

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);
      float rawDepth = texture2D(tDepth, vUv).r;

      // Skip sky pixels
      if (rawDepth > 0.9999) {
        gl_FragColor = sceneColor;
        return;
      }

      vec3 fragPos = getViewPos(vUv);

      // Reconstruct normal from depth derivatives (no negation!)
      vec3 normal = normalize(cross(dFdx(fragPos), dFdy(fragPos)));

      // Random rotation from noise texture
      vec2 noiseScale = uResolution / ${NOISE_SIZE.toFixed(1)};
      vec3 randomVec = texture2D(tNoise, vUv * noiseScale).xyz;

      // Gram-Schmidt to build TBN
      vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
      vec3 bitangent = cross(normal, tangent);
      mat3 TBN = mat3(tangent, bitangent, normal);

      float occlusion = 0.0;
      float fragLinearDepth = linearizeDepth(rawDepth);

      for (int i = 0; i < ${KERNEL_SIZE}; i++) {
        vec3 samplePos = fragPos + TBN * uKernel[i] * uRadius;

        // Project sample to screen space
        vec4 projected = uProjection * vec4(samplePos, 1.0);
        vec2 sampleUv = (projected.xy / projected.w) * 0.5 + 0.5;

        // Use LOD-explicit sampling to avoid gradient warnings in loop
        float sampledRawDepth = texture2DLodEXT(tDepth, clamp(sampleUv, 0.0, 1.0), 0.0).r;
        float sampledLinearDepth = linearizeDepth(sampledRawDepth);
        float expectedLinearDepth = -samplePos.z;

        // Range check to avoid contribution from distant surfaces
        float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(fragLinearDepth - sampledLinearDepth));

        // Occluded when surface at sample screen pos is closer than the sample itself
        occlusion += step(sampledLinearDepth, expectedLinearDepth - uBias) * rangeCheck;
      }

      float ao = 1.0 - (occlusion / ${KERNEL_SIZE.toFixed(1)}) * uIntensity;
      ao = clamp(ao, 0.0, 1.0);

      gl_FragColor = vec4(sceneColor.rgb * ao, sceneColor.a);
    }
  `,
};

export class SSAORenderPass extends Pass {
  private readonly fsQuad: FullScreenQuad;
  private readonly ssaoMaterial: THREE.ShaderMaterial;
  private depthTexture: THREE.Texture | null = null;
  private readonly camera: THREE.Camera;

  constructor(camera: THREE.Camera, width: number, height: number) {
    super();
    this.needsSwap = true;
    this.camera = camera;

    const kernel = generateKernel();
    const noiseTex = generateNoiseTexture();

    this.ssaoMaterial = new THREE.ShaderMaterial({
      vertexShader: ssaoShader.vertexShader,
      fragmentShader: ssaoShader.fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tNoise: { value: noiseTex },
        uKernel: { value: kernel },
        uProjection: { value: new THREE.Matrix4() },
        uInverseProjection: { value: new THREE.Matrix4() },
        uResolution: { value: new THREE.Vector2(width, height) },
        uRadius: { value: SSAO_RADIUS },
        uBias: { value: SSAO_BIAS },
        uIntensity: { value: SSAO_INTENSITY },
        uNear: { value: NEAR_PLANE },
        uFar: { value: FAR_PLANE },
      },
    });

    this.fsQuad = new FullScreenQuad(this.ssaoMaterial);
  }

  setDepthTexture(tex: THREE.Texture): void {
    this.depthTexture = tex;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.ssaoMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.ssaoMaterial.uniforms.tDepth.value = this.depthTexture ?? readBuffer.depthTexture;
    this.ssaoMaterial.uniforms.uProjection.value.copy(this.camera.projectionMatrix);
    this.ssaoMaterial.uniforms.uInverseProjection.value.copy(
      (this.camera as THREE.PerspectiveCamera).projectionMatrixInverse,
    );

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  setSize(width: number, height: number): void {
    this.ssaoMaterial.uniforms.uResolution.value.set(width, height);
  }

  dispose(): void {
    this.ssaoMaterial.dispose();
    this.fsQuad.dispose();
  }
}
