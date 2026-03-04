import * as THREE from 'three';
import { FAR_PLANE, SHADOW_MAP_SIZE, SHADOW_BIAS } from '../utils/constants';

const waterVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vDepth;
  varying vec2 vUv;
  varying float vWaveHeight;

  uniform float uTime;

  vec3 gerstnerWave(vec2 pos, float steepness, float wavelength, vec2 direction, float speed) {
    float k = 6.28318 / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(direction);
    float f = k * (dot(d, pos) - c * speed * uTime);
    float a = steepness / k;
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec2 xz = pos.xz;

    vec3 wave = vec3(0.0);
    wave += gerstnerWave(xz, 0.15, 12.0, vec2(1.0, 0.6), 0.8);
    wave += gerstnerWave(xz, 0.12, 8.0, vec2(-0.7, 1.0), 0.7);
    wave += gerstnerWave(xz, 0.08, 4.0, vec2(0.3, -0.8), 1.2);
    wave += gerstnerWave(xz, 0.04, 2.0, vec2(-1.0, 0.3), 1.5);
    wave += gerstnerWave(xz, 0.02, 1.2, vec2(0.8, 0.9), 1.8);

    pos.x += wave.x;
    pos.y += wave.y;
    pos.z += wave.z;
    vWaveHeight = wave.y;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vec4 mvPos = viewMatrix * worldPos;
    vDepth = -mvPos.z;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTime;
  uniform float uSeaLevel;

  // Shadow uniforms
  uniform sampler2D uShadowMap0;
  uniform mat4 uShadowMatrix0;
  uniform float uShadowBias;
  uniform float uDayFactor;

  // Point lights (torches)
  uniform float uPointLightCount;
  uniform vec3 uPointLights[8];
  uniform vec3 uPointLightColors[8];

  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vDepth;
  varying vec2 vUv;
  varying float vWaveHeight;

  float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  vec3 getWaterNormal(vec3 pos) {
    float t = uTime;
    float eps = 0.15;
    float hC = 0.0, hL = 0.0, hR = 0.0, hD = 0.0, hU = 0.0;

    for (int i = 0; i < 3; i++) {
      float wl, sp, st;
      vec2 dir;
      if (i == 0) { st = 0.15; wl = 12.0; dir = normalize(vec2(1.0, 0.6)); sp = 0.8; }
      else if (i == 1) { st = 0.12; wl = 8.0; dir = normalize(vec2(-0.7, 1.0)); sp = 0.7; }
      else { st = 0.08; wl = 4.0; dir = normalize(vec2(0.3, -0.8)); sp = 1.2; }

      float k = 6.28318 / wl;
      float c = sqrt(9.8 / k);
      float a = st / k;

      hC += a * sin(k * (dot(dir, pos.xz) - c * sp * t));
      hL += a * sin(k * (dot(dir, pos.xz + vec2(-eps, 0.0)) - c * sp * t));
      hR += a * sin(k * (dot(dir, pos.xz + vec2(eps, 0.0)) - c * sp * t));
      hD += a * sin(k * (dot(dir, pos.xz + vec2(0.0, -eps)) - c * sp * t));
      hU += a * sin(k * (dot(dir, pos.xz + vec2(0.0, eps)) - c * sp * t));
    }

    float detailScale = 3.0;
    float detailAmp = 0.015;
    float dC = sin(pos.x * detailScale + t * 2.0) * sin(pos.z * detailScale * 1.3 + t * 1.7) * detailAmp;
    float dL = sin((pos.x - eps) * detailScale + t * 2.0) * sin(pos.z * detailScale * 1.3 + t * 1.7) * detailAmp;
    float dR = sin((pos.x + eps) * detailScale + t * 2.0) * sin(pos.z * detailScale * 1.3 + t * 1.7) * detailAmp;
    float dD = sin(pos.x * detailScale + t * 2.0) * sin((pos.z - eps) * detailScale * 1.3 + t * 1.7) * detailAmp;
    float dU = sin(pos.x * detailScale + t * 2.0) * sin((pos.z + eps) * detailScale * 1.3 + t * 1.7) * detailAmp;

    hC += dC; hL += dL; hR += dR; hD += dD; hU += dU;
    return normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  }

  float getWaterShadow(vec3 worldPos) {
    if (uDayFactor < 0.05) return 1.0;
    vec4 sc = uShadowMatrix0 * vec4(worldPos, 1.0);
    sc.z -= uShadowBias * 2.0;
    if (sc.x < 0.01 || sc.x > 0.99 || sc.y < 0.01 || sc.y > 0.99) return 1.0;
    float texel = 1.0 / ${SHADOW_MAP_SIZE.toFixed(1)};
    float shadow = 0.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 off = vec2(float(x), float(y)) * texel;
        float d = texture2D(uShadowMap0, sc.xy + off).r;
        shadow += step(sc.z, d);
      }
    }
    shadow /= 9.0;
    return mix(1.0, shadow, smoothstep(0.05, 0.2, uDayFactor));
  }

  void main() {
    vec3 N = getWaterNormal(vWorldPos);
    vec3 V = normalize(vViewDir);

    float shadow = getWaterShadow(vWorldPos);

    // Depth-based water color
    float waterSurfaceY = uSeaLevel - 0.15;
    float estimatedDepth = max(waterSurfaceY - (vWorldPos.y - vWaveHeight * 2.0), 0.0) + 2.0;

    vec3 shallowColor = vec3(0.12, 0.42, 0.50);
    vec3 midColor = vec3(0.04, 0.22, 0.38);
    vec3 deepColor = vec3(0.01, 0.06, 0.18);

    float shallowFactor = clamp(estimatedDepth / 5.0, 0.0, 1.0);
    float deepFactor = clamp((estimatedDepth - 5.0) / 15.0, 0.0, 1.0);
    vec3 waterColor = mix(shallowColor, midColor, shallowFactor);
    waterColor = mix(waterColor, deepColor, deepFactor);

    // Darken water in shadow
    waterColor *= mix(0.7, 1.0, shadow);

    // Fresnel
    float cosTheta = max(dot(V, N), 0.0);
    float fresnel = pow(1.0 - cosTheta, 5.0);
    fresnel = clamp(fresnel * 0.75 + 0.08, 0.0, 1.0);

    // Sky reflection
    vec3 reflectDir = reflect(-V, N);
    float skyGrad = clamp(reflectDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 reflectionColor = mix(uSkyColor * 0.5, uSkyColor * 1.1, skyGrad);
    reflectionColor = mix(reflectionColor, waterColor * 1.5, 0.15);
    // Reduce reflection in shadow
    reflectionColor *= mix(0.6, 1.0, shadow);

    // Sun specular (attenuated by shadow)
    vec3 H = normalize(V + uSunDirection);
    float specAngle = max(dot(N, H), 0.0);
    float spec = pow(specAngle, 512.0) * 3.0 * shadow;
    float specBroad = pow(specAngle, 32.0) * 0.15 * shadow;
    vec3 specColor = uSunColor * (spec + specBroad);

    // Subsurface scattering
    float sss = pow(max(dot(V, -uSunDirection + N * 0.6), 0.0), 3.0) * 0.25;
    vec3 sssColor = vec3(0.06, 0.28, 0.22) * uSunColor * sss * shadow;

    // Caustics
    float caustic1 = sin(vWorldPos.x * 3.5 + uTime * 0.7) * sin(vWorldPos.z * 2.8 + uTime * 0.5);
    float caustic2 = sin(vWorldPos.x * 2.3 - uTime * 0.6) * sin(vWorldPos.z * 3.5 + uTime * 0.9);
    float caustics = (caustic1 + caustic2) * 0.02 * (1.0 - deepFactor) * shadow;

    // Shore foam
    float foamNoise1 = vnoise(vWorldPos.xz * 1.5 + uTime * 0.3);
    float foamNoise2 = vnoise(vWorldPos.xz * 3.0 - uTime * 0.2);
    float foamPattern = foamNoise1 * 0.6 + foamNoise2 * 0.4;
    float foamDepthFactor = smoothstep(4.0, 1.0, estimatedDepth);
    float foamCrestFactor = smoothstep(0.03, 0.08, vWaveHeight);
    float foamAmount = max(foamDepthFactor, foamCrestFactor * 0.5) * smoothstep(0.4, 0.7, foamPattern);
    vec3 foamColor = vec3(0.85, 0.9, 0.95);

    // Combine
    vec3 surfaceColor = mix(waterColor + caustics + sssColor, reflectionColor, fresnel) + specColor;
    vec3 finalColor = mix(surfaceColor, foamColor, foamAmount * 0.6);

    // Sun light contribution
    float NdotL = max(dot(N, uSunDirection), 0.0);
    finalColor += waterColor * uSunColor * NdotL * 0.15 * shadow;

    // Point lights (torches reflecting on water)
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uPointLightCount) break;
      vec3 toLight = uPointLights[i] - vWorldPos;
      float dist = length(toLight);
      vec3 lightDir = toLight / max(dist, 0.001);
      float atten = 1.0 / (1.0 + 0.09 * dist + 0.032 * dist * dist);
      atten *= smoothstep(14.0, 1.0, dist);
      float pNdotL = max(dot(N, lightDir), 0.0);
      finalColor += uPointLightColors[i] * pNdotL * atten * 0.4;
      // Point light specular on water
      vec3 pH = normalize(V + lightDir);
      float pSpec = pow(max(dot(N, pH), 0.0), 128.0) * 1.5 * atten;
      finalColor += uPointLightColors[i] * pSpec;
    }

    // Fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vDepth);
    finalColor = mix(finalColor, uFogColor, fogFactor);

    // Transparency
    float alpha = mix(0.55, 0.92, clamp(shallowFactor * 0.7 + fresnel * 0.4, 0.0, 1.0));
    alpha = mix(alpha, 1.0, foamAmount * 0.4);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Vector3(1.0, 0.95, 0.8) },
      uSkyColor: { value: new THREE.Vector3(0.5, 0.7, 1.0) },
      uFogColor: { value: new THREE.Vector3(0.6, 0.75, 0.95) },
      uFogNear: { value: FAR_PLANE * 0.35 },
      uFogFar: { value: FAR_PLANE * 0.8 },
      uTime: { value: 0 },
      uSeaLevel: { value: 34.0 },
      // Shadow
      uShadowMap0: { value: null },
      uShadowMatrix0: { value: new THREE.Matrix4() },
      uShadowBias: { value: SHADOW_BIAS },
      uDayFactor: { value: 1.0 },
      // Point lights
      uPointLightCount: { value: 0 },
      uPointLights: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
      uPointLightColors: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function updateWaterUniforms(
  material: THREE.ShaderMaterial,
  sunDirection: THREE.Vector3,
  sunColor: THREE.Vector3,
  skyColor: THREE.Vector3,
  fogColor: THREE.Vector3,
  time: number,
): void {
  material.uniforms.uSunDirection.value.copy(sunDirection);
  material.uniforms.uSunColor.value.copy(sunColor);
  material.uniforms.uSkyColor.value.copy(skyColor);
  material.uniforms.uFogColor.value.copy(fogColor);
  material.uniforms.uTime.value = time;
}

export function updateWaterShadowUniforms(
  material: THREE.ShaderMaterial,
  shadowMap: THREE.Texture,
  shadowMatrix: THREE.Matrix4,
  dayFactor: number,
): void {
  material.uniforms.uShadowMap0.value = shadowMap;
  material.uniforms.uShadowMatrix0.value.copy(shadowMatrix);
  material.uniforms.uDayFactor.value = dayFactor;
}
