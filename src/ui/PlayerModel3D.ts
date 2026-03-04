import * as THREE from 'three';

/**
 * Procedural Minecraft-style player model rendered in a separate Three.js scene.
 * Uses per-face materials for correct skin rendering (face only on front, hair on top, etc.)
 * All textures are generated deterministically -- no Math.random().
 */
export class PlayerModel3D {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;

  private readonly head: THREE.Mesh;
  private readonly body: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly modelGroup: THREE.Group;

  private targetRotY: number = 0;
  private targetHeadRotX: number = 0;

  constructor(containerEl: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'player-model-canvas';
    this.canvas.width = 104;
    this.canvas.height = 152;
    containerEl.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(104, 152);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, 104 / 152, 0.1, 100);
    this.camera.position.set(0, 0.2, 4.2);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 4);
    this.scene.add(dirLight);

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // Head (6 face materials: right, left, top, bottom, front, back)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMats = this.createHeadMaterials();
    this.head = new THREE.Mesh(headGeo, headMats);
    this.head.position.set(0, 0.95, 0);
    this.modelGroup.add(this.head);

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMats = this.createBodyMaterials();
    this.body = new THREE.Mesh(bodyGeo, bodyMats);
    this.body.position.set(0, 0.325, 0);
    this.modelGroup.add(this.body);

    // Right Arm
    const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const rightArmMats = this.createArmMaterials();
    this.rightArm = new THREE.Mesh(armGeo, rightArmMats);
    this.rightArm.position.set(-0.375, 0.325, 0);
    this.modelGroup.add(this.rightArm);

    // Left Arm
    const leftArmMats = this.createArmMaterials();
    this.leftArm = new THREE.Mesh(armGeo.clone(), leftArmMats);
    this.leftArm.position.set(0.375, 0.325, 0);
    this.modelGroup.add(this.leftArm);

    // Right Leg
    const legGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const rightLegMats = this.createLegMaterials();
    this.rightLeg = new THREE.Mesh(legGeo, rightLegMats);
    this.rightLeg.position.set(-0.125, -0.375, 0);
    this.modelGroup.add(this.rightLeg);

    // Left Leg
    const leftLegMats = this.createLegMaterials();
    this.leftLeg = new THREE.Mesh(legGeo.clone(), leftLegMats);
    this.leftLeg.position.set(0.125, -0.375, 0);
    this.modelGroup.add(this.leftLeg);

    this.modelGroup.position.y = -0.2;
  }

  // --- Deterministic texture helpers ---

  private makeSolidTex(color: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 8, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private makeMat(color: string): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ map: this.makeSolidTex(color) });
  }

  // --- Head: face on front, hair on top/sides/back, skin on bottom ---

  private createHeadMaterials(): THREE.MeshLambertMaterial[] {
    const skin = '#c08850';
    const hair = '#3b2213';

    const faceTex = this.createFaceTexture();
    const hairSideTex = this.createHairSideTexture();
    const hairTopTex = this.createHairTopTexture();
    const hairBackTex = this.createHairBackTexture();

    return [
      new THREE.MeshLambertMaterial({ map: hairSideTex }),  // +X right
      new THREE.MeshLambertMaterial({ map: hairSideTex }),  // -X left
      new THREE.MeshLambertMaterial({ map: hairTopTex }),   // +Y top
      this.makeMat(skin),                                   // -Y bottom
      new THREE.MeshLambertMaterial({ map: faceTex }),      // +Z front
      new THREE.MeshLambertMaterial({ map: hairBackTex }),  // -Z back
    ];
  }

  private createFaceTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;

    // Skin base
    ctx.fillStyle = '#c08850';
    ctx.fillRect(0, 0, 16, 16);

    // Hair (top of face)
    ctx.fillStyle = '#3b2213';
    ctx.fillRect(0, 0, 16, 4);
    // Hair sides
    ctx.fillRect(0, 4, 1, 3);
    ctx.fillRect(15, 4, 1, 3);

    // Eyes - white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 7, 4, 2);
    ctx.fillRect(9, 7, 4, 2);

    // Eyes - iris (blue)
    ctx.fillStyle = '#3355aa';
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(10, 7, 2, 2);

    // Eyes - pupil
    ctx.fillStyle = '#111111';
    ctx.fillRect(5, 7, 1, 2);
    ctx.fillRect(11, 7, 1, 2);

    // Nose
    ctx.fillStyle = '#b07040';
    ctx.fillRect(7, 9, 2, 2);

    // Mouth
    ctx.fillStyle = '#8a5038';
    ctx.fillRect(6, 12, 4, 1);

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private createHairTopTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3b2213';
    ctx.fillRect(0, 0, 16, 16);
    // Subtle hair detail
    ctx.fillStyle = '#4a2e1a';
    ctx.fillRect(2, 3, 3, 2);
    ctx.fillRect(8, 6, 4, 2);
    ctx.fillRect(5, 10, 3, 2);
    ctx.fillRect(11, 1, 2, 3);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private createHairSideTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    // Skin base (lower part visible)
    ctx.fillStyle = '#c08850';
    ctx.fillRect(0, 0, 16, 16);
    // Hair covering top and sides
    ctx.fillStyle = '#3b2213';
    ctx.fillRect(0, 0, 16, 8);
    ctx.fillStyle = '#4a2e1a';
    ctx.fillRect(2, 5, 3, 2);
    ctx.fillRect(9, 3, 4, 2);
    // Ear hint
    ctx.fillStyle = '#b07848';
    ctx.fillRect(6, 8, 3, 3);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private createHairBackTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    // Hair covers the whole back
    ctx.fillStyle = '#3b2213';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#4a2e1a';
    ctx.fillRect(1, 2, 3, 3);
    ctx.fillRect(7, 5, 4, 2);
    ctx.fillRect(3, 9, 2, 3);
    ctx.fillRect(10, 11, 3, 2);
    // Skin at bottom
    ctx.fillStyle = '#c08850';
    ctx.fillRect(3, 14, 10, 2);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  // --- Body: teal shirt ---

  private createBodyMaterials(): THREE.MeshLambertMaterial[] {
    const shirtFront = this.createShirtFrontTexture();
    const shirtSide = this.createShirtSideTexture();
    const shirtBack = this.createShirtBackTexture();
    const shirtTopBot = this.makeMat('#2a7aaa');

    return [
      new THREE.MeshLambertMaterial({ map: shirtSide }),    // +X
      new THREE.MeshLambertMaterial({ map: shirtSide }),    // -X
      shirtTopBot,                                           // +Y top
      shirtTopBot,                                           // -Y bottom
      new THREE.MeshLambertMaterial({ map: shirtFront }),   // +Z front
      new THREE.MeshLambertMaterial({ map: shirtBack }),    // -Z back
    ];
  }

  private createShirtFrontTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3c8ec4';
    ctx.fillRect(0, 0, 16, 16);
    // Darker edges
    ctx.fillStyle = '#2a6a96';
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(0, 15, 16, 1);
    // Center fold line
    ctx.fillStyle = '#2e78a8';
    ctx.fillRect(7, 0, 2, 16);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private createShirtSideTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3c8ec4';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#2a6a96';
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 16, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  private createShirtBackTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3c8ec4';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#2a6a96';
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(0, 15, 16, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  // --- Arms: skin colored ---

  private createArmMaterials(): THREE.MeshLambertMaterial[] {
    const skin = '#c08850';
    const skinDark = '#a87040';

    const armTex = this.createArmTexture();
    const armTop = this.makeMat(skin);
    const armBot = this.makeMat(skinDark);

    return [
      new THREE.MeshLambertMaterial({ map: armTex }), // +X
      new THREE.MeshLambertMaterial({ map: armTex }), // -X
      armTop,                                          // +Y
      armBot,                                          // -Y
      new THREE.MeshLambertMaterial({ map: armTex }), // +Z
      new THREE.MeshLambertMaterial({ map: armTex }), // -Z
    ];
  }

  private createArmTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 16;
    const ctx = c.getContext('2d')!;
    // Shirt sleeve (top portion)
    ctx.fillStyle = '#3c8ec4';
    ctx.fillRect(0, 0, 8, 5);
    ctx.fillStyle = '#2a6a96';
    ctx.fillRect(0, 4, 8, 1);
    // Skin (rest)
    ctx.fillStyle = '#c08850';
    ctx.fillRect(0, 5, 8, 11);
    ctx.fillStyle = '#b07840';
    ctx.fillRect(0, 15, 8, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  // --- Legs: dark blue pants ---

  private createLegMaterials(): THREE.MeshLambertMaterial[] {
    const legTex = this.createLegTexture();
    const legTop = this.makeMat('#3535a0');
    const legBot = this.makeMat('#2a2a80');

    return [
      new THREE.MeshLambertMaterial({ map: legTex }), // +X
      new THREE.MeshLambertMaterial({ map: legTex }), // -X
      legTop,                                          // +Y
      legBot,                                          // -Y
      new THREE.MeshLambertMaterial({ map: legTex }), // +Z
      new THREE.MeshLambertMaterial({ map: legTex }), // -Z
    ];
  }

  private createLegTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3535a0';
    ctx.fillRect(0, 0, 8, 16);
    // Darker bottom (shoes)
    ctx.fillStyle = '#2a2a80';
    ctx.fillRect(0, 12, 8, 4);
    // Shoe detail
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 14, 8, 2);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  /** Update model rotation based on mouse position */
  updateMouseLook(mouseX: number, mouseY: number, containerRect: DOMRect): void {
    const relX = (mouseX - containerRect.left) / containerRect.width;
    const relY = (mouseY - containerRect.top) / containerRect.height;
    this.targetRotY = (relX - 0.5) * 1.2;
    this.targetHeadRotX = (relY - 0.5) * 0.6;
  }

  render(): void {
    this.modelGroup.rotation.y += (this.targetRotY - this.modelGroup.rotation.y) * 0.1;
    this.head.rotation.x += (this.targetHeadRotX - this.head.rotation.x) * 0.1;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m instanceof THREE.Material) m.dispose();
        }
      }
    });
  }
}
