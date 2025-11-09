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
    territories: []
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
            population: 0
        });
    });
    
    const easternTerritories = gameState.territories.filter(t => t.x > 900);
    for (let i = 0; i < 6; i++) {
        if (i < easternTerritories.length) {
            const territory = easternTerritories[i];
            territory.ownerId = 'zombie';
            territory.population = 60;
        }
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
                    population: 100,
                    army: 50
                };
                colorIndex++;
                
                gameState.players[playerId] = player;
                
                const westernTerritories = gameState.territories.filter(t => !t.ownerId && t.x < 650);
                if (westernTerritories.length > 0) {
                    const startTerritory = westernTerritories[Math.floor(Math.random() * westernTerritories.length)];
                    startTerritory.ownerId = playerId;
                    startTerritory.population = 60;
                    player.territories = 1;
                }
                
                broadcast({
                    type: 'update',
                    gameState: gameState
                });
            }
            
            if (data.type === 'attack') {
                const player = gameState.players[playerId];
                if (!player) return;
                
                const territory = gameState.territories.find(t => t.id === data.territoryId);
                if (!territory) return;
                
                const playerTerritories = gameState.territories.filter(t => t.ownerId === playerId);
                if (playerTerritories.length === 0) return;
                
                if (territory.ownerId === playerId) return;
                
                const hasAdjacentTerritory = playerTerritories.some(t => checkAdjacent(t, territory));
                if (!hasAdjacentTerritory) return;
                
                const attackPower = Math.floor(player.army * 0.6);
                const defendPower = territory.population;
                
                if (attackPower > defendPower) {
                    if (territory.ownerId && territory.ownerId !== 'zombie') {
                        const defender = gameState.players[territory.ownerId];
                        if (defender) {
                            defender.territories--;
                            if (defender.territories <= 0) {
                                gameState.territories.forEach(t => {
                                    if (t.ownerId === territory.ownerId) {
                                        t.ownerId = null;
                                        t.population = 0;
                                    }
                                });
                            }
                        }
                    }
                    
                    territory.ownerId = playerId;
                    territory.population = Math.floor((attackPower - defendPower) * 0.7);
                    player.territories++;
                    player.army -= Math.floor(attackPower * 0.4);
                } else {
                    player.army -= Math.floor(attackPower * 0.6);
                    territory.population = Math.max(0, territory.population - Math.floor(attackPower * 0.3));
                }
                
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
    Object.values(gameState.players).forEach(player => {
        const territories = gameState.territories.filter(t => t.ownerId === player.id);
        player.territories = territories.length;
        
        if (player.territories > 0) {
            player.population = Math.min(player.population + territories.length * 3, territories.length * 150);
            player.army = Math.floor(player.population * 0.6);
            
            territories.forEach(t => {
                if (t.population < 100) {
                    t.population = Math.min(t.population + 2, 100);
                }
            });
        }
    });
    
    if (Math.random() < 0.2) {
        const zombieTerritories = gameState.territories.filter(t => t.ownerId === 'zombie');
        
        if (zombieTerritories.length > 0 && zombieTerritories.length < 25) {
            const source = zombieTerritories[Math.floor(Math.random() * zombieTerritories.length)];
            
            const targets = gameState.territories.filter(t => {
                if (t.ownerId === 'zombie') return false;
                if (!checkAdjacent(source, t)) return false;
                const isWestward = t.x < source.x;
                return isWestward && (t.ownerId === null || t.population < 40);
            });
            
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                
                if (target.ownerId === null) {
                    target.ownerId = 'zombie';
                    target.population = 50;
                } else if (source.population > 60) {
                    const zombieAttack = 40;
                    if (zombieAttack > target.population) {
                        if (target.ownerId) {
                            const defender = gameState.players[target.ownerId];
                            if (defender) {
                                defender.territories--;
                            }
                        }
                        target.ownerId = 'zombie';
                        target.population = zombieAttack - target.population;
                        source.population -= 20;
                    } else {
                        target.population -= zombieAttack / 2;
                        source.population -= 10;
                    }
                }
            }
        }
        
        zombieTerritories.forEach(t => {
            if (t.population < 100) {
                t.population = Math.min(t.population + 1, 100);
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
