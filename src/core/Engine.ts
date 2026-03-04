import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from '../player/Player';
import { Physics } from '../player/Physics';
import { InputManager } from './InputManager';
import { Sky } from '../rendering/Sky';
import { PostProcessing } from '../rendering/PostProcessing';
import { createTerrainMaterial, updateMaterialUniforms, updateShadowUniforms } from '../rendering/Materials';
import { createWaterMaterial, updateWaterUniforms, updateWaterShadowUniforms } from '../rendering/WaterMaterial';
import { ShadowSystem } from '../rendering/ShadowSystem';
import { TorchLightManager } from '../rendering/TorchLightManager';
import { HeldItemRenderer } from '../rendering/HeldItemRenderer';
import { SwimmingArms } from '../rendering/SwimmingArms';
import { TextureAtlas } from '../textures/TextureAtlas';
import { BlockInteraction } from '../ui/BlockInteraction';
import { HUD } from '../ui/HUD';
import { ParticleSystem } from '../rendering/Particles';
import { InventorySystem } from '../ui/InventorySystem';
import { InventoryUI } from '../ui/InventoryUI';
import { PauseMenu } from '../ui/PauseMenu';
import { DroppedItemManager } from '../world/DroppedItemManager';
import { ChestManager } from '../world/ChestManager';
import { BlockType, BLOCK_DEFINITIONS } from '../blocks/BlockTypes';
import { ItemType, ITEM_DEFINITIONS } from '../ui/ItemTypes';
import { StructureTypeName } from '../world/StructureGenerator';
import { FOV, NEAR_PLANE, FAR_PLANE } from '../utils/constants';
import { worldSeed } from '../utils/noise';
import { MobManager } from '../entities/MobManager';
import { CombatSystem } from '../entities/CombatSystem';
import { WeatherSystem } from '../rendering/WeatherSystem';
import { DeathScreen } from '../ui/DeathScreen';
import { AchievementManager } from '../ui/Achievements';
import { CommandSystem } from '../ui/CommandSystem';
import { SoundEngine } from '../audio/SoundEngine';
import { ProceduralMusic } from '../audio/ProceduralMusic';
import { XPSystem } from '../ui/XPSystem';
import { Minimap } from '../ui/Minimap';
import { OptionsMenu, GameSettings } from '../ui/OptionsMenu';

type GameState = 'start' | 'playing' | 'inventory' | 'paused' | 'dead';

export class Engine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input: InputManager;
  private readonly world: World;
  private readonly player: Player;
  private readonly sky: Sky;
  private readonly postProcessing: PostProcessing;
  private readonly terrainMaterial: THREE.ShaderMaterial;
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly blockInteraction: BlockInteraction;
  private readonly hud: HUD;
  private readonly particles: ParticleSystem;
  private readonly inventory: InventorySystem;
  private readonly inventoryUI: InventoryUI;
  private readonly pauseMenu: PauseMenu;
  private readonly droppedItems: DroppedItemManager;
  private readonly chestManager: ChestManager;
  private readonly atlas: TextureAtlas;
  private readonly shadowSystem: ShadowSystem;
  private readonly torchLightManager: TorchLightManager;
  private readonly heldItemRenderer: HeldItemRenderer;
  private readonly swimmingArms: SwimmingArms;
  private readonly mobManager: MobManager;
  private readonly combatSystem: CombatSystem;
  private readonly physics: Physics;
  private readonly mobAmbientLight: THREE.AmbientLight;
  private readonly mobDirLight: THREE.DirectionalLight;

  // New systems
  private readonly weatherSystem: WeatherSystem;
  private readonly deathScreen: DeathScreen;
  private readonly achievements: AchievementManager;
  private readonly commandSystem: CommandSystem;
  private readonly soundEngine: SoundEngine;
  private readonly music: ProceduralMusic;
  private readonly xpSystem: XPSystem;
  private readonly minimap: Minimap;
  private readonly optionsMenu: OptionsMenu;

  // Spawn point
  private spawnX: number = 0;
  private spawnY: number = 80;
  private spawnZ: number = 0;

  private lastTime: number = 0;
  private readonly fixedDt: number = 1 / 60;
  private accumulator: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private fps: number = 0;
  private running: boolean = false;
  private gameState: GameState = 'start';
  private openChestPos: { x: number; y: number; z: number } | null = null;

  // Reusable vectors to avoid GC pressure in game loop
  private readonly _camDir = new THREE.Vector3();
  private achievementTimer: number = 0;
  private menuTime: number = 0;

  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    document.body.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Camera
    this.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR_PLANE, FAR_PLANE);

    // Input
    this.input = new InputManager(this.renderer.domElement);

    // Sky
    this.sky = new Sky(this.scene);

    // Texture Atlas & Materials
    this.atlas = new TextureAtlas();
    this.terrainMaterial = createTerrainMaterial(this.atlas);
    this.waterMaterial = createWaterMaterial();

    // Chest manager
    this.chestManager = new ChestManager();

    // World
    this.world = new World(this.scene, this.terrainMaterial, this.waterMaterial, this.atlas, this.chestManager);

    // Physics & Player
    this.physics = new Physics(this.world);
    this.player = new Player(this.camera, this.input, this.physics);
    this.player.setWorld(this.world);

    // Scene lights for entity rendering (MeshLambertMaterial needs these)
    this.mobAmbientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.mobAmbientLight);
    this.mobDirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.mobDirLight.position.set(50, 80, 30);
    this.scene.add(this.mobDirLight);

    // Mob system
    this.mobManager = new MobManager(this.scene, this.physics, this.world);
    this.combatSystem = new CombatSystem(this.mobManager, this.player, this.camera);

    // Shadow system
    this.shadowSystem = new ShadowSystem(this.atlas);

    // Torch light manager
    this.torchLightManager = new TorchLightManager(this.scene);

    // Held item renderer (first-person hand view)
    this.heldItemRenderer = new HeldItemRenderer(this.camera, this.scene, this.atlas);

    // Swimming arms renderer (first-person swimming animation)
    this.swimmingArms = new SwimmingArms(this.camera, this.scene);

    // Post processing
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    // Inventory system
    this.inventory = new InventorySystem();

    // Give some starting items (torch first so it's in slot 0 = selected)
    this.inventory.addItem(ItemType.TORCH, 16);
    this.inventory.addItem(ItemType.WOOD, 16);
    this.inventory.addItem(ItemType.STONE, 16);
    this.inventory.addItem(ItemType.DIRT, 32);
    this.inventory.addItem(ItemType.PLANKS, 8);

    // Block interaction
    this.blockInteraction = new BlockInteraction(this.world, this.player, this.scene, this.inventory);

    // HUD
    this.hud = new HUD(this.atlas, this.inventory);

    // Inventory UI
    this.inventoryUI = new InventoryUI(this.inventory, this.atlas, this.hud);

    // Pause menu
    this.pauseMenu = new PauseMenu();
    this.pauseMenu.onResume = () => {
      this.input.requestPointerLock();
    };
    this.pauseMenu.onTeleportToStructure = (type: StructureTypeName) => {
      this.teleportToStructure(type);
    };

    // Options menu
    this.optionsMenu = new OptionsMenu();
    this.optionsMenu.setOnSettingsChange((s: GameSettings) => this.applySettings(s));
    this.optionsMenu.onClose = () => {
      // Return to pause menu when options closed
    };
    this.pauseMenu.onOpenOptions = () => {
      this.pauseMenu.hide();
      this.optionsMenu.show();
      this.optionsMenu.onClose = () => {
        this.pauseMenu.show();
      };
    };

    // Also wire main menu options button
    const menuOptionsBtn = document.getElementById('btn-menu-options');
    if (menuOptionsBtn) {
      menuOptionsBtn.addEventListener('click', () => {
        this.optionsMenu.show();
        this.optionsMenu.onClose = () => {
          // Back to main menu
        };
      });
    }

    // Dropped items
    this.droppedItems = new DroppedItemManager(this.scene, this.world, this.atlas);

    // Connect block breaking to drop spawning + torch/chest tracking
    this.blockInteraction.onBlockBreak = (event) => {
      if (event.blockType === BlockType.TORCH) {
        this.torchLightManager.removeTorch(event.x, event.y, event.z);
      }
      if (event.blockType === BlockType.CHEST) {
        const chestItems = this.chestManager.removeChest(event.x, event.y, event.z);
        if (chestItems) {
          for (const stack of chestItems) {
            if (stack) {
              this.droppedItems.spawnFromBlock(event.x, event.y, event.z, stack.itemType as number);
            }
          }
        }
      }
      // TNT explosion
      if (event.blockType === BlockType.TNT) {
        this.explodeTNT(event.x, event.y, event.z);
        return;
      }
      // Ore drops: drop raw material instead of ore block
      const oreDrop = this.getOreDrop(event.blockType);
      if (oreDrop !== null) {
        this.droppedItems.spawnFromBlock(event.x, event.y, event.z, oreDrop);
        this.xpSystem.addXP(this.getOreXP(event.blockType));
        this.soundEngine.play('xp_pickup', 0.3);
      } else {
        this.droppedItems.spawnFromBlock(event.x, event.y, event.z, event.blockType);
      }
      // Leaves can drop apples
      if (event.blockType === BlockType.LEAVES && Math.random() < 0.02) {
        this.droppedItems.spawnFromBlock(event.x, event.y, event.z, ItemType.APPLE as number);
      }
      this.player.blocksMined++;
      this.soundEngine.play('block_break');
    };
    this.blockInteraction.onBlockPlace = (x, y, z, blockType) => {
      if (blockType === BlockType.TORCH) {
        this.torchLightManager.addTorch(x, y, z);
      }
      if (blockType === BlockType.CHEST) {
        this.chestManager.registerChest(x, y, z);
      }
      this.player.blocksPlaced++;
      this.soundEngine.play('block_place');
    };

    // Particles
    this.particles = new ParticleSystem(this.scene);

    // New systems
    this.weatherSystem = new WeatherSystem(this.scene);
    this.deathScreen = new DeathScreen();
    this.achievements = new AchievementManager();
    this.commandSystem = new CommandSystem();
    this.soundEngine = new SoundEngine();
    this.music = new ProceduralMusic();
    this.xpSystem = new XPSystem();
    this.minimap = new Minimap();

    // Apply saved settings on startup (after all systems are initialized)
    this.applySettings(this.optionsMenu.getSettings());

    // Death screen callbacks
    this.deathScreen.onRespawn = () => {
      this.player.respawn(this.spawnX, this.spawnY, this.spawnZ);
      this.deathScreen.hide();
      this.gameState = 'playing';
      this.input.requestPointerLock();
    };
    this.deathScreen.onTitleScreen = () => {
      window.location.reload();
    };

    // Command system callback
    this.commandSystem.onCommand = (cmd: string, args: string[]) => {
      this.executeCommand(cmd, args);
    };

    // Initial world load
    this.world.forceLoadAll(0, 0);

    // Find spawn point
    let spawnX = 0, spawnZ = 0, spawnY = 80;
    let foundLand = false;
    for (let radius = 0; radius < 64 && !foundLand; radius++) {
      for (let dx = -radius; dx <= radius && !foundLand; dx++) {
        for (let dz = -radius; dz <= radius && !foundLand; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
          for (let y = 120; y > 34; y--) {
            if (this.world.isSolid(dx, y, dz)) {
              spawnX = dx; spawnZ = dz; spawnY = y + 1;
              foundLand = true;
              break;
            }
          }
        }
      }
    }
    if (!foundLand) {
      for (let y = 120; y > 0; y--) {
        if (this.world.isSolid(0, y, 0)) { spawnY = y + 1; break; }
      }
    }
    this.spawnX = spawnX + 0.5;
    this.spawnY = spawnY;
    this.spawnZ = spawnZ + 0.5;
    this.player.x = this.spawnX;
    this.player.y = this.spawnY;
    this.player.z = this.spawnZ;

    // Display seed in menu
    const seedEl = document.getElementById('seed-display');
    if (seedEl) seedEl.textContent = `Seed: ${worldSeed}`;
    const footerSeedEl = document.getElementById('footer-seed');
    if (footerSeedEl) footerSeedEl.textContent = String(worldSeed);

    // Set random splash text
    this.initSplashText();

    // Apply blur on canvas for menu panorama
    this.renderer.domElement.style.filter = 'blur(6px) brightness(0.75)';
    this.renderer.domElement.style.transition = 'filter 0.5s ease';

    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupStartScreen();

    // Start render loop immediately for panorama background
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private setupStartScreen(): void {
    const startScreen = document.getElementById('start-screen')!;
    const btnPlay = document.getElementById('btn-play')!;
    const btnQuit = document.getElementById('btn-menu-quit')!;

    // Hide HUD and minimap while on the menu
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    const startGame = (): void => {
      startScreen.style.opacity = '0';
      startScreen.style.transition = 'opacity 0.4s ease';
      this.renderer.domElement.style.filter = 'none';
      // Show HUD and minimap when game starts
      if (uiOverlay) uiOverlay.style.display = 'block';
      setTimeout(() => {
        startScreen.style.display = 'none';
      }, 400);
      this.gameState = 'playing';
      this.input.requestPointerLock();
    };

    btnPlay.addEventListener('click', startGame);

    btnQuit.addEventListener('click', () => {
      window.close();
      window.location.href = 'about:blank';
    });

    this.input.setPointerLockChangeCallback(() => {
      if (!this.input.isPointerLocked) {
        if (this.gameState === 'playing') {
          this.gameState = 'paused';
          this.pauseMenu.show();
        }
      } else {
        if (this.gameState === 'paused') {
          this.gameState = 'playing';
          this.pauseMenu.hide();
        }
      }
    });
  }

  private initSplashText(): void {
    const splashes = [
      'Made by AI!',
      'Powered by Claude!',
      '100% Voxels!',
      'Now with mobs!',
      'Zero external assets!',
      'Built with Three.js!',
      'TypeScript powered!',
      'Infinite worlds!',
      'Craft all the things!',
      'Day/night cycle!',
      'AI generated code!',
      'No images used!',
      'Pure procedural!',
      'Shadow mapping!',
      'Explore the depths!',
      'Also try Minecraft!',
      'Claude was here!',
      'Voxel by voxel!',
      'Web Edition!',
      'Try /fly!',
    ];
    const el = document.getElementById('splash-text');
    if (el) {
      el.textContent = splashes[Math.floor(Math.random() * splashes.length)];
    }
  }

  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    const time = now / 1000;

    // FPS counter
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    // Menu panorama mode: camera orbits around spawn, render scene, skip gameplay
    if (this.gameState === 'start') {
      this.menuTime += dt;
      const orbitSpeed = 0.05;
      const angle = this.menuTime * orbitSpeed;
      const orbitRadius = 30;
      const camX = this.spawnX + Math.cos(angle) * orbitRadius;
      const camZ = this.spawnZ + Math.sin(angle) * orbitRadius;
      const camY = this.spawnY + 25;
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(this.spawnX, this.spawnY + 5, this.spawnZ);

      this.sky.update(dt, camX, camZ);
      this.world.update(camX, camZ);

      // Update material uniforms for panorama rendering
      updateMaterialUniforms(
        this.terrainMaterial,
        this.sky.sunDirection,
        this.sky.sunColor,
        this.sky.ambientColor,
        this.sky.fogColor,
        time,
      );
      updateWaterUniforms(
        this.waterMaterial,
        this.sky.sunDirection,
        this.sky.sunColor,
        this.sky.skyColorTop,
        this.sky.fogColor,
        time,
      );

      this.postProcessing.updateSunScreenPos(this.camera, this.sky.sunDirection);
      this.postProcessing.setDayFactor(this.sky.getDayFactor());
      this.postProcessing.render();
      this.input.resetFrame();
      return;
    }

    // Handle input states
    this.handleGameInput();

    // Fixed timestep physics (only when playing)
    if (this.gameState === 'playing') {
      this.accumulator += dt;
      while (this.accumulator >= this.fixedDt) {
        if (this.input.isPointerLocked) {
          this.player.update(this.fixedDt);
        }
        // Update mobs in fixed timestep
        this.mobManager.update(
          this.fixedDt,
          this.player.x, this.player.y, this.player.z,
          this.sky.getDayFactor(),
        );
        this.accumulator -= this.fixedDt;
      }
    }

    // Check player death
    if (this.gameState === 'playing' && this.player.health <= 0 && !this.player.isDead) {
      this.player.die();
      this.gameState = 'dead';
      document.exitPointerLock();
      this.deathScreen.show({
        mobsKilled: this.player.mobsKilled,
        distanceTraveled: Math.round(this.player.totalDistanceTraveled),
        blocksMined: this.player.blocksMined,
        survivalTime: this.player.survivalTime,
      });
      this.soundEngine.play('death');
    }

    // Weather update
    this.camera.getWorldDirection(this._camDir);
    this.weatherSystem.update(dt, this.camera.position, this._camDir);

    // Music
    this.music.update(dt, this.sky.getTimeOfDay());

    // Achievements update (throttled to ~1 check/sec to avoid per-frame overhead)
    this.achievements.update(dt);
    this.achievementTimer += dt;
    if (this.achievementTimer >= 1.0) {
      this.achievementTimer = 0;
      this.achievements.checkCondition('distanceTraveled', this.player.totalDistanceTraveled);
      this.achievements.checkCondition('mobKills', this.player.mobsKilled);
      this.achievements.checkCondition('blocksPlaced', this.player.blocksPlaced);
      this.achievements.checkCondition('blocksMined', this.player.blocksMined);
      this.achievements.checkCondition('minY', this.player.y);
    }

    // Command system
    this.commandSystem.update(dt);

    // Death screen
    if (this.gameState === 'dead') {
      this.deathScreen.update(dt);
    }

    // Sky update (always runs for visual continuity)
    this.sky.update(dt, this.player.x, this.player.z);

    // Sync entity lights with sky
    const dayF = this.sky.getDayFactor();
    this.mobAmbientLight.intensity = 0.25 + dayF * 0.55;
    this.mobDirLight.intensity = 0.2 + dayF * 0.8;
    this.mobDirLight.position.set(
      this.sky.sunDirection.x * 80,
      this.sky.sunDirection.y * 80 + 20,
      this.sky.sunDirection.z * 80,
    );
    this.mobDirLight.color.setRGB(
      this.sky.sunColor.x,
      this.sky.sunColor.y,
      this.sky.sunColor.z,
    );

    // World chunk loading
    this.world.update(this.player.x, this.player.z);

    // Shadow map rendering
    this.shadowSystem.render(
      this.renderer,
      this.scene,
      this.camera,
      this.sky.sunDirection,
      this.sky.getDayFactor(),
    );

    // Biome-based fog tinting
    const biomeFog = this.sky.fogColor.clone();
    if (this.world.biomeSystem) {
      const biome = this.world.biomeSystem.getBiome(Math.floor(this.player.x), Math.floor(this.player.z));
      const bc = this.world.biomeSystem.getConfig(biome);
      biomeFog.lerp(new THREE.Vector3(bc.fogColor[0], bc.fogColor[1], bc.fogColor[2]), 0.3);
    }

    // Terrain material uniforms
    updateMaterialUniforms(
      this.terrainMaterial,
      this.sky.sunDirection,
      this.sky.sunColor,
      this.sky.ambientColor,
      biomeFog,
      time,
    );
    updateShadowUniforms(
      this.terrainMaterial,
      this.shadowSystem.shadowMaps,
      this.shadowSystem.shadowMatrices,
      this.sky.getDayFactor(),
    );

    // Water material uniforms
    updateWaterUniforms(
      this.waterMaterial,
      this.sky.sunDirection,
      this.sky.sunColor,
      this.sky.skyColorTop,
      biomeFog,
      time,
    );
    updateWaterShadowUniforms(
      this.waterMaterial,
      this.shadowSystem.shadowMaps[0],
      this.shadowSystem.shadowMatrices[0],
      this.sky.getDayFactor(),
    );

    // Torch lights: detect held torch + update lights + flame particles
    const selectedSlot = this.hud.getSelectedSlot();
    const heldStack = this.inventory.hotbar[selectedSlot];
    this.torchLightManager.setHeldTorch(
      heldStack !== null && heldStack !== undefined && heldStack.itemType === ItemType.TORCH,
    );
    this.torchLightManager.update(dt, this.camera, time);
    this.torchLightManager.updateMaterialUniforms(this.terrainMaterial);
    this.torchLightManager.updateMaterialUniforms(this.waterMaterial);

    // Held item in hand (first-person view) — hidden when swimming
    const heldItemType = heldStack ? heldStack.itemType : -1;
    const isWalking = this.input.isPointerLocked && (
      this.input.isKeyDown('KeyW') || this.input.isKeyDown('KeyS') ||
      this.input.isKeyDown('KeyA') || this.input.isKeyDown('KeyD')
    );
    if (this.player.isSwimming || this.player.isInWater) {
      this.heldItemRenderer.update(-1, dt, false); // Hide held item while swimming
    } else {
      this.heldItemRenderer.update(heldItemType, dt, isWalking);
    }

    // Swimming arms (only visible in water)
    this.swimmingArms.update(
      dt,
      this.player.isSwimming,
      this.player.isInWater,
      this.player.swimStrokePhase,
    );

    // Particles
    this.particles.update(dt, this.player.x, this.player.y, this.player.z, 1.0);

    // Combat system update (before block interaction to take priority)
    if (this.gameState === 'playing' && this.input.isPointerLocked) {
      this.combatSystem.update(dt, this.input.leftClick);
    }

    // Block interaction (only when playing, skip if combat hit a mob)
    if (this.gameState === 'playing' && this.input.isPointerLocked) {
      const mobAimed = this.combatSystem.isAimingAtMob();
      this.blockInteraction.update(
        mobAimed ? false : this.input.leftClickHeld,
        this.input.rightClick,
        this.hud.getSelectedSlot(),
        dt,
      );
    }

    // Dropped items
    this.droppedItems.update(dt, this.player, this.inventory);

    // HUD
    this.hud.setAimingAtMob(this.combatSystem.isAimingAtMob());
    this.hud.update(this.fps, this.player, this.sky, dt);
    if (this.gameState === 'playing') {
      this.hud.handleInput(this.input);
    }

    // Inventory UI
    if (this.gameState === 'inventory') {
      this.inventoryUI.update();
    }

    // Minimap (throttled internally, passes dt for timer)
    if (this.gameState === 'playing') {
      const aliveMobs = this.mobManager.getAliveMobs();
      const minimapMobs = [];
      for (let i = 0; i < aliveMobs.length; i++) {
        const m = aliveMobs[i];
        minimapMobs.push({ x: m.x, z: m.z, hostile: !!m.definition.hostile });
      }
      this.minimap.update(
        this.player.x, this.player.z, this.player.yaw,
        (x: number, z: number) => {
          for (let y = 90; y > 0; y--) {
            const block = this.world.getBlock(x, y, z);
            if (block !== 0) return block;
          }
          return 0;
        },
        minimapMobs,
        dt,
      );
    }

    // Post-processing
    this.postProcessing.updateSunScreenPos(this.camera, this.sky.sunDirection);
    this.postProcessing.setDayFactor(this.sky.getDayFactor());
    this.postProcessing.setUnderwaterFactor(this.player.underwaterFactor);
    this.postProcessing.setTime(time);

    // Render
    this.postProcessing.render();

    // Reset per-frame input
    this.input.resetFrame();
  }

  private handleGameInput(): void {
    // Command system intercept
    if (this.commandSystem.isOpen()) {
      return;
    }

    // T or / to open chat
    if (this.gameState === 'playing' && (this.input.wasKeyPressed('KeyT') || this.input.wasKeyPressed('Slash'))) {
      this.commandSystem.open();
      return;
    }

    // M for minimap toggle
    if (this.input.wasKeyPressed('KeyM') && this.gameState === 'playing') {
      this.minimap.toggle();
    }

    // E key: toggle inventory
    if (this.input.wasKeyPressed('KeyE')) {
      if (this.gameState === 'playing') {
        this.openInventory(false);
      } else if (this.gameState === 'inventory') {
        this.closeInventory();
      }
    }

    // Escape key: close inventory or handled by pointer lock
    if (this.input.wasKeyPressed('Escape')) {
      if (this.gameState === 'inventory') {
        this.closeInventory();
      }
    }

    // Right-click on interactive blocks, mobs, or eat food
    if (this.gameState === 'playing' && this.input.rightClick && this.input.isPointerLocked) {
      // Try to mount a horse first
      if (!this.player.isRiding) {
        const horse = this.mobManager.findNearestRideable(
          this.player.x, this.player.y + 0.8, this.player.z, 3.5,
        );
        if (horse) {
          this.player.mountHorse(horse);
          this.achievements.checkCondition('horseRidden', true);
          return;
        }
      }

      const result = this.blockInteraction.getLastResult();
      if (result && result.hit) {
        if (result.blockType === BlockType.CRAFTING_TABLE) {
          this.openInventory(true);
          return;
        }
        if (result.blockType === BlockType.CHEST) {
          this.openChestAt(result.blockX, result.blockY, result.blockZ);
          return;
        }
        if (result.blockType === BlockType.FURNACE) {
          this.openInventory(false);
          return;
        }
      }

      // Try eating held food
      const selectedSlot2 = this.hud.getSelectedSlot();
      const heldStack2 = this.inventory.hotbar[selectedSlot2];
      if (heldStack2) {
        const def = ITEM_DEFINITIONS[heldStack2.itemType];
        if (def && def.foodHunger && this.player.hunger < this.player.maxHunger) {
          this.player.eatFood(def.foodHunger, def.foodSaturation ?? 0);
          heldStack2.count -= 1;
          if (heldStack2.count <= 0) {
            this.inventory.hotbar[selectedSlot2] = null;
          }
          this.soundEngine.play('eat');
          this.achievements.checkCondition('foodCooked', 1);
        }
      }
    }
  }

  private openInventory(craftingTable: boolean): void {
    this.gameState = 'inventory';
    document.exitPointerLock();
    this.inventoryUI.open(craftingTable);
  }

  private openChestAt(x: number, y: number, z: number): void {
    if (!this.chestManager.hasChest(x, y, z)) {
      this.chestManager.registerChest(x, y, z);
    }
    const slots = this.chestManager.getChest(x, y, z);
    if (!slots) return;
    this.openChestPos = { x, y, z };
    this.gameState = 'inventory';
    document.exitPointerLock();
    this.inventoryUI.openChest(slots);
  }

  private closeInventory(): void {
    if (this.inventoryUI.getIsChest()) {
      this.inventory.closeChest();
    }
    this.inventoryUI.close();
    this.openChestPos = null;
    this.gameState = 'playing';
    this.input.requestPointerLock();
  }

  private teleportToStructure(type: StructureTypeName): void {
    const loc = this.world.findNearestStructure(this.player.x, this.player.z, type);
    if (!loc) {
      console.log(`%cNo ${type} found nearby`, 'color: #f44336');
      return;
    }
    // Force-load chunks around target first so terrain exists
    this.world.forceLoadAll(loc.wx, loc.wz);
    // Teleport player high above the structure so they fall down onto it
    this.player.x = loc.wx + 0.5;
    this.player.y = loc.wy + 40;
    this.player.z = loc.wz + 0.5;
    console.log(`%cTeleported to ${type} at (${loc.wx}, ${loc.wy}, ${loc.wz}) — distance: ${Math.round(loc.dist)} blocks`, 'color: #4CAF50; font-size: 12px');
    // Resume game
    this.pauseMenu.hide();
    this.gameState = 'playing';
    this.input.requestPointerLock();
  }

  private explodeTNT(x: number, y: number, z: number): void {
    const radius = 4;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            const bx = x + dx, by = y + dy, bz = z + dz;
            const block = this.world.getBlock(bx, by, bz);
            if (block !== BlockType.AIR && block !== BlockType.BEDROCK && block !== BlockType.WATER) {
              this.world.setBlock(bx, by, bz, BlockType.AIR);
            }
          }
        }
      }
    }
    this.soundEngine.play('explosion');
    this.achievements.checkCondition('tntExploded', true);
    // Damage player if nearby
    const dist = Math.sqrt((this.player.x - x) ** 2 + (this.player.y - y) ** 2 + (this.player.z - z) ** 2);
    if (dist < radius * 2 && !this.player.isCreative) {
      const damage = Math.max(1, Math.floor((radius * 2 - dist) * 3));
      this.player.takeDamage(damage, this.player.x - x, this.player.z - z);
    }
  }

  private getOreDrop(blockType: number): number | null {
    switch (blockType) {
      case BlockType.COAL_ORE: return ItemType.COAL;
      case BlockType.IRON_ORE: return ItemType.IRON_RAW;
      case BlockType.GOLD_ORE: return ItemType.GOLD_RAW;
      case BlockType.DIAMOND_ORE: return ItemType.DIAMOND;
      case BlockType.EMERALD_ORE: return ItemType.EMERALD;
      default: return null;
    }
  }

  private getOreXP(blockType: number): number {
    switch (blockType) {
      case BlockType.COAL_ORE: return 1;
      case BlockType.IRON_ORE: return 2;
      case BlockType.GOLD_ORE: return 3;
      case BlockType.DIAMOND_ORE: return 7;
      case BlockType.EMERALD_ORE: return 5;
      default: return 0;
    }
  }

  private executeCommand(cmd: string, args: string[]): void {
    switch (cmd) {
      case 'tp':
        if (args.length >= 3) {
          const tx = parseFloat(args[0]);
          const ty = parseFloat(args[1]);
          const tz = parseFloat(args[2]);
          if (!isNaN(tx) && !isNaN(ty) && !isNaN(tz)) {
            this.player.x = tx;
            this.player.y = ty;
            this.player.z = tz;
            this.commandSystem.addMessage(`Teleported to ${tx}, ${ty}, ${tz}`, '#55ff55');
          }
        }
        break;
      case 'time':
        if (args[0] === 'set') {
          const timeMap: Record<string, number> = { day: 0.25, night: 0.75, noon: 0.5, midnight: 0 };
          const t = timeMap[args[1]];
          if (t !== undefined) {
            (this.sky as any).timeOfDay = t;
            this.commandSystem.addMessage(`Time set to ${args[1]}`, '#55ff55');
          }
        }
        break;
      case 'weather':
        if (args[0]) {
          const weatherMap: Record<string, string> = { clear: 'CLEAR', rain: 'RAIN', thunder: 'THUNDER', snow: 'SNOW' };
          const w = weatherMap[args[0]];
          if (w) {
            this.weatherSystem.setWeather(w as any);
            this.commandSystem.addMessage(`Weather set to ${args[0]}`, '#55ff55');
          }
        }
        break;
      case 'gamemode':
        if (args[0] === 'creative') {
          this.player.isCreative = true;
          this.commandSystem.addMessage('Game mode set to Creative', '#55ff55');
        } else if (args[0] === 'survival') {
          this.player.isCreative = false;
          this.player.isFlying = false;
          this.commandSystem.addMessage('Game mode set to Survival', '#55ff55');
        }
        break;
      case 'kill':
        this.player.die();
        break;
      case 'spawn':
        this.player.x = this.spawnX;
        this.player.y = this.spawnY;
        this.player.z = this.spawnZ;
        this.commandSystem.addMessage('Teleported to spawn', '#55ff55');
        break;
      case 'seed':
        this.commandSystem.addMessage(`Seed: ${worldSeed}`, '#aaaaff');
        break;
      case 'xp':
        if (args[0]) {
          const amt = parseInt(args[0]);
          if (!isNaN(amt)) {
            this.xpSystem.addXP(amt);
            this.commandSystem.addMessage(`Gave ${amt} XP`, '#55ff55');
          }
        }
        break;
      case 'fly':
        this.player.isFlying = !this.player.isFlying;
        this.commandSystem.addMessage(`Flying: ${this.player.isFlying ? 'ON' : 'OFF'}`, '#55ff55');
        break;
      case 'give':
        if (args[0]) {
          const itemName = args[0].toUpperCase().replace(/ /g, '_');
          const count = args[1] ? parseInt(args[1]) : 1;
          const itemEntry = Object.entries(ItemType).find(([k]) => k === itemName);
          if (itemEntry) {
            const itemId = (itemEntry[1] as number);
            this.inventory.addItem(itemId, isNaN(count) ? 1 : count);
            this.commandSystem.addMessage(`Gave ${count}x ${args[0]}`, '#55ff55');
          } else {
            this.commandSystem.addMessage(`Unknown item: ${args[0]}`, '#ff5555');
          }
        }
        break;
      default:
        this.commandSystem.addMessage(`Unknown command: /${cmd}`, '#ff5555');
    }
  }

  private applySettings(s: GameSettings): void {
    // Video
    this.world.renderDistance = s.renderDistance;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.shadowSystem.enabled = s.shadowsEnabled;
    this.postProcessing.setBloomEnabled(s.bloomEnabled);
    this.postProcessing.setSsaoEnabled(s.ssaoEnabled);
    this.postProcessing.setGodRaysEnabled(s.godRaysEnabled);

    // Audio
    this.soundEngine.setMasterVolume(s.masterVolume);
    this.soundEngine.setMusicVolume(s.musicVolume);
    this.soundEngine.setSfxVolume(s.sfxVolume);

    // Controls
    this.player.setMouseSensitivity(s.mouseSensitivity);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing.resize(w, h);
  }
}
