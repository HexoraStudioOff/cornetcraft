import * as THREE from 'three';

/**
 * First-person swimming arms renderer.
 * Shows animated arms doing breaststroke/crawl when swimming.
 * Attaches to the camera as children so they follow the view.
 */
export class SwimmingArms {
  private readonly group: THREE.Group;
  private readonly leftArm: THREE.Group;
  private readonly rightArm: THREE.Group;
  private readonly leftForearm: THREE.Mesh;
  private readonly rightForearm: THREE.Mesh;
  private readonly leftHand: THREE.Mesh;
  private readonly rightHand: THREE.Mesh;

  private phase: number = 0;
  private visible: boolean = false;
  private opacity: number = 0;

  // Skin color materials
  private readonly skinMat: THREE.MeshBasicMaterial;
  private readonly skinDarkMat: THREE.MeshBasicMaterial;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.renderOrder = 999;

    // Skin tones
    this.skinMat = new THREE.MeshBasicMaterial({
      color: 0xd4a574,
      transparent: true,
      depthTest: false,
    });
    this.skinDarkMat = new THREE.MeshBasicMaterial({
      color: 0xc49464,
      transparent: true,
      depthTest: false,
    });

    // Build left arm
    this.leftArm = new THREE.Group();
    const { forearm: lf, hand: lh } = this.createArm();
    this.leftForearm = lf;
    this.leftHand = lh;
    this.leftArm.add(lf);
    this.leftArm.add(lh);
    this.group.add(this.leftArm);

    // Build right arm
    this.rightArm = new THREE.Group();
    const { forearm: rf, hand: rh } = this.createArm();
    this.rightForearm = rf;
    this.rightHand = rh;
    this.rightArm.add(rf);
    this.rightArm.add(rh);
    this.group.add(this.rightArm);

    camera.add(this.group);
    if (!camera.parent) {
      scene.add(camera);
    }

    this.group.visible = false;
  }

  private createArm(): { forearm: THREE.Mesh; hand: THREE.Mesh } {
    // Upper arm / forearm
    const forearmGeo = new THREE.BoxGeometry(0.09, 0.32, 0.09);
    const forearm = new THREE.Mesh(forearmGeo, this.skinMat);

    // Hand (slightly wider, flatter)
    const handGeo = new THREE.BoxGeometry(0.1, 0.06, 0.12);
    const hand = new THREE.Mesh(handGeo, this.skinDarkMat);

    return { forearm, hand };
  }

  update(dt: number, isSwimming: boolean, isInWater: boolean, strokePhase: number): void {
    this.visible = isSwimming || isInWater;
    const targetOpacity = this.visible ? 1.0 : 0.0;
    this.opacity += (targetOpacity - this.opacity) * 0.15;

    if (this.opacity < 0.01) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.skinMat.opacity = this.opacity;
    this.skinDarkMat.opacity = this.opacity;

    this.phase = strokePhase;

    if (isSwimming) {
      this.animateSwimStroke();
    } else if (isInWater) {
      this.animateTreading();
    }
  }

  private animateSwimStroke(): void {
    const t = this.phase;

    // Crawl stroke: arms alternate, reaching forward then pulling back
    // Left arm is offset by PI from right arm
    const leftT = t;
    const rightT = t + Math.PI;

    this.positionArm(this.leftArm, this.leftForearm, this.leftHand, leftT, -1);
    this.positionArm(this.rightArm, this.rightForearm, this.rightHand, rightT, 1);
  }

  private animateTreading(): void {
    // Slower, gentle paddling motion
    const t = this.phase * 0.8;
    const leftT = t;
    const rightT = t + Math.PI;

    this.positionArmTread(this.leftArm, this.leftForearm, this.leftHand, leftT, -1);
    this.positionArmTread(this.rightArm, this.rightForearm, this.rightHand, rightT, 1);
  }

  private positionArm(
    armGroup: THREE.Group,
    forearm: THREE.Mesh,
    hand: THREE.Mesh,
    t: number,
    side: number,
  ): void {
    // side: -1 = left, 1 = right

    // Swim stroke cycle:
    // Phase 0..PI: arm reaches forward and pulls back (power stroke)
    // Phase PI..2PI: arm recovers (lifts up and reaches forward again)
    const cycle = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const normalized = cycle / (Math.PI * 2); // 0..1

    // Base X offset from center
    const baseX = side * 0.22;

    // Arm animation paths
    let armX: number, armY: number, armZ: number;
    let forearmRotX: number, forearmRotZ: number;
    let handY: number;

    if (normalized < 0.5) {
      // Power stroke: arm pulls from front to side
      const p = normalized * 2; // 0..1 during power phase
      const eased = Math.sin(p * Math.PI * 0.5);

      armX = baseX + side * eased * 0.15;
      armY = -0.35 - Math.sin(p * Math.PI) * 0.08;
      armZ = -0.55 + eased * 0.35;

      forearmRotX = -1.2 + eased * 0.8;
      forearmRotZ = side * (-0.1 + eased * 0.3);
      handY = -0.16 - Math.sin(p * Math.PI) * 0.02;
    } else {
      // Recovery: arm swings forward again
      const p = (normalized - 0.5) * 2; // 0..1 during recovery
      const eased = Math.sin(p * Math.PI * 0.5);

      armX = baseX + side * 0.15 * (1 - eased);
      armY = -0.35 + Math.sin(p * Math.PI) * 0.06;
      armZ = -0.2 - eased * 0.35;

      forearmRotX = -0.4 - eased * 0.8;
      forearmRotZ = side * (0.2 - eased * 0.3);
      handY = -0.16;
    }

    // Apply positions
    forearm.position.set(armX, armY, armZ);
    forearm.rotation.set(forearmRotX, 0, forearmRotZ);

    hand.position.set(armX, armY + handY, armZ - 0.06);
    hand.rotation.set(forearmRotX - 0.3, 0, forearmRotZ);
  }

  private positionArmTread(
    armGroup: THREE.Group,
    forearm: THREE.Mesh,
    hand: THREE.Mesh,
    t: number,
    side: number,
  ): void {
    const baseX = side * 0.25;
    const sway = Math.sin(t) * 0.12;
    const bob = Math.cos(t * 0.7) * 0.04;

    forearm.position.set(
      baseX + sway * side,
      -0.42 + bob,
      -0.45,
    );
    forearm.rotation.set(-0.8 + Math.sin(t) * 0.2, 0, side * 0.3);

    hand.position.set(
      baseX + sway * side,
      -0.58 + bob,
      -0.48,
    );
    hand.rotation.set(-1.0 + Math.sin(t) * 0.15, 0, side * 0.3);
  }

  dispose(): void {
    this.skinMat.dispose();
    this.skinDarkMat.dispose();

    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  }
}
