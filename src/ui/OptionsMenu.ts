export interface GameSettings {
  // Video
  renderDistance: number;
  fov: number;
  shadowsEnabled: boolean;
  bloomEnabled: boolean;
  ssaoEnabled: boolean;
  godRaysEnabled: boolean;
  // Audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  // Controls
  mouseSensitivity: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  renderDistance: 5,
  fov: 75,
  shadowsEnabled: true,
  bloomEnabled: true,
  ssaoEnabled: true,
  godRaysEnabled: true,
  masterVolume: 1.0,
  musicVolume: 0.5,
  sfxVolume: 1.0,
  mouseSensitivity: 1.0,
};

const STORAGE_KEY = 'claudecraft_settings';

type SettingsChangeCallback = (settings: GameSettings) => void;

export class OptionsMenu {
  private overlay: HTMLDivElement;
  private panel: HTMLDivElement;
  private isVisible: boolean = false;
  private settings: GameSettings;
  private currentTab: 'video' | 'audio' | 'controls' = 'video';
  private onSettingsChange: SettingsChangeCallback | null = null;
  onClose: (() => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.overlay = document.createElement('div');
    this.overlay.id = 'options-overlay';
    this.panel = document.createElement('div');
    this.panel.id = 'options-panel';
    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);
    this.buildUI();
    this.hide();
  }

  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  setOnSettingsChange(cb: SettingsChangeCallback): void {
    this.onSettingsChange = cb;
  }

  private notifyChange(): void {
    this.saveSettings();
    if (this.onSettingsChange) this.onSettingsChange(this.settings);
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  private buildUI(): void {
    this.panel.innerHTML = '';

    // Title
    const title = document.createElement('div');
    title.className = 'opt-title';
    title.textContent = 'Options';
    this.panel.appendChild(title);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'opt-tab-bar';
    const tabs: Array<{ id: 'video' | 'audio' | 'controls'; label: string }> = [
      { id: 'video', label: 'Video' },
      { id: 'audio', label: 'Audio' },
      { id: 'controls', label: 'Controls' },
    ];
    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = 'opt-tab' + (this.currentTab === tab.id ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        this.currentTab = tab.id;
        this.buildUI();
      });
      tabBar.appendChild(btn);
    }
    this.panel.appendChild(tabBar);

    // Content
    const content = document.createElement('div');
    content.className = 'opt-content';

    if (this.currentTab === 'video') this.buildVideoTab(content);
    else if (this.currentTab === 'audio') this.buildAudioTab(content);
    else this.buildControlsTab(content);

    this.panel.appendChild(content);

    // Done button
    const doneBtn = document.createElement('button');
    doneBtn.className = 'opt-done-btn';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => {
      this.hide();
      if (this.onClose) this.onClose();
    });
    this.panel.appendChild(doneBtn);
  }

  private buildVideoTab(container: HTMLElement): void {
    this.addSlider(container, 'Render Distance', this.settings.renderDistance, 3, 10, 1,
      (v) => { this.settings.renderDistance = v; this.notifyChange(); }, (v) => `${v} chunks`);

    this.addSlider(container, 'FOV', this.settings.fov, 60, 110, 5,
      (v) => { this.settings.fov = v; this.notifyChange(); }, (v) => `${v}`);

    this.addToggle(container, 'Shadows', this.settings.shadowsEnabled,
      (v) => { this.settings.shadowsEnabled = v; this.notifyChange(); });

    this.addToggle(container, 'Bloom', this.settings.bloomEnabled,
      (v) => { this.settings.bloomEnabled = v; this.notifyChange(); });

    this.addToggle(container, 'SSAO', this.settings.ssaoEnabled,
      (v) => { this.settings.ssaoEnabled = v; this.notifyChange(); });

    this.addToggle(container, 'God Rays', this.settings.godRaysEnabled,
      (v) => { this.settings.godRaysEnabled = v; this.notifyChange(); });
  }

  private buildAudioTab(container: HTMLElement): void {
    this.addSlider(container, 'Master Volume', Math.round(this.settings.masterVolume * 100), 0, 100, 5,
      (v) => { this.settings.masterVolume = v / 100; this.notifyChange(); }, (v) => `${v}%`);

    this.addSlider(container, 'Music Volume', Math.round(this.settings.musicVolume * 100), 0, 100, 5,
      (v) => { this.settings.musicVolume = v / 100; this.notifyChange(); }, (v) => `${v}%`);

    this.addSlider(container, 'SFX Volume', Math.round(this.settings.sfxVolume * 100), 0, 100, 5,
      (v) => { this.settings.sfxVolume = v / 100; this.notifyChange(); }, (v) => `${v}%`);
  }

  private buildControlsTab(container: HTMLElement): void {
    this.addSlider(container, 'Mouse Sensitivity', Math.round(this.settings.mouseSensitivity * 100), 25, 300, 25,
      (v) => { this.settings.mouseSensitivity = v / 100; this.notifyChange(); }, (v) => `${(v / 100).toFixed(2)}x`);

    // Key bindings display (read-only)
    const keySection = document.createElement('div');
    keySection.className = 'opt-key-section';
    const keyTitle = document.createElement('div');
    keyTitle.className = 'opt-label';
    keyTitle.textContent = 'Key Bindings';
    keyTitle.style.marginTop = '12px';
    keyTitle.style.marginBottom = '6px';
    keySection.appendChild(keyTitle);

    const bindings = [
      ['W / A / S / D', 'Move'],
      ['Space', 'Jump / Swim Up'],
      ['Left Shift', 'Sprint'],
      ['E', 'Inventory'],
      ['Escape', 'Pause'],
      ['T or /', 'Commands'],
      ['M', 'Minimap'],
      ['1-9', 'Hotbar Slot'],
      ['Left Click', 'Break / Attack'],
      ['Right Click', 'Place / Interact'],
      ['F3', 'Debug Info'],
    ];

    for (const [key, action] of bindings) {
      const row = document.createElement('div');
      row.className = 'opt-keybind-row';
      const keyEl = document.createElement('span');
      keyEl.className = 'opt-key';
      keyEl.textContent = key;
      const actionEl = document.createElement('span');
      actionEl.className = 'opt-action';
      actionEl.textContent = action;
      row.appendChild(actionEl);
      row.appendChild(keyEl);
      keySection.appendChild(row);
    }
    container.appendChild(keySection);
  }

  private addSlider(container: HTMLElement, label: string, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void, formatValue: (v: number) => string): void {
    const row = document.createElement('div');
    row.className = 'opt-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'opt-label';
    labelEl.textContent = label;

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'opt-slider-wrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'opt-slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const valEl = document.createElement('span');
    valEl.className = 'opt-value';
    valEl.textContent = formatValue(value);

    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      valEl.textContent = formatValue(v);
      onChange(v);
    });

    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(valEl);
    row.appendChild(labelEl);
    row.appendChild(sliderWrap);
    container.appendChild(row);
  }

  private addToggle(container: HTMLElement, label: string, value: boolean,
    onChange: (v: boolean) => void): void {
    const row = document.createElement('div');
    row.className = 'opt-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'opt-label';
    labelEl.textContent = label;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'opt-toggle' + (value ? ' on' : '');
    toggleBtn.textContent = value ? 'ON' : 'OFF';
    toggleBtn.addEventListener('click', () => {
      const newVal = !toggleBtn.classList.contains('on');
      toggleBtn.classList.toggle('on', newVal);
      toggleBtn.textContent = newVal ? 'ON' : 'OFF';
      onChange(newVal);
    });

    row.appendChild(labelEl);
    row.appendChild(toggleBtn);
    container.appendChild(row);
  }

  show(): void {
    this.isVisible = true;
    this.buildUI();
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.isVisible = false;
    this.overlay.style.display = 'none';
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
