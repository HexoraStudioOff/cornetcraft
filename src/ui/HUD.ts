import { InputManager } from '../core/InputManager';
import { Player } from '../player/Player';
import { Sky } from '../rendering/Sky';
import { TextureAtlas } from '../textures/TextureAtlas';
import { InventorySystem, ItemStack } from './InventorySystem';
import { ITEM_DEFINITIONS, ItemType } from './ItemTypes';
import { worldSeed } from '../utils/noise';

export class HUD {
  private readonly debugEl: HTMLElement;
  private readonly hotbarEl: HTMLElement;
  private readonly healthBarEl: HTMLElement;
  private readonly hungerBarEl: HTMLElement;
  private readonly xpBarEl: HTMLElement;
  private readonly crosshairEl: HTMLElement;
  private readonly damageOverlay: HTMLElement;
  private readonly atlas: TextureAtlas;
  private readonly inventory: InventorySystem;

  private selectedSlot: number = 0;
  private readonly hotbarSlots: HTMLElement[] = [];

  private readonly heartCanvases: HTMLCanvasElement[] = [];
  private readonly hungerCanvases: HTMLCanvasElement[] = [];
  private readonly oxygenCanvases: HTMLCanvasElement[] = [];
  private readonly oxygenBarEl: HTMLElement;

  private lastHealth: number = 20;
  private damageFlashTime: number = 0;
  private isAimingAtMob: boolean = false;

  constructor(atlas: TextureAtlas, inventory: InventorySystem) {
    this.atlas = atlas;
    this.inventory = inventory;
    this.debugEl = document.getElementById('debug-info')!;
    this.hotbarEl = document.getElementById('hotbar')!;
    this.healthBarEl = document.getElementById('health-bar')!;
    this.hungerBarEl = document.getElementById('hunger-bar')!;
    this.xpBarEl = document.getElementById('xp-bar')!;
    this.crosshairEl = document.getElementById('crosshair')!;

    // Create damage overlay
    this.damageOverlay = document.createElement('div');
    this.damageOverlay.id = 'damage-overlay';
    this.damageOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center,transparent 50%,rgba(255,0,0,0.4) 100%);opacity:0;transition:opacity 0.1s;';
    document.body.appendChild(this.damageOverlay);

    // Oxygen bar (created dynamically, above health bar in bars-container)
    this.oxygenBarEl = document.createElement('div');
    this.oxygenBarEl.id = 'oxygen-bar';
    this.oxygenBarEl.style.cssText =
      'display:flex;gap:0px;flex-direction:row;opacity:0;transition:opacity 0.3s;height:0;overflow:hidden;';
    // Insert before health bar in bars-container
    const barsContainer = document.getElementById('bars-container');
    if (barsContainer) {
      barsContainer.insertBefore(this.oxygenBarEl, barsContainer.firstChild);
    } else {
      document.body.appendChild(this.oxygenBarEl);
    }

    this.buildHotbar();
    this.buildHealthBar();
    this.buildHungerBar();
    this.buildOxygenBar();
  }

  private buildHotbar(): void {
    this.hotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === this.selectedSlot ? ' active' : '');

      const numberLabel = document.createElement('span');
      numberLabel.className = 'slot-number';
      numberLabel.textContent = String(i + 1);
      slot.appendChild(numberLabel);

      const itemContainer = document.createElement('div');
      itemContainer.className = 'slot-item';
      slot.appendChild(itemContainer);

      const countLabel = document.createElement('span');
      countLabel.className = 'slot-count';
      slot.appendChild(countLabel);

      this.hotbarEl.appendChild(slot);
      this.hotbarSlots.push(slot);
    }
  }

  private buildHealthBar(): void {
    this.healthBarEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 18;
      canvas.height = 18;
      canvas.className = 'heart-icon';
      this.healthBarEl.appendChild(canvas);
      this.heartCanvases.push(canvas);
    }
  }

  private buildHungerBar(): void {
    this.hungerBarEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 18;
      canvas.height = 18;
      canvas.className = 'hunger-icon';
      this.hungerBarEl.appendChild(canvas);
      this.hungerCanvases.push(canvas);
    }
  }

  private buildOxygenBar(): void {
    this.oxygenBarEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 18;
      canvas.height = 18;
      canvas.style.cssText = 'width:18px;height:18px;';
      this.oxygenBarEl.appendChild(canvas);
      this.oxygenCanvases.push(canvas);
    }
  }

  private drawBubble(canvas: HTMLCanvasElement, fill: 'full' | 'half' | 'empty', popPhase: number): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 18, 18);

    if (fill === 'empty') {
      // Popped bubble: show burst marks
      if (popPhase > 0) {
        ctx.strokeStyle = 'rgba(100,180,255,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + popPhase;
          const inner = 3;
          const outer = 6;
          ctx.beginPath();
          ctx.moveTo(9 + Math.cos(angle) * inner, 9 + Math.sin(angle) * inner);
          ctx.lineTo(9 + Math.cos(angle) * outer, 9 + Math.sin(angle) * outer);
          ctx.stroke();
        }
      }
      return;
    }

    // Bubble outline
    ctx.beginPath();
    ctx.arc(9, 9, 7, 0, Math.PI * 2);
    ctx.strokeStyle = fill === 'full' ? 'rgba(100,180,255,0.8)' : 'rgba(100,180,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (fill === 'full') {
      // Filled bubble: translucent blue interior
      ctx.beginPath();
      ctx.arc(9, 9, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,160,240,0.35)';
      ctx.fill();

      // Shine highlight
      ctx.beginPath();
      ctx.arc(7, 6, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      ctx.fill();
    } else {
      // Half bubble: partially filled
      ctx.beginPath();
      ctx.arc(9, 9, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,160,240,0.15)';
      ctx.fill();
    }
  }

  private drawHeart(canvas: HTMLCanvasElement, fill: 'full' | 'half' | 'empty'): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 18, 18);

    // Background outline
    ctx.fillStyle = '#1a1a1a';
    this.drawHeartShape(ctx, 9, 9, 8);

    if (fill === 'full') {
      ctx.fillStyle = '#e01030';
      this.drawHeartShape(ctx, 9, 9, 6);
      ctx.fillStyle = '#ff4060';
      this.drawHeartShape(ctx, 8, 8, 3);
    } else if (fill === 'half') {
      ctx.fillStyle = '#e01030';
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 9, 18);
      ctx.clip();
      this.drawHeartShape(ctx, 9, 9, 6);
      ctx.restore();
      ctx.fillStyle = '#3a3a3a';
      ctx.save();
      ctx.beginPath();
      ctx.rect(9, 0, 9, 18);
      ctx.clip();
      this.drawHeartShape(ctx, 9, 9, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = '#3a3a3a';
      this.drawHeartShape(ctx, 9, 9, 6);
    }
  }

  private drawHeartShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    const topY = cy - size * 0.3;
    ctx.moveTo(cx, cy + size * 0.6);
    ctx.bezierCurveTo(cx - size, cy, cx - size, topY - size * 0.3, cx - size * 0.5, topY - size * 0.3);
    ctx.bezierCurveTo(cx - size * 0.1, topY - size * 0.3, cx, topY, cx, topY + size * 0.1);
    ctx.bezierCurveTo(cx, topY, cx + size * 0.1, topY - size * 0.3, cx + size * 0.5, topY - size * 0.3);
    ctx.bezierCurveTo(cx + size, topY - size * 0.3, cx + size, cy, cx, cy + size * 0.6);
    ctx.fill();
  }

  private drawDrumstick(canvas: HTMLCanvasElement, fill: 'full' | 'half' | 'empty'): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 18, 18);

    // Background outline
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(10, 8, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(3, 10, 5, 6);

    if (fill === 'full') {
      ctx.fillStyle = '#c47634';
      ctx.beginPath();
      ctx.ellipse(10, 8, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a05828';
      ctx.fillRect(4, 10, 3, 5);
      ctx.fillStyle = '#d4965c';
      ctx.beginPath();
      ctx.ellipse(9, 7, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (fill === 'half') {
      ctx.fillStyle = '#c47634';
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 9, 18);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(10, 8, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(4, 10, 3, 5);
      ctx.restore();
      ctx.fillStyle = '#3a3a3a';
      ctx.save();
      ctx.beginPath();
      ctx.rect(9, 0, 9, 18);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(10, 8, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath();
      ctx.ellipse(10, 8, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(4, 10, 3, 5);
    }
  }

  setAimingAtMob(aiming: boolean): void {
    this.isAimingAtMob = aiming;
  }

  update(fps: number, player: Player, sky: Sky, dt: number): void {
    // Debug info
    const ridingInfo = player.isRiding ? ' [RIDING]' : '';
    const modeInfo = player.isCreative ? ' [CREATIVE]' : '';
    const flyInfo = player.isFlying ? ' [FLYING]' : '';
    this.debugEl.innerHTML = [
      `FPS: ${fps}`,
      `XYZ: ${player.x.toFixed(1)} / ${player.y.toFixed(1)} / ${player.z.toFixed(1)}${ridingInfo}${modeInfo}${flyInfo}`,
      `${sky.getTimeLabel()} (${(sky.getTimeOfDay() * 24).toFixed(1)}h)`,
      `Grounded: ${player.grounded} | Armor: ${player.armor}`,
      `Seed: ${worldSeed}`,
    ].join('<br>');

    // Damage flash
    if (player.health < this.lastHealth) {
      this.damageFlashTime = 0.3;
    }
    this.lastHealth = player.health;
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= dt;
    }

    // Damage overlay (red vignette)
    if (player.hurtFlashTimer > 0) {
      this.damageOverlay.style.opacity = String(Math.min(1, player.hurtFlashTimer * 3));
    } else {
      this.damageOverlay.style.opacity = '0';
    }

    // Crosshair color: red when aiming at mob
    if (this.crosshairEl) {
      this.crosshairEl.style.color = this.isAimingAtMob ? '#ff4444' : 'white';
    }

    // Update hearts
    for (let i = 0; i < 10; i++) {
      const heartVal = player.health - i * 2;
      let fill: 'full' | 'half' | 'empty';
      if (heartVal >= 2) fill = 'full';
      else if (heartVal >= 1) fill = 'half';
      else fill = 'empty';
      this.drawHeart(this.heartCanvases[i], fill);
    }

    // Update hunger
    for (let i = 0; i < 10; i++) {
      const hungerVal = player.hunger - i * 2;
      let fill: 'full' | 'half' | 'empty';
      if (hungerVal >= 2) fill = 'full';
      else if (hungerVal >= 1) fill = 'half';
      else fill = 'empty';
      this.drawDrumstick(this.hungerCanvases[i], fill);
    }

    // Update oxygen bubbles (only visible when underwater or oxygen < max)
    const showOxygen = player.isInWater || player.oxygen < player.maxOxygen;
    if (showOxygen) {
      this.oxygenBarEl.style.height = 'auto';
      this.oxygenBarEl.style.overflow = 'visible';
      this.oxygenBarEl.style.opacity = '1';
      for (let i = 0; i < 10; i++) {
        const oxygenVal = player.oxygen - i;
        let fill: 'full' | 'half' | 'empty';
        if (oxygenVal >= 1) fill = 'full';
        else if (oxygenVal >= 0.5) fill = 'half';
        else fill = 'empty';
        const popPhase = fill === 'empty' ? (performance.now() / 1000 + i) : 0;
        this.drawBubble(this.oxygenCanvases[i], fill, popPhase);
      }
    } else {
      this.oxygenBarEl.style.opacity = '0';
      this.oxygenBarEl.style.height = '0';
      this.oxygenBarEl.style.overflow = 'hidden';
    }

    // Update XP bar (cosmetic for now)
    const xpFill = this.xpBarEl.querySelector('.xp-fill') as HTMLElement;
    if (xpFill) {
      xpFill.style.width = '0%';
    }

    // Update hotbar slots
    this.updateHotbarSlots();
  }

  private updateHotbarSlots(): void {
    for (let i = 0; i < 9; i++) {
      const slot = this.hotbarSlots[i];
      const itemContainer = slot.querySelector('.slot-item') as HTMLElement;
      const countLabel = slot.querySelector('.slot-count') as HTMLElement;
      const stack = this.inventory.hotbar[i];

      itemContainer.innerHTML = '';
      countLabel.textContent = '';

      if (stack) {
        const canvas = this.getItemCanvas(stack);
        if (canvas) {
          itemContainer.appendChild(canvas);
        }
        if (stack.count > 1) {
          countLabel.textContent = String(stack.count);
        }
      }
    }
  }

  getItemCanvas(stack: ItemStack): HTMLCanvasElement | null {
    const def = ITEM_DEFINITIONS[stack.itemType];
    if (!def) return null;

    if (def.isBlock && def.textureIndex !== undefined && def.textureIndex >= 0) {
      const canvas = this.atlas.getTextureCanvas(def.textureIndex);
      canvas.className = 'item-icon';
      return canvas;
    }

    // Non-block items: draw procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    canvas.className = 'item-icon';
    const ctx = canvas.getContext('2d')!;
    this.drawItemIcon(ctx, stack.itemType);
    return canvas;
  }

  private drawItemIcon(ctx: CanvasRenderingContext2D, type: ItemType): void {
    switch (type) {
      case ItemType.STICK:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 2, 2, 12);
        ctx.fillStyle = '#A07828';
        ctx.fillRect(7, 2, 1, 12);
        break;
      case ItemType.WOODEN_PICKAXE:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillStyle = '#B4924A';
        ctx.fillRect(3, 2, 10, 3);
        ctx.fillStyle = '#A0823C';
        ctx.fillRect(3, 3, 10, 1);
        break;
      case ItemType.STONE_PICKAXE:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillStyle = '#888';
        ctx.fillRect(3, 2, 10, 3);
        ctx.fillStyle = '#777';
        ctx.fillRect(3, 3, 10, 1);
        break;
      case ItemType.WOODEN_SWORD:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 10, 2, 5);
        ctx.fillStyle = '#B4924A';
        ctx.fillRect(6, 3, 4, 8);
        ctx.fillStyle = '#A0823C';
        ctx.fillRect(7, 2, 2, 1);
        ctx.fillStyle = '#5C4420';
        ctx.fillRect(5, 9, 6, 2);
        break;
      case ItemType.STONE_SWORD:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(7, 10, 2, 5);
        ctx.fillStyle = '#888';
        ctx.fillRect(6, 3, 4, 8);
        ctx.fillStyle = '#999';
        ctx.fillRect(7, 2, 2, 1);
        ctx.fillStyle = '#5C4420';
        ctx.fillRect(5, 9, 6, 2);
        break;
    }
  }

  handleInput(input: InputManager): void {
    const num = input.getNumberKeyPressed();
    if (num > 0 && num <= 9) {
      this.setSelectedSlot(num - 1);
    }

    // Scroll wheel for hotbar
    if (input.scrollDelta !== 0) {
      let newSlot = this.selectedSlot + (input.scrollDelta > 0 ? 1 : -1);
      if (newSlot < 0) newSlot = 8;
      if (newSlot > 8) newSlot = 0;
      this.setSelectedSlot(newSlot);
    }
  }

  private setSelectedSlot(index: number): void {
    if (index === this.selectedSlot) return;
    this.hotbarSlots[this.selectedSlot]?.classList.remove('active');
    this.selectedSlot = index;
    this.hotbarSlots[this.selectedSlot]?.classList.add('active');
  }

  getSelectedSlot(): number {
    return this.selectedSlot;
  }

  getSelectedItemStack(): ItemStack | null {
    return this.inventory.hotbar[this.selectedSlot];
  }
}
