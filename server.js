const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 80;

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading game');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

const gameState = {
    players: {},
    territories: [],
    activeAttacks: [], // Track ongoing territory fills
    gamePhase: 'lobby', // 'lobby', 'playing', 'ended'
    lobbyTimer: 15, // 15 second countdown for faster testing
    aiFactions: {}, // Neutral AI factions
    mapName: 'Europe - Zombie Invasion'
};

const colors = [
    '#e63946', // Bright Red
    '#457b9d', // Steel Blue
    '#2a9d8f', // Teal
    '#e9c46a', // Gold
    '#f4a261', // Orange
    '#06aed5', // Cyan
    '#7209b7', // Purple
    '#d62828', // Dark Red
    '#003049', // Navy
    '#95e1d3', // Mint
    '#f38181', // Light Red
    '#aa96da', // Light Purple
    '#fcbad3', // Pink
    '#a8d8ea', // Light Blue
    '#ffcb69', // Yellow
    '#52b788'  // Green
];
let colorIndex = 0;

// Enhanced European map with more territories and proper structure
const MAP_WIDTH = 1400;
const MAP_HEIGHT = 700;

const europeRegions = [
    // Atlantic Ocean (water)
    { name: 'Atlantic', x: 100, y: 300, type: 'water' },
    { name: 'Atlantic', x: 100, y: 400, type: 'water' },
    { name: 'Atlantic', x: 150, y: 350, type: 'water' },
    { name: 'Atlantic', x: 150, y: 450, type: 'water' },

    // Western Europe
    { name: 'Ireland', x: 280, y: 280, region: 'west' },
    { name: 'Scotland', x: 320, y: 240, region: 'west' },
    { name: 'England', x: 340, y: 300, region: 'west' },
    { name: 'Wales', x: 300, y: 320, region: 'west' },
    { name: 'Portugal', x: 220, y: 420, region: 'west' },
    { name: 'N.Spain', x: 280, y: 380, region: 'west' },
    { name: 'S.Spain', x: 300, y: 440, region: 'west' },
    { name: 'E.Spain', x: 350, y: 410, region: 'west' },
    { name: 'Brittany', x: 360, y: 350, region: 'west' },
    { name: 'N.France', x: 400, y: 320, region: 'west' },
    { name: 'Paris', x: 420, y: 360, region: 'west' },
    { name: 'S.France', x: 400, y: 420, region: 'west' },
    { name: 'Lyon', x: 450, y: 400, region: 'west' },

    // Central Europe
    { name: 'Belgium', x: 460, y: 330, region: 'central' },
    { name: 'Netherlands', x: 480, y: 300, region: 'central' },
    { name: 'Denmark', x: 520, y: 260, region: 'central' },
    { name: 'N.Germany', x: 540, y: 300, region: 'central' },
    { name: 'Berlin', x: 580, y: 320, region: 'central' },
    { name: 'S.Germany', x: 560, y: 360, region: 'central' },
    { name: 'Bavaria', x: 580, y: 380, region: 'central' },
    { name: 'Switzerland', x: 500, y: 400, region: 'central' },
    { name: 'Austria', x: 600, y: 400, region: 'central' },
    { name: 'N.Italy', x: 520, y: 440, region: 'central' },
    { name: 'Rome', x: 560, y: 480, region: 'central' },
    { name: 'S.Italy', x: 600, y: 520, region: 'central' },
    { name: 'Sicily', x: 580, y: 560, region: 'central' },
    { name: 'Czech', x: 640, y: 360, region: 'central' },
    { name: 'Slovakia', x: 680, y: 380, region: 'central' },
    { name: 'Hungary', x: 700, y: 410, region: 'central' },
    { name: 'Slovenia', x: 640, y: 420, region: 'central' },
    { name: 'Croatia', x: 660, y: 450, region: 'central' },

    // Scandinavia
    { name: 'S.Norway', x: 500, y: 220, region: 'north' },
    { name: 'Oslo', x: 520, y: 200, region: 'north' },
    { name: 'N.Norway', x: 560, y: 160, region: 'north' },
    { name: 'S.Sweden', x: 600, y: 240, region: 'north' },
    { name: 'Stockholm', x: 640, y: 220, region: 'north' },
    { name: 'N.Sweden', x: 640, y: 180, region: 'north' },
    { name: 'S.Finland', x: 720, y: 220, region: 'north' },
    { name: 'Helsinki', x: 740, y: 200, region: 'north' },
    { name: 'N.Finland', x: 760, y: 160, region: 'north' },

    // Eastern Europe
    { name: 'N.Poland', x: 680, y: 300, region: 'east' },
    { name: 'Warsaw', x: 700, y: 320, region: 'east' },
    { name: 'S.Poland', x: 720, y: 350, region: 'east' },
    { name: 'Estonia', x: 760, y: 220, region: 'east' },
    { name: 'Latvia', x: 780, y: 250, region: 'east' },
    { name: 'Lithuania', x: 760, y: 280, region: 'east' },
    { name: 'N.Belarus', x: 800, y: 280, region: 'east' },
    { name: 'Minsk', x: 820, y: 310, region: 'east' },
    { name: 'S.Belarus', x: 800, y: 340, region: 'east' },
    { name: 'N.Ukraine', x: 840, y: 340, region: 'east' },
    { name: 'Kiev', x: 860, y: 370, region: 'east' },
    { name: 'C.Ukraine', x: 880, y: 400, region: 'east' },
    { name: 'S.Ukraine', x: 900, y: 440, region: 'east' },
    { name: 'Crimea', x: 940, y: 460, region: 'east' },
    { name: 'Moldova', x: 860, y: 420, region: 'east' },
    { name: 'Romania', x: 800, y: 440, region: 'east' },
    { name: 'Bulgaria', x: 820, y: 480, region: 'east' },
    { name: 'Serbia', x: 740, y: 460, region: 'east' },
    { name: 'Bosnia', x: 700, y: 460, region: 'east' },
    { name: 'Albania', x: 720, y: 500, region: 'east' },
    { name: 'Macedonia', x: 760, y: 500, region: 'east' },
    { name: 'Greece', x: 780, y: 530, region: 'east' },
    { name: 'Crete', x: 800, y: 570, type: 'water' },

    // Russia
    { name: 'Kaliningrad', x: 720, y: 270, region: 'russia' },
    { name: 'St.Pete', x: 840, y: 220, region: 'russia' },
    { name: 'W.Russia', x: 900, y: 260, region: 'russia' },
    { name: 'Moscow', x: 940, y: 280, region: 'russia' },
    { name: 'Volga', x: 1000, y: 300, region: 'russia' },
    { name: 'Rostov', x: 960, y: 400, region: 'russia' },
    { name: 'Urals', x: 1060, y: 280, region: 'russia' },
    { name: 'Siberia-W', x: 1120, y: 260, region: 'russia' },
    { name: 'Siberia-E', x: 1180, y: 240, region: 'russia' },
    { name: 'Caucasus', x: 1020, y: 440, region: 'russia' },

    // Mediterranean (water)
    { name: 'Med.Sea', x: 480, y: 540, type: 'water' },
    { name: 'Med.Sea', x: 540, y: 580, type: 'water' },
    { name: 'Med.Sea', x: 640, y: 560, type: 'water' },
    { name: 'Med.Sea', x: 700, y: 580, type: 'water' },
    { name: 'Adriatic', x: 620, y: 480, type: 'water' },

    // Black Sea (water)
    { name: 'Black Sea', x: 900, y: 480, type: 'water' },
    { name: 'Black Sea', x: 940, y: 500, type: 'water' },

    // Baltic Sea (water)
    { name: 'Baltic', x: 660, y: 260, type: 'water' },
    { name: 'Baltic', x: 700, y: 240, type: 'water' },
    { name: 'Baltic', x: 560, y: 280, type: 'water' }
];

function generatePolygon(centerX, centerY, size, sides = 6, seed = 0) {
    const polygon = [];
    const angleStep = (Math.PI * 2) / sides;
    const jitter = 0.2;

    for (let i = 0; i < sides; i++) {
        // Use seed for consistent generation
        const randomOffset = Math.sin(seed + i * 1.5) * 0.5 + 0.5;
        const angle = angleStep * i + (randomOffset - 0.5) * angleStep * jitter;
        const radius = size * (0.9 + randomOffset * 0.2);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        polygon.push([x, y]);
    }

    return polygon;
}

const BUILDING_TYPES = {
    city: {
        cost: 150,
        name: 'City',
        emoji: '🏛️',
        goldPerTick: 8,
        populationBonus: 30,
        description: 'Increases max population and gold income. Essential for growth.'
    },
    port: {
        cost: 200,
        name: 'Port',
        emoji: '⚓',
        goldPerTick: 15,
        enablesTrade: true,
        description: 'Enables trade routes for massive gold income.'
    },
    train: {
        cost: 180,
        name: 'Train Station',
        emoji: '🚂',
        expansionBonus: 1.5,
        description: 'Speeds up territory expansion by 50%.'
    },
    factory: {
        cost: 250,
        name: 'Factory',
        emoji: '🏭',
        armyBonus: 1.4,
        description: 'Increases army strength by 40%.'
    },
    defensepost: {
        cost: 300,
        name: 'Defense Post',
        emoji: '🏰',
        defenseBonus: 50,
        description: 'Adds +50 defense to territory. Critical for borders.'
    },
    missile: {
        cost: 500,
        name: 'Missile Silo',
        emoji: '🚀',
        enablesMissiles: true,
        description: 'Launch devastating attacks on distant enemies.'
    }
};

function initTerritories() {
    gameState.territories = []; // Clear existing
    gameState.aiFactions = {}; // Clear AI factions

    europeRegions.forEach((region, id) => {
        const isWater = region.type === 'water';
        gameState.territories.push({
            id: id,
            x: region.x,
            y: region.y,
            polygon: generatePolygon(region.x, region.y, isWater ? 45 : 38, 6, id),
            countryName: region.name,
            ownerId: null,
            population: 0,
            fillProgress: 0,
            defense: 0,
            maxDefense: 3,
            buildings: [],
            maxBuildings: 3, // Increased to 3 for more strategic depth
            isWater: isWater,
            region: region.region
        });
    });

    // Create neutral AI factions in central/eastern Europe
    const aiColors = ['#9b59b6', '#e67e22', '#16a085', '#c0392b'];
    const aiNames = ['Kingdom of Prussia', 'Polish Empire', 'Hungarian Kingdom', 'Serbian Federation'];
    const aiRegions = [
        gameState.territories.filter(t => t.region === 'central' && !t.isWater && t.x > 550 && t.x < 650),
        gameState.territories.filter(t => t.region === 'east' && !t.isWater && t.x > 650 && t.x < 750),
        gameState.territories.filter(t => t.region === 'central' && !t.isWater && t.x > 650 && t.y > 380),
        gameState.territories.filter(t => t.region === 'east' && !t.isWater && t.x > 700 && t.y > 430)
    ];

    for (let i = 0; i < 4; i++) {
        const aiId = 'ai_' + i;
        gameState.aiFactions[aiId] = {
            id: aiId,
            name: aiNames[i],
            color: aiColors[i],
            territories: 0,
            population: 150,
            army: 75,
            gold: 100,
            isAI: true
        };

        // Give AI starting territories (2-3 each)
        const possibleTerritories = aiRegions[i].filter(t => !t.ownerId && !t.isWater);
        const numTerritories = 2 + Math.floor(Math.random() * 2);

        for (let j = 0; j < numTerritories && possibleTerritories.length > 0; j++) {
            const idx = Math.floor(Math.random() * possibleTerritories.length);
            const territory = possibleTerritories.splice(idx, 1)[0];
            territory.ownerId = aiId;
            territory.population = 60;
            territory.fillProgress = 100;
            gameState.aiFactions[aiId].territories++;
        }
    }

    // Zombies start in far eastern territories (Russia/Siberia)
    const easternTerritories = gameState.territories.filter(t => !t.isWater && t.x > 1050);
    easternTerritories.forEach(territory => {
        territory.ownerId = 'zombie';
        territory.population = 80;
        territory.fillProgress = 100;
    });
}

// Don't initialize until game starts

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function checkAdjacent(t1, t2) {
    const dist = Math.sqrt((t1.x - t2.x) ** 2 + (t1.y - t2.y) ** 2);
    return dist < 100; // Closer adjacency for better gameplay
}

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        gameState: gameState
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'join') {
                const player = {
                    id: playerId,
                    name: data.name,
                    color: colors[colorIndex % colors.length],
                    territories: 0,
                    population: 0,
                    army: 0,
                    gold: 100, // Starting gold
                    troopPercentage: 50, // Default attack percentage
                    spawnSelected: false
                };
                colorIndex++;

                gameState.players[playerId] = player;

                broadcast({
                    type: 'update',
                    gameState: gameState
                });
            }

            if (data.type === 'selectSpawn') {
                const player = gameState.players[playerId];
                if (!player || player.spawnSelected) return;

                // Can only select spawn during playing phase
                if (gameState.gamePhase !== 'playing') return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory || territory.isWater) return;

                // Must be in Western Europe (region 'west') and unclaimed
                if (territory.region !== 'west' || territory.ownerId) return;

                // Give player their starting territory
                territory.ownerId = playerId;
                territory.population = 50;
                territory.fillProgress = 100;
                player.territories = 1;
                player.population = 100;
                player.army = 50;
                player.spawnSelected = true;

                broadcast({
                    type: 'update',
                    gameState: gameState
                });
            }
            
            if (data.type === 'setTroopPercentage') {
                const player = gameState.players[playerId];
                if (!player) return;
                player.troopPercentage = Math.max(1, Math.min(100, data.percentage));
            }

            if (data.type === 'buildDefense') {
                const player = gameState.players[playerId];
                if (!player || gameState.gamePhase !== 'playing') return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory || territory.ownerId !== playerId) return;

                // Cost 30 troops per defense level
                if (player.army >= 30 && territory.defense < territory.maxDefense) {
                    territory.defense++;
                    player.army -= 30;
                    broadcast({
                        type: 'update',
                        gameState: gameState
                    });
                }
            }

            if (data.type === 'buildStructure') {
                const player = gameState.players[playerId];
                if (!player || gameState.gamePhase !== 'playing') return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory || territory.ownerId !== playerId) return;

                const buildingType = data.buildingType;
                const building = BUILDING_TYPES[buildingType];

                if (!building) return;
                if (territory.buildings.includes(buildingType)) return; // Already built
                if (territory.buildings.length >= territory.maxBuildings) return;
                if (player.gold < building.cost) return;

                // Build it
                territory.buildings.push(buildingType);
                player.gold -= building.cost;

                broadcast({
                    type: 'update',
                    gameState: gameState
                });
            }

            if (data.type === 'attack') {
                const player = gameState.players[playerId];
                if (!player || player.territories === 0 || gameState.gamePhase !== 'playing') return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory || territory.isWater) return; // Can't attack water

                // PVE: Can't attack other players (only neutral/zombie/AI territories)
                const targetOwner = territory.ownerId;
                if (targetOwner && targetOwner !== 'zombie' && !targetOwner.startsWith('ai_') && targetOwner !== playerId) {
                    return; // Can't attack other human players
                }

                // Can't attack own territory
                if (territory.ownerId === playerId) return;

                const playerTerritories = gameState.territories.filter(t => t.ownerId === playerId);
                const hasAdjacentTerritory = playerTerritories.some(t => checkAdjacent(t, territory));
                if (!hasAdjacentTerritory) return;

                // Check if already attacking this territory
                const existingAttack = gameState.activeAttacks.find(
                    a => a.playerId === playerId && a.territoryId === territory.id
                );
                if (existingAttack) return;

                // Calculate attack strength based on troop percentage
                const troopsUsed = Math.floor(player.army * (player.troopPercentage / 100));
                if (troopsUsed < 10) return; // Minimum 10 troops needed

                // Start the sand-fill attack
                gameState.activeAttacks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    playerId: playerId,
                    territoryId: territory.id,
                    troopsUsed: troopsUsed,
                    progress: 0,
                    fillRate: Math.max(1, troopsUsed / 20) // Faster fill with more troops
                });

                // Deduct troops
                player.army -= troopsUsed;

                broadcast({
                    type: 'update',
                    gameState: gameState
                });
            }
        } catch (e) {
            console.error('Error:', e);
        }
    });
    
    ws.on('close', () => {
        if (gameState.players[playerId]) {
            gameState.territories.forEach(t => {
                if (t.ownerId === playerId) {
                    t.ownerId = null;
                    t.population = 0;
                }
            });
            delete gameState.players[playerId];
            
            broadcast({
                type: 'update',
                gameState: gameState
            });
        }
    });
});

function getAllPlayers() {
    return { ...gameState.players, ...gameState.aiFactions };
}

function updateEntity(entity, territories) {
    entity.territories = territories.length;

    if (entity.territories > 0) {
        // Calculate bonuses from buildings
        let populationBonus = 0;
        let armyMultiplier = 1.0;
        let goldIncome = territories.length * 2; // Base gold per territory
        let hasPorts = 0;

        territories.forEach(t => {
            t.buildings.forEach(buildingType => {
                const building = BUILDING_TYPES[buildingType];
                if (building.populationBonus) populationBonus += building.populationBonus;
                if (building.armyBonus) armyMultiplier *= building.armyBonus;
                if (building.goldPerTick) goldIncome += building.goldPerTick;
                if (building.enablesTrade) hasPorts++;
            });
        });

        // Port trade bonus: each port can trade with other ports for extra income
        if (hasPorts > 0) {
            goldIncome += hasPorts * 5; // Each port generates extra trade income
        }

        // Population growth (keep ~50% for faster growth like openfront.io)
        const growthRate = entity.army < (entity.population * 0.5) ? 5 : 3;
        const maxPopulation = territories.length * 150 + populationBonus * 5; // Cities increase max pop cap
        entity.population = Math.min(
            entity.population + territories.length * growthRate + Math.floor(populationBonus / 10),
            maxPopulation
        );
        entity.army = Math.floor(entity.population * 0.6 * armyMultiplier);

        if (entity.gold !== undefined) {
            entity.gold = Math.max(0, entity.gold + goldIncome);
        }

        territories.forEach(t => {
            if (t.population < 100) {
                t.population = Math.min(t.population + 2, 100);
            }
        });
    }
}

function runAITurn(aiId) {
    const ai = gameState.aiFactions[aiId];
    if (!ai) return;

    const aiTerritories = gameState.territories.filter(t => t.ownerId === aiId);
    if (aiTerritories.length === 0) return;

    // AI tries to expand (less efficient than players)
    if (Math.random() < 0.15 && ai.army > 30) {
        const source = aiTerritories[Math.floor(Math.random() * aiTerritories.length)];
        const targets = gameState.territories.filter(t => {
            if (t.isWater) return false; // Don't attack water
            if (t.ownerId === aiId) return false;
            if (t.ownerId && !t.ownerId.startsWith('ai_') && t.ownerId !== 'zombie') return false; // Don't attack players
            return checkAdjacent(source, t);
        });

        if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const troopsUsed = Math.floor(ai.army * 0.3); // AI uses 30% troops

            gameState.activeAttacks.push({
                id: Math.random().toString(36).substr(2, 9),
                playerId: aiId,
                territoryId: target.id,
                troopsUsed: troopsUsed,
                progress: 0,
                fillRate: Math.max(1, troopsUsed / 25) // Slower than players
            });

            ai.army -= troopsUsed;
        }
    }
}

setInterval(() => {
    // LOBBY PHASE: Countdown
    if (gameState.gamePhase === 'lobby') {
        gameState.lobbyTimer--;

        if (gameState.lobbyTimer <= 0 || Object.keys(gameState.players).length >= 8) {
            // Start game
            gameState.gamePhase = 'playing';
            initTerritories();
            console.log('🎮 Game starting with ' + Object.keys(gameState.players).length + ' players!');
        }

        broadcast({
            type: 'update',
            gameState: gameState
        });
        return;
    }

    // PLAYING PHASE
    if (gameState.gamePhase === 'playing') {
        // Process sand-fill attacks
        gameState.activeAttacks = gameState.activeAttacks.filter(attack => {
            const territory = gameState.territories.find(t => t.id === attack.territoryId);
            const allPlayers = getAllPlayers();
            const attacker = allPlayers[attack.playerId];

            if (!territory || !attacker) return false;

            // Increase fill progress
            attack.progress += attack.fillRate;

            // Check if attack completes
            if (attack.progress >= 100) {
                // Calculate defense including defense posts
                let defenseBonus = 0;
                if (territory.buildings) {
                    territory.buildings.forEach(buildingType => {
                        const building = BUILDING_TYPES[buildingType];
                        if (building.defenseBonus) defenseBonus += building.defenseBonus;
                    });
                }
                const defendPower = territory.population + (territory.defense * 15) + defenseBonus;

                if (attack.troopsUsed > defendPower) {
                    // Successful capture
                    if (territory.ownerId && territory.ownerId !== 'zombie') {
                        const defender = allPlayers[territory.ownerId];
                        if (defender) {
                            defender.territories--;
                            if (defender.territories <= 0 && !defender.isAI) {
                                // Player eliminated
                                gameState.territories.forEach(t => {
                                    if (t.ownerId === defender.id) {
                                        t.ownerId = null;
                                        t.population = 0;
                                        t.fillProgress = 0;
                                    }
                                });
                            }
                        }
                    }

                    territory.ownerId = attacker.id;
                    territory.population = Math.floor((attack.troopsUsed - defendPower) * 0.6);
                    territory.fillProgress = 100;
                    attacker.territories++;
                } else {
                    // Failed attack - just damage
                    territory.population = Math.max(0, territory.population - Math.floor(attack.troopsUsed * 0.4));
                }

                return false; // Remove completed attack
            }

            return true; // Keep active attack
        });

        // Update all players
        Object.values(gameState.players).forEach(player => {
            const territories = gameState.territories.filter(t => t.ownerId === player.id);
            updateEntity(player, territories);
        });

        // Update AI factions
        Object.values(gameState.aiFactions).forEach(ai => {
            const territories = gameState.territories.filter(t => t.ownerId === ai.id);
            updateEntity(ai, territories);
        });

        // Run AI turns
        Object.keys(gameState.aiFactions).forEach(aiId => {
            runAITurn(aiId);
        });

        // Zombie invasion (more aggressive)
        if (Math.random() < 0.3) {
            const zombieTerritories = gameState.territories.filter(t => t.ownerId === 'zombie');

            if (zombieTerritories.length > 0) {
                const source = zombieTerritories[Math.floor(Math.random() * zombieTerritories.length)];

                const targets = gameState.territories.filter(t => {
                    if (t.isWater) return false; // Zombies don't go in water
                    if (t.ownerId === 'zombie') return false;
                    if (!checkAdjacent(source, t)) return false;
                    // Zombies prefer to move west
                    return t.x <= source.x + 50;
                });

                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    const zombieAttack = 50 + Math.floor(Math.random() * 20);

                    // Calculate defense including defense posts
                    let defenseBonus = 0;
                    if (target.buildings) {
                        target.buildings.forEach(buildingType => {
                            const building = BUILDING_TYPES[buildingType];
                            if (building.defenseBonus) defenseBonus += building.defenseBonus;
                        });
                    }
                    const defense = target.population + (target.defense * 15) + defenseBonus;

                    if (zombieAttack > defense) {
                        // Zombie captures territory
                        if (target.ownerId) {
                            const allPlayers = getAllPlayers();
                            const defender = allPlayers[target.ownerId];
                            if (defender) {
                                defender.territories--;
                                // Game over check
                                if (defender.territories <= 0) {
                                    gameState.territories.forEach(t => {
                                        if (t.ownerId === defender.id) {
                                            t.ownerId = null;
                                            t.population = 0;
                                            t.fillProgress = 0;
                                        }
                                    });
                                }
                            }
                        }
                        target.ownerId = 'zombie';
                        target.population = zombieAttack - defense;
                        target.fillProgress = 100;
                        target.defense = 0;
                        target.buildings = [];
                    } else {
                        // Defend successfully but take damage
                        target.population = Math.max(0, defense - zombieAttack);
                        if (target.population < 20 && target.defense > 0) {
                            target.defense--; // Lose a defense level
                        }
                    }
                }
            }

            // Zombie territories grow
            zombieTerritories.forEach(t => {
                if (t.population < 100) {
                    t.population = Math.min(t.population + 3, 100);
                }
            });
        }

        broadcast({
            type: 'update',
            gameState: gameState
        });
    }
}, 1000);

server.listen(PORT, () => {
    console.log('🧟 Eras Zombie: OPENFRONT STYLE - Europe Edition');
    console.log('🗺️  Polygon territories like sand/land!');
    console.log('🌍 Players spawn in Western Europe');
    console.log('🧟 Zombies invade from the East!');
});
