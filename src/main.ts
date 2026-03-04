import { Engine } from './core/Engine';

// Remove Vite default styles and content
const appEl = document.getElementById('app');
if (appEl) appEl.remove();

// Start the voxel engine
new Engine();

console.log("CornetCraft boot!");