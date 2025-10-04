#!/bin/bash

# Start script for Render.com deployment
# Runs health check server and both bots

echo "Starting Solana Trading Bot on Render.com..."

# Start health check server in background
node server.js &

# Wait a moment
sleep 2

# Start monitoring bot in background
node solana_monitor_bot.js &

# Wait a moment
sleep 2

# Start trading bot in foreground (keeps container alive)
node trading_bot_local.js
