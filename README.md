# 🧟 Eras Zombie - Europe Edition

An **openfront.io-style** multiplayer strategy game where players cooperate to defend Europe against a zombie invasion from the east!

## 🎮 Game Features

### Core Gameplay
- **PVE Cooperative Multiplayer** - Work together to stop the zombie horde
- **Sand-Fill Territory Capture** - Gradual territory expansion like openfront.io
- **95+ Territories** - Detailed European map from Ireland to Siberia
- **Pregame Lobby** - 15-second countdown before game starts

### Economic System
- **Gold Economy** - Earn 2 gold per territory + building bonuses
- **Buildings System** - Cities, Ports, Trains, Factories
- **Troop Percentage Slider** - Control what % of army to send (10-100%)
- **Population Growth** - Keep army < 50% population for faster growth

### Strategic Elements
- **Defense Structures** - Build shields (costs 30 troops, max 3 per territory)
- **AI Factions** - 4 neutral kingdoms you can conquer or ally with
  - Kingdom of Prussia
  - Polish Empire
  - Hungarian Kingdom
  - Serbian Federation
- **Zombie Invasion** - Hordes spread westward from Siberia

### Map Features
- **Proper European Geography** - Western, Central, Eastern, Northern, Russian regions
- **Ocean Tiles** - Atlantic, Mediterranean, Black Sea, Baltic Sea
- **Real Territory Names** - From Scotland to Moscow to Sicily

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/apalmaccio/eras-zombie.git
cd eras-zombie

# Install dependencies
npm install

# Start the server
node server.js

# Open in browser
# Visit http://localhost
```

### Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete auto-deployment setup!

**Quick deploy to your server:**
```bash
# On your droplet
git clone https://github.com/apalmaccio/eras-zombie.git
cd eras-zombie
npm install --production
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

## 🎯 How to Play

1. **Join Lobby** - Enter your name and wait for game to start
2. **Select Spawn** - Click a territory in Western Europe (highlighted green)
3. **Expand Territory** - Left-click adjacent territories to sand-fill capture
4. **Build Economy** - Right-click your territories to open build menu (max 3 buildings per territory)
   - 🏛️ **City** (150g): +8 gold/tick, +30 population bonus
   - ⚓ **Port** (200g): +15 gold/tick, enables trade routes
   - 🚂 **Train Station** (180g): +50% expansion speed
   - 🏭 **Factory** (250g): +40% army strength
   - 🏰 **Defense Post** (300g): +50 defense power
   - 🚀 **Missile Silo** (500g): Launch long-range attacks
5. **Defend** - Build defenses, fight zombies, capture AI lands

### Controls
- **Left Click**: Attack/capture adjacent territories
- **Right Click**: Open build menu on your territories
- **Slider**: Adjust % of troops to use per attack
- **Zoom**: +/- buttons in bottom right

## 📊 Game Mechanics

### Territory Capture (Sand-Fill)
- Territories fill gradually based on troop count
- More troops = faster capture
- Must be adjacent to your territory
- Can attack: Neutral, AI factions, Zombies
- Cannot attack: Other players (PVE only), Water tiles

### Economy
- **Base Income**: 2 gold per territory per second
- **Population Growth**: Territories + buildings provide population
- **Army Size**: 60% of total population (affected by factory multiplier)
- **Optimal Strategy**: Keep army < 50% of max for 5/sec growth vs 3/sec

### Combat
- **Attack Power**: Troop count you send
- **Defense Power**: Territory population + (defense level × 15)
- **Success**: Attack power > Defense power
- **Result**: Capture territory with remaining troops

### AI Factions
- 15% chance per second to expand
- Use 30% of army per attack
- Slower fill rate than players
- Won't attack human players (PVE)
- Can be conquered for territory

### Zombie Threat
- Start in far eastern Russia/Siberia
- 30% chance per second to attack westward
- Attack power: 50-70
- Destroy buildings when capturing
- Can eliminate players if they lose all territory

## 🛠️ Tech Stack

- **Server**: Node.js with WebSocket (ws library)
- **Client**: Vanilla JavaScript with HTML5 Canvas
- **Deployment**: GitHub Actions + PM2
- **Architecture**: Real-time multiplayer with 1-second game tick

## 📁 Project Structure

```
eras-zombie/
├── server.js              # Game server & logic
├── index.html             # Client-side game
├── package.json           # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
├── .github/workflows/
│   └── deploy.yml         # Auto-deployment config
├── DEPLOYMENT.md          # Deployment guide
└── README.md              # This file
```

## 🔧 Configuration

### Server Settings (server.js)
```javascript
const PORT = 80;                    // Server port
lobbyTimer: 15,                     // Lobby countdown (seconds)
adjacency distance: 100,            // How close territories must be
fillRate: troopsUsed / 20,          // Sand-fill speed
```

### Building Costs & Effects
- **Defense Shield**: 30 troops (max 3 per territory, +15 defense each)
- **City**: 150 gold (+8 gold/tick, +30 pop bonus, increases max population)
- **Port**: 200 gold (+15 gold/tick, +5 per port trade bonus)
- **Train Station**: 180 gold (+50% faster territory expansion)
- **Factory**: 250 gold (+40% army strength multiplier)
- **Defense Post**: 300 gold (+50 defense power to territory)
- **Missile Silo**: 500 gold (enables long-range attacks)

## 🚀 Auto-Deployment

This project includes **automatic deployment** via GitHub Actions!

Every time you push to the repository, it automatically:
1. SSH into your server
2. Pull latest code
3. Install dependencies
4. Restart the game

**Setup**: See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

**Quick setup:**
1. Add SSH key to your server
2. Add these GitHub Secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`
3. Push code → Auto deploys! 🎉

## 🎨 Map Regions

- **Western Europe**: Ireland, UK, France, Spain, Portugal (spawn zone)
- **Central Europe**: Germany, Italy, Austria, Switzerland
- **Northern Europe**: Norway, Sweden, Finland, Denmark
- **Eastern Europe**: Poland, Ukraine, Balkans, Baltic states
- **Russia**: From St. Petersburg to Siberia
- **Water**: Atlantic, Mediterranean, Black Sea, Baltic Sea

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 80 is available
lsof -i :80

# Give Node permission to bind to port 80
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### Can't connect to game
- Check firewall: `ufw allow 80/tcp`
- Check server is running: `pm2 status`
- Check IP address is correct

### Game lags/crashes
- Increase server resources
- Check logs: `pm2 logs eras-zombie`
- Restart: `pm2 restart eras-zombie`

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 🎮 Credits

Inspired by [openfront.io](https://openfront.io) - A great strategy game!

---

**Made with ❤️ for zombie strategy fans**

🧟 Survive the horde! 🛡️
