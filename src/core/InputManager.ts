export class InputManager {
  readonly keys: Set<string> = new Set();
  mouseX: number = 0;
  mouseY: number = 0;
  mouseDeltaX: number = 0;
  mouseDeltaY: number = 0;
  leftClick: boolean = false;
  rightClick: boolean = false;
  leftClickHeld: boolean = false;
  scrollDelta: number = 0;
  isPointerLocked: boolean = false;

  // Per-frame key presses (true only on the frame the key was pressed)
  private readonly keyJustPressed: Set<string> = new Set();

  private readonly element: HTMLElement;
  private onPointerLockChange: (() => void) | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.keyJustPressed.add(e.code);
      }
      this.keys.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.leftClick = true;
        this.leftClickHeld = true;
      }
      if (e.button === 2) this.rightClick = true;
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.leftClickHeld = false;
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('wheel', (e) => {
      this.scrollDelta += e.deltaY;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.element;
      if (this.onPointerLockChange) this.onPointerLockChange();
    });
  }

  requestPointerLock(): void {
    this.element.requestPointerLock();
  }

  setPointerLockChangeCallback(cb: () => void): void {
    this.onPointerLockChange = cb;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Check if a key was just pressed this frame */
  wasKeyPressed(code: string): boolean {
    return this.keyJustPressed.has(code);
  }

  resetFrame(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.leftClick = false;
    this.rightClick = false;
    this.scrollDelta = 0;
    this.keyJustPressed.clear();
  }

  getNumberKeyPressed(): number {
    for (let i = 1; i <= 9; i++) {
      if (this.keys.has(`Digit${i}`)) return i;
    }
    return 0;
  }
}
