/**
 * Generates all app icons from one SVG "scroll of healing" design.
 * Run from the repo root: node scripts/generate-icons.mjs
 * Outputs into apps/mobile/assets/images/.
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const OUT_DIR = new URL('../apps/mobile/assets/images/', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1'); // strip leading slash on Windows paths

/**
 * The scroll group is drawn in a 1024×1024 box, roughly centered, and reused
 * by every asset. Parchment sheet between two wooden rollers, a glowing green
 * healing cross, and three sparkles — classic video-game consumable.
 */
const DEFS = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="#1f4a3a"/>
      <stop offset="100%" stop-color="#0c2019"/>
    </radialGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8eed6"/>
      <stop offset="55%" stop-color="#f1e2bd"/>
      <stop offset="100%" stop-color="#e3cc9c"/>
    </linearGradient>
    <linearGradient id="roller" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8d2a2"/>
      <stop offset="100%" stop-color="#c3a065"/>
    </linearGradient>
    <linearGradient id="cross" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5ec97a"/>
      <stop offset="100%" stop-color="#2f8c4d"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="26" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
`;

function sparkle(cx, cy, r, opacity = 1) {
  const inner = r * 0.22;
  return `<path transform="translate(${cx} ${cy})" fill="#d8ffe3" opacity="${opacity}"
    d="M0 ${-r} C ${inner} ${-inner} ${inner} ${-inner} ${r} 0
       C ${inner} ${inner} ${inner} ${inner} 0 ${r}
       C ${-inner} ${inner} ${-inner} ${inner} ${-r} 0
       C ${-inner} ${-inner} ${-inner} ${-inner} 0 ${-r} Z"/>`;
}

function roller(y) {
  return `
    <rect x="216" y="${y}" width="592" height="88" rx="44" fill="url(#roller)"/>
    <rect x="216" y="${y}" width="592" height="30" rx="15" fill="#f4e4bd" opacity="0.5"/>
    <circle cx="260" cy="${y + 44}" r="24" fill="#a67c46"/>
    <circle cx="260" cy="${y + 44}" r="11" fill="#6f4f2a"/>
    <circle cx="764" cy="${y + 44}" r="24" fill="#a67c46"/>
    <circle cx="764" cy="${y + 44}" r="11" fill="#6f4f2a"/>
  `;
}

/** colored=false renders the flat white silhouette for the Android monochrome layer. */
function scrollGroup({ colored = true } = {}) {
  if (!colored) {
    return `
      <g>
        <mask id="cut">
          <rect x="0" y="0" width="1024" height="1024" fill="black"/>
          <rect x="216" y="180" width="592" height="88" rx="44" fill="white"/>
          <rect x="216" y="756" width="592" height="88" rx="44" fill="white"/>
          <rect x="288" y="224" width="448" height="576" fill="white"/>
          <path fill="black" d="M464 368 h96 v96 h96 v96 h-96 v96 h-96 v-96 h-96 v-96 h96 Z"/>
        </mask>
        <rect x="0" y="0" width="1024" height="1024" fill="white" mask="url(#cut)"/>
      </g>
    `;
  }
  return `
    <g filter="url(#softShadow)">
      <rect x="288" y="224" width="448" height="576" fill="url(#sheet)"/>
      <rect x="288" y="224" width="26" height="576" fill="#c9ab74" opacity="0.55"/>
      <rect x="710" y="224" width="26" height="576" fill="#c9ab74" opacity="0.55"/>
      ${roller(180)}
      ${roller(756)}
      <g filter="url(#glow)">
        <path fill="url(#cross)" stroke="#1e5c33" stroke-width="10" stroke-linejoin="round"
          d="M470 374 h84 a14 14 0 0 1 14 14 v76 h76 a14 14 0 0 1 14 14 v84 a14 14 0 0 1 -14 14 h-76 v76 a14 14 0 0 1 -14 14 h-84 a14 14 0 0 1 -14 -14 v-76 h-76 a14 14 0 0 1 -14 -14 v-84 a14 14 0 0 1 14 -14 h76 v-76 a14 14 0 0 1 14 -14 Z"/>
        <rect x="470" y="388" width="84" height="26" rx="13" fill="#8fe3a6" opacity="0.9"/>
      </g>
      ${sparkle(402, 402, 34, 0.95)}
      ${sparkle(628, 414, 22, 0.8)}
      ${sparkle(614, 638, 27, 0.9)}
    </g>
  `;
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${DEFS}${inner}</svg>`;
}

const mainIcon = svg(`
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${scrollGroup()}
`);

// Adaptive foreground: content inside the ~66% safe zone, transparent around it.
const androidForeground = svg(`
  <g transform="translate(512 512) scale(0.60) translate(-512 -512)">${scrollGroup()}</g>
`);

const androidBackground = svg(`<rect width="1024" height="1024" fill="url(#bg)"/>`);

const androidMonochrome = svg(`
  <g transform="translate(512 512) scale(0.60) translate(-512 -512)">${scrollGroup({ colored: false })}</g>
`);

// Splash: the scroll alone on transparency; splash background color comes from app.json.
const splashIcon = svg(`
  <g transform="translate(512 512) scale(0.86) translate(-512 -512)">${scrollGroup()}</g>
`);

async function render(name, source, size) {
  await sharp(Buffer.from(source), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`${OUT_DIR}${name}`);
  console.log(`✓ ${name} (${size}px)`);
}

mkdirSync(OUT_DIR, { recursive: true });
await render('icon.png', mainIcon, 1024);
await render('android-icon-foreground.png', androidForeground, 1024);
await render('android-icon-background.png', androidBackground, 1024);
await render('android-icon-monochrome.png', androidMonochrome, 1024);
await render('splash-icon.png', splashIcon, 1024);
await render('favicon.png', mainIcon, 48);
console.log('Done — icons written to apps/mobile/assets/images/');
