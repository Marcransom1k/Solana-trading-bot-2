# Solana Trading Bot - Local API Solution

## Problem Solved! ✅

**Original Issue:** The Lightning Transaction API required creating a separate PumpPortal wallet and API key, which kept failing with "not linked to valid wallet" errors.

**Solution:** Switched to **Local Transaction API** which trades directly from your Phantom wallet!

---

## How It Works Now

### Architecture

```
Your Phantom Wallet
       ↓
   (Private Key)
       ↓
Trading Bot (Local API)
       ↓
PumpPortal builds transaction
       ↓
Bot signs with your key
       ↓
Transaction sent to Solana
```

### Key Advantages

| Feature | Local API ✅ | Lightning API ❌ |
|---------|-------------|------------------|
| **API Key** | Not needed | Required |
| **Separate Wallet** | Not needed | Required |
| **Funding** | Use existing Phantom | Must fund new wallet |
| **Control** | Full control | Trust PumpPortal |
| **Security** | You sign transactions | They sign for you |
| **Setup** | Just private key | Multiple steps |

---

## Current Setup

### Bot Configuration

**File:** `trading_bot_local.js`

**Settings:**
- Wallet: Your Phantom wallet (31oUgLMfAqXk668PS8EfNjnjcaRR88MiTMqgZuUZTpmj)
- Buy Amount: 0.01 SOL per trade
- Take Profit: +50%
- Stop Loss: -20%
- Max Positions: 3
- Liquidity Check: $3K minimum
- Pool: Auto (Pump.fun or Raydium)

### Features

✅ **Paste contract addresses** - Get token info with buy button
✅ **Liquidity warnings** - Shows ⚠️ if liquidity < $3K
✅ **Position tracking** - Monitors all open trades
✅ **Auto take-profit/stop-loss** - Sells automatically at targets
✅ **Sell buttons** - One-click exit on `/positions`
✅ **Real-time PnL** - Shows profit/loss on each position

---

## How to Use

### 1. Check Status
Send to Telegram bot:
```
/stats
```

### 2. Buy a Token
Paste any Solana contract address into Telegram:
```
6vVfbQVRSXcfyQamPqCzcqmA86vCzb2d7B7gmDDqpump
```

Bot will show:
- Token name and symbol
- Current price
- Market cap
- **Liquidity** (with warning if low)
- 24h volume
- Buy button

Click **Buy** button to execute trade!

### 3. Monitor Positions
```
/positions
```

Shows all open positions with:
- Entry price
- Current price
- PnL percentage
- **Sell button** for each position

### 4. Manual Sell
Click the sell button on `/positions` or use:
```
/sell CONTRACT_ADDRESS
```

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/positions` | View open positions with sell buttons |
| `/stats` | Trading statistics and wallet info |
| `/help` | Show help message |
| Paste address | Get token info and buy button |
| `/sell MINT` | Manually sell a position |

---

## Running the Bots

### Current Status

Both bots are running in tmux sessions:

```bash
# Check running bots
tmux ls

# View monitoring bot
tmux attach -t monitor_bot
# (Press Ctrl+B then D to detach)

# View trading bot
tmux attach -t trading_bot
# (Press Ctrl+B then D to detach)
```

### Restart Bots

```bash
# Restart monitoring bot
tmux kill-session -t monitor_bot
cd ~/memebot
tmux new -s monitor_bot
node solana_monitor_bot.js
# Press Ctrl+B then D

# Restart trading bot
tmux kill-session -t trading_bot
cd ~/memebot
tmux new -s trading_bot
node trading_bot_local.js
# Press Ctrl+B then D
```

---

## Safety Features

### 1. Liquidity Check
- Minimum $3K liquidity required
- Shows ⚠️ warning if below threshold
- Button changes to "RISKY" for low liquidity

### 2. Position Limits
- Maximum 3 concurrent positions
- Prevents overexposure

### 3. Auto Risk Management
- Take profit at +50%
- Stop loss at -20%
- Monitors every 30 seconds

### 4. Small Trade Sizes
- Default 0.01 SOL per trade
- ~$2.34 per trade (safe testing)

---

## Technical Details

### API Endpoint
```
https://pumpportal.fun/api/trade-local
```

### Request Format
```json
{
  "publicKey": "YOUR_WALLET_PUBLIC_KEY",
  "action": "buy",
  "mint": "TOKEN_CONTRACT_ADDRESS",
  "amount": 0.01,
  "denominatedInSol": "true",
  "slippage": 15,
  "priorityFee": 0.0001,
  "pool": "auto"
}
```

### Response
- Serialized Solana transaction
- Bot signs with your private key
- Sends to Solana network
- Waits for confirmation

---

## Files

| File | Purpose |
|------|---------|
| `trading_bot_local.js` | Main trading bot (Local API) |
| `solana_monitor_bot.js` | Monitoring bot (alerts) |
| `trading_bot_pumpportal.js` | Old bot (Lightning API) - not used |
| `package.json` | Dependencies |

---

## Next Steps

### To Deploy on Termux

1. **Install Node.js and npm** on your Android device
2. **Copy the memebot folder** to Termux
3. **Install dependencies:**
   ```bash
   cd ~/memebot
   npm install
   ```
4. **Run the bots:**
   ```bash
   # Start monitoring bot
   tmux new -s monitor
   node solana_monitor_bot.js
   # Ctrl+B then D to detach
   
   # Start trading bot
   tmux new -s trading
   node trading_bot_local.js
   # Ctrl+B then D to detach
   ```

### Security Reminder

⚠️ **Your private key is in the bot code!**
- Keep the bot files secure
- Don't share the files with anyone
- Consider using a dedicated trading wallet with limited funds
- Never commit the files to public repositories

---

## Troubleshooting

### Bot Not Responding
```bash
# Check if bots are running
tmux ls

# View bot logs
tmux attach -t trading_bot
```

### Transaction Failed
- Check wallet has enough SOL for trade + fees
- Verify token has sufficient liquidity
- Try increasing slippage (currently 15%)

### Can't Buy Token
- Check if max positions (3) reached
- Verify liquidity is above $3K
- Ensure wallet has SOL balance

---

## Summary

✅ **Problem:** Lightning API wallet linking issues
✅ **Solution:** Local Transaction API with Phantom wallet
✅ **Result:** Direct trading from your wallet, no API key needed!

**Both bots are now running and ready to trade!** 🚀

Try pasting a contract address into your Telegram bot to test it!
