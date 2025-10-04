/**
 * Solana Meme Coin Monitor Bot
 * 
 * Features:
 * - Monitors Pump.fun new tokens via WebSocket
 * - Scans for hot movers on Solana DEXs
 * - Sends Telegram alerts for quality tokens
 * - Telegram commands: /status, /stats, /help
 * - No trading features - alerts only
 * 
 * Focus: Quality tokens with real momentum
 */

import fetch from 'node-fetch'
import WebSocket from 'ws'

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Telegram settings
  TELEGRAM_TOKEN: "8330355067:AAGySAnviDql76Zj8ZUFENdx02xDVEkqI5E",
  TELEGRAM_CHAT_ID: "7409247544",
  
  // Pump.fun monitoring
  ENABLE_PUMP_FUN: true,
  PUMP_MIN_MC_USD: 5000,        // $5K minimum market cap
  PUMP_MIN_HOLDERS: 10,          // Minimum 10 holders
  
  // Hot movers monitoring
  ENABLE_MOVERS: true,
  MOVERS_SCAN_INTERVAL: 45000,   // Scan every 45 seconds
  MOVERS_MIN_VOLUME_24H: 2000,   // $2K minimum 24h volume
  MOVERS_MIN_PRICE_CHANGE: 8,    // 8%+ price change in 1h
  MOVERS_MIN_MC: 5000,           // $5K minimum market cap
  MOVERS_MAX_MC: 3000000,        // $3M maximum market cap
  MOVERS_MIN_LIQUIDITY: 3000,    // $3K minimum liquidity (SAFETY: ensures you can sell)
  
  // Alert settings
  ALERT_COOLDOWN_MS: 1800000,    // 30 min cooldown per token
  HEARTBEAT_INTERVAL: 300000,    // Status update every 5 minutes
}

// ============================================
// STATE TRACKING
// ============================================
const state = {
  seenTokens: new Set(),
  lastAlerts: new Map(),
  stats: {
    startTime: Date.now(),
    pumpTokensFound: 0,
    moversFound: 0,
    alertsSent: 0,
    errors: 0
  },
  pumpWs: null,
  isRunning: false
}

// ============================================
// TELEGRAM FUNCTIONS
// ============================================
async function sendTelegram(message) {
  if (!CONFIG.TELEGRAM_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    console.log('[TG] No credentials configured')
    return false
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('[TG] API Error:', result.description)
      
      // Retry without HTML if parse error
      if (result.description && result.description.includes('parse')) {
        const retryResponse = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CONFIG.TELEGRAM_CHAT_ID,
            text: message,
            disable_web_page_preview: true
          })
        })
        return retryResponse.ok
      }
      return false
    }
    
    state.stats.alertsSent++
    return true
  } catch (error) {
    console.error('[TG] Exception:', error.message)
    state.stats.errors++
    return false
  }
}

// Handle incoming Telegram commands
async function handleTelegramUpdates() {
  let lastUpdateId = 0
  
  setInterval(async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`)
      const data = await response.json()
      
      if (!data.ok || !data.result) return
      
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id)
        
        const message = update.message
        if (!message || !message.text) continue
        
        const text = message.text.trim()
        const chatId = message.chat.id.toString()
        
        // Only respond to configured chat
        if (chatId !== CONFIG.TELEGRAM_CHAT_ID) continue
        
        // Handle commands
        if (text === '/status') {
          await sendStatusMessage()
        } else if (text === '/stats') {
          await sendStatsMessage()
        } else if (text === '/help') {
          await sendHelpMessage()
        }
      }
    } catch (error) {
      console.error('[TG] Update error:', error.message)
    }
  }, 3000) // Check every 3 seconds
}

async function sendStatusMessage() {
  const uptime = Math.floor((Date.now() - state.stats.startTime) / 1000)
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  const status = `🤖 <b>Bot Status</b>

✅ Running: ${state.isRunning ? 'Yes' : 'No'}
⏱️ Uptime: ${hours}h ${minutes}m
🔍 Pump.fun: ${CONFIG.ENABLE_PUMP_FUN ? 'Active' : 'Disabled'}
📊 Movers: ${CONFIG.ENABLE_MOVERS ? 'Active' : 'Disabled'}

Use /stats for detailed statistics
Use /help for available commands`
  
  await sendTelegram(status)
}

async function sendStatsMessage() {
  const uptime = Math.floor((Date.now() - state.stats.startTime) / 1000)
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  const stats = `📊 <b>Bot Statistics</b>

⏱️ Uptime: ${hours}h ${minutes}m
🆕 Pump tokens found: ${state.stats.pumpTokensFound}
🔥 Hot movers found: ${state.stats.moversFound}
📤 Alerts sent: ${state.stats.alertsSent}
❌ Errors: ${state.stats.errors}
👀 Tokens tracked: ${state.seenTokens.size}

<i>Last updated: ${new Date().toLocaleTimeString()}</i>`
  
  await sendTelegram(stats)
}

async function sendHelpMessage() {
  const help = `📖 <b>Available Commands</b>

/status - Show bot status
/stats - Show detailed statistics
/help - Show this help message

<b>Monitoring Settings:</b>
• Pump.fun: ${CONFIG.ENABLE_PUMP_FUN ? 'Enabled' : 'Disabled'}
• Hot Movers: ${CONFIG.ENABLE_MOVERS ? 'Enabled' : 'Disabled'}
• Min Market Cap: $${(CONFIG.PUMP_MIN_MC_USD / 1000).toFixed(0)}K
• Min Price Change: ${CONFIG.MOVERS_MIN_PRICE_CHANGE}%

Bot automatically sends alerts for quality tokens!`
  
  await sendTelegram(help)
}

// ============================================
// FORMATTING HELPERS
// ============================================
function formatUSD(amount) {
  if (!amount || isNaN(amount)) return '$0'
  const abs = Math.abs(amount)
  if (abs >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`
  return `$${amount.toFixed(2)}`
}

function formatPercent(value) {
  if (!value || isNaN(value)) return '0%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatNumber(num) {
  if (!num || isNaN(num)) return '0'
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return Math.round(num).toString()
}

function formatAge(timestamp) {
  if (!timestamp) return 'Unknown'
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ============================================
// DEXSCREENER API
// ============================================
async function getDexPairByMint(mint) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data?.pairs?.length) return null
    
    // Filter for Solana pairs and sort by liquidity
    const solanaPairs = data.pairs.filter(p => p.chainId === 'solana')
    if (!solanaPairs.length) return null
    
    solanaPairs.sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))
    return solanaPairs[0]
  } catch (error) {
    console.error(`[DEX] Error fetching ${mint}:`, error.message)
    return null
  }
}

async function searchHotMovers() {
  try {
    console.log('[MOVERS] Scanning for hot tokens...')
    const allPairs = []
    
    // Search multiple sources
    const searchTerms = ['pump', 'solana', 'raydium']
    
    for (const term of searchTerms) {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${term}`)
        if (!response.ok) continue
        
        const data = await response.json()
        if (data?.pairs?.length) {
          const solanaPairs = data.pairs.filter(p => p.chainId === 'solana')
          allPairs.push(...solanaPairs)
        }
      } catch (error) {
        console.error(`[MOVERS] Search error for ${term}:`, error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Remove duplicates by mint address
    const uniquePairs = new Map()
    for (const pair of allPairs) {
      const mint = pair.baseToken?.address
      if (mint && !uniquePairs.has(mint)) {
        uniquePairs.set(mint, pair)
      }
    }
    
    const pairs = Array.from(uniquePairs.values())
    console.log(`[MOVERS] Found ${pairs.length} unique tokens`)
    
    // Filter for quality movers
    const filtered = pairs.filter(pair => {
      const volume24h = pair.volume?.h24 || 0
      const priceChange1h = pair.priceChange?.h1 || 0
      const marketCap = pair.marketCap || pair.fdv || 0
      const liquidity = pair.liquidity?.usd || 0
      
      return (
        volume24h >= CONFIG.MOVERS_MIN_VOLUME_24H &&
        priceChange1h >= CONFIG.MOVERS_MIN_PRICE_CHANGE &&
        marketCap >= CONFIG.MOVERS_MIN_MC &&
        marketCap <= CONFIG.MOVERS_MAX_MC &&
        liquidity >= CONFIG.MOVERS_MIN_LIQUIDITY
      )
    })
    
    // Sort by price change
    filtered.sort((a, b) => (b.priceChange?.h1 || 0) - (a.priceChange?.h1 || 0))
    
    console.log(`[MOVERS] ${filtered.length} tokens meet quality criteria`)
    return filtered.slice(0, 10) // Top 10
  } catch (error) {
    console.error('[MOVERS] Search error:', error.message)
    state.stats.errors++
    return []
  }
}

// ============================================
// ALERT FORMATTING
// ============================================
function createTokenAlert(tokenData, source = 'Unknown') {
  const {
    name,
    symbol,
    mint,
    price,
    priceChange1h,
    priceChange5m,
    marketCap,
    volume24h,
    liquidity,
    holders,
    age,
    dex
  } = tokenData
  
  const emoji = source === 'Pump.fun' ? '🚀' : '🔥'
  
  let alert = `${emoji} <b>${name || symbol}</b> ($${symbol})\n\n`
  alert += `📍 <code>${mint}</code>\n`
  alert += `🏷️ Source: ${source}\n`
  
  if (dex) alert += `💱 DEX: ${dex}\n`
  if (age) alert += `⏰ Age: ${age}\n`
  alert += `\n`
  
  alert += `💰 Market Cap: ${formatUSD(marketCap)}\n`
  alert += `💧 Liquidity: ${formatUSD(liquidity)}\n`
  alert += `📊 Volume 24h: ${formatUSD(volume24h)}\n`
  
  if (price) alert += `💵 Price: $${price.toFixed(8)}\n`
  
  if (priceChange1h) {
    alert += `📈 1h Change: ${formatPercent(priceChange1h)}\n`
  }
  if (priceChange5m) {
    alert += `⚡ 5m Change: ${formatPercent(priceChange5m)}\n`
  }
  
  if (holders) alert += `👥 Holders: ${formatNumber(holders)}\n`
  
  return alert
}

// ============================================
// PUMP.FUN MONITORING
// ============================================
function startPumpFunMonitoring() {
  if (!CONFIG.ENABLE_PUMP_FUN) {
    console.log('[PUMP] Monitoring disabled')
    return
  }
  
  console.log('[PUMP] Starting WebSocket connection...')
  
  try {
    const ws = new WebSocket('wss://pumpportal.fun/api/data')
    state.pumpWs = ws
    
    ws.on('open', () => {
      console.log('[PUMP] ✅ Connected to Pump.fun')
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }))
      sendTelegram('🟢 <b>Pump.fun Monitor Active</b>\n\nWatching for new token launches...')
    })
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        await handlePumpFunToken(message)
      } catch (error) {
        console.error('[PUMP] Parse error:', error.message)
      }
    })
    
    ws.on('close', () => {
      console.log('[PUMP] ❌ Connection closed, reconnecting in 5s...')
      setTimeout(() => startPumpFunMonitoring(), 5000)
    })
    
    ws.on('error', (error) => {
      console.error('[PUMP] WebSocket error:', error.message)
      state.stats.errors++
    })
  } catch (error) {
    console.error('[PUMP] Failed to start:', error.message)
    state.stats.errors++
    setTimeout(() => startPumpFunMonitoring(), 10000)
  }
}

async function handlePumpFunToken(message) {
  const mint = message.mint || message.tokenMint || message.address
  if (!mint) return
  
  // Skip if already seen
  if (state.seenTokens.has(mint)) return
  state.seenTokens.add(mint)
  
  const symbol = (message.symbol || message.ticker || 'TOKEN').toUpperCase()
  const name = message.name || symbol
  
  console.log(`[PUMP] New token: ${symbol} (${mint.slice(0, 8)}...)`)
  state.stats.pumpTokensFound++
  
  // Get market data
  const marketCapSol = message.marketCapSol || message.market_cap_sol || 0
  const holders = message.holders || message.holder_count || 0
  
  // Estimate USD value (SOL ~$140)
  const solPrice = 140
  const marketCapUSD = marketCapSol * solPrice
  
  // Apply quality filters
  if (marketCapUSD > 0 && marketCapUSD < CONFIG.PUMP_MIN_MC_USD) {
    console.log(`[PUMP] ⏭️ Skipped: MC too low (${formatUSD(marketCapUSD)})`)
    return
  }
  
  if (holders > 0 && holders < CONFIG.PUMP_MIN_HOLDERS) {
    console.log(`[PUMP] ⏭️ Skipped: Too few holders (${holders})`)
    return
  }
  
  // Wait for DEX data
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const pair = await getDexPairByMint(mint)
  
  const tokenData = {
    name,
    symbol,
    mint,
    price: pair?.priceUsd ? parseFloat(pair.priceUsd) : null,
    priceChange1h: pair?.priceChange?.h1,
    priceChange5m: pair?.priceChange?.m5,
    marketCap: pair?.marketCap || pair?.fdv || marketCapUSD,
    volume24h: pair?.volume?.h24,
    liquidity: pair?.liquidity?.usd,
    holders,
    age: pair?.pairCreatedAt ? formatAge(pair.pairCreatedAt) : null,
    dex: pair?.dexId
  }
  
  const alert = createTokenAlert(tokenData, 'Pump.fun')
  await sendTelegram(alert)
  
  state.lastAlerts.set(mint, Date.now())
  console.log(`[PUMP] ✅ Alert sent for ${symbol}`)
}

// ============================================
// HOT MOVERS MONITORING
// ============================================
async function scanHotMovers() {
  if (!CONFIG.ENABLE_MOVERS) return
  
  const movers = await searchHotMovers()
  
  if (movers.length === 0) {
    console.log('[MOVERS] No hot movers found')
    return
  }
  
  let alertsSent = 0
  
  for (const pair of movers) {
    const mint = pair.baseToken?.address
    if (!mint) continue
    
    // Check cooldown
    const lastAlert = state.lastAlerts.get(mint) || 0
    if (Date.now() - lastAlert < CONFIG.ALERT_COOLDOWN_MS) {
      continue
    }
    
    const symbol = (pair.baseToken?.symbol || 'TOKEN').toUpperCase()
    const name = pair.baseToken?.name || symbol
    
    console.log(`[MOVERS] Hot token: ${symbol} (${formatPercent(pair.priceChange?.h1 || 0)})`)
    state.stats.moversFound++
    
    const tokenData = {
      name,
      symbol,
      mint,
      price: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
      priceChange1h: pair.priceChange?.h1,
      priceChange5m: pair.priceChange?.m5,
      marketCap: pair.marketCap || pair.fdv,
      volume24h: pair.volume?.h24,
      liquidity: pair.liquidity?.usd,
      holders: null,
      age: pair.pairCreatedAt ? formatAge(pair.pairCreatedAt) : null,
      dex: pair.dexId
    }
    
    const alert = createTokenAlert(tokenData, 'Hot Mover')
    await sendTelegram(alert)
    
    state.lastAlerts.set(mint, Date.now())
    alertsSent++
    console.log(`[MOVERS] ✅ Alert sent for ${symbol}`)
    
    // Limit to 3 alerts per scan
    if (alertsSent >= 3) break
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

// ============================================
// HEARTBEAT
// ============================================
async function sendHeartbeat() {
  const uptime = Math.floor((Date.now() - state.stats.startTime) / 1000 / 60)
  
  const message = `💓 <b>Bot Heartbeat</b>

✅ Status: Running
⏱️ Uptime: ${uptime} minutes
🔍 Monitoring: ${CONFIG.ENABLE_PUMP_FUN ? 'Pump.fun' : ''} ${CONFIG.ENABLE_MOVERS ? '+ Hot Movers' : ''}
📊 Alerts sent: ${state.stats.alertsSent}

<i>Use /status for more info</i>`
  
  await sendTelegram(message)
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🤖 SOLANA MEME COIN MONITOR BOT')
  console.log('='.repeat(60))
  console.log(`📱 Telegram Chat: ${CONFIG.TELEGRAM_CHAT_ID}`)
  console.log(`\n📡 Monitoring:`)
  console.log(`  ${CONFIG.ENABLE_PUMP_FUN ? '✅' : '❌'} Pump.fun new tokens`)
  console.log(`  ${CONFIG.ENABLE_MOVERS ? '✅' : '❌'} Hot movers (${CONFIG.MOVERS_SCAN_INTERVAL / 1000}s interval)`)
  console.log(`\n🎯 Quality Filters:`)
  console.log(`  • Min Market Cap: ${formatUSD(CONFIG.PUMP_MIN_MC_USD)}`)
  console.log(`  • Min Price Change: ${CONFIG.MOVERS_MIN_PRICE_CHANGE}%`)
  console.log(`  • Min Volume 24h: ${formatUSD(CONFIG.MOVERS_MIN_VOLUME_24H)}`)
  console.log(`  • Alert Cooldown: ${CONFIG.ALERT_COOLDOWN_MS / 60000} minutes`)
  console.log(`\n⌨️  Commands: /status, /stats, /help`)
  console.log('='.repeat(60) + '\n')
  
  state.isRunning = true
  
  // Start Pump.fun monitoring
  if (CONFIG.ENABLE_PUMP_FUN) {
    startPumpFunMonitoring()
  }
  
  // Start hot movers scanning
  if (CONFIG.ENABLE_MOVERS) {
    setInterval(scanHotMovers, CONFIG.MOVERS_SCAN_INTERVAL)
    setTimeout(scanHotMovers, 10000) // First scan after 10s
  }
  
  // Start command handler
  handleTelegramUpdates()
  
  // Start heartbeat
  setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL)
  
  // Send startup message
  await sendTelegram(`🤖 <b>Bot Started</b>

✅ Monitoring active
🔍 Pump.fun: ${CONFIG.ENABLE_PUMP_FUN ? 'Enabled' : 'Disabled'}
📊 Hot Movers: ${CONFIG.ENABLE_MOVERS ? 'Enabled' : 'Disabled'}

You'll receive alerts for quality tokens!

Commands: /status, /stats, /help`)
  
  console.log('✅ Bot is running. Press Ctrl+C to stop.\n')
}

// ============================================
// ERROR HANDLING & STARTUP
// ============================================
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  state.stats.errors++
})

process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Shutting down...')
  state.isRunning = false
  
  if (state.pumpWs) {
    state.pumpWs.close()
  }
  
  await sendTelegram('🔴 <b>Bot Stopped</b>\n\nMonitoring has been disabled.')
  
  process.exit(0)
})

// Start the bot
main().catch(error => {
  console.error('Fatal error:', error)
  sendTelegram(`❌ <b>Bot Error</b>\n\n${error.message}`)
  process.exit(1)
})
