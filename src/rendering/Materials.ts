import * as THREE from 'three';
import { TextureAtlas } from '../textures/TextureAtlas';
import { FAR_PLANE, SHADOW_MAP_SIZE, SHADOW_BIAS, SHADOW_NORMAL_BIAS } from '../utils/constants';

const vertexShader = /* glsl */ `
  attribute float aAnimType;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;
  varying float vDepth;
  varying float vAnimType;

  uniform float uTime;
  uniform float uWindStrength;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vColor = color;
    vAnimType = aAnimType;

    vec3 pos = position;

    // Wind animation for leaves (aAnimType == 1.0)
    if (aAnimType > 0.5 && aAnimType < 1.5) {
      float phase = pos.x * 1.5 + pos.z * 1.3 + pos.y * 0.7;
      float wind = sin(uTime * 1.8 + phase) * 0.06 * uWindStrength;
      float wind2 = cos(uTime * 1.3 + phase * 0.7) * 0.04 * uWindStrength;
      pos.x += wind;
      pos.z += wind2;
      pos.y += sin(uTime * 2.2 + phase * 1.1) * 0.02 * uWindStrength;
    }

    // Wind animation for ground vegetation (aAnimType == 2.0)
    if (aAnimType > 1.5) {
      float localY = fract(pos.y);
      float topFactor = localY;
      float phase = pos.x * 2.0 + pos.z * 2.3;
      float sway = sin(uTime * 2.5 + phase) * 0.12 * topFactor * uWindStrength;
      float sway2 = cos(uTime * 1.9 + phase * 0.8) * 0.08 * topFactor * uWindStrength;
      pos.x += sway;
      pos.z += sway2;
    }

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vec4 mvPos = viewMatrix * worldPos;
    vDepth = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uAmbientColor;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTime;
  uniform float uDayFactor;

  // Shadow uniforms
  uniform sampler2D uShadowMap0;
  uniform sampler2D uShadowMap1;
  uniform sampler2D uShadowMap2;
  uniform mat4 uShadowMatrix0;
  uniform mat4 uShadowMatrix1;
  uniform mat4 uShadowMatrix2;
  uniform float uShadowBias;
  uniform float uShadowNormalBias;

  // Point lights (torches)
  uniform float uPointLightCount;
  uniform vec3 uPointLights[8];
  uniform vec3 uPointLightColors[8];

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;
  varying float vDepth;
  varying float vAnimType;

  float sampleShadow(sampler2D smap, vec2 coords, float compare) {
    float d = texture2D(smap, coords).r;
    return step(compare, d);
  }

  float pcfShadow(sampler2D smap, vec4 sc, float texelSize) {
    float shadow = 0.0;
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 off = vec2(float(x), float(y)) * texelSize;
        shadow += sampleShadow(smap, sc.xy + off, sc.z);
      }
    }
    return shadow / 25.0;
  }

  float getShadow(vec3 worldPos, vec3 N) {
    if (uDayFactor < 0.05) return 1.0;

    vec3 offsetPos = worldPos + N * uShadowNormalBias;
    float texel = 1.0 / ${SHADOW_MAP_SIZE.toFixed(1)};
    float bias = uShadowBias;
    float shadow = 1.0;

    if (vDepth < 30.0) {
      vec4 sc = uShadowMatrix0 * vec4(offsetPos, 1.0);
      sc.z -= bias;
      if (sc.x > 0.01 && sc.x < 0.99 && sc.y > 0.01 && sc.y < 0.99 && sc.z > 0.0 && sc.z < 1.0) {
        shadow = pcfShadow(uShadowMap0, sc, texel);
        return mix(1.0, shadow, smoothstep(0.05, 0.2, uDayFactor));
      }
    }
    if (vDepth < 80.0) {
      vec4 sc = uShadowMatrix1 * vec4(offsetPos, 1.0);
      sc.z -= bias * 1.5;
      if (sc.x > 0.01 && sc.x < 0.99 && sc.y > 0.01 && sc.y < 0.99 && sc.z > 0.0 && sc.z < 1.0) {
        shadow = pcfShadow(uShadowMap1, sc, texel * 1.5);
        return mix(1.0, shadow, smoothstep(0.05, 0.2, uDayFactor));
      }
    }
    {
      vec4 sc = uShadowMatrix2 * vec4(offsetPos, 1.0);
      sc.z -= bias * 2.0;
      if (sc.x > 0.01 && sc.x < 0.99 && sc.y > 0.01 && sc.y < 0.99 && sc.z > 0.0 && sc.z < 1.0) {
        shadow = pcfShadow(uShadowMap2, sc, texel * 2.5);
        return mix(1.0, shadow, smoothstep(0.05, 0.2, uDayFactor));
      }
    }
    return 1.0;
  }

  void main() {
    vec4 texColor = texture2D(uAtlas, vUv);
    if (texColor.a < 0.3) discard;

    vec3 N = normalize(vNormal);
    float NdotL = max(dot(N, uSunDirection), 0.0);

    // Shadow
    float shadow = getShadow(vWorldPos, N);

    // Reduce self-shadowing artifacts on grass cross-faces
    if (vAnimType > 1.5) {
      shadow = mix(1.0, shadow, 0.35);
    }
    // Reduce on tree leaves too (thin geometry)
    if (vAnimType > 0.5 && vAnimType < 1.5) {
      shadow = mix(1.0, shadow, 0.6);
    }

    // Hemisphere ambient (sky from above, ground bounce from below) — BRIGHTER
    vec3 skyColor = uAmbientColor * 1.4;
    vec3 groundColor = uAmbientColor * vec3(0.6, 0.55, 0.5) * 0.5;
    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(groundColor, skyColor, hemi);

    // Fill light: even shadowed areas get some directionality
    float fillNdotL = max(dot(N, uSunDirection), 0.0) * 0.12;
    ambient += uSunColor * fillNdotL;

    // Sun diffuse with shadow (half-lambert wrap)
    float wrapDiffuse = NdotL * 0.5 + 0.5;
    vec3 sunDiffuse = uSunColor * wrapDiffuse * 0.75 * shadow;

    // Specular (Blinn-Phong) — visible on lit solid blocks
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 H = normalize(V + uSunDirection);
    float specAngle = max(dot(N, H), 0.0);
    float spec = pow(specAngle, 64.0) * 0.1 * shadow * NdotL;
    vec3 specColor = uSunColor * spec;

    // Rim lighting (subtle backlight glow)
    float rimDot = 1.0 - max(dot(V, N), 0.0);
    float rim = smoothstep(0.55, 1.0, rimDot) * max(NdotL * 0.5 + 0.3, 0.0);
    vec3 rimColor = uSunColor * rim * 0.05 * shadow;

    // Subsurface scattering for leaves
    float sss = 0.0;
    if (vAnimType > 0.5 && vAnimType < 1.5) {
      float backlight = max(dot(-N, uSunDirection), 0.0);
      sss = backlight * 0.35;
    }
    if (vAnimType > 1.5) {
      sss = max(dot(-N, uSunDirection), 0.0) * 0.2;
    }
    vec3 sssColor = uSunColor * vec3(0.35, 0.55, 0.2) * sss * mix(1.0, shadow, 0.5);

    // Indirect light approximation (ground bounce)
    float bounceFactor = max(-N.y * 0.5 + 0.5, 0.0);
    vec3 indirectLight = uAmbientColor * vec3(0.35, 0.32, 0.28) * bounceFactor * 0.2;
    indirectLight *= (0.6 + shadow * 0.4);

    // Point lights (torches)
    vec3 pointLightContrib = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uPointLightCount) break;
      vec3 toLight = uPointLights[i] - vWorldPos;
      float dist = length(toLight);
      vec3 lightDir = toLight / max(dist, 0.001);
      float atten = 1.0 / (1.0 + 0.09 * dist + 0.032 * dist * dist);
      atten *= smoothstep(14.0, 1.0, dist);
      float pNdotL = max(dot(N, lightDir), 0.0);
      // Wrap lighting for softer torch illumination
      float pWrap = pNdotL * 0.6 + 0.4;
      pointLightContrib += uPointLightColors[i] * pWrap * atten;
    }

    // Combine lighting
    vec3 lighting = (ambient + sunDiffuse + sssColor + indirectLight + specColor + rimColor + pointLightContrib) * vColor;
    vec3 finalColor = texColor.rgb * lighting;

    // Distance fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vDepth);
    finalColor = mix(finalColor, uFogColor, fogFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

export function createTerrainMaterial(atlas: TextureAtlas): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uAtlas: { value: atlas.texture },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Vector3(1.0, 0.95, 0.8) },
      uAmbientColor: { value: new THREE.Vector3(0.35, 0.38, 0.5) },
      uFogColor: { value: new THREE.Vector3(0.6, 0.75, 0.95) },
      uFogNear: { value: FAR_PLANE * 0.35 },
      uFogFar: { value: FAR_PLANE * 0.8 },
      uTime: { value: 0 },
      uWindStrength: { value: 1.0 },
      uDayFactor: { value: 1.0 },
      // Shadow maps
      uShadowMap0: { value: null },
      uShadowMap1: { value: null },
      uShadowMap2: { value: null },
      uShadowMatrix0: { value: new THREE.Matrix4() },
      uShadowMatrix1: { value: new THREE.Matrix4() },
      uShadowMatrix2: { value: new THREE.Matrix4() },
      uShadowBias: { value: SHADOW_BIAS },
      uShadowNormalBias: { value: SHADOW_NORMAL_BIAS },
      // Point lights
      uPointLightCount: { value: 0 },
      uPointLights: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
      uPointLightColors: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
    },
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.1,
  });
}

export function updateMaterialUniforms(
  material: THREE.ShaderMaterial,
  sunDirection: THREE.Vector3,
  sunColor: THREE.Vector3,
  ambientColor: THREE.Vector3,
  fogColor: THREE.Vector3,
  time: number,
): void {
  material.uniforms.uSunDirection.value.copy(sunDirection);
  material.uniforms.uSunColor.value.copy(sunColor);
  material.uniforms.uAmbientColor.value.copy(ambientColor);
  material.uniforms.uFogColor.value.copy(fogColor);
  material.uniforms.uTime.value = time;
}

export function updateShadowUniforms(
  material: THREE.ShaderMaterial,
  shadowMaps: THREE.Texture[],
  shadowMatrices: THREE.Matrix4[],
  dayFactor: number,
): void {
  material.uniforms.uShadowMap0.value = shadowMaps[0];
  material.uniforms.uShadowMap1.value = shadowMaps[1];
  material.uniforms.uShadowMap2.value = shadowMaps[2];
  material.uniforms.uShadowMatrix0.value.copy(shadowMatrices[0]);
  material.uniforms.uShadowMatrix1.value.copy(shadowMatrices[1]);
  material.uniforms.uShadowMatrix2.value.copy(shadowMatrices[2]);
  material.uniforms.uDayFactor.value = dayFactor;
}
