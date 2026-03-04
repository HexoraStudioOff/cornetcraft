export class XPSystem {
  private totalXP: number = 0;
  private currentLevel: number = 0;

  addXP(amount: number): void {
    this.totalXP += amount;
    this.recalculateLevel();
  }

  getLevel(): number {
    return this.currentLevel;
  }

  getXP(): number {
    return this.totalXP;
  }

  getXPForNextLevel(): number {
    return (this.currentLevel + 1) * 7;
  }

  getProgress(): number {
    const xpForCurrent = this.getXPForLevel(this.currentLevel);
    const xpForNext = this.getXPForLevel(this.currentLevel + 1);
    const range = xpForNext - xpForCurrent;
    if (range <= 0) return 0;
    return Math.min(1, (this.totalXP - xpForCurrent) / range);
  }

  private getXPForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i <= level; i++) {
      total += i * 7;
    }
    return total;
  }

  private recalculateLevel(): void {
    let level = 0;
    let xpNeeded = 0;
    while (true) {
      const next = xpNeeded + (level + 1) * 7;
      if (this.totalXP < next) break;
      xpNeeded = next;
      level++;
    }
    this.currentLevel = level;
  }
}
