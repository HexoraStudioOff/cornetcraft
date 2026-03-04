import { StructureTypeName } from '../world/StructureGenerator';

export class PauseMenu {
  private readonly menuEl: HTMLElement;
  private readonly resumeBtn: HTMLElement;
  private readonly optionsBtn: HTMLElement;
  private readonly quitBtn: HTMLElement;
  private readonly adminBtn: HTMLElement;
  private readonly adminPanel: HTMLElement;
  private isVisible: boolean = false;

  /** Callback to request pointer lock again */
  onResume: (() => void) | null = null;
  /** Callback when admin requests teleport to a structure type */
  onTeleportToStructure: ((type: StructureTypeName) => void) | null = null;
  /** Callback when options button is clicked */
  onOpenOptions: (() => void) | null = null;

  constructor() {
    this.menuEl = document.getElementById('pause-menu')!;
    this.resumeBtn = document.getElementById('btn-resume')!;
    this.optionsBtn = document.getElementById('btn-options')!;
    this.quitBtn = document.getElementById('btn-quit')!;

    // Create admin button
    this.adminBtn = document.createElement('button');
    this.adminBtn.className = 'mc-button';
    this.adminBtn.textContent = 'Admin';
    this.adminBtn.style.marginTop = '12px';
    this.adminBtn.style.background = 'linear-gradient(to bottom, #6a2c70, #4a1a50)';
    this.adminBtn.style.borderColor = '#8a3c90';
    this.menuEl.appendChild(this.adminBtn);

    // Create admin panel (hidden by default)
    this.adminPanel = document.createElement('div');
    this.adminPanel.style.display = 'none';
    this.adminPanel.style.marginTop = '8px';
    this.adminPanel.style.padding = '10px';
    this.adminPanel.style.background = 'rgba(40, 10, 50, 0.85)';
    this.adminPanel.style.borderRadius = '4px';
    this.adminPanel.style.border = '2px solid #8a3c90';

    const panelTitle = document.createElement('div');
    panelTitle.textContent = 'Teleport to Structure';
    panelTitle.style.cssText = 'color: #daa0e0; font-size: 13px; margin-bottom: 8px; text-align: center; font-weight: bold;';
    this.adminPanel.appendChild(panelTitle);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;';

    const structures: { name: string; type: StructureTypeName }[] = [
      { name: 'Castle', type: 'castle' },
      { name: 'Village', type: 'village' },
      { name: 'Temple', type: 'temple' },
      { name: 'Ruins', type: 'ruins' },
    ];

    for (const s of structures) {
      const btn = document.createElement('button');
      btn.className = 'mc-button';
      btn.textContent = s.name;
      btn.style.cssText = 'padding: 6px 10px; font-size: 12px; min-width: 0;';
      btn.addEventListener('click', () => {
        if (this.onTeleportToStructure) {
          this.onTeleportToStructure(s.type);
        }
      });
      btnContainer.appendChild(btn);
    }

    this.adminPanel.appendChild(btnContainer);
    this.menuEl.appendChild(this.adminPanel);

    // Event listeners
    this.resumeBtn.addEventListener('click', () => {
      this.hide();
      if (this.onResume) this.onResume();
    });

    this.optionsBtn.addEventListener('click', () => {
      if (this.onOpenOptions) this.onOpenOptions();
    });

    this.quitBtn.addEventListener('click', () => {
      window.location.reload();
    });

    this.adminBtn.addEventListener('click', () => {
      const visible = this.adminPanel.style.display === 'none';
      this.adminPanel.style.display = visible ? 'block' : 'none';
      this.adminBtn.textContent = visible ? 'Admin (close)' : 'Admin';
    });
  }

  show(): void {
    this.isVisible = true;
    this.menuEl.style.display = 'flex';
    this.adminPanel.style.display = 'none';
    this.adminBtn.textContent = 'Admin';
  }

  hide(): void {
    this.isVisible = false;
    this.menuEl.style.display = 'none';
    this.adminPanel.style.display = 'none';
    this.adminBtn.textContent = 'Admin';
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
