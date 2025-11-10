import { Game } from './game.js';
import { View } from './render.js';

// Initialize game and view
const canvas = document.getElementById('map');
const game = new Game();
const view = new View(canvas, game);

// Expose to window for console debugging
window.game = game;
window.view = view;

// HUD elements
const hudElements = {
    territory: document.getElementById('territory'),
    population: document.getElementById('population'),
    army: document.getElementById('army'),
    gold: document.getElementById('gold'),
    troopPct: document.getElementById('troopPct')
};

const buildMenu = document.getElementById('buildMenu');

// Update HUD
function updateHUD() {
    const stats = game.getStats();
    hudElements.territory.textContent = stats.territory;
    hudElements.population.textContent = stats.population.toLocaleString();
    hudElements.army.textContent = stats.army.toLocaleString();
    hudElements.gold.textContent = stats.gold.toLocaleString();
    hudElements.troopPct.textContent = stats.troopPct;
}

// Mouse state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Prevent context menu
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Mouse down - handle clicks
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (e.button === 0) {
        // Left click - try to expand
        buildMenu.style.display = 'none';
        const grid = view.toGrid(px, py);
        const success = game.tryExpand(grid.x, grid.y);
        if (success) {
            updateHUD();
        }
    } else if (e.button === 2) {
        // Right click - open build menu
        const grid = view.toGrid(px, py);
        const pos = game.openBuildAt(grid.x, grid.y);
        if (pos) {
            buildMenu.style.left = (e.clientX + 10) + 'px';
            buildMenu.style.top = (e.clientY + 10) + 'px';
            buildMenu.style.display = 'block';
        } else {
            buildMenu.style.display = 'none';
        }
    } else if (e.button === 1) {
        // Middle mouse - pan
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

// Mouse move - panning
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;

        view.camera.offsetX += dx;
        view.camera.offsetY += dy;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

// Mouse up - stop dragging
canvas.addEventListener('mouseup', (e) => {
    if (e.button === 1) {
        isDragging = false;
    }
});

// Mouse wheel - zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    view.zoomAt(px, py, factor);
}, { passive: false });

// Click outside build menu to close it
document.addEventListener('click', (e) => {
    if (!buildMenu.contains(e.target) && e.target !== canvas) {
        buildMenu.style.display = 'none';
    }
});

// Window resize
window.addEventListener('resize', () => {
    view.handleResize();
});

// Game loop
let lastFrame = 0;
function gameLoop(timestamp) {
    // Run game turn (once per second)
    game.turn();

    // Update HUD
    updateHUD();

    // Render
    view.render();

    // Next frame
    requestAnimationFrame(gameLoop);
}

// Start the game
console.log('🧟 Eras Zombie MVP loaded!');
console.log('Left-click to expand, right-click to build');
console.log('Use mouse wheel to zoom');

// Initial render and HUD update
updateHUD();
view.render();

// Start game loop
requestAnimationFrame(gameLoop);
