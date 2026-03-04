/**
 * Achievements system for voxel game.
 * Tracks stats, unlocks achievements, and shows toast notifications.
 */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "firstBlood", name: "First Blood", description: "Kill a mob", icon: "🩸" },
  { id: "lumberjack", name: "Lumberjack", description: "Cut 100 wood blocks", icon: "🪓" },
  { id: "deepDive", name: "Deep Dive", description: "Reach Y=5", icon: "⛏️" },
  { id: "dragonSlayer", name: "Dragon Slayer", description: "Defeat the Wither Dragon", icon: "🐉" },
  { id: "ironMan", name: "Iron Man", description: "Equip full iron armor", icon: "🛡️" },
  { id: "blingBling", name: "Bling Bling", description: "Equip full diamond armor", icon: "💎" },
  { id: "explorer", name: "Explorer", description: "Travel 10000 blocks", icon: "🗺️" },
  { id: "chef", name: "Chef", description: "Cook food", icon: "🍳" },
  { id: "architect", name: "Architect", description: "Place 1000 blocks", icon: "🏗️" },
  { id: "spelunker", name: "Spelunker", description: "Go below Y=20", icon: "🕳️" },
  { id: "swimmer", name: "Swimmer", description: "Spend 30s underwater", icon: "🏊" },
  { id: "horseWhisperer", name: "Horse Whisperer", description: "Ride a horse", icon: "🐴" },
  { id: "bestFriend", name: "Best Friend", description: "Tame a wolf", icon: "🐺" },
  { id: "sharpshooter", name: "Sharpshooter", description: "Kill a mob with bow at 30+ blocks", icon: "🎯" },
  { id: "survivor", name: "Survivor", description: "Survive 10 nights", icon: "🌙" },
  { id: "tntTime", name: "TNT Time", description: "Explode TNT", icon: "💥" },
  { id: "iceSkating", name: "Ice Skating", description: "Slide on ice 5s", icon: "⛸️" },
  { id: "trampoline", name: "Trampoline", description: "Bounce 10 blocks on slime", icon: "🟢" },
  { id: "rainbowHunter", name: "Rainbow Hunter", description: "See a rainbow", icon: "🌈" },
  { id: "fisherman", name: "Fisherman", description: "Catch a fish", icon: "🎣" },
];

interface StatCondition {
  achievementId: string;
  threshold: number | boolean;
  check: (value: number | boolean) => boolean;
}

const STAT_CONDITIONS: readonly StatCondition[] = [
  { achievementId: "firstBlood", threshold: 1, check: (v) => typeof v === "number" && v >= 1 },
  { achievementId: "lumberjack", threshold: 100, check: (v) => typeof v === "number" && v >= 100 },
  { achievementId: "deepDive", threshold: 5, check: (v) => typeof v === "number" && v <= 5 },
  { achievementId: "dragonSlayer", threshold: true, check: (v) => v === true },
  { achievementId: "ironMan", threshold: true, check: (v) => v === true },
  { achievementId: "blingBling", threshold: true, check: (v) => v === true },
  { achievementId: "explorer", threshold: 10000, check: (v) => typeof v === "number" && v >= 10000 },
  { achievementId: "chef", threshold: 1, check: (v) => typeof v === "number" && v >= 1 },
  { achievementId: "architect", threshold: 1000, check: (v) => typeof v === "number" && v >= 1000 },
  { achievementId: "spelunker", threshold: 20, check: (v) => typeof v === "number" && v <= 20 },
  { achievementId: "swimmer", threshold: 30, check: (v) => typeof v === "number" && v >= 30 },
  { achievementId: "horseWhisperer", threshold: true, check: (v) => v === true },
  { achievementId: "bestFriend", threshold: true, check: (v) => v === true },
  { achievementId: "sharpshooter", threshold: true, check: (v) => v === true },
  { achievementId: "survivor", threshold: 10, check: (v) => typeof v === "number" && v >= 10 },
  { achievementId: "tntTime", threshold: true, check: (v) => v === true },
  { achievementId: "iceSkating", threshold: 5, check: (v) => typeof v === "number" && v >= 5 },
  { achievementId: "trampoline", threshold: 10, check: (v) => typeof v === "number" && v >= 10 },
  { achievementId: "rainbowHunter", threshold: true, check: (v) => v === true },
  { achievementId: "fisherman", threshold: 1, check: (v) => typeof v === "number" && v >= 1 },
];

const STAT_TO_ACHIEVEMENT: Readonly<Record<string, string>> = {
  mobKills: "firstBlood",
  woodCut: "lumberjack",
  minY: "deepDive",
  dragonKilled: "dragonSlayer",
  fullIronArmor: "ironMan",
  fullDiamondArmor: "blingBling",
  distanceTraveled: "explorer",
  foodCooked: "chef",
  blocksPlaced: "architect",
  underwaterTime: "swimmer",
  horseRidden: "horseWhisperer",
  wolfTamed: "bestFriend",
  longRangeKill: "sharpshooter",
  nightsSurvived: "survivor",
  tntExploded: "tntTime",
  iceSlideTime: "iceSkating",
  slimeBounceHeight: "trampoline",
  rainbowSeen: "rainbowHunter",
  fishCaught: "fisherman",
};

// minY has two achievements: deepDive (<=5) and spelunker (<=20)
const STAT_MINY_ACHIEVEMENTS = ["deepDive", "spelunker"] as const;

interface ToastState {
  element: HTMLElement;
  timer: number;
  phase: "in" | "hold" | "out";
}

export class AchievementManager {
  private readonly unlocked = new Set<string>();
  private readonly toasts: ToastState[] = [];
  private readonly container: HTMLElement;
  private readonly toastDuration = 3;
  private readonly slideDuration = 0.3;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "achievement-toast-container";
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  unlock(id: string): void {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    this.showToast(id);
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  getAll(): AchievementDef[] {
    return [...ACHIEVEMENTS];
  }

  getUnlocked(): string[] {
    return [...this.unlocked];
  }

  checkCondition(stat: string, value: number | boolean): void {
    if (stat === "minY") {
      const numVal = typeof value === "number" ? value : 0;
      if (numVal <= 5 && !this.unlocked.has("deepDive")) this.unlock("deepDive");
      if (numVal <= 20 && !this.unlocked.has("spelunker")) this.unlock("spelunker");
      return;
    }

    const achievementId = STAT_TO_ACHIEVEMENT[stat];
    if (!achievementId || this.unlocked.has(achievementId)) return;

    const condition = STAT_CONDITIONS.find((c) => c.achievementId === achievementId);
    if (condition?.check(value)) {
      this.unlock(achievementId);
    }
  }

  update(dt: number): void {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i];
      toast.timer -= dt;

      if (toast.phase === "in") {
        const progress = 1 - toast.timer / this.slideDuration;
        const eased = 1 - (1 - progress) ** 2;
        toast.element.style.transform = `translateY(${-100 + eased * 100}px)`;
        toast.element.style.opacity = String(eased);
        if (toast.timer <= 0) {
          toast.phase = "hold";
          toast.timer = this.toastDuration;
        }
      } else if (toast.phase === "hold") {
        if (toast.timer <= 0) {
          toast.phase = "out";
          toast.timer = this.slideDuration;
        }
      } else if (toast.phase === "out") {
        const progress = 1 - toast.timer / this.slideDuration;
        const eased = progress ** 2;
        toast.element.style.transform = `translateY(${-eased * 100}px)`;
        toast.element.style.opacity = String(1 - eased);
        if (toast.timer <= 0) {
          this.container.removeChild(toast.element);
          this.toasts.splice(i, 1);
        }
      }
    }
  }

  dispose(): void {
    for (const toast of this.toasts) {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
    }
    this.toasts.length = 0;
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  private showToast(id: string): void {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;

    const el = document.createElement("div");
    el.className = "achievement-toast";
    el.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 2px solid #d4af37;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
      transform: translateY(-100px);
      opacity: 0;
      transition: none;
      font-family: system-ui, sans-serif;
      color: #fff;
    `;

    const iconEl = document.createElement("span");
    iconEl.textContent = def.icon;
    iconEl.style.cssText = `font-size: 32px; line-height: 1;`;

    const textWrap = document.createElement("div");
    textWrap.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;

    const nameEl = document.createElement("div");
    nameEl.textContent = def.name;
    nameEl.style.cssText = `font-weight: bold; font-size: 16px; color: #d4af37;`;

    const subEl = document.createElement("div");
    subEl.textContent = "Achievement Unlocked!";
    subEl.style.cssText = `font-size: 12px; color: #aaa;`;

    textWrap.appendChild(nameEl);
    textWrap.appendChild(subEl);
    el.appendChild(iconEl);
    el.appendChild(textWrap);

    this.container.appendChild(el);

    this.toasts.push({
      element: el,
      timer: this.slideDuration,
      phase: "in",
    });
  }
}
