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
    activeAttacks: [] // Track ongoing territory fills
};

const colors = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#d62828', '#003049', '#06aed5', '#7209b7'];
let colorIndex = 0;

const europeCountries = [
    { name: 'Portugal', x: 250, y: 450 },
    { name: 'Spain', x: 350, y: 450 },
    { name: 'France', x: 450, y: 400 },
    { name: 'UK', x: 400, y: 300 },
    { name: 'Ireland', x: 350, y: 280 },
    { name: 'Belgium', x: 480, y: 350 },
    { name: 'Netherlands', x: 500, y: 320 },
    { name: 'Switzerland', x: 520, y: 420 },
    { name: 'Italy', x: 600, y: 480 },
    { name: 'Germany', x: 580, y: 360 },
    { name: 'Austria', x: 650, y: 420 },
    { name: 'Czech Rep.', x: 680, y: 380 },
    { name: 'Poland', x: 750, y: 350 },
    { name: 'Hungary', x: 750, y: 430 },
    { name: 'Croatia', x: 700, y: 470 },
    { name: 'Serbia', x: 760, y: 480 },
    { name: 'Bosnia', x: 720, y: 480 },
    { name: 'Norway', x: 580, y: 200 },
    { name: 'Sweden', x: 680, y: 220 },
    { name: 'Finland', x: 780, y: 200 },
    { name: 'Denmark', x: 580, y: 300 },
    { name: 'Estonia', x: 800, y: 250 },
    { name: 'Latvia', x: 820, y: 280 },
    { name: 'Lithuania', x: 800, y: 310 },
    { name: 'Belarus', x: 850, y: 320 },
    { name: 'Ukraine', x: 900, y: 380 },
    { name: 'Moldova', x: 880, y: 430 },
    { name: 'Romania', x: 820, y: 460 },
    { name: 'Bulgaria', x: 820, y: 500 },
    { name: 'Russia-W', x: 950, y: 300 },
    { name: 'Russia-C', x: 1050, y: 280 },
    { name: 'Russia-E', x: 1150, y: 260 },
    { name: 'Greece', x: 800, y: 520 },
    { name: 'Albania', x: 760, y: 510 },
    { name: 'N.Macedonia', x: 790, y: 500 },
    { name: 'Turkey-W', x: 880, y: 530 },
    { name: 'Turkey-E', x: 980, y: 540 }
];

function generatePolygon(centerX, centerY, size, sides = 6) {
    const polygon = [];
    const angleStep = (Math.PI * 2) / sides;
    const jitter = 0.3;
    
    for (let i = 0; i < sides; i++) {
        const angle = angleStep * i + (Math.random() - 0.5) * angleStep * jitter;
        const radius = size * (0.85 + Math.random() * 0.3);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        polygon.push([x, y]);
    }
    
    return polygon;
}

function initTerritories() {
    europeCountries.forEach((country, id) => {
        gameState.territories.push({
            id: id,
            x: country.x,
            y: country.y,
            polygon: generatePolygon(country.x, country.y, 50, 6 + Math.floor(Math.random() * 2)),
            countryName: country.name,
            ownerId: null,
            population: 0,
            fillProgress: 0, // 0-100 for sand-fill mechanic
            defense: 0, // Defense structures
            maxDefense: 3 // Max defense level
        });
    });

    // Zombies start in far eastern territories
    const easternTerritories = gameState.territories.filter(t => t.x > 1000);
    for (let i = 0; i < easternTerritories.length; i++) {
        const territory = easternTerritories[i];
        territory.ownerId = 'zombie';
        territory.population = 80;
        territory.fillProgress = 100;
    }
}

initTerritories();

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
    return dist < 180;
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
                    troopPercentage: 50 // Default attack percentage
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
                if (!player) return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory) return;

                // Must be in Western Europe and unclaimed
                if (territory.x > 650 || territory.ownerId) return;

                // Give player their starting territory
                territory.ownerId = playerId;
                territory.population = 50;
                territory.fillProgress = 100;
                player.territories = 1;
                player.population = 100;
                player.army = 50;

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
                if (!player) return;

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

            if (data.type === 'attack') {
                const player = gameState.players[playerId];
                if (!player || player.territories === 0) return;

                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory) return;

                // PVE: Can't attack other players (only neutral/zombie territories)
                if (territory.ownerId && territory.ownerId !== 'zombie' && territory.ownerId !== playerId) return;

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

setInterval(() => {
    // Process sand-fill attacks
    gameState.activeAttacks = gameState.activeAttacks.filter(attack => {
        const territory = gameState.territories.find(t => t.id === attack.territoryId);
        const player = gameState.players[attack.playerId];

        if (!territory || !player) return false;

        // Increase fill progress
        attack.progress += attack.fillRate;

        // Check if attack completes
        if (attack.progress >= 100) {
            const defendPower = territory.population + (territory.defense * 15);

            if (attack.troopsUsed > defendPower) {
                // Successful capture
                if (territory.ownerId && territory.ownerId !== 'zombie') {
                    const defender = gameState.players[territory.ownerId];
                    if (defender) defender.territories--;
                }

                territory.ownerId = player.id;
                territory.population = Math.floor((attack.troopsUsed - defendPower) * 0.6);
                territory.fillProgress = 100;
                player.territories++;
            } else {
                // Failed attack - just damage
                territory.population = Math.max(0, territory.population - Math.floor(attack.troopsUsed * 0.4));
            }

            return false; // Remove completed attack
        }

        return true; // Keep active attack
    });

    // Update player resources
    Object.values(gameState.players).forEach(player => {
        const territories = gameState.territories.filter(t => t.ownerId === player.id);
        player.territories = territories.length;

        if (player.territories > 0) {
            // Population growth (keep ~50% for faster growth like openfront.io)
            const growthRate = player.army < (player.population * 0.5) ? 5 : 3;
            player.population = Math.min(player.population + territories.length * growthRate, territories.length * 150);
            player.army = Math.floor(player.population * 0.6);

            territories.forEach(t => {
                if (t.population < 100) {
                    t.population = Math.min(t.population + 2, 100);
                }
            });
        }
    });

    // Zombie invasion (more aggressive)
    if (Math.random() < 0.3) {
        const zombieTerritories = gameState.territories.filter(t => t.ownerId === 'zombie');

        if (zombieTerritories.length > 0) {
            const source = zombieTerritories[Math.floor(Math.random() * zombieTerritories.length)];

            const targets = gameState.territories.filter(t => {
                if (t.ownerId === 'zombie') return false;
                if (!checkAdjacent(source, t)) return false;
                // Zombies prefer to move west
                return t.x <= source.x + 50;
            });

            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                const zombieAttack = 50 + Math.floor(Math.random() * 20);
                const defense = target.population + (target.defense * 15);

                if (zombieAttack > defense) {
                    // Zombie captures territory
                    if (target.ownerId) {
                        const defender = gameState.players[target.ownerId];
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
}, 1000);

server.listen(PORT, () => {
    console.log('🧟 Eras Zombie: OPENFRONT STYLE - Europe Edition');
    console.log('🗺️  Polygon territories like sand/land!');
    console.log('🌍 Players spawn in Western Europe');
    console.log('🧟 Zombies invade from the East!');
});
