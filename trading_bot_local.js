/**
 * Solana Trading Bot - Local Transaction API
 * 
 * Uses PumpPortal Local Transaction API to trade directly from your Phantom wallet
 * No API key needed - just your wallet's private key
 * 
 * Features:
 * - Trade from YOUR Phantom wallet
 * - Paste contract addresses to buy
 * - Auto take-profit and stop-loss
 * - Position tracking with PnL
 * - Liquidity safety checks
 * - Sell buttons on /positions
 */

import fetch from 'node-fetch'
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import fs from 'fs'

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Telegram settings
  TELEGRAM_TOKEN: "8330355067:AAGySAnviDql76Zj8ZUFENdx02xDVEkqI5E",
  TELEGRAM_CHAT_ID: "7409247544",
  
  // Wallet settings (YOUR PHANTOM WALLET)
  WALLET_PRIVATE_KEY: "1BhHL9kppN47ZsQfbzMLEt9pzZnWoGJMThFwQzCCJgo5gunb6Btq1kiFvN6e34Dz1h2GNRmnXBkwaWMognEehMF", // Base58 encoded private key
  
  // Solana RPC (using multiple endpoints for reliability)
  RPC_ENDPOINT: "https://api.mainnet-beta.solana.com",
  RPC_ENDPOINTS: [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana"
  ],
  
  // PumpPortal Local API
  PUMPPORTAL_LOCAL_API: "https://pumpportal.fun/api/trade-local",
  
  // Trading settings
  BUY_AMOUNT_SOL: 0.01,          // Amount to buy per trade
  SLIPPAGE_PERCENT: 15,          // 15% slippage tolerance
  PRIORITY_FEE: 0.0001,          // Priority fee in SOL
  POOL: "auto",                  // auto, pump, raydium
  
  // Risk management
  TAKE_PROFIT_PERCENT: 50,       // Sell at +50% profit
  STOP_LOSS_PERCENT: 20,         // Sell at -20% loss
  MAX_POSITIONS: 3,              // Maximum concurrent positions
  MIN_LIQUIDITY: 3000,           // $3K minimum liquidity
  
  // Monitoring
  PRICE_CHECK_INTERVAL: 30000,   // Check prices every 30 seconds
  AUTO_TRADE: false,             // Manual trading only
  
  // Persistence
  POSITIONS_FILE: './positions.json' // Save positions to file
}

// ============================================
// STATE TRACKING
// ============================================
const state = {
  positions: new Map(), // mint -> {amount, entryPrice, timestamp, currentPrice}
  stats: {
    totalProfit: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0
  },
  wallet: null,
  connection: null
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log('============================================================')
  console.log('🤖 SOLANA TRADING BOT - LOCAL TRANSACTION API')
  console.log('============================================================')
  console.log(`📱 Telegram Chat: ${CONFIG.TELEGRAM_CHAT_ID}`)
  console.log(`⚙️  Settings:`)
  console.log(`  • Auto-trade: ${CONFIG.AUTO_TRADE ? 'Enabled' : 'Disabled'}`)
  console.log(`  • Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL`)
  console.log(`  • Take Profit: +${CONFIG.TAKE_PROFIT_PERCENT}%`)
  console.log(`  • Stop Loss: -${CONFIG.STOP_LOSS_PERCENT}%`)
  console.log(`  • Max Positions: ${CONFIG.MAX_POSITIONS}`)
  console.log(`  • Pool: ${CONFIG.POOL}`)
  console.log(`⌨️  Commands: /positions, /stats, /help`)
  console.log('============================================================')
  
  // Initialize wallet
  if (CONFIG.WALLET_PRIVATE_KEY === 'YOUR_PHANTOM_PRIVATE_KEY_HERE') {
    console.error('❌ ERROR: Phantom wallet private key not configured!')
    console.error('Please add your private key to the config.')
    process.exit(1)
  }
  
  try {
    const privateKeyBytes = bs58.decode(CONFIG.WALLET_PRIVATE_KEY)
    state.wallet = Keypair.fromSecretKey(privateKeyBytes)
    console.log(`✅ Wallet loaded: ${state.wallet.publicKey.toString()}`)
  } catch (error) {
    console.error('❌ ERROR: Invalid private key format!')
    console.error('Make sure you copied the base58 encoded private key from Phantom.')
    process.exit(1)
  }
  
  // Initialize Solana connection
  state.connection = new Connection(CONFIG.RPC_ENDPOINT, 'confirmed')
  
  // Load saved positions
  loadPositions()
  
  // Start services
  startTelegramPolling()
  startPriceMonitoring()
  
  console.log('✅ Trading bot is running. Press Ctrl+C to stop.')
}

// ============================================
// PERSISTENCE FUNCTIONS
// ============================================
function loadPositions() {
  try {
    if (fs.existsSync(CONFIG.POSITIONS_FILE)) {
      const data = fs.readFileSync(CONFIG.POSITIONS_FILE, 'utf8')
      const saved = JSON.parse(data)
      
      // Restore positions
      if (saved.positions) {
        state.positions = new Map(Object.entries(saved.positions))
        console.log(`✅ Loaded ${state.positions.size} saved positions`)
      }
      
      // Restore stats
      if (saved.stats) {
        state.stats = saved.stats
        console.log(`✅ Loaded stats: ${state.stats.totalTrades} trades, ${state.stats.wins}W/${state.stats.losses}L`)
      }
    } else {
      console.log('📝 No saved positions found (starting fresh)')
    }
  } catch (error) {
    console.error('[LOAD] Error loading positions:', error.message)
  }
}

function savePositions() {
  try {
    const data = {
      positions: Object.fromEntries(state.positions),
      stats: state.stats,
      lastSaved: new Date().toISOString()
    }
    fs.writeFileSync(CONFIG.POSITIONS_FILE, JSON.stringify(data, null, 2))
    console.log('[SAVE] Positions saved to file')
  } catch (error) {
    console.error('[SAVE] Error saving positions:', error.message)
  }
}

// ============================================
// TELEGRAM FUNCTIONS
// ============================================
async function sendTelegram(message, buttons = null) {
  const payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  }
  
  if (buttons) {
    payload.reply_markup = { inline_keyboard: buttons }
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    console.error('[TG] Send error:', error.message)
  }
}

function startTelegramPolling() {
  let lastUpdateId = 0
  
  setInterval(async () => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
      )
      const data = await response.json()
      
      if (!data.ok || !data.result) return
      
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id)
        
        if (update.message && update.message.text) {
          await handleCommand(update.message)
        }
        
        if (update.callback_query) {
          await handleCallback(update.callback_query)
        }
      }
    } catch (error) {
      console.error('[TG] Update error:', error.message)
    }
  }, 3000)
}

async function handleCommand(message) {
  const text = message.text.trim()
  const chatId = message.chat.id.toString()
  
  if (chatId !== CONFIG.TELEGRAM_CHAT_ID) return
  
  console.log(`[CMD] Received: ${text}`)
  
  if (text === '/positions') {
    await sendPositionsStatus()
  } else if (text === '/stats') {
    await sendTradingStats()
  } else if (text === '/help') {
    await sendHelpMessage()
  } else if (text.startsWith('/sell ')) {
    const mint = text.split(' ')[1]
    if (mint && state.positions.has(mint)) {
      await executeSell(mint, '100%', 'Manual command')
    }
  } else if (isContractAddress(text)) {
    await handleContractAddress(text)
  }
}

async function handleCallback(callback) {
  const data = callback.data
  console.log(`[CALLBACK] Received: ${data}`)
  
  if (data.startsWith('buy_')) {
    const mint = data.replace('buy_', '')
    await executeBuy(mint, CONFIG.BUY_AMOUNT_SOL, 'Button click')
  } else if (data.startsWith('sell_')) {
    const mint = data.replace('sell_', '')
    if (state.positions.has(mint)) {
      await executeSell(mint, '100%', 'Button click')
    }
  }
  
  await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  })
}

function isContractAddress(text) {
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return solanaAddressRegex.test(text)
}

async function handleContractAddress(mint) {
  console.log(`[CONTRACT] Received contract address: ${mint}`)
  
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
    if (!response.ok) {
      await sendTelegram('❌ Could not fetch token info. Invalid contract address?')
      return
    }
    
    const data = await response.json()
    if (!data?.pairs?.length) {
      await sendTelegram('❌ No trading pairs found for this token.')
      return
    }
    
    const pair = data.pairs[0]
    const tokenName = pair.baseToken.name || 'Unknown'
    const tokenSymbol = pair.baseToken.symbol || '???'
    const price = parseFloat(pair.priceUsd) || 0
    const marketCap = pair.marketCap || 0
    const liquidityUsd = pair.liquidity?.usd || 0
    const volume24h = pair.volume?.h24 || 0
    const priceChange24h = pair.priceChange?.h24 || 0
    const dexName = pair.dexId || 'Unknown'
    
    const priceEmoji = priceChange24h > 0 ? '🟢' : '🔴'
    const liquidityWarning = liquidityUsd < CONFIG.MIN_LIQUIDITY
    
    // Check if user already owns this token
    const hasPosition = state.positions.has(mint)
    const position = hasPosition ? state.positions.get(mint) : null
    
    let message = `🪙 <b>${tokenName} (${tokenSymbol})</b>

📊 <b>Token Info:</b>
💰 Price: $${price.toFixed(8)}
${priceEmoji} 24h Change: ${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(1)}%
📈 Market Cap: $${(marketCap / 1000).toFixed(1)}K
💧 Liquidity: $${(liquidityUsd / 1000).toFixed(1)}K ${liquidityWarning ? '⚠️ LOW' : '✅'}
📊 Volume 24h: $${(volume24h / 1000).toFixed(1)}K
🔄 DEX: ${dexName}

📝 Contract: <code>${mint}</code>`
    
    // If user owns this token, show position info
    if (hasPosition) {
      const pnl = position.currentPrice ? 
        ((price - position.entryPrice) / position.entryPrice * 100).toFixed(1) : '?'
      const pnlEmoji = pnl > 0 ? '🟢' : pnl < 0 ? '🔴' : '⚪'
      
      message += `\n\n${pnlEmoji} <b>YOUR POSITION:</b>
💵 Entry Price: $${position.entryPrice.toFixed(8)}
📊 Current PnL: ${pnl > 0 ? '+' : ''}${pnl}%
💰 Amount: ${position.amount} SOL
⏱️ Holding Time: ${Math.floor((Date.now() - position.timestamp) / 60000)}m`
    } else {
      message += `\n\n💵 Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL (~$${(CONFIG.BUY_AMOUNT_SOL * 234).toFixed(2)})`
    }
    
    if (liquidityWarning && !hasPosition) {
      message += `\n\n⚠️ <b>WARNING: Low Liquidity!</b>
Liquidity is below $${(CONFIG.MIN_LIQUIDITY / 1000).toFixed(1)}K. You may have difficulty selling this token. Trade at your own risk!`
    }
    
    // Show appropriate button based on ownership
    let buttons
    if (hasPosition) {
      const pnl = position.currentPrice ? 
        ((price - position.entryPrice) / position.entryPrice * 100).toFixed(1) : '0'
      buttons = [[
        { text: `🔴 Sell Position (${pnl > 0 ? '+' : ''}${pnl}%)`, 
          callback_data: `sell_${mint}` }
      ]]
    } else {
      buttons = [[
        { text: liquidityWarning ? `⚠️ Buy ${CONFIG.BUY_AMOUNT_SOL} SOL (RISKY)` : `💰 Buy ${CONFIG.BUY_AMOUNT_SOL} SOL`, 
          callback_data: `buy_${mint}` }
      ]]
    }
    
    await sendTelegram(message, buttons)
    
  } catch (error) {
    console.error('[CONTRACT] Error:', error.message)
    await sendTelegram(`❌ Error fetching token info: ${error.message}`)
  }
}

async function sendPositionsStatus() {
  if (state.positions.size === 0) {
    await sendTelegram('📊 <b>No Open Positions</b>\n\nYou currently have no active trades.')
    return
  }
  
  let message = '📊 <b>Open Positions</b>\n\n'
  const buttons = []
  
  for (const [mint, position] of state.positions.entries()) {
    const shortMint = `${mint.slice(0, 4)}...${mint.slice(-4)}`
    const age = Math.floor((Date.now() - position.timestamp) / 60000)
    const pnl = position.currentPrice ? 
      ((position.currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1) : '?'
    const pnlEmoji = pnl > 0 ? '🟢' : pnl < 0 ? '🔴' : '⚪'
    
    message += `${pnlEmoji} <code>${shortMint}</code>\n`
    message += `   Entry: $${position.entryPrice.toFixed(8)}\n`
    message += `   Current: $${position.currentPrice ? position.currentPrice.toFixed(8) : '?'}\n`
    message += `   Amount: ${position.amount} SOL\n`
    message += `   Age: ${age}m\n`
    message += `   PnL: ${pnl}%\n\n`
    
    buttons.push([{ 
      text: `🔴 Sell ${shortMint} (${pnl}%)`, 
      callback_data: `sell_${mint}` 
    }])
  }
  
  await sendTelegram(message, buttons)
}

async function sendTradingStats() {
  const winRate = state.stats.totalTrades > 0 ? 
    (state.stats.wins / state.stats.totalTrades * 100).toFixed(1) : 0
  
  const message = `📈 <b>Trading Statistics</b>

💰 Total Profit: ${state.stats.totalProfit.toFixed(4)} SOL
📊 Total Trades: ${state.stats.totalTrades}
✅ Wins: ${state.stats.wins}
❌ Losses: ${state.stats.losses}
🎯 Win Rate: ${winRate}%
📍 Open Positions: ${state.positions.size}/${CONFIG.MAX_POSITIONS}

💼 Wallet: <code>${state.wallet.publicKey.toString()}</code>

<i>Auto-trade: ${CONFIG.AUTO_TRADE ? 'Enabled' : 'Disabled'}</i>`
  
  await sendTelegram(message)
}

async function sendHelpMessage() {
  const help = `🤖 <b>Trading Bot Commands</b>

<b>Position Management:</b>
/positions - View open positions with sell buttons
/stats - View trading statistics
/help - Show this help message

<b>Manual Trading:</b>
Just paste a contract address to see token info and buy button
/sell MINT - Sell a token manually

<b>Settings:</b>
• Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL
• Take Profit: +${CONFIG.TAKE_PROFIT_PERCENT}%
• Stop Loss: -${CONFIG.STOP_LOSS_PERCENT}%
• Auto-trade: ${CONFIG.AUTO_TRADE ? 'ON' : 'OFF'}

<b>Trading from:</b> Your Phantom wallet
<b>Liquidity Check:</b> Minimum $${(CONFIG.MIN_LIQUIDITY / 1000).toFixed(1)}K`
  
  await sendTelegram(help)
}

// ============================================
// TRADING FUNCTIONS (LOCAL TRANSACTION API)
// ============================================
async function executeBuy(mint, amountSOL, reason = '') {
  console.log(`[BUY] Attempting to buy ${mint} with ${amountSOL} SOL (${reason})`)
  
  if (state.positions.size >= CONFIG.MAX_POSITIONS) {
    console.log('[BUY] Max positions reached')
    await sendTelegram(`⚠️ <b>Max Positions Reached</b>\n\nCannot open new position. Close existing positions first.`)
    return false
  }
  
  if (state.positions.has(mint)) {
    console.log('[BUY] Already have position in this token')
    return false
  }
  
  try {
    // Try different pools in order: auto -> pump -> raydium
    const poolsToTry = ['auto', 'pump', 'raydium']
    let response = null
    let lastError = null
    
    for (const pool of poolsToTry) {
      console.log(`[BUY] Trying pool: ${pool}`)
      
      response = await fetch(CONFIG.PUMPPORTAL_LOCAL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: state.wallet.publicKey.toString(),
          action: 'buy',
          mint: mint,
          amount: amountSOL,
          denominatedInSol: 'true',
          slippage: CONFIG.SLIPPAGE_PERCENT,
          priorityFee: CONFIG.PRIORITY_FEE,
          pool: pool
        })
      })
      
      if (response.ok) {
        console.log(`[BUY] ✅ Success with pool: ${pool}`)
        break
      } else {
        lastError = await response.text()
        console.log(`[BUY] ❌ Failed with pool ${pool}: ${lastError}`)
        response = null
      }
    }
    
    if (!response || !response.ok) {
      console.error('[BUY] All pools failed. Last error:', lastError)
      await sendTelegram(`❌ <b>Buy Failed</b>\n\nTried all pools (auto, pump, raydium).\n\nThis token might:\n• Have graduated and use non-SOL pair\n• Have insufficient liquidity\n• Be temporarily unavailable\n\nLast error: ${lastError}`)
      return false
    }
    
    // Get serialized transaction
    const txBuffer = Buffer.from(await response.arrayBuffer())
    const tx = VersionedTransaction.deserialize(txBuffer)
    
    // Sign transaction with your wallet
    tx.sign([state.wallet])
    
    // Send transaction with retry logic
    let signature
    let retries = 3
    while (retries > 0) {
      try {
        signature = await state.connection.sendTransaction(tx, {
          skipPreflight: false,
          maxRetries: 3
        })
        console.log('[BUY] Transaction sent:', signature)
        break
      } catch (error) {
        retries--
        if (retries === 0) throw error
        console.log(`[BUY] Send failed, retrying... (${retries} left)`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Wait for confirmation
    await state.connection.confirmTransaction(signature, 'confirmed')
    console.log('[BUY] Transaction confirmed:', signature)
    
    // Get current price
    const priceData = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
    const priceJson = await priceData.json()
    const entryPrice = priceJson?.pairs?.[0]?.priceUsd || 0.00001
    
    // Store position
    state.positions.set(mint, {
      amount: amountSOL,
      entryPrice: parseFloat(entryPrice),
      timestamp: Date.now(),
      buySignature: signature,
      currentPrice: parseFloat(entryPrice),
      highestPrice: parseFloat(entryPrice) // Initialize trailing stop
    })
    
    // Save positions to file
    savePositions()
    
    await sendTelegram(`✅ <b>Buy Successful!</b>

💰 Amount: ${amountSOL} SOL
📝 Token: <code>${mint}</code>
💵 Entry Price: $${entryPrice}
🔗 <a href="https://solscan.io/tx/${signature}">View Transaction</a>

Position is now being monitored for take-profit and stop-loss.`)
    
    return true
    
  } catch (error) {
    console.error('[BUY] Error:', error.message)
    await sendTelegram(`❌ <b>Buy Failed</b>\n\n${error.message}`)
    return false
  }
}

async function executeSell(mint, amount, reason = '') {
  console.log(`[SELL] Attempting to sell ${amount} of ${mint} (${reason})`)
  
  const position = state.positions.get(mint)
  if (!position) {
    console.log('[SELL] No position found')
    return false
  }
  
  try {
    // Request transaction from PumpPortal Local API
    const response = await fetch(CONFIG.PUMPPORTAL_LOCAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: state.wallet.publicKey.toString(),
        action: 'sell',
        mint: mint,
        amount: amount,
        denominatedInSol: 'false',
        slippage: CONFIG.SLIPPAGE_PERCENT,
        priorityFee: CONFIG.PRIORITY_FEE,
        pool: CONFIG.POOL
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[SELL] API Error:', error)
      await sendTelegram(`❌ <b>Sell Failed</b>\n\n${error}`)
      return false
    }
    
    // Get serialized transaction
    const txBuffer = Buffer.from(await response.arrayBuffer())
    const tx = VersionedTransaction.deserialize(txBuffer)
    
    // Sign transaction
    tx.sign([state.wallet])
    
    // Send transaction
    const signature = await state.connection.sendTransaction(tx)
    console.log('[SELL] Transaction sent:', signature)
    
    // Wait for confirmation
    await state.connection.confirmTransaction(signature, 'confirmed')
    console.log('[SELL] Transaction confirmed:', signature)
    
    // Calculate PnL
    const pnl = position.currentPrice ? 
      ((position.currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1) : 0
    const profitSOL = position.amount * (pnl / 100)
    
    // Update stats
    state.stats.totalTrades++
    state.stats.totalProfit += profitSOL
    if (pnl > 0) state.stats.wins++
    else state.stats.losses++
    
    // Remove position
    state.positions.delete(mint)
    
    // Save updated positions and stats
    savePositions()
    
    const emoji = pnl > 0 ? '🟢' : '🔴'
    await sendTelegram(`${emoji} <b>Sell Successful!</b>

📝 Token: <code>${mint}</code>
💵 Exit Price: $${position.currentPrice?.toFixed(8)}
📊 PnL: ${pnl > 0 ? '+' : ''}${pnl}%
💰 Profit: ${profitSOL > 0 ? '+' : ''}${profitSOL.toFixed(4)} SOL
🔗 <a href="https://solscan.io/tx/${signature}">View Transaction</a>

${reason}`)
    
    return true
    
  } catch (error) {
    console.error('[SELL] Error:', error.message)
    await sendTelegram(`❌ <b>Sell Failed</b>\n\n${error.message}`)
    return false
  }
}

// ============================================
// PRICE MONITORING
// ============================================
function startPriceMonitoring() {
  setInterval(async () => {
    if (state.positions.size === 0) return
    
    for (const [mint, position] of state.positions.entries()) {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
        const data = await response.json()
        
        if (!data?.pairs?.length) continue
        
        const currentPrice = parseFloat(data.pairs[0].priceUsd)
        position.currentPrice = currentPrice
        
        // Track highest price for trailing stop
        if (!position.highestPrice || currentPrice > position.highestPrice) {
          position.highestPrice = currentPrice
          console.log(`[MONITOR] New high for ${mint}: $${currentPrice.toFixed(8)} (${((currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1)}%)`)
          savePositions() // Save new high
        }
        
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice * 100)
        
        // Check take profit (fixed at +50%)
        if (pnlPercent >= CONFIG.TAKE_PROFIT_PERCENT) {
          console.log(`[MONITOR] Take profit triggered for ${mint}: ${pnlPercent.toFixed(1)}%`)
          await executeSell(mint, '100%', `🎯 Take Profit (+${CONFIG.TAKE_PROFIT_PERCENT}%)`)
        }
        // Check trailing stop loss (trails from highest price)
        else {
          const trailingStopPrice = position.highestPrice * (1 - CONFIG.STOP_LOSS_PERCENT / 100)
          const dropFromHigh = ((position.highestPrice - currentPrice) / position.highestPrice * 100)
          
          if (currentPrice <= trailingStopPrice) {
            console.log(`[MONITOR] Trailing stop triggered for ${mint}: ${pnlPercent.toFixed(1)}% (dropped ${dropFromHigh.toFixed(1)}% from high)`)
            await executeSell(mint, '100%', `📉 Trailing Stop (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)`)
          }
        }
        
      } catch (error) {
        console.error(`[MONITOR] Error checking ${mint}:`, error.message)
      }
    }
  }, CONFIG.PRICE_CHECK_INTERVAL)
}

// ============================================
// START BOT
// ============================================
init().catch(console.error)
