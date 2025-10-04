# Quick Start Guide - Trading Bot

## What You Have Now

You now have **TWO bots** that work together:

### 1. Monitoring Bot (`solana_monitor_bot.js`)
- ✅ Already running
- Watches Pump.fun for new tokens
- Scans for hot movers on Solana
- Sends alerts to your Telegram

### 2. Trading Bot (`trading_bot_pumpportal.js`)
- 🆕 Just created
- Executes buy/sell trades via PumpPortal API
- Tracks positions and PnL
- Auto-sells at profit/loss targets

## The Key Discovery 🔑

**Axiom.trade uses PumpPortal API, NOT Jupiter!**

This is why your Jupiter integration wasn't working. PumpPortal is:
- Much simpler to use
- Optimized for Pump.fun and Raydium
- Lower latency
- Better for meme coin trading

## How to Get Started

### Step 1: Get PumpPortal API Key

1. Go to https://pumpportal.fun
2. Look for "Developer Docs" or "API Access"
3. Sign up and get your API key
4. It will look like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 2: Add API Key to Bot

Open the trading bot file and add your API key:

```bash
nano ~/memebot/trading_bot_pumpportal.js
```

Find this line (around line 23):
```javascript
PUMPPORTAL_API_KEY: "YOUR_PUMPPORTAL_API_KEY_HERE",
```

Replace with your actual key:
```javascript
PUMPPORTAL_API_KEY: "your-actual-api-key-here",
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 3: Run the Trading Bot

```bash
cd ~/memebot
node trading_bot_pumpportal.js
```

You should see:
```
🤖 SOLANA TRADING BOT - PUMPPORTAL API
✅ Trading bot is running
```

### Step 4: Test It

Send these commands to your Telegram bot:

1. `/help` - See all commands
2. `/stats` - View trading statistics
3. `/positions` - Check open positions

## Trading Modes

### Manual Mode (Default - Safer)
- Bot monitors positions
- You manually trigger buys with `/buy` command
- Bot auto-sells at take profit or stop loss

**Example:**
```
/buy 6BLnGfidZq3ZYN8ePpPpPp3pPp3pPp3pPp3pPp3pPp3p 0.01
```

### Auto-Trade Mode (Automated - Riskier)
- Bot automatically buys when monitoring bot finds hot tokens
- Fully automated trading

**To enable:**
Edit the config and change:
```javascript
AUTO_TRADE: true,
```

## How They Work Together

```
┌─────────────────────┐
│  Monitoring Bot     │
│  (Already Running)  │
│                     │
│  • Watches Pump.fun │
│  • Finds hot tokens │
│  • Sends alerts     │
└──────────┬──────────┘
           │
           │ Alerts
           ▼
┌─────────────────────┐
│   Trading Bot       │
│   (New)             │
│                     │
│  • Executes trades  │
│  • Manages positions│
│  • Takes profit/loss│
└─────────────────────┘
```

## Safety Settings

The bot has built-in safety features:

```javascript
BUY_AMOUNT_SOL: 0.01,          // Small position size (~$2-3)
TAKE_PROFIT_PERCENT: 50,       // Sell at +50% profit
STOP_LOSS_PERCENT: 20,         // Sell at -20% loss
MAX_POSITIONS: 3,              // Max 3 positions at once
```

**Start small!** Test with 0.01 SOL first.

## Running Both Bots Together

Use tmux to run both bots in the background:

```bash
# Start monitoring bot
tmux new -s monitor
cd ~/memebot
node solana_monitor_bot.js
# Press Ctrl+B then D to detach

# Start trading bot
tmux new -s trading
cd ~/memebot
node trading_bot_pumpportal.js
# Press Ctrl+B then D to detach
```

To check on them:
```bash
tmux attach -t monitor   # View monitoring bot
tmux attach -t trading   # View trading bot
```

## Telegram Commands

### Position Management
- `/positions` - View all open positions
- `/stats` - View trading statistics
- `/help` - Show help message

### Manual Trading
- `/buy MINT_ADDRESS AMOUNT` - Buy a token
- `/sell MINT_ADDRESS` - Sell a token

**Example:**
```
/buy 6BLnGfidZq3ZYN8e 0.01
/sell 6BLnGfidZq3ZYN8e
```

## What Happens When You Trade

### Buy Process:
1. You send `/buy` command (or auto-trigger)
2. Bot sends request to PumpPortal API
3. PumpPortal executes trade on Solana
4. Bot stores position and tracks it
5. You get confirmation in Telegram

### Sell Process:
1. Bot monitors position price
2. When profit target or stop loss hit
3. Bot automatically sells via PumpPortal
4. Position closed, PnL calculated
5. You get results in Telegram

## Example Trading Session

```
You: /stats
Bot: 📈 Trading Statistics
     Total Profit: 0.0000 SOL
     Total Trades: 0
     Open Positions: 0/3

You: /buy 6BLnGfid... 0.01
Bot: ✅ Buy Executed
     Token: 6BLnGfid...
     Amount: 0.01 SOL
     Entry Price: $0.00001234

[Bot monitors position...]

Bot: 🟢 Sell Executed
     Token: 6BLnGfid...
     Entry: $0.00001234
     Exit: $0.00001850
     PnL: +50.0% (+0.005 SOL)
     Take profit at +50%
```

## Troubleshooting

### "API key not configured"
➜ You need to add your PumpPortal API key to the config

### "Buy Failed"
➜ Check you have SOL in your wallet
➜ Verify API key is correct
➜ Try increasing slippage

### Bot stops when I close terminal
➜ Use tmux (see "Running Both Bots Together")

### No trades executing
➜ Make sure AUTO_TRADE is enabled (if you want auto-trading)
➜ Or manually trigger with `/buy` command

## Important Warnings ⚠️

1. **Start Small** - Test with 0.01 SOL or less
2. **Understand Risks** - You can lose money
3. **API Key Security** - Keep your API key private
4. **Fees** - PumpPortal charges fees per transaction
5. **Slippage** - High volatility = higher slippage

## Next Steps

1. ✅ Get PumpPortal API key
2. ✅ Add it to the bot config
3. ✅ Run the trading bot
4. ✅ Test with `/help` command
5. ✅ Try a small test trade
6. ✅ Monitor results
7. ✅ Adjust settings as needed

## Files You Have

```
~/memebot/
├── solana_monitor_bot.js          # Monitoring bot (running)
├── trading_bot_pumpportal.js      # Trading bot (new)
├── SETUP_GUIDE.md                 # Monitoring bot setup
├── TRADING_BOT_SETUP.md           # Trading bot detailed guide
└── QUICK_START_TRADING.md         # This file
```

## Support Resources

- PumpPortal Docs: https://pumpportal.fun
- PumpPortal Telegram: Join for support
- Your bot logs: Check terminal for errors

---

**Ready to trade? Get your API key and let's go! 🚀**

Remember: Start small, test thoroughly, and trade responsibly!
