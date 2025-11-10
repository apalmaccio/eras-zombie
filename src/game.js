// Game state and logic
export class Game {
    constructor() {
        this.gridW = 40;
        this.gridH = 30;
        this.cellSize = 32;

        // Grid: each cell has { owner, pop, defense, buildings }
        this.grid = [];
        for (let y = 0; y < this.gridH; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridW; x++) {
                this.grid[y][x] = {
                    owner: null,
                    pop: 0,
                    defense: 0,
                    buildings: []
                };
            }
        }

        // Player state
        this.player = {
            id: 'P',
            territory: 0,
            population: 100,
            army: 50,
            gold: 100,
            troopPct: 50
        };

        // AI factions
        this.ai = [
            { id: 'A', color: '#9b59b6', territory: 0, pop: 150, army: 75 },
            { id: 'B', color: '#e67e22', territory: 0, pop: 150, army: 75 },
            { id: 'C', color: '#16a085', territory: 0, pop: 150, army: 75 }
        ];

        // Zombies
        this.zombies = { id: 'Z', color: '#2d4a2e', territory: 0, pop: 100 };

        // Last turn time
        this.lastTurn = Date.now();

        // Selected cell for build menu
        this.selectedCell = null;

        // Initialize the grid
        this.initGrid();
    }

    initGrid() {
        // Player starts in center-left
        this.setOwner(5, 15, 'P', 50);

        // AI factions get 2-3 cells each
        this.setOwner(15, 10, 'A', 60);
        this.setOwner(16, 10, 'A', 60);
        this.setOwner(15, 11, 'A', 60);

        this.setOwner(25, 15, 'B', 60);
        this.setOwner(26, 15, 'B', 60);

        this.setOwner(20, 25, 'C', 60);
        this.setOwner(21, 25, 'C', 60);
        this.setOwner(20, 24, 'C', 60);

        // Zombies start in far right
        this.setOwner(35, 15, 'Z', 80);

        this.updateTerritories();
    }

    setOwner(x, y, owner, pop) {
        if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH) {
            this.grid[y][x].owner = owner;
            this.grid[y][x].pop = pop || 50;
        }
    }

    getCell(x, y) {
        if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH) {
            return this.grid[y][x];
        }
        return null;
    }

    // Try to expand from player territory
    tryExpand(gridX, gridY) {
        const cell = this.getCell(gridX, gridY);
        if (!cell) return false;

        // Can't expand into own territory
        if (cell.owner === 'P') return false;

        // Check if adjacent to player territory
        const adjacent = this.getAdjacentCells(gridX, gridY);
        const hasPlayerAdjacent = adjacent.some(c => c.owner === 'P');
        if (!hasPlayerAdjacent) return false;

        // Calculate attack power
        const attackPower = Math.floor(this.player.army * (this.player.troopPct / 100));
        if (attackPower < 10) return false; // Need at least 10 troops

        // Calculate defense
        const defensePower = cell.pop + (cell.defense * 15);

        // Add randomness
        const attackRoll = attackPower * (0.8 + Math.random() * 0.4);
        const defenseRoll = defensePower * (0.8 + Math.random() * 0.4);

        // Attack succeeds?
        if (attackRoll > defenseRoll) {
            const prevOwner = cell.owner;
            cell.owner = 'P';
            cell.pop = Math.floor((attackPower - defensePower) * 0.6);
            cell.defense = 0;
            this.player.army -= attackPower;

            // Update territory counts
            if (prevOwner) {
                this.updateTerritories();
            }

            return true;
        } else {
            // Failed attack - lose troops
            this.player.army -= attackPower;
            cell.pop = Math.max(0, cell.pop - Math.floor(attackPower * 0.4));
            return false;
        }
    }

    // Open build menu at grid position
    openBuildAt(gridX, gridY) {
        const cell = this.getCell(gridX, gridY);
        if (!cell || cell.owner !== 'P') {
            this.selectedCell = null;
            return null;
        }

        this.selectedCell = { x: gridX, y: gridY };
        return { x: gridX, y: gridY };
    }

    // Build methods
    buildDefense() {
        if (!this.selectedCell) return;
        const cell = this.getCell(this.selectedCell.x, this.selectedCell.y);
        if (!cell || cell.owner !== 'P') return;

        if (this.player.army >= 30) {
            cell.defense++;
            this.player.army -= 30;
        }
        this.selectedCell = null;
    }

    buildCity() {
        if (!this.selectedCell) return;
        const cell = this.getCell(this.selectedCell.x, this.selectedCell.y);
        if (!cell || cell.owner !== 'P') return;

        if (this.player.gold >= 100 && !cell.buildings.includes('city')) {
            cell.buildings.push('city');
            this.player.gold -= 100;
        }
        this.selectedCell = null;
    }

    buildFactory() {
        if (!this.selectedCell) return;
        const cell = this.getCell(this.selectedCell.x, this.selectedCell.y);
        if (!cell || cell.owner !== 'P') return;

        if (this.player.gold >= 150 && !cell.buildings.includes('factory')) {
            cell.buildings.push('factory');
            this.player.gold -= 150;
        }
        this.selectedCell = null;
    }

    // Get adjacent cells
    getAdjacentCells(x, y) {
        const cells = [];
        const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
        for (const [dx, dy] of dirs) {
            const cell = this.getCell(x + dx, y + dy);
            if (cell) cells.push(cell);
        }
        return cells;
    }

    // Update territory counts
    updateTerritories() {
        const counts = { P: 0, A: 0, B: 0, C: 0, Z: 0 };

        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                const owner = this.grid[y][x].owner;
                if (owner) counts[owner]++;
            }
        }

        this.player.territory = counts.P;
        this.ai[0].territory = counts.A;
        this.ai[1].territory = counts.B;
        this.ai[2].territory = counts.C;
        this.zombies.territory = counts.Z;
    }

    // AI takes a turn
    aiTurn() {
        for (const faction of this.ai) {
            if (Math.random() > 0.3) continue; // 30% chance to act

            // Find AI territories
            const territories = [];
            for (let y = 0; y < this.gridH; y++) {
                for (let x = 0; x < this.gridW; x++) {
                    if (this.grid[y][x].owner === faction.id) {
                        territories.push({ x, y });
                    }
                }
            }

            if (territories.length === 0) continue;

            // Pick random territory to expand from
            const source = territories[Math.floor(Math.random() * territories.length)];

            // Find weakest adjacent target
            const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
            let bestTarget = null;
            let lowestDefense = Infinity;

            for (const [dx, dy] of dirs) {
                const tx = source.x + dx;
                const ty = source.y + dy;
                const cell = this.getCell(tx, ty);

                if (!cell || cell.owner === faction.id) continue;
                if (cell.owner === 'P' || cell.owner === 'Z') continue; // Don't attack player or zombies

                const defense = cell.pop + cell.defense * 15;
                if (defense < lowestDefense) {
                    lowestDefense = defense;
                    bestTarget = { x: tx, y: ty };
                }
            }

            if (bestTarget) {
                const cell = this.getCell(bestTarget.x, bestTarget.y);
                const attackPower = Math.floor(faction.army * 0.3);
                const defensePower = cell.pop + cell.defense * 15;

                if (attackPower > defensePower * 0.8) {
                    cell.owner = faction.id;
                    cell.pop = Math.floor(attackPower * 0.5);
                    cell.defense = 0;
                    faction.army -= attackPower;
                }
            }
        }
    }

    // Zombies take a turn
    zombieTurn() {
        // Find all zombie cells
        const zombieCells = [];
        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                if (this.grid[y][x].owner === 'Z') {
                    zombieCells.push({ x, y });
                }
            }
        }

        if (zombieCells.length === 0) return;

        // Zombies spread to 1-3 adjacent tiles
        const numAttacks = Math.min(3, Math.floor(Math.random() * 3) + 1);

        for (let i = 0; i < numAttacks && zombieCells.length > 0; i++) {
            const source = zombieCells[Math.floor(Math.random() * zombieCells.length)];
            const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];

            const tx = source.x + dir[0];
            const ty = source.y + dir[1];
            const cell = this.getCell(tx, ty);

            if (!cell || cell.owner === 'Z') continue;

            const zombiePower = 50 + Math.floor(Math.random() * 30);
            const defensePower = cell.pop + cell.defense * 15;

            if (zombiePower > defensePower) {
                cell.owner = 'Z';
                cell.pop = zombiePower - defensePower;
                cell.defense = 0;
                cell.buildings = [];
            } else {
                cell.pop = Math.max(0, cell.pop - Math.floor(zombiePower * 0.3));
            }
        }
    }

    // Economy tick
    economyTick() {
        // Count cities and factories
        let cityBonus = 0;
        let factoryBonus = 1.0;

        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                const cell = this.grid[y][x];
                if (cell.owner === 'P') {
                    if (cell.buildings.includes('city')) cityBonus += 20;
                    if (cell.buildings.includes('factory')) factoryBonus += 0.1;
                }
            }
        }

        // Update player resources
        const goldIncome = this.player.territory * 2 + cityBonus;
        this.player.gold += goldIncome;

        const popGrowth = this.player.territory * 3;
        this.player.population += popGrowth;

        this.player.army = Math.floor(this.player.population * 0.6 * factoryBonus);

        // Update AI
        for (const faction of this.ai) {
            faction.pop += faction.territory * 3;
            faction.army = Math.floor(faction.pop * 0.6);
        }

        // Update zombies
        this.zombies.pop += this.zombies.territory * 2;
    }

    // Main turn - called once per second
    turn() {
        const now = Date.now();
        if (now - this.lastTurn < 1000) return;
        this.lastTurn = now;

        this.economyTick();
        this.aiTurn();
        this.zombieTurn();
        this.updateTerritories();
    }

    // Get player stats for HUD
    getStats() {
        return {
            territory: this.player.territory,
            population: this.player.population,
            army: this.player.army,
            gold: this.player.gold,
            troopPct: this.player.troopPct
        };
    }
}
