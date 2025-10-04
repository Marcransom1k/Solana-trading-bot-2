/**
 * Solana Trading Bot with PumpPortal API
 * 
 * Features:
 * - Integrates with monitoring bot alerts
 * - Executes trades via PumpPortal API
 * - Telegram commands for manual trading
 * - Position tracking and PnL monitoring
 * - Auto-sell at profit/loss targets
 */

import fetch from 'node-fetch'

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Telegram settings
  TELEGRAM_TOKEN: "8330355067:AAGySAnviDql76Zj8ZUFENdx02xDVEkqI5E",
  TELEGRAM_CHAT_ID: "7409247544",
  
  // PumpPortal API settings
  PUMPPORTAL_API_KEY: "extmpva9a5jmmybnb134udjfcxrmjgagctnmph239nvqjvj790r6jmubanb72vbectm5ev9pf1r64u3nd5bm2ju1ax15cpahdt8kep9b9d2mahbrchd7gdau918mrrb6dnm58p3a84ykuaxgk8tajdnk7mwtjadmpwgbacm5d6p8ha4an1myrkbb9ucjujq6h23av28758kuf8", // API key configured
  PUMPPORTAL_API_URL: "https://pumpportal.fun/api/trade",
  
  // Trading settings
  AUTO_TRADE: false,              // Set to true for auto-trading on alerts
  BUY_AMOUNT_SOL: 0.01,          // Amount of SOL per trade (~$2.34 at $234/SOL)
  SLIPPAGE_PERCENT: 10,          // 10% slippage tolerance
  PRIORITY_FEE: 0.0001,          // Priority fee in SOL
  POOL: "auto",                  // "pump", "raydium", or "auto"
  
  // Risk management
  TAKE_PROFIT_PERCENT: 50,       // Sell at +50% profit
  STOP_LOSS_PERCENT: 20,         // Sell at -20% loss
  MAX_POSITIONS: 3,              // Maximum concurrent positions
  
  // Position monitoring
  CHECK_POSITIONS_INTERVAL: 30000, // Check positions every 30 seconds
}

// ============================================
// STATE TRACKING
// ============================================
const state = {
  positions: new Map(), // mint => { amount, entryPrice, timestamp, buySignature }
  pendingTrades: new Map(), // For button-based trades
  stats: {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalProfit: 0
  }
}

// ============================================
// TELEGRAM FUNCTIONS
// ============================================
async function sendTelegram(message, buttons = null) {
  try {
    const payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    
    if (buttons) {
      payload.reply_markup = {
        inline_keyboard: buttons
      }
    }
    
    const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    if (!response.ok) {
      console.error('[TG] Error:', result.description)
      return false
    }
    return true
  } catch (error) {
    console.error('[TG] Exception:', error.message)
    return false
  }
}

// Handle incoming Telegram updates (commands and button clicks)
async function handleTelegramUpdates() {
  let lastUpdateId = 0
  
  setInterval(async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`)
      const data = await response.json()
      
      if (!data.ok || !data.result) return
      
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id)
        
        // Handle text commands
        if (update.message && update.message.text) {
          await handleCommand(update.message)
        }
        
        // Handle button callbacks
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
  } else if (text.startsWith('/buy ')) {
    // Manual buy: /buy MINT_ADDRESS AMOUNT_SOL
    const parts = text.split(' ')
    if (parts.length >= 2) {
      const mint = parts[1]
      const amount = parts[2] ? parseFloat(parts[2]) : CONFIG.BUY_AMOUNT_SOL
      await executeBuy(mint, amount, 'Manual command')
    }
  } else if (text.startsWith('/sell ')) {
    // Manual sell: /sell MINT_ADDRESS
    const mint = text.split(' ')[1]
    if (mint && state.positions.has(mint)) {
      await executeSell(mint, '100%', 'Manual command')
    }
  } else if (isContractAddress(text)) {
    // User pasted a contract address - show token info with buy button
    await handleContractAddress(text)
  }
}

// Check if text looks like a Solana contract address
function isContractAddress(text) {
  // Solana addresses are base58 encoded, 32-44 characters, alphanumeric
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return solanaAddressRegex.test(text)
}

// Handle when user pastes a contract address
async function handleContractAddress(mint) {
  console.log(`[CONTRACT] Received contract address: ${mint}`)
  
  try {
    // Fetch token info from DexScreener
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
    
    // Get the main pair (usually first one)
    const pair = data.pairs[0]
    const tokenName = pair.baseToken.name || 'Unknown'
    const tokenSymbol = pair.baseToken.symbol || '???'
    const price = parseFloat(pair.priceUsd) || 0
    const marketCap = pair.marketCap || 0
    const liquidityUsd = pair.liquidity?.usd || 0
    const volume24h = pair.volume?.h24 || 0
    const priceChange24h = pair.priceChange?.h24 || 0
    const dexName = pair.dexId || 'Unknown'
    
    const shortMint = `${mint.slice(0, 6)}...${mint.slice(-6)}`
    const priceEmoji = priceChange24h > 0 ? '🟢' : '🔴'
    
    // SAFETY CHECK: Minimum liquidity requirement
    const MIN_LIQUIDITY = 3000 // $3K minimum to ensure you can sell
    const liquidityWarning = liquidityUsd < MIN_LIQUIDITY
    
    // Create message with token info
    let message = `🪙 <b>${tokenName} (${tokenSymbol})</b>

📊 <b>Token Info:</b>
💰 Price: $${price.toFixed(8)}
${priceEmoji} 24h Change: ${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(1)}%
📈 Market Cap: $${(marketCap / 1000).toFixed(1)}K
💧 Liquidity: $${(liquidityUsd / 1000).toFixed(1)}K ${liquidityWarning ? '⚠️ LOW' : '✅'}
📊 Volume 24h: $${(volume24h / 1000).toFixed(1)}K
🔄 DEX: ${dexName}

📝 Contract: <code>${mint}</code>

💵 Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL (~$${(CONFIG.BUY_AMOUNT_SOL * 234).toFixed(2)})`
    
    // Add warning if liquidity is too low
    if (liquidityWarning) {
      message += `\n\n⚠️ <b>WARNING: Low Liquidity!</b>
Liquidity is below $${(MIN_LIQUIDITY / 1000).toFixed(1)}K. You may have difficulty selling this token. Trade at your own risk!`
    }
    
    // Create buy button (always show, but user is warned)
    const buttons = [[
      { text: liquidityWarning ? `⚠️ Buy ${CONFIG.BUY_AMOUNT_SOL} SOL (RISKY)` : `💰 Buy ${CONFIG.BUY_AMOUNT_SOL} SOL`, 
        callback_data: `buy_${mint}` }
    ]]
    
    await sendTelegram(message, buttons)
    
  } catch (error) {
    console.error('[CONTRACT] Error:', error.message)
    await sendTelegram(`❌ Error fetching token info: ${error.message}`)
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
  
  // Acknowledge callback
  await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  })
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
    
    // Add sell button for this position
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

<i>Auto-trade: ${CONFIG.AUTO_TRADE ? 'Enabled' : 'Disabled'}</i>`
  
  await sendTelegram(message)
}

async function sendHelpMessage() {
  const help = `🤖 <b>Trading Bot Commands</b>

<b>Position Management:</b>
/positions - View open positions
/stats - View trading statistics
/help - Show this help message

<b>Manual Trading:</b>
/buy MINT [AMOUNT] - Buy a token
/sell MINT - Sell a token

<b>Settings:</b>
• Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL
• Take Profit: +${CONFIG.TAKE_PROFIT_PERCENT}%
• Stop Loss: -${CONFIG.STOP_LOSS_PERCENT}%
• Auto-trade: ${CONFIG.AUTO_TRADE ? 'ON' : 'OFF'}

<b>Note:</b> You need a PumpPortal API key to trade.
Get one at https://pumpportal.fun`
  
  await sendTelegram(help)
}

// ============================================
// PUMPPORTAL API FUNCTIONS
// ============================================
async function executeBuy(mint, amountSOL, reason = '') {
  console.log(`[BUY] Attempting to buy ${mint} with ${amountSOL} SOL (${reason})`)
  
  // Check if API key is configured
  if (CONFIG.PUMPPORTAL_API_KEY === 'YOUR_PUMPPORTAL_API_KEY_HERE') {
    await sendTelegram('❌ <b>Trading Error</b>\n\nPumpPortal API key not configured. Please add your API key to the config.')
    return false
  }
  
  // Check max positions
  if (state.positions.size >= CONFIG.MAX_POSITIONS) {
    console.log('[BUY] Max positions reached')
    await sendTelegram(`⚠️ <b>Max Positions Reached</b>\n\nCannot open new position. Close existing positions first.`)
    return false
  }
  
  // Check if already have position
  if (state.positions.has(mint)) {
    console.log('[BUY] Already have position in this token')
    return false
  }
  
  try {
    const response = await fetch(`${CONFIG.PUMPPORTAL_API_URL}?api-key=${CONFIG.PUMPPORTAL_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'buy',
        mint: mint,
        amount: amountSOL,
        denominatedInSol: 'true',
        slippage: CONFIG.SLIPPAGE_PERCENT,
        priorityFee: CONFIG.PRIORITY_FEE,
        pool: CONFIG.POOL
      })
    })
    
    const result = await response.json()
    
    if (!response.ok || result.error) {
      console.error('[BUY] Error:', result.error || result)
      await sendTelegram(`❌ <b>Buy Failed</b>\n\n${result.error || 'Unknown error'}`)
      return false
    }
    
    console.log('[BUY] Success:', result.signature)
    
    // Get current price (approximate from amount)
    const entryPrice = 0.00001 // We'll update this from DexScreener
    
    // Store position
    state.positions.set(mint, {
      amount: amountSOL,
      entryPrice: entryPrice,
      timestamp: Date.now(),
      buySignature: result.signature,
      currentPrice: entryPrice
    })
    
    state.stats.totalTrades++
    
    // Send success message
    const shortMint = `${mint.slice(0, 8)}...${mint.slice(-8)}`
    await sendTelegram(`✅ <b>Buy Executed</b>

🪙 Token: <code>${shortMint}</code>
💰 Amount: ${amountSOL} SOL
📊 Entry Price: $${entryPrice.toFixed(8)}
🔗 Tx: <code>${result.signature}</code>

Position opened successfully!`)
    
    return true
  } catch (error) {
    console.error('[BUY] Exception:', error.message)
    await sendTelegram(`❌ <b>Buy Error</b>\n\n${error.message}`)
    return false
  }
}

async function executeSell(mint, amount, reason = '') {
  console.log(`[SELL] Attempting to sell ${mint} amount ${amount} (${reason})`)
  
  const position = state.positions.get(mint)
  if (!position) {
    console.log('[SELL] No position found')
    return false
  }
  
  try {
    const response = await fetch(`${CONFIG.PUMPPORTAL_API_URL}?api-key=${CONFIG.PUMPPORTAL_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sell',
        mint: mint,
        amount: amount,
        denominatedInSol: 'false',
        slippage: CONFIG.SLIPPAGE_PERCENT,
        priorityFee: CONFIG.PRIORITY_FEE,
        pool: CONFIG.POOL
      })
    })
    
    const result = await response.json()
    
    if (!response.ok || result.error) {
      console.error('[SELL] Error:', result.error || result)
      await sendTelegram(`❌ <b>Sell Failed</b>\n\n${result.error || 'Unknown error'}`)
      return false
    }
    
    console.log('[SELL] Success:', result.signature)
    
    // Calculate PnL
    const exitPrice = position.currentPrice || position.entryPrice
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice * 100)
    const pnlSOL = position.amount * (pnlPercent / 100)
    
    // Update stats
    if (pnlPercent > 0) {
      state.stats.wins++
    } else {
      state.stats.losses++
    }
    state.stats.totalProfit += pnlSOL
    
    // Remove position
    state.positions.delete(mint)
    
    // Send success message
    const shortMint = `${mint.slice(0, 8)}...${mint.slice(-8)}`
    const emoji = pnlPercent > 0 ? '🟢' : '🔴'
    await sendTelegram(`${emoji} <b>Sell Executed</b>

🪙 Token: <code>${shortMint}</code>
📊 Entry: $${position.entryPrice.toFixed(8)}
📊 Exit: $${exitPrice.toFixed(8)}
💰 PnL: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(1)}% (${pnlSOL > 0 ? '+' : ''}${pnlSOL.toFixed(4)} SOL)
🔗 Tx: <code>${result.signature}</code>

${reason}`)
    
    return true
  } catch (error) {
    console.error('[SELL] Exception:', error.message)
    await sendTelegram(`❌ <b>Sell Error</b>\n\n${error.message}`)
    return false
  }
}

// ============================================
// POSITION MONITORING
// ============================================
async function monitorPositions() {
  if (state.positions.size === 0) return
  
  console.log(`[MONITOR] Checking ${state.positions.size} positions...`)
  
  for (const [mint, position] of state.positions.entries()) {
    try {
      // Fetch current price from DexScreener
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
      if (!response.ok) continue
      
      const data = await response.json()
      if (!data?.pairs?.length) continue
      
      const pair = data.pairs[0]
      const currentPrice = parseFloat(pair.priceUsd)
      
      // Update position with current price
      position.currentPrice = currentPrice
      
      // Calculate PnL
      const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice * 100)
      
      console.log(`  ${mint.slice(0, 8)}: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(1)}%`)
      
      // Check take profit
      if (pnlPercent >= CONFIG.TAKE_PROFIT_PERCENT) {
        console.log(`  🎯 Take profit triggered at +${pnlPercent.toFixed(1)}%`)
        await executeSell(mint, '100%', `Take profit at +${pnlPercent.toFixed(1)}%`)
      }
      // Check stop loss
      else if (pnlPercent <= -CONFIG.STOP_LOSS_PERCENT) {
        console.log(`  🛑 Stop loss triggered at ${pnlPercent.toFixed(1)}%`)
        await executeSell(mint, '100%', `Stop loss at ${pnlPercent.toFixed(1)}%`)
      }
      
    } catch (error) {
      console.error(`[MONITOR] Error checking ${mint}:`, error.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🤖 SOLANA TRADING BOT - PUMPPORTAL API')
  console.log('='.repeat(60))
  console.log(`📱 Telegram Chat: ${CONFIG.TELEGRAM_CHAT_ID}`)
  console.log(`\n⚙️  Settings:`)
  console.log(`  • Auto-trade: ${CONFIG.AUTO_TRADE ? 'Enabled' : 'Disabled'}`)
  console.log(`  • Buy Amount: ${CONFIG.BUY_AMOUNT_SOL} SOL`)
  console.log(`  • Take Profit: +${CONFIG.TAKE_PROFIT_PERCENT}%`)
  console.log(`  • Stop Loss: -${CONFIG.STOP_LOSS_PERCENT}%`)
  console.log(`  • Max Positions: ${CONFIG.MAX_POSITIONS}`)
  console.log(`  • Pool: ${CONFIG.POOL}`)
  console.log(`\n⌨️  Commands: /positions, /stats, /help`)
  console.log('='.repeat(60) + '\n')
  
  // Check API key
  if (CONFIG.PUMPPORTAL_API_KEY === 'YOUR_PUMPPORTAL_API_KEY_HERE') {
    console.log('⚠️  WARNING: PumpPortal API key not configured!')
    console.log('   Get your API key from https://pumpportal.fun')
    console.log('   Trading will not work until you add your API key.\n')
  }
  
  // Start command handler
  handleTelegramUpdates()
  
  // Start position monitoring
  setInterval(monitorPositions, CONFIG.CHECK_POSITIONS_INTERVAL)
  
  // Send startup message
  await sendTelegram(`🤖 <b>Trading Bot Started</b>

✅ Ready to trade
⚙️ Auto-trade: ${CONFIG.AUTO_TRADE ? 'Enabled' : 'Disabled'}
💰 Buy amount: ${CONFIG.BUY_AMOUNT_SOL} SOL
🎯 TP: +${CONFIG.TAKE_PROFIT_PERCENT}% | SL: -${CONFIG.STOP_LOSS_PERCENT}%

Commands: /positions, /stats, /help`)
  
  console.log('✅ Trading bot is running. Press Ctrl+C to stop.\n')
}

// ============================================
// ERROR HANDLING & STARTUP
// ============================================
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
})

process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Shutting down...')
  
  if (state.positions.size > 0) {
    console.log(`⚠️  Warning: ${state.positions.size} open positions`)
  }
  
  await sendTelegram('🔴 <b>Trading Bot Stopped</b>\n\nBot has been shut down.')
  
  process.exit(0)
})

// Start the bot
main().catch(error => {
  console.error('Fatal error:', error)
  sendTelegram(`❌ <b>Bot Error</b>\n\n${error.message}`)
  process.exit(1)
})
