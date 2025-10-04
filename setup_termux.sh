#!/bin/bash
# Solana Trading Bot - Termux Setup Script
# Run this script on your Android device in Termux

echo "============================================================"
echo "🤖 SOLANA TRADING BOT - TERMUX SETUP"
echo "============================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "trading_bot_local.js" ]; then
    echo "❌ Error: Bot files not found!"
    echo "Make sure you're in the memebot directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install node-fetch ws @solana/web3.js bs58

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed!"
echo ""

# Create start script
cat > start_bots.sh << 'EOF'
#!/bin/bash
cd ~/memebot
echo "🔄 Stopping old bot sessions..."
tmux kill-session -t monitor 2>/dev/null
tmux kill-session -t trading 2>/dev/null
sleep 1

echo "🚀 Starting bots..."
tmux new-session -d -s monitor 'node solana_monitor_bot.js'
tmux new-session -d -s trading 'node trading_bot_local.js'
sleep 2

echo ""
echo "✅ Bots started successfully!"
echo ""
tmux ls
echo ""
echo "📱 Check your Telegram for bot messages!"
echo ""
echo "Commands:"
echo "  tmux attach -t monitor  # View monitoring bot"
echo "  tmux attach -t trading  # View trading bot"
echo "  (Press Ctrl+B then D to detach)"
EOF

chmod +x start_bots.sh

# Create stop script
cat > stop_bots.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping bots..."
tmux kill-session -t monitor 2>/dev/null
tmux kill-session -t trading 2>/dev/null
echo "✅ Bots stopped!"
EOF

chmod +x stop_bots.sh

# Create status script
cat > status_bots.sh << 'EOF'
#!/bin/bash
echo "📊 Bot Status:"
echo ""
tmux ls 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ No bots running"
else
    echo ""
    echo "✅ Bots are running!"
fi
EOF

chmod +x status_bots.sh

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "📝 Scripts created:"
echo "  ./start_bots.sh   - Start both bots"
echo "  ./stop_bots.sh    - Stop both bots"
echo "  ./status_bots.sh  - Check bot status"
echo ""
echo "🚀 To start the bots now, run:"
echo "  ./start_bots.sh"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Keep Termux running in background"
echo "  2. Run: termux-wake-lock (prevents Android from killing Termux)"
echo "  3. Disable battery optimization for Termux in Android settings"
echo ""
echo "============================================================"
