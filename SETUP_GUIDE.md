# Solana Meme Coin Monitor Bot - Setup Guide

This guide provides step-by-step instructions for setting up and running the Solana Meme Coin Monitor Bot on your Android device using Termux. The bot monitors Pump.fun for new tokens and scans for hot movers on Solana, sending alerts to your Telegram.

## Prerequisites

Before you begin, ensure you have the following installed on your Android device:

- **Termux:** A terminal emulator for Android. You can download it from F-Droid.
- **Node.js:** A JavaScript runtime environment. You can install it in Termux.

## Setup Instructions

### Step 1: Install Node.js

If you don't have Node.js installed in Termux, open Termux and run the following command:

```bash
pkg install nodejs-lts
```

### Step 2: Create Bot Directory

Create a new directory for your bot and navigate into it:

```bash
mkdir -p ~/memebot
cd ~/memebot
```

### Step 3: Create the Bot File

Create a new file named `solana_monitor_bot.js` and paste the code from the `solana_monitor_bot.js` file provided.

### Step 4: Create `package.json`

Create a file named `package.json` in the same directory and paste the following content:

```json
{
  "name": "solana-monitor-bot",
  "version": "1.0.0",
  "description": "Telegram bot for monitoring Solana meme coins",
  "type": "module",
  "main": "solana_monitor_bot.js",
  "scripts": {
    "start": "node solana_monitor_bot.js"
  },
  "dependencies": {
    "node-fetch": "^3.3.2",
    "ws": "^8.16.0"
  }
}
```

### Step 5: Install Dependencies

Install the required Node.js packages by running:

```bash
npm install
```

### Step 6: Run the Bot

Start the bot using the following command:

```bash
node solana_monitor_bot.js
```

The bot will start, connect to Telegram and Pump.fun, and begin monitoring for new tokens and hot movers. You should see log messages in your Termux console.

### Step 7: Keep the Bot Running (Optional)

To keep the bot running in the background even after you close Termux, you can use `tmux`. `tmux` is a terminal multiplexer that allows you to run processes in the background.

1.  **Install tmux:**

    ```bash
    pkg install tmux
    ```

2.  **Start a new tmux session:**

    ```bash
    tmux new -s memebot
    ```

3.  **Run the bot inside the tmux session:**

    ```bash
    cd ~/memebot
    node solana_monitor_bot.js
    ```

4.  **Detach from the tmux session:**

    Press `Ctrl+b` and then `d` to detach from the session. The bot will continue to run in the background.

5.  **Re-attach to the session:**

    To check the bot's logs or stop it, you can re-attach to the tmux session:

    ```bash
    tmux attach -t memebot
    ```

## Telegram Commands

You can interact with the bot on Telegram using the following commands:

- `/status`: Shows the current status of the bot.
- `/stats`: Displays detailed statistics about the bot's activity.
- `/help`: Provides a list of available commands.

---
