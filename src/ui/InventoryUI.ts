import { InventorySystem, ItemStack } from './InventorySystem';
import { TextureAtlas } from '../textures/TextureAtlas';
import { HUD } from './HUD';
import { PlayerModel3D } from './PlayerModel3D';
import { ITEM_DEFINITIONS, ItemType } from './ItemTypes';

export class InventoryUI {
  private readonly screenEl: HTMLElement;
  private readonly inventory: InventorySystem;
  private readonly atlas: TextureAtlas;
  private readonly hud: HUD;
  private readonly cursorEl: HTMLElement;

  private panelEl: HTMLElement | null = null;
  private playerModel: PlayerModel3D | null = null;
  private isOpen: boolean = false;
  private isCraftingTable: boolean = false;
  private isChest: boolean = false;

  private inventorySlots: HTMLElement[] = [];
  private hotbarSlots: HTMLElement[] = [];
  private craftingSlots: HTMLElement[] = [];
  private chestSlots: HTMLElement[] = [];
  private resultSlot: HTMLElement | null = null;

  constructor(
    inventory: InventorySystem,
    atlas: TextureAtlas,
    hud: HUD,
  ) {
    this.inventory = inventory;
    this.atlas = atlas;
    this.hud = hud;
    this.screenEl = document.getElementById('inventory-screen')!;
    this.cursorEl = document.getElementById('cursor-item')!;

    document.addEventListener('mousemove', (e) => {
      if (this.isOpen || this.inventory.cursorStack) {
        this.cursorEl.style.left = `${e.clientX + 8}px`;
        this.cursorEl.style.top = `${e.clientY + 8}px`;
      }
    });
  }

  open(craftingTable: boolean = false): void {
    this.isOpen = true;
    this.isCraftingTable = craftingTable;
    this.isChest = false;
    this.inventory.setCraftingGridSize(craftingTable ? 3 : 2);
    this.buildUI();
    this.screenEl.style.display = 'flex';
  }

  openChest(slots: (ItemStack | null)[]): void {
    this.isOpen = true;
    this.isCraftingTable = false;
    this.isChest = true;
    this.inventory.openChest(slots);
    this.buildUI();
    this.screenEl.style.display = 'flex';
  }

  close(): void {
    this.isOpen = false;
    this.screenEl.style.display = 'none';

    if (this.isChest) {
      this.inventory.closeChest();
    } else {
      this.inventory.returnCraftingItems();
    }

    // Return cursor stack to inventory
    if (this.inventory.cursorStack) {
      this.inventory.addItem(this.inventory.cursorStack.itemType, this.inventory.cursorStack.count);
      this.inventory.cursorStack = null;
    }
    this.updateCursorDisplay();

    if (this.playerModel) {
      this.playerModel.dispose();
      this.playerModel = null;
    }
    this.isChest = false;
    this.panelEl = null;
  }

  getIsChest(): boolean {
    return this.isChest;
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  private buildUI(): void {
    this.screenEl.innerHTML = '';
    this.inventorySlots = [];
    this.hotbarSlots = [];
    this.craftingSlots = [];
    this.chestSlots = [];

    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    this.panelEl = panel;

    if (this.isChest) {
      this.buildChestUI(panel);
    } else {
      this.buildInventoryUI(panel);
    }

    this.screenEl.appendChild(panel);

    // Close on clicking outside the panel
    this.screenEl.addEventListener('mousedown', (e) => {
      if (e.target === this.screenEl) {
        // Don't close, just eat the event
      }
    });

    this.refreshAll();
  }

  private buildChestUI(panel: HTMLElement): void {
    // Title
    const title = document.createElement('div');
    title.className = 'inv-title';
    title.textContent = 'Chest';
    panel.appendChild(title);

    // Chest inventory (3x9 = 27 slots)
    for (let row = 0; row < 3; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'inv-row';
      for (let col = 0; col < 9; col++) {
        const slotIdx = row * 9 + col;
        const slot = this.createSlot('chest', slotIdx);
        rowEl.appendChild(slot);
        this.chestSlots.push(slot);
      }
      panel.appendChild(rowEl);
    }

    // Separator
    const sep1 = document.createElement('div');
    sep1.className = 'inv-separator';
    panel.appendChild(sep1);

    // Main inventory (3x9)
    for (let row = 0; row < 3; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'inv-row';
      for (let col = 0; col < 9; col++) {
        const slotIdx = row * 9 + col;
        const slot = this.createSlot('main', slotIdx);
        rowEl.appendChild(slot);
        this.inventorySlots.push(slot);
      }
      panel.appendChild(rowEl);
    }

    // Separator
    const sep2 = document.createElement('div');
    sep2.className = 'inv-separator';
    panel.appendChild(sep2);

    // Hotbar (1x9)
    const hotbarRow = document.createElement('div');
    hotbarRow.className = 'inv-row';
    for (let i = 0; i < 9; i++) {
      const slot = this.createSlot('hotbar', i);
      hotbarRow.appendChild(slot);
      this.hotbarSlots.push(slot);
    }
    panel.appendChild(hotbarRow);
  }

  private buildInventoryUI(panel: HTMLElement): void {
    // Title
    const title = document.createElement('div');
    title.className = 'inv-title';
    title.textContent = this.isCraftingTable ? 'Crafting' : 'Inventory';
    panel.appendChild(title);

    // Top section: player model + crafting area
    const topSection = document.createElement('div');
    topSection.className = 'inv-top';

    // Player model
    const modelContainer = document.createElement('div');
    modelContainer.className = 'player-model-container';
    topSection.appendChild(modelContainer);

    this.playerModel = new PlayerModel3D(modelContainer);

    // Crafting area
    const craftArea = document.createElement('div');
    craftArea.className = 'crafting-area';

    const gridSize = this.isCraftingTable ? 3 : 2;
    const grid = document.createElement('div');
    grid.className = 'crafting-grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 36px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, 36px)`;

    for (let i = 0; i < gridSize * gridSize; i++) {
      const slot = this.createSlot('crafting', i);
      grid.appendChild(slot);
      this.craftingSlots.push(slot);
    }
    craftArea.appendChild(grid);

    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'crafting-arrow';
    arrow.textContent = '\u2192';
    craftArea.appendChild(arrow);

    // Result slot
    const resultContainer = document.createElement('div');
    resultContainer.className = 'craft-result';
    this.resultSlot = this.createSlot('result', 0);
    resultContainer.appendChild(this.resultSlot);
    craftArea.appendChild(resultContainer);

    topSection.appendChild(craftArea);
    panel.appendChild(topSection);

    // Separator
    const sep1 = document.createElement('div');
    sep1.className = 'inv-separator';
    panel.appendChild(sep1);

    // Main inventory (3x9)
    for (let row = 0; row < 3; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'inv-row';
      for (let col = 0; col < 9; col++) {
        const slotIdx = row * 9 + col;
        const slot = this.createSlot('main', slotIdx);
        rowEl.appendChild(slot);
        this.inventorySlots.push(slot);
      }
      panel.appendChild(rowEl);
    }

    // Separator
    const sep2 = document.createElement('div');
    sep2.className = 'inv-separator';
    panel.appendChild(sep2);

    // Hotbar (1x9)
    const hotbarRow = document.createElement('div');
    hotbarRow.className = 'inv-row';
    for (let i = 0; i < 9; i++) {
      const slot = this.createSlot('hotbar', i);
      hotbarRow.appendChild(slot);
      this.hotbarSlots.push(slot);
    }
    panel.appendChild(hotbarRow);

    // Handle mouse look on player model
    this.screenEl.addEventListener('mousemove', (e) => {
      if (this.playerModel && modelContainer.parentElement) {
        const rect = modelContainer.getBoundingClientRect();
        this.playerModel.updateMouseLook(e.clientX, e.clientY, rect);
      }
    });
  }

  private createSlot(type: string, index: number): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.dataset.type = type;
    slot.dataset.index = String(index);

    slot.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0) this.handleSlotClick(type, index);
      else if (e.button === 2) this.handleSlotRightClick(type, index);
    });

    slot.addEventListener('contextmenu', (e) => e.preventDefault());

    return slot;
  }

  private handleSlotClick(type: string, index: number): void {
    switch (type) {
      case 'hotbar':
        this.inventory.clickSlot(index);
        break;
      case 'main':
        this.inventory.clickSlot(index + 9);
        break;
      case 'crafting':
        this.inventory.clickCraftingSlot(index);
        break;
      case 'result':
        this.inventory.takeCraftingResult();
        break;
      case 'chest':
        this.inventory.clickChestSlot(index);
        break;
    }
    this.refreshAll();
  }

  private handleSlotRightClick(type: string, index: number): void {
    switch (type) {
      case 'hotbar':
        this.inventory.rightClickSlot(index);
        break;
      case 'main':
        this.inventory.rightClickSlot(index + 9);
        break;
      case 'crafting':
        this.inventory.rightClickCraftingSlot(index);
        break;
      case 'chest':
        this.inventory.rightClickChestSlot(index);
        break;
    }
    this.refreshAll();
  }

  private refreshAll(): void {
    // Hotbar
    for (let i = 0; i < 9; i++) {
      this.renderSlot(this.hotbarSlots[i], this.inventory.hotbar[i]);
    }

    // Main inventory
    for (let i = 0; i < 27; i++) {
      this.renderSlot(this.inventorySlots[i], this.inventory.mainInventory[i]);
    }

    // Crafting
    for (let i = 0; i < this.craftingSlots.length; i++) {
      this.renderSlot(this.craftingSlots[i], this.inventory.craftingGrid[i]);
    }

    // Chest
    if (this.isChest && this.inventory.chestInventory) {
      for (let i = 0; i < this.chestSlots.length; i++) {
        this.renderSlot(this.chestSlots[i], this.inventory.chestInventory[i]);
      }
    }

    // Result
    if (this.resultSlot) {
      this.renderSlot(this.resultSlot, this.inventory.craftingResult);
    }

    this.updateCursorDisplay();
  }

  private renderSlot(slotEl: HTMLElement, stack: ItemStack | null): void {
    // Clear existing content except event listeners
    const existing = slotEl.querySelector('.item-icon');
    if (existing) existing.remove();
    const existingCount = slotEl.querySelector('.inv-count');
    if (existingCount) existingCount.remove();

    if (!stack) return;

    const canvas = this.hud.getItemCanvas(stack);
    if (canvas) {
      slotEl.appendChild(canvas);
    }

    if (stack.count > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'inv-count';
      countEl.textContent = String(stack.count);
      slotEl.appendChild(countEl);
    }
  }

  private updateCursorDisplay(): void {
    const stack = this.inventory.cursorStack;
    if (!stack) {
      this.cursorEl.style.display = 'none';
      return;
    }

    this.cursorEl.style.display = 'block';
    // Clear old content
    while (this.cursorEl.firstChild) {
      if (this.cursorEl.firstChild instanceof HTMLElement && this.cursorEl.firstChild.classList.contains('cursor-count')) {
        break;
      }
      this.cursorEl.removeChild(this.cursorEl.firstChild);
    }

    const canvas = this.hud.getItemCanvas(stack);
    if (canvas) {
      this.cursorEl.insertBefore(canvas, this.cursorEl.firstChild);
    }

    const countEl = this.cursorEl.querySelector('.cursor-count') as HTMLElement;
    if (countEl) {
      countEl.textContent = stack.count > 1 ? String(stack.count) : '';
    }
  }

  update(): void {
    if (!this.isOpen) return;
    if (this.playerModel) {
      this.playerModel.render();
    }
    this.refreshAll();
  }
}
