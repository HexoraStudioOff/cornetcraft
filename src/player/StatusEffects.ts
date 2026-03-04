/**
 * Status effects (potion effects) system for the voxel game.
 * Self-contained, no external imports.
 */

export enum StatusEffectType {
  SPEED = "SPEED",
  JUMP_BOOST = "JUMP_BOOST",
  REGENERATION = "REGENERATION",
  NIGHT_VISION = "NIGHT_VISION",
  STRENGTH = "STRENGTH",
  FIRE_RESISTANCE = "FIRE_RESISTANCE",
  SLOW_FALLING = "SLOW_FALLING",
  INVISIBILITY = "INVISIBILITY",
}

export interface ActiveEffect {
  readonly type: StatusEffectType;
  readonly duration: number;
  readonly level: number;
  remainingTime: number;
}

export class StatusEffectManager {
  private readonly effects: Map<StatusEffectType, ActiveEffect> = new Map();

  addEffect(type: StatusEffectType, duration: number, level: number = 1): void {
    const existing = this.effects.get(type);
    const effectiveLevel = Math.max(level, existing?.level ?? 0);
    const effectiveDuration = existing
      ? Math.max(existing.remainingTime, duration)
      : duration;

    this.effects.set(type, {
      type,
      duration: effectiveDuration,
      level: effectiveLevel,
      remainingTime: effectiveDuration,
    });
  }

  removeEffect(type: StatusEffectType): void {
    this.effects.delete(type);
  }

  hasEffect(type: StatusEffectType): boolean {
    return this.effects.has(type);
  }

  getEffectLevel(type: StatusEffectType): number {
    return this.effects.get(type)?.level ?? 0;
  }

  getActiveEffects(): ActiveEffect[] {
    return Array.from(this.effects.values());
  }

  update(dt: number): void {
    for (const [type, effect] of this.effects.entries()) {
      effect.remainingTime -= dt;
      if (effect.remainingTime <= 0) {
        this.effects.delete(type);
      }
    }
  }

  getSpeedMultiplier(): number {
    if (!this.hasEffect(StatusEffectType.SPEED)) return 1;
    const level = this.getEffectLevel(StatusEffectType.SPEED);
    return 1 + 0.4 * level; // +40% per level
  }

  getJumpMultiplier(): number {
    if (!this.hasEffect(StatusEffectType.JUMP_BOOST)) return 1;
    const level = this.getEffectLevel(StatusEffectType.JUMP_BOOST);
    return 1 + 0.7 * level; // +70% per level
  }

  getDamageBonus(): number {
    if (!this.hasEffect(StatusEffectType.STRENGTH)) return 0;
    const level = this.getEffectLevel(StatusEffectType.STRENGTH);
    return 3 * level; // +3 per level
  }

  hasFireResistance(): boolean {
    return this.hasEffect(StatusEffectType.FIRE_RESISTANCE);
  }

  hasNightVision(): boolean {
    return this.hasEffect(StatusEffectType.NIGHT_VISION);
  }

  hasSlowFalling(): boolean {
    return this.hasEffect(StatusEffectType.SLOW_FALLING);
  }

  isInvisible(): boolean {
    return this.hasEffect(StatusEffectType.INVISIBILITY);
  }
}
