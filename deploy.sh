#!/bin/bash

# Eras Zombie Auto-Deploy Script
# Run this script on your droplet to deploy/update the game

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine the directory
APP_DIR="${APP_DIR:-$(pwd)}"
cd "$APP_DIR"

echo -e "${YELLOW}📂 Working directory: $APP_DIR${NC}"

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git fetch --all
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git reset --hard origin/$BRANCH
echo -e "${GREEN}✅ Code updated to latest commit${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Restart the application
echo -e "${YELLOW}🔄 Restarting application...${NC}"

# Try PM2 first (recommended)
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "eras-zombie"; then
        pm2 restart eras-zombie
        echo -e "${GREEN}✅ Application restarted with PM2${NC}"
    else
        pm2 start server.js --name eras-zombie --time
        pm2 save
        echo -e "${GREEN}✅ Application started with PM2${NC}"
    fi

# Try systemctl (if running as service)
elif command -v systemctl &> /dev/null; then
    if systemctl list-units --all | grep -q "eras-zombie"; then
        sudo systemctl restart eras-zombie
        echo -e "${GREEN}✅ Service restarted${NC}"
    else
        echo -e "${YELLOW}⚠️  No systemd service found. Starting manually...${NC}"
        pkill -f "node server.js" || true
        nohup node server.js > /dev/null 2>&1 &
        echo -e "${GREEN}✅ Application started in background${NC}"
    fi

# Manual restart
else
    echo -e "${YELLOW}⚠️  No process manager found. Restarting manually...${NC}"
    pkill -f "node server.js" || true
    nohup node server.js > /dev/null 2>&1 &
    echo -e "${GREEN}✅ Application started in background${NC}"
fi

echo ""
echo -e "${GREEN}🎮 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌍 Game is running on http://your-server-ip${NC}"
