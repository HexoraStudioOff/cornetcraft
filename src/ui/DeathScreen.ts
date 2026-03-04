export interface DeathStats {
  mobsKilled: number;
  distanceTraveled: number;
  blocksMined: number;
  survivalTime: number;
}

export class DeathScreen {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private contentWrapper: HTMLDivElement;
  private title: HTMLDivElement;
  private statsContainer: HTMLDivElement;
  private mobsKilledEl: HTMLSpanElement;
  private distanceTraveledEl: HTMLSpanElement;
  private blocksMinedEl: HTMLSpanElement;
  private survivalTimeEl: HTMLSpanElement;
  private buttonsContainer: HTMLDivElement;
  private respawnBtn: HTMLButtonElement;
  private titleScreenBtn: HTMLButtonElement;

  private _visible = false;
  private _tiltAngle = 0;
  private _elapsedTime = 0;

  onRespawn: (() => void) | null = null;
  onTitleScreen: (() => void) | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      z-index: 1000;
      pointer-events: none;
    `;

    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(120, 0, 0, 0.6);
      pointer-events: auto;
    `;

    this.title = document.createElement("div");
    this.title.textContent = "YOU DIED";
    this.title.style.cssText = `
      position: relative;
      font-family: 'Courier New', monospace;
      font-size: 72px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 4px 4px 0 #8b0000, -2px -2px 0 #8b0000;
      letter-spacing: 0.1em;
      margin-bottom: 32px;
      animation: deathTitleIn 1.5s ease-out forwards;
      opacity: 0;
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes deathTitleIn {
        0% {
          opacity: 0;
          transform: scale(0.5);
        }
        60% {
          opacity: 1;
          transform: scale(1.1);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(styleSheet);

    this.statsContainer = document.createElement("div");
    this.statsContainer.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 18px;
      color: #e0e0e0;
      text-align: center;
      line-height: 2;
      margin-bottom: 24px;
      text-shadow: 1px 1px 0 #333;
    `;

    this.mobsKilledEl = document.createElement("span");
    this.distanceTraveledEl = document.createElement("span");
    this.blocksMinedEl = document.createElement("span");
    this.survivalTimeEl = document.createElement("span");

    this.statsContainer.appendChild(document.createTextNode("Mobs Killed: "));
    this.statsContainer.appendChild(this.mobsKilledEl);
    this.statsContainer.appendChild(document.createElement("br"));
    this.statsContainer.appendChild(document.createTextNode("Distance Traveled: "));
    this.statsContainer.appendChild(this.distanceTraveledEl);
    this.statsContainer.appendChild(document.createElement("br"));
    this.statsContainer.appendChild(document.createTextNode("Blocks Mined: "));
    this.statsContainer.appendChild(this.blocksMinedEl);
    this.statsContainer.appendChild(document.createElement("br"));
    this.statsContainer.appendChild(document.createTextNode("Survival Time: "));
    this.statsContainer.appendChild(this.survivalTimeEl);

    this.buttonsContainer = document.createElement("div");
    this.buttonsContainer.style.cssText = `
      display: flex;
      gap: 16px;
      margin-top: 16px;
    `;

    this.respawnBtn = document.createElement("button");
    this.respawnBtn.textContent = "Respawn";
    this.respawnBtn.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 20px;
      padding: 12px 24px;
      background: #4a4a4a;
      color: #ffffff;
      border: 3px solid #2a2a2a;
      cursor: pointer;
      text-shadow: 1px 1px 0 #000;
      box-shadow: 2px 2px 0 #000;
    `;
    this.respawnBtn.addEventListener("click", () => this.onRespawn?.());

    this.titleScreenBtn = document.createElement("button");
    this.titleScreenBtn.textContent = "Title Screen";
    this.titleScreenBtn.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 20px;
      padding: 12px 24px;
      background: #4a4a4a;
      color: #ffffff;
      border: 3px solid #2a2a2a;
      cursor: pointer;
      text-shadow: 1px 1px 0 #000;
      box-shadow: 2px 2px 0 #000;
    `;
    this.titleScreenBtn.addEventListener("click", () => this.onTitleScreen?.());

    this.buttonsContainer.appendChild(this.respawnBtn);
    this.buttonsContainer.appendChild(this.titleScreenBtn);

    this.contentWrapper = document.createElement("div");
    this.contentWrapper.style.cssText = `
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: auto;
      transition: transform 0.1s linear;
      transform-origin: center center;
    `;
    this.contentWrapper.appendChild(this.title);
    this.contentWrapper.appendChild(this.statsContainer);
    this.contentWrapper.appendChild(this.buttonsContainer);

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.contentWrapper);

    document.body.appendChild(this.container);
  }

  show(stats: DeathStats): void {
    this._visible = true;
    this._tiltAngle = 0;
    this._elapsedTime = 0;

    this.mobsKilledEl.textContent = String(stats.mobsKilled);
    this.distanceTraveledEl.textContent = `${stats.distanceTraveled.toFixed(0)} m`;
    this.blocksMinedEl.textContent = String(stats.blocksMined);
    this.survivalTimeEl.textContent = this.formatSurvivalTime(stats.survivalTime);

    this.title.style.animation = "none";
    this.title.offsetHeight;
    this.title.style.animation = "deathTitleIn 1.5s ease-out forwards";

    this.container.style.display = "flex";
  }

  hide(): void {
    this._visible = false;
    this.container.style.display = "none";
  }

  isVisible(): boolean {
    return this._visible;
  }

  update(dt: number): void {
    if (!this._visible) return;

    this._elapsedTime += dt;
    this._tiltAngle = Math.min(this._elapsedTime * 2, 8);
    this.contentWrapper.style.transform = `rotate(${this._tiltAngle}deg)`;
  }

  private formatSurvivalTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
}
