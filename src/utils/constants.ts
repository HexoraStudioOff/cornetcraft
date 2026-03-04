// World dimensions
export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 128;
export const RENDER_DISTANCE = 10;

// Texture
export const TEXTURE_SIZE = 16;

// Physics
export const GRAVITY = 20;
export const JUMP_FORCE = 8;
export const PLAYER_SPEED = 5.5;
export const PLAYER_SPRINT_SPEED = 8;
export const PLAYER_HEIGHT = 1.62;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_EYE_HEIGHT = 1.52;
export const TERMINAL_VELOCITY = 40;

// Rendering
export const FOV = 75;
export const NEAR_PLANE = 0.1;
export const FAR_PLANE = 500;
export const DAY_CYCLE_DURATION = 720; // seconds for full day/night cycle (12 minutes)

// Block interaction
export const REACH_DISTANCE = 6;

// Shadow mapping
export const SHADOW_MAP_SIZE = 1024;
export const SHADOW_CASCADE_SPLITS: readonly [number, number, number] = [24, 60, 160];
export const SHADOW_BIAS = 0.003;
export const SHADOW_NORMAL_BIAS = 0.4;
export const SHADOW_LAYER = 1;

// SSAO
export const SSAO_RADIUS = 0.4;
export const SSAO_BIAS = 0.025;
export const SSAO_INTENSITY = 0.5;

// Mob system
export const MAX_HOSTILE_MOBS = 18;
export const MAX_PASSIVE_MOBS = 30;
export const MAX_AQUATIC_MOBS = 18;
export const MOB_SPAWN_MIN_RANGE = 12;
export const MOB_SPAWN_MAX_RANGE = 48;
export const MOB_DESPAWN_RANGE = 80;
export const MOB_SPAWN_INTERVAL = 1.0;
export const INITIAL_PASSIVE_SPAWN = 18;
export const INITIAL_AQUATIC_SPAWN = 12;
export const SEA_LEVEL = 34;

// Swimming / Water
export const SWIM_SPEED = 3.2;
export const SWIM_SPRINT_SPEED = 5.0;
export const WATER_GRAVITY = 3.5;
export const WATER_BUOYANCY = 5.0;
export const WATER_DRAG = 0.85;
export const SWIM_UP_FORCE = 6.0;
export const SWIM_DOWN_SPEED = 3.0;
export const OXYGEN_MAX = 10;
export const OXYGEN_DEPLETION_RATE = 0.5; // per second
export const OXYGEN_REGEN_RATE = 2.5; // per second
export const DROWNING_DAMAGE = 2;
export const DROWNING_INTERVAL = 1.0; // seconds between drowning ticks

// Combat
export const ATTACK_COOLDOWN = 0.5;
export const ATTACK_REACH = 4.5;
export const KNOCKBACK_FORCE = 6;
export const PLAYER_HURT_INVINCIBILITY = 0.5;
