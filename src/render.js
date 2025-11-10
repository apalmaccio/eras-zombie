// Rendering and camera management
export class View {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;

        // Camera state
        this.camera = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0
        };

        // Colors for different owners
        this.colors = {
            P: '#457b9d',     // Player - Steel Blue
            A: '#9b59b6',     // AI A - Purple
            B: '#e67e22',     // AI B - Orange
            C: '#16a085',     // AI C - Teal
            Z: '#2d4a2e',     // Zombies - Dark Green
            null: '#3a4a3a'   // Neutral - Gray-Green
        };

        // Setup HiDPI
        this.setupHiDPI();

        // Center camera on player start
        this.centerCamera();
    }

    setupHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.displayWidth = rect.width;
        this.displayHeight = rect.height;
    }

    centerCamera() {
        // Center on grid
        const gridPixelW = this.game.gridW * this.game.cellSize;
        const gridPixelH = this.game.gridH * this.game.cellSize;

        this.camera.offsetX = (this.displayWidth - gridPixelW) / 2;
        this.camera.offsetY = (this.displayHeight - gridPixelH) / 2;
    }

    // Convert screen pixel to grid coordinates
    toGrid(px, py) {
        const worldX = (px - this.camera.offsetX) / this.camera.scale;
        const worldY = (py - this.camera.offsetY) / this.camera.scale;

        const gridX = Math.floor(worldX / this.game.cellSize);
        const gridY = Math.floor(worldY / this.game.cellSize);

        return { x: gridX, y: gridY };
    }

    // Zoom at a specific screen point (for mouse wheel)
    zoomAt(px, py, factor) {
        const oldScale = this.camera.scale;
        this.camera.scale = Math.max(0.5, Math.min(3.0, this.camera.scale * factor));

        // Adjust offset to zoom toward cursor
        const scaleDelta = this.camera.scale - oldScale;
        this.camera.offsetX -= (px - this.camera.offsetX) * (scaleDelta / oldScale);
        this.camera.offsetY -= (py - this.camera.offsetY) * (scaleDelta / oldScale);
    }

    // Main render function
    render() {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#10293f';
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        // Save context state
        ctx.save();

        // Apply camera transform
        ctx.translate(this.camera.offsetX, this.camera.offsetY);
        ctx.scale(this.camera.scale, this.camera.scale);

        // Draw grid
        for (let y = 0; y < this.game.gridH; y++) {
            for (let x = 0; x < this.game.gridW; x++) {
                const cell = this.game.grid[y][x];
                const px = x * this.game.cellSize;
                const py = y * this.game.cellSize;

                // Cell background
                ctx.fillStyle = this.colors[cell.owner];
                ctx.fillRect(px, py, this.game.cellSize, this.game.cellSize);

                // Border
                ctx.strokeStyle = '#1a2f4a';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, this.game.cellSize, this.game.cellSize);

                // Population text
                if (cell.owner && cell.pop > 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        cell.pop,
                        px + this.game.cellSize / 2,
                        py + this.game.cellSize / 2
                    );
                }

                // Defense shields
                if (cell.defense > 0) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    for (let i = 0; i < Math.min(cell.defense, 3); i++) {
                        ctx.fillText('🛡️', px + 2 + i * 8, py + 2);
                    }
                }

                // Buildings
                if (cell.buildings.length > 0) {
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    let buildText = '';
                    if (cell.buildings.includes('city')) buildText += '🏛️';
                    if (cell.buildings.includes('factory')) buildText += '🏭';
                    ctx.fillText(buildText, px + this.game.cellSize - 2, py + this.game.cellSize - 2);
                }
            }
        }

        // Restore context
        ctx.restore();
    }

    // Handle window resize
    handleResize() {
        this.setupHiDPI();
        this.render();
    }
}
