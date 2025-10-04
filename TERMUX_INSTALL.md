# Solana Trading Bot - Termux Installation Guide

## 📱 Quick Start for Android

### Step 1: Install Termux

Download Termux from F-Droid (NOT Google Play Store):
https://f-droid.org/en/packages/com.termux/

### Step 2: Install Required Packages

Open Termux and run:

```bash
# Update Termux packages
pkg update && pkg upgrade -y

# Install Node.js, tmux, and other tools
pkg install nodejs tmux wget unzip -y
```

### Step 3: Transfer Bot Files

**Option A: Download from cloud (if you uploaded the zip)**
```bash
cd ~
wget YOUR_DOWNLOAD_LINK_HERE
unzip memebot.zip
cd memebot
```

**Option B: Use Termux file access**
```bash
# Allow Termux to access storage
termux-setup-storage

# Copy files from Downloads folder
cd ~
cp -r ~/storage/downloads/memebot ~/memebot
cd ~/memebot
```

### Step 4: Run Setup Script

```bash
cd ~/memebot
chmod +x setup_termux.sh
./setup_termux.sh
```

This will:
- Install all dependencies (node-fetch, ws, @solana/web3.js, bs58)
- Create helper scripts (start_bots.sh, stop_bots.sh, status_bots.sh)
- Set up everything automatically

### Step 5: Start the Bots

```bash
./start_bots.sh
```

You should see:
```
✅ Bots started successfully!

monitor: 1 windows (created ...)
trading: 1 windows (created ...)

📱 Check your Telegram for bot messages!
```

---

## 🎮 Managing Your Bots

### Start Bots
```bash
cd ~/memebot
./start_bots.sh
```

### Stop Bots
```bash
cd ~/memebot
./stop_bots.sh
```

### Check Status
```bash
cd ~/memebot
./status_bots.sh
```

### View Bot Logs

**Monitoring Bot:**
```bash
tmux attach -t monitor
```
Press `Ctrl+B` then `D` to detach (exit without stopping)

**Trading Bot:**
```bash
tmux attach -t trading
```
Press `Ctrl+B` then `D` to detach

---

## ⚡ Keep Bots Running 24/7

### 1. Acquire Wakelock
Prevents Android from killing Termux when screen is off:
```bash
termux-wake-lock
```

To release:
```bash
termux-wake-unlock
```

### 2. Disable Battery Optimization

1. Open Android **Settings**
2. Go to **Apps** → **Termux**
3. Select **Battery**
4. Choose **Unrestricted** or **Don't optimize**

### 3. Keep Termux in Background

- Don't swipe away Termux from recent apps
- Termux will show a persistent notification when wakelock is active
- Bots will continue running even with screen off

---

## 🔧 Troubleshooting

### Bots Not Starting

```bash
# Check if Node.js is installed
node --version

# Check if files exist
ls -la ~/memebot

# Try manual start
cd ~/memebot
node trading_bot_local.js
```

### Bots Keep Stopping

```bash
# Make sure wakelock is active
termux-wake-lock

# Check battery optimization is disabled
# (Android Settings → Apps → Termux → Battery)

# Check tmux sessions
tmux ls
```

### Can't See Bot Logs

```bash
# List all tmux sessions
tmux ls

# Attach to specific session
tmux attach -t trading

# If session doesn't exist, start bots again
./start_bots.sh
```

### Dependencies Installation Failed

```bash
# Update npm
npm install -g npm

# Clear npm cache
npm cache clean --force

# Try installing again
cd ~/memebot
npm install
```

---

## 📊 Bot Status Commands

### Check if Bots are Running
```bash
./status_bots.sh
```

### View Live Bot Activity
```bash
# Monitoring bot
tmux attach -t monitor

# Trading bot
tmux attach -t trading
```

### Restart Bots
```bash
./stop_bots.sh
./start_bots.sh
```

---

## 🔐 Security Notes

⚠️ **Your private key is stored in `trading_bot_local.js`**

**Security Tips:**
1. Don't share the bot files with anyone
2. Don't upload files to public locations
3. Consider using a dedicated trading wallet with limited funds
4. Keep Termux app locked with fingerprint/PIN if possible

---

## 📱 Telegram Commands

Once bots are running, use these in Telegram:

| Command | Description |
|---------|-------------|
| Paste contract address | Get token info and buy button |
| `/positions` | View open positions with sell buttons |
| `/stats` | Trading statistics and wallet info |
| `/help` | Show help message |
| `/sell MINT` | Manually sell a position |

---

## 🚀 Auto-Start on Boot (Advanced)

To automatically start bots when Termux launches:

```bash
# Create boot script
cat >> ~/.bashrc << 'EOF'

# Auto-start trading bots
if [ -f ~/memebot/start_bots.sh ]; then
    echo "🤖 Starting trading bots..."
    cd ~/memebot && ./start_bots.sh
fi
EOF
```

Now bots will start automatically when you open Termux!

---

## 📞 Support

If you encounter issues:

1. Check bot logs: `tmux attach -t trading`
2. Verify Telegram is receiving messages
3. Check wallet has SOL for trading
4. Ensure internet connection is stable

---

## ✅ Quick Reference

```bash
# Start bots
./start_bots.sh

# Stop bots
./stop_bots.sh

# Check status
./status_bots.sh

# View logs
tmux attach -t trading  # (Ctrl+B then D to exit)

# Keep running 24/7
termux-wake-lock
```

**Your bots are now ready to trade on Android!** 🎉
