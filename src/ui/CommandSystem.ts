/**
 * CommandSystem - Chat/command UI for voxel game.
 * Opens with T or / key. DOM-based input and message history.
 */

const COMMANDS = [
  'give',
  'tp',
  'time',
  'weather',
  'gamemode',
  'kill',
  'spawn',
  'seed',
  'difficulty',
  'summon',
  'effect',
  'xp',
  'fly',
] as const;

const SUBCOMMANDS: Record<string, readonly string[]> = {
  time: ['set'],
  'time set': ['day', 'night', 'noon', 'midnight'],
  weather: ['clear', 'rain', 'thunder', 'snow'],
  gamemode: ['survival', 'creative'],
  difficulty: ['peaceful', 'easy', 'normal', 'hard'],
};

const MESSAGE_FADE_DURATION = 5;

export class CommandSystem {
  onCommand: ((cmd: string, args: string[]) => void) | null = null;

  private container: HTMLDivElement;
  private messagesContainer: HTMLDivElement;
  private input: HTMLInputElement;
  private isOpenState = false;
  private history: string[] = [];
  private historyIndex = -1;
  private pendingHistory: string = '';
  private messageEntries: Array<{ el: HTMLDivElement; createdAt: number }> = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px 24px;
      pointer-events: none;
      font-family: monospace;
      font-size: 14px;
      color: #fff;
      z-index: 1000;
    `;

    this.messagesContainer = document.createElement('div');
    this.messagesContainer.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Enter command...';
    this.input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 14px;
      color: #fff;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      outline: none;
      pointer-events: auto;
    `;

    this.container.appendChild(this.messagesContainer);
    this.container.appendChild(this.input);

    this.input.addEventListener('keydown', (e) => this.handleInputKeyDown(e));
    this.input.addEventListener('blur', () => this.close());

    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  }

  open(): void {
    this.isOpenState = true;
    this.container.style.display = 'block';
    this.container.style.pointerEvents = 'auto';
    this.input.value = '';
    this.input.focus();
    this.historyIndex = -1;
    this.pendingHistory = '';
  }

  close(): void {
    this.isOpenState = false;
    this.container.style.display = 'none';
    this.container.style.pointerEvents = 'none';
  }

  isOpen(): boolean {
    return this.isOpenState;
  }

  handleKeyDown(key: string): boolean {
    if (key === 't' || key === 'T' || key === '/') {
      if (!this.isOpenState) {
        this.open();
        if (key === '/') {
          this.input.value = '/';
          this.input.setSelectionRange(1, 1);
        }
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    const now = performance.now() / 1000;
    for (let i = this.messageEntries.length - 1; i >= 0; i--) {
      const entry = this.messageEntries[i];
      const age = now - entry.createdAt;
      if (age > MESSAGE_FADE_DURATION) {
        const opacity = Math.max(0, 1 - (age - MESSAGE_FADE_DURATION) / 1);
        entry.el.style.opacity = String(opacity);
        if (opacity <= 0) {
          entry.el.remove();
          this.messageEntries.splice(i, 1);
        }
      }
    }
  }

  addMessage(text: string, color?: string): void {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      padding: 2px 0;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      ${color ? `color: ${color};` : ''}
    `;
    this.messagesContainer.appendChild(el);
    this.messageEntries.push({ el, createdAt: performance.now() / 1000 });
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private handleInputKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.submitCommand();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.navigateHistory(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigateHistory(1);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this.autocomplete();
      return;
    }
  }

  private submitCommand(): void {
    const raw = this.input.value.trim();
    if (!raw) {
      this.close();
      return;
    }
    if (raw.startsWith('/')) {
      const rest = raw.slice(1).trim();
      const parts = rest.split(/\s+/);
      const cmd = parts[0]?.toLowerCase() ?? '';
      const args = parts.slice(1);
      this.history.push(raw);
      if (this.history.length > 50) this.history.shift();
      this.historyIndex = -1;
      this.pendingHistory = '';
      if (this.onCommand) {
        this.onCommand(cmd, args);
      }
    } else {
      this.addMessage(`<Player> ${raw}`);
      this.history.push(raw);
      if (this.history.length > 50) this.history.shift();
      this.historyIndex = -1;
      this.pendingHistory = '';
    }
    this.input.value = '';
  }

  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;
    if (this.historyIndex === -1) {
      this.pendingHistory = this.input.value;
    }
    this.historyIndex = Math.max(-1, Math.min(this.history.length - 1, this.historyIndex + direction));
    if (this.historyIndex === -1) {
      this.input.value = this.pendingHistory;
    } else {
      this.input.value = this.history[this.history.length - 1 - this.historyIndex];
    }
  }

  private autocomplete(): void {
    const raw = this.input.value.trim();
    if (!raw.startsWith('/')) return;
    const rest = raw.slice(1).trim();
    const parts = rest.split(/\s+/);
    const prefix = parts[parts.length - 1]?.toLowerCase() ?? '';

    let candidates: string[] = [];
    if (parts.length === 1) {
      candidates = COMMANDS.filter((c) => c.startsWith(prefix));
    } else if (parts.length === 2 && parts[0] === 'time') {
      candidates = SUBCOMMANDS['time']?.filter((c) => c.startsWith(prefix)) ?? [];
    } else if (parts.length === 3 && parts[0] === 'time' && parts[1] === 'set') {
      candidates = SUBCOMMANDS['time set']?.filter((c) => c.startsWith(prefix)) ?? [];
    } else if (parts.length === 2) {
      const subKey = parts[0];
      const sub = SUBCOMMANDS[subKey];
      if (sub) candidates = sub.filter((c) => c.startsWith(prefix));
    }

    if (candidates.length === 1) {
      const base = parts.slice(0, -1).join(' ');
      const completed = base ? `${base} ${candidates[0]}` : candidates[0];
      this.input.value = '/' + completed + ' ';
      this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    } else if (candidates.length > 1) {
      const common = this.getCommonPrefix(candidates);
      if (common.length > prefix.length) {
        const base = parts.slice(0, -1).join(' ');
        const completed = base ? `${base} ${common}` : common;
        this.input.value = '/' + completed;
        this.input.setSelectionRange(this.input.value.length, this.input.value.length);
      } else {
        this.addMessage(`Suggestions: ${candidates.join(', ')}`, '#aaa');
      }
    }
  }

  private getCommonPrefix(choices: string[]): string {
    if (choices.length === 0) return '';
    let prefix = choices[0];
    for (let i = 1; i < choices.length; i++) {
      while (!choices[i].startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
    }
    return prefix;
  }
}
