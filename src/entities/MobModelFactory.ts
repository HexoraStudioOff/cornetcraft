import * as THREE from 'three';
import { MobType, MOB_DEFINITIONS, BodyPartDef } from './MobTypes';
import { MobTextureGenerator } from '../textures/MobTextureGenerator';

export interface MobModel {
  group: THREE.Group;
  parts: Map<string, THREE.Mesh>;
  partDefs: readonly BodyPartDef[];
  animTime: number;
}

const textureGenerator = new MobTextureGenerator();
const materialCache: Map<string, THREE.MeshLambertMaterial> = new Map();

function makeMat(canvas: HTMLCanvasElement): THREE.MeshLambertMaterial {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return new THREE.MeshLambertMaterial({ map: tex });
}

function getMaterial(mobType: MobType, partName: string): THREE.MeshLambertMaterial {
  const key = `${mobType}_${partName}`;
  let mat = materialCache.get(key);
  if (mat) return mat.clone();

  const textures = textureGenerator.getTextures(mobType);
  const canvas = textures[partName];

  if (canvas) {
    mat = makeMat(canvas);
  } else {
    mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  }

  materialCache.set(key, mat);
  return mat.clone();
}

/**
 * Build 6-material array for head parts.
 * BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
 * Model faces -Z, so face index 5 (-Z) is the front where eyes belong.
 */
function getHeadMaterials(mobType: MobType): THREE.MeshLambertMaterial[] {
  const textures = textureGenerator.getTextures(mobType);
  const frontCanvas = textures['head'];
  const sideCanvas = textures['head_side'];

  if (!sideCanvas || !frontCanvas) {
    const mat = getMaterial(mobType, 'head');
    return [mat, mat.clone(), mat.clone(), mat.clone(), mat.clone(), mat.clone()];
  }

  const side = makeMat(sideCanvas);
  const front = makeMat(frontCanvas);

  return [
    side.clone(), // +X right
    side.clone(), // -X left
    side.clone(), // +Y top
    side.clone(), // -Y bottom
    side.clone(), // +Z back of head
    front,        // -Z front face (eyes, mouth, nose)
  ];
}

function forEachMat(mesh: THREE.Mesh, fn: (mat: THREE.MeshLambertMaterial) => void): void {
  if (Array.isArray(mesh.material)) {
    for (const m of mesh.material) fn(m as THREE.MeshLambertMaterial);
  } else {
    fn(mesh.material as THREE.MeshLambertMaterial);
  }
}

export function createMobModel(type: MobType): MobModel {
  const def = MOB_DEFINITIONS[type];
  const group = new THREE.Group();
  const parts = new Map<string, THREE.Mesh>();

  for (const partDef of def.bodyParts) {
    const geo = new THREE.BoxGeometry(partDef.width, partDef.height, partDef.depth);

    let meshMat: THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[];
    if (partDef.name === 'head') {
      meshMat = getHeadMaterials(type);
    } else {
      meshMat = getMaterial(type, partDef.name);
    }

    const mesh = new THREE.Mesh(geo, meshMat);

    mesh.position.set(
      partDef.offsetX,
      partDef.offsetY + partDef.height / 2,
      partDef.offsetZ,
    );

    if (partDef.animated && partDef.animGroup) {
      const pivot = new THREE.Group();
      pivot.position.set(partDef.pivotX, partDef.pivotY, partDef.pivotZ);
      mesh.position.sub(pivot.position);
      pivot.add(mesh);
      pivot.name = partDef.name + '_pivot';
      group.add(pivot);
    } else {
      group.add(mesh);
    }

    parts.set(partDef.name, mesh);
  }

  group.castShadow = true;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, parts, partDefs: def.bodyParts, animTime: 0 };
}

export function animateMobModel(
  model: MobModel,
  dt: number,
  speed: number,
  isMoving: boolean,
  isHurt: boolean,
  isDying: boolean,
  deathProgress: number,
): void {
  if (isDying) {
    model.group.rotation.z = -deathProgress * (Math.PI / 2);
    model.group.position.y = -deathProgress * 0.5;
    model.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        forEachMat(child, (mat) => {
          mat.transparent = true;
          mat.opacity = 1 - deathProgress;
        });
      }
    });
    return;
  }

  const animSpeed = isMoving ? speed * 1.2 : 0;
  if (isMoving) {
    model.animTime += dt * animSpeed;
  } else {
    model.animTime *= 0.9;
  }

  const swingAngle = isMoving ? 0.6 : 0;

  for (const partDef of model.partDefs) {
    if (!partDef.animated || !partDef.animGroup) continue;

    const pivotName = partDef.name + '_pivot';
    const pivot = model.group.getObjectByName(pivotName) as THREE.Group | undefined;
    if (!pivot) continue;

    const phase = partDef.animPhase ?? 0;

    if (partDef.animGroup === 'legs') {
      pivot.rotation.x = Math.sin(model.animTime + phase) * swingAngle;
    } else if (partDef.animGroup === 'arms') {
      pivot.rotation.x = Math.sin(model.animTime + phase) * swingAngle * 0.8;
    } else if (partDef.animGroup === 'head') {
      pivot.rotation.y = Math.sin(model.animTime * 0.3) * 0.1;
      pivot.rotation.x = Math.sin(model.animTime * 0.2) * 0.05;
    } else if (partDef.animGroup === 'tail') {
      const tailSwing = isMoving ? 0.5 : 0.15;
      pivot.rotation.y = Math.sin(model.animTime * 1.5 + phase) * tailSwing;
    } else if (partDef.animGroup === 'fins') {
      const finSwing = isMoving ? 0.3 : 0.1;
      pivot.rotation.z = Math.sin(model.animTime * 1.2 + phase) * finSwing;
    }
  }

  if (isHurt) {
    model.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        forEachMat(child, (mat) => {
          mat.emissive.setHex(0xff2222);
          mat.emissiveIntensity = 0.6;
        });
      }
    });
  } else {
    model.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        forEachMat(child, (mat) => {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        });
      }
    });
  }
}

export function disposeMobModel(model: MobModel): void {
  model.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        for (const mat of child.material) (mat as THREE.Material).dispose();
      } else {
        (child.material as THREE.Material).dispose();
      }
    }
  });
}
