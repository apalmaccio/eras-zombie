# 🚀 Auto-Deployment Setup Guide

This guide will help you set up automatic deployment from GitHub to your DigitalOcean Droplet (or any server).

## 📋 Prerequisites

- A DigitalOcean Droplet (or any VPS) running Ubuntu/Debian
- Git installed on the server
- Node.js and npm installed on the server
- SSH access to your server

## 🔧 One-Time Setup

### Step 1: Setup on Your Droplet

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

#### Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs git

# Install PM2 (Process Manager - RECOMMENDED)
npm install -g pm2

# Allow Node to bind to port 80
setcap 'cap_net_bind_service=+ep' $(which node)
```

#### Clone Repository

```bash
# Choose your installation directory
cd /var/www  # or ~/  or /home/yourusername/

# Clone the repo
git clone https://github.com/apalmaccio/eras-zombie.git
cd eras-zombie

# Install dependencies
npm install --production

# Make deploy script executable
chmod +x deploy.sh

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable PM2 on boot
```

### Step 2: Generate SSH Key (on your local machine)

```bash
# Generate a new SSH key for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/eras-zombie-deploy

# Display the public key (you'll add this to your server)
cat ~/.ssh/eras-zombie-deploy.pub

# Display the private key (you'll add this to GitHub Secrets)
cat ~/.ssh/eras-zombie-deploy
```

### Step 3: Add Public Key to Your Droplet

On your droplet:
```bash
# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Configure GitHub Secrets

Go to your GitHub repository:
1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** and add these three secrets:

| Secret Name | Value |
|-------------|-------|
| `DROPLET_HOST` | Your droplet IP address (e.g., `159.89.123.45`) |
| `DROPLET_USER` | SSH username (usually `root` or your username) |
| `DROPLET_SSH_KEY` | The **private key** from `~/.ssh/eras-zombie-deploy` (entire content) |

**To copy private key:**
```bash
# On your local machine
cat ~/.ssh/eras-zombie-deploy | pbcopy  # macOS
cat ~/.ssh/eras-zombie-deploy | xclip -selection clipboard  # Linux
cat ~/.ssh/eras-zombie-deploy  # Windows (manually copy)
```

### Step 5: Test SSH Connection

Test that GitHub Actions can connect:
```bash
# From your local machine
ssh -i ~/.ssh/eras-zombie-deploy root@your-droplet-ip "echo 'Connection successful!'"
```

## 🎯 How It Works

Once set up, automatic deployment happens on every push:

1. **You push code** to GitHub (any branch)
2. **GitHub Actions triggers** automatically
3. **SSH into your droplet**
4. **Pull latest code** from the repository
5. **Install dependencies** (`npm install`)
6. **Restart the game** using PM2/systemctl/manual restart

### Manual Deployment

You can also manually deploy by SSH'ing into your droplet:

```bash
ssh root@your-droplet-ip
cd /var/www/eras-zombie  # or wherever you installed it
./deploy.sh
```

## 🔍 Monitoring & Logs

### PM2 Commands (Recommended)

```bash
# View status
pm2 status

# View logs
pm2 logs eras-zombie

# Restart
pm2 restart eras-zombie

# Stop
pm2 stop eras-zombie

# Monitor in real-time
pm2 monit
```

### Manual Process Management

```bash
# Find the process
ps aux | grep "node server.js"

# Kill the process
pkill -f "node server.js"

# Start manually
node server.js &

# View logs (if using nohup)
tail -f nohup.out
```

## 🌐 Accessing Your Game

After deployment:
- **HTTP**: `http://your-droplet-ip`
- **Domain** (if configured): `http://yourdomain.com`

## 🔥 Firewall Configuration

Make sure port 80 is open:

```bash
# Using UFW (Ubuntu Firewall)
ufw allow 80/tcp
ufw allow 22/tcp  # SSH
ufw enable
ufw status
```

## 🐛 Troubleshooting

### GitHub Actions Failing

1. **Check secrets** are set correctly in GitHub
2. **Verify SSH key** permissions:
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   ```
3. **Check logs** in GitHub Actions tab

### Game Not Starting

1. **Check PM2 status**: `pm2 status`
2. **View logs**: `pm2 logs eras-zombie`
3. **Check port 80**: `lsof -i :80` or `netstat -tulpn | grep :80`
4. **Manually test**: `node server.js`

### Port 80 Permission Denied

```bash
# Give Node permission to bind to port 80
setcap 'cap_net_bind_service=+ep' $(which node)
```

### Can't Connect to Server

1. **Check firewall**: `ufw status`
2. **Check process is running**: `pm2 status` or `ps aux | grep node`
3. **Check server IP**: Make sure you're using the correct IP

## 📚 Advanced Configuration

### Using NGINX as Reverse Proxy

For better performance and HTTPS support:

```bash
# Install NGINX
apt install nginx

# Create NGINX config
nano /etc/nginx/sites-available/eras-zombie
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/eras-zombie /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

Update `server.js` to use port 8080 instead of 80.

### SSL/HTTPS with Let's Encrypt

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 🎮 Success!

Your game should now auto-deploy on every push. Visit your server IP to play!

**Support**: If you encounter issues, check the GitHub Actions logs or PM2 logs for detailed error messages.
