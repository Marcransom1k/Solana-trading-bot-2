# 🚀 Deploy to Render.com - Step by Step Guide

## Why Render.com?

✅ **FREE forever** - No credit card required for free tier
✅ **Web interface** - No command line needed!
✅ **24/7 uptime** - Bot runs continuously
✅ **Auto-restart** - If it crashes, automatically restarts
✅ **Simple deployment** - Just 5 clicks!

---

## Total Time: 10 Minutes

---

## Step 1: Sign Up for Render.com (2 minutes)

1. Go to: **https://render.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with:
   - **Email** (recommended), OR
   - **GitHub** account, OR
   - **GitLab** account

4. **Verify your email** (check inbox)

✅ **Account created!**

**Note:** Free tier does NOT require credit card!

---

## Step 2: Create New Web Service (1 minute)

1. After logging in, click **"New +"** button (top right)
2. Select **"Web Service"**
3. You'll see deployment options

✅ **Ready to deploy!**

---

## Step 3: Deploy Your Bot (3 minutes)

### Option A: Deploy from GitHub (Recommended)

**If you have GitHub:**

1. Upload `memebot-render.zip` contents to a GitHub repo
2. In Render, click **"Connect Repository"**
3. Select your repo
4. Render auto-detects settings
5. Click **"Create Web Service"**

### Option B: Deploy from Zip (Easier, No GitHub)

**If you don't have GitHub:**

1. Click **"Public Git Repository"**
2. Enter: `https://github.com/yourusername/memebot` (we'll create this)

**OR use Render's Blueprint:**

1. Download the `memebot-render.zip`
2. Extract it locally
3. Create a new GitHub repo (free)
4. Upload files
5. Connect to Render

---

## Step 4: Configure Settings (2 minutes)

Render should auto-detect most settings from `render.yaml`, but verify:

### Basic Settings:
- **Name:** `solana-trading-bot` (or whatever you want)
- **Region:** Choose closest to you (e.g., Oregon)
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Advanced Settings:
- **Plan:** **Free** ✅
- **Environment:** Node
- **Auto-Deploy:** Yes (recommended)

### Health Check:
- **Health Check Path:** `/health`

✅ **Settings configured!**

---

## Step 5: Deploy! (2 minutes)

1. Click **"Create Web Service"** at the bottom
2. Render will:
   - Build your bot
   - Install dependencies
   - Start the service
3. Watch the logs in real-time
4. Wait for: **"Your service is live"**

✅ **Bot is deployed and running 24/7!**

---

## Step 6: Verify It's Working (1 minute)

### Check Render Logs:

In the Render dashboard:
1. Click on your service
2. Click **"Logs"** tab
3. You should see:
   ```
   ✅ Wallet loaded: 31oUgLMf...
   ✅ Loaded 2 saved positions
   ✅ Trading bot is running
   ```

### Check Telegram:

- Open your Telegram bot
- Send: `/stats`
- You should get a response!

✅ **Bot is operational!**

---

## Important: Free Tier Limitations

### Render Free Tier:

✅ **750 hours/month** - Enough for 24/7 (744 hours)
⚠️ **Spins down after 15 min inactivity** - Wakes up on request
✅ **Automatic restarts** - If it crashes
✅ **Shared CPU** - Slower but works fine

### What This Means:

Your bot will:
- Run 24/7 ✅
- Spin down if no activity for 15 minutes ⚠️
- Wake up when Telegram message received ✅
- May have 10-30 second delay on first message after sleep ⚠️

**For always-on (no spin down):** Upgrade to $7/month plan

---

## Keeping Bot Awake (Optional)

To prevent spin-down, you can:

### Option 1: Use UptimeRobot (Free)

1. Go to: https://uptimerobot.com
2. Sign up (free)
3. Add monitor:
   - Type: HTTP(s)
   - URL: Your Render service URL + `/health`
   - Interval: 5 minutes
4. Done - pings your bot every 5 min to keep it awake!

### Option 2: Upgrade to Paid Plan

$7/month for always-on, no spin-down

---

## Managing Your Bot on Render

### View Logs:
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab

### Restart Bot:
1. Go to Render dashboard
2. Click your service
3. Click "Manual Deploy" → "Deploy latest commit"

### Update Bot Code:
1. Push changes to GitHub
2. Render auto-deploys (if auto-deploy enabled)
3. Or click "Manual Deploy"

### Stop Bot:
1. Go to service settings
2. Click "Suspend Service"

### Delete Bot:
1. Go to service settings
2. Scroll to bottom
3. Click "Delete Service"

---

## Troubleshooting

### "Build failed"

Check logs for errors. Common issues:
- Missing dependencies → Check `package.json`
- Node version → Make sure `engines` specifies Node 18+

**Fix:** Update `package.json` and redeploy

### "Service won't start"

Check logs. Common issues:
- Port not set → Render sets `PORT` env var automatically
- Crash on startup → Check bot code for errors

**Fix:** Check logs, fix code, redeploy

### "Bot not responding in Telegram"

1. Check Render logs - is bot running?
2. Check if service is suspended
3. Try restarting service
4. Send `/stats` in Telegram to wake it up

### "Positions lost after restart"

This shouldn't happen - positions are saved to `positions.json`

**Fix:** 
1. Check if disk is mounted correctly
2. Verify `positions.json` exists in logs
3. May need to add persistent disk in Render settings

---

## Costs Summary

### Free Tier:
- **Cost:** $0/month
- **Hours:** 750/month (enough for 24/7)
- **Limitation:** Spins down after 15 min inactivity
- **Best for:** Testing, low-frequency trading

### Starter Plan:
- **Cost:** $7/month
- **Hours:** Unlimited
- **Limitation:** None - always on
- **Best for:** Active trading, 24/7 monitoring

---

## Alternative: GitHub Setup (If Needed)

If you need to create a GitHub repo:

1. Go to: https://github.com
2. Sign up (free)
3. Click "New repository"
4. Name: `solana-trading-bot`
5. Make it **Private** (recommended)
6. Click "Create repository"
7. Upload all files from `memebot-render.zip`
8. Connect to Render

---

## Quick Command Reference

### From Render Dashboard:

- **View Logs:** Service → Logs tab
- **Restart:** Manual Deploy → Deploy latest
- **Stop:** Service Settings → Suspend
- **Delete:** Service Settings → Delete Service

---

## What Happens After Deployment?

1. ✅ Bot runs 24/7 on Render servers
2. ✅ Monitors Solana tokens continuously
3. ✅ Sends Telegram alerts when hot tokens found
4. ✅ Executes trades when you click Buy
5. ✅ Auto-sells at take profit/stop loss
6. ✅ Tracks all positions persistently
7. ✅ Restarts automatically if it crashes

**You control everything from Telegram - no computer needed!** 📱

---

## Support

**Render Docs:** https://render.com/docs
**Render Community:** https://community.render.com
**Render Status:** https://status.render.com

---

## Summary

**Setup Time:** 10 minutes
**Cost:** FREE (or $7/month for always-on)
**Difficulty:** Easy - just web interface!
**Result:** Bot running 24/7 in the cloud!

**No command line, no technical knowledge needed!** 🎯

---

## Next Steps

1. ✅ Sign up for Render.com
2. ✅ Create new Web Service
3. ✅ Upload/connect your bot code
4. ✅ Deploy!
5. ✅ Trade from Telegram!

**You're done! Your bot is now running 24/7!** 🚀
