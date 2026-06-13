const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'server.js',
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/assets/steam-pet-brush.png',
  'public/assets/hy300-projector.png',
  'public/assets/car-gesture-light.png'
];

const requiredCopy = [
  'Self-Cleaning Steam Pet Brush',
  'HY300 Portable Android Smart Projector',
  'LED Car Hand Gesture Light',
  'DropViral AI',
  'No spam, no fake urgency'
];

const forbiddenRuntimeTerms = [
  'TELEGRAM_TOKEN',
  'WALLET_PRIVATE_KEY',
  'PUMPPORTAL_API_KEY',
  'solana_monitor_bot',
  'trading_bot_local',
  'trading_bot_pumpportal'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing required file: ${relativePath}`);
}

const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
for (const copy of requiredCopy) {
  assert(html.includes(copy), `Missing required page copy: ${copy}`);
}

const runtimeFiles = ['server.js', 'package.json', 'public/index.html', 'public/styles.css', 'public/app.js'];
for (const relativePath of runtimeFiles) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const term of forbiddenRuntimeTerms) {
    assert(!content.includes(term), `Forbidden legacy bot term found in ${relativePath}: ${term}`);
  }
}

execFileSync(process.execPath, ['--check', path.join(root, 'server.js')], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', path.join(root, 'public/app.js')], { stdio: 'inherit' });

console.log('DropViral static site checks passed.');
