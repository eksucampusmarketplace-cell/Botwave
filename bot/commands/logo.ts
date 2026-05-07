import { registerCommand, type MessageContext } from './registry';
import { sendReply } from './helpers';
import sharp from 'sharp';

// ═══════════════════════════════════════════════════════════════════════════════
// BOTWAVE LOGO GENERATOR — !logo command
// 30+ styles: techy, nature, abstract, retro, neon, galaxy, watercolor,
// vintage, graffiti, elegant, sports, gaming, minimalist, geometric, floral,
// cosmic, cyberpunk, vaporwave, pixel, ocean, fire, marble, gradient, tribal,
// islamic, african, luxury, music, anime, matrix, holographic, aurora
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Color Utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const val = parseInt(hex.replace('#', ''), 16);
  return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255 };
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── SVG Text Rendering ─────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function textSvg(
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  opts: {
    fontFamily?: string;
    fontWeight?: string;
    letterSpacing?: number;
    textAnchor?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    filter?: string;
    transform?: string;
  } = {},
): string {
  const escaped = escapeXml(text);
  const family = opts.fontFamily || 'Arial, Helvetica, sans-serif';
  const weight = opts.fontWeight || 'bold';
  const anchor = opts.textAnchor || 'middle';
  const opacity = opts.opacity !== undefined ? opts.opacity : 1;
  const extra: string[] = [];
  if (opts.letterSpacing) extra.push(`letter-spacing="${opts.letterSpacing}px"`);
  if (opts.stroke) extra.push(`stroke="${opts.stroke}" stroke-width="${opts.strokeWidth || 2}"`);
  if (opts.filter) extra.push(`filter="url(#${opts.filter})"`);
  if (opts.transform) extra.push(`transform="${opts.transform}"`);
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central" opacity="${opacity}" ${extra.join(' ')}>${escaped}</text>`;
}

// ─── Background Generators ───────────────────────────────────────────────────

function defsGlow(id: string, color: string, blur: number): string {
  return `<filter id="${id}"><feGaussianBlur stdDeviation="${blur}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

function defsShadow(id: string, dx: number, dy: number, blur: number, color: string): string {
  return `<filter id="${id}"><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="0.6"/></filter>`;
}

function defsNoise(id: string): string {
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;
}

// ─── Style Definitions ───────────────────────────────────────────────────────

interface LogoStyle {
  name: string;
  description: string;
  generate: (text: string, w: number, h: number) => string;
}

const STYLES: LogoStyle[] = [

  // ═══ 1. TECHY / CIRCUIT BOARD ═══
  {
    name: 'techy',
    description: 'Circuit board with glowing lines',
    generate: (text, w, h) => {
      const lines: string[] = [];
      const colors = ['#00ff41', '#00d4ff', '#ff00ff', '#ffff00'];
      const mainColor = randomFromArray(colors);
      // Circuit traces
      for (let i = 0; i < 40; i++) {
        const x1 = randomBetween(0, w);
        const y1 = randomBetween(0, h);
        const x2 = Math.random() > 0.5 ? x1 : randomBetween(0, w);
        const y2 = x2 === x1 ? randomBetween(0, h) : y1;
        lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${mainColor}" stroke-width="${randomFloat(0.5, 2)}" opacity="${randomFloat(0.1, 0.4)}"/>`);
      }
      // Nodes
      for (let i = 0; i < 25; i++) {
        const cx = randomBetween(20, w - 20);
        const cy = randomBetween(20, h - 20);
        lines.push(`<circle cx="${cx}" cy="${cy}" r="${randomBetween(2, 5)}" fill="${mainColor}" opacity="${randomFloat(0.2, 0.6)}"/>`);
      }
      // Grid dots
      for (let gx = 0; gx < w; gx += 30) {
        for (let gy = 0; gy < h; gy += 30) {
          lines.push(`<circle cx="${gx}" cy="${gy}" r="1" fill="${mainColor}" opacity="0.15"/>`);
        }
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsGlow('glow', mainColor, 8)}${defsShadow('shadow', 2, 2, 4, '#000')}</defs>
        <rect width="${w}" height="${h}" fill="#0a0a0a"/>
        ${lines.join('')}
        <rect x="${w * 0.05}" y="${h * 0.3}" width="${w * 0.9}" height="${h * 0.4}" rx="10" fill="rgba(0,0,0,0.7)" stroke="${mainColor}" stroke-width="2" opacity="0.8"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.65), h * 0.2), mainColor, { filter: 'glow', fontFamily: 'Courier New, monospace', letterSpacing: 4 })}
        <text x="${w / 2}" y="${h * 0.78}" font-family="Courier New" font-size="14" fill="${mainColor}" text-anchor="middle" opacity="0.5">// SYSTEM.INIT</text>
      </svg>`;
    },
  },

  // ═══ 2. NEON GLOW ═══
  {
    name: 'neon',
    description: 'Vibrant neon sign on dark wall',
    generate: (text, w, h) => {
      const neonColors = ['#ff006e', '#00f5d4', '#fee440', '#9b5de5', '#f15bb5', '#00bbf9'];
      const color = randomFromArray(neonColors);
      const { r, g, b } = hexToRgb(color);
      const bricks: string[] = [];
      // Brick wall
      const bw = 60, bh = 25;
      for (let by = 0; by < h; by += bh) {
        const offset = (Math.floor(by / bh) % 2) * (bw / 2);
        for (let bx = -bw; bx < w + bw; bx += bw) {
          bricks.push(`<rect x="${bx + offset}" y="${by}" width="${bw - 2}" height="${bh - 2}" fill="rgb(${40 + randomBetween(-5, 5)},${25 + randomBetween(-5, 5)},${25 + randomBetween(-5, 5)})" rx="1"/>`);
        }
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="neonGlow"><feGaussianBlur stdDeviation="6" result="blur1"/><feGaussianBlur stdDeviation="12" result="blur2"/><feGaussianBlur stdDeviation="20" result="blur3"/><feMerge><feMergeNode in="blur3"/><feMergeNode in="blur2"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="wallTex"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="#1a1210"/>
        <g filter="url(#wallTex)">${bricks.join('')}</g>
        <rect width="${w}" height="${h}" fill="rgba(${r},${g},${b},0.03)"/>
        <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.4}" ry="${h * 0.35}" fill="rgba(${r},${g},${b},0.06)"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.22), color, { filter: 'neonGlow', fontFamily: 'Arial, sans-serif', letterSpacing: 6, stroke: color, strokeWidth: 1 })}
        <line x1="${w * 0.3}" y1="${h * 0.25}" x2="${w * 0.35}" y2="${h * 0.15}" stroke="#333" stroke-width="2"/>
        <line x1="${w * 0.7}" y1="${h * 0.25}" x2="${w * 0.65}" y2="${h * 0.15}" stroke="#333" stroke-width="2"/>
      </svg>`;
    },
  },

  // ═══ 3. GALAXY / SPACE ═══
  {
    name: 'galaxy',
    description: 'Deep space galaxy with stars',
    generate: (text, w, h) => {
      const stars: string[] = [];
      for (let i = 0; i < 200; i++) {
        const sx = randomBetween(0, w);
        const sy = randomBetween(0, h);
        const sr = randomFloat(0.3, 2.5);
        const so = randomFloat(0.3, 1);
        stars.push(`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="white" opacity="${so}"/>`);
      }
      // Nebula clouds
      const nebulae: string[] = [];
      const nebulaColors = ['#7b2d8e', '#1e3a5f', '#0d4b6e', '#5c1a6e', '#2d1b69'];
      for (let i = 0; i < 6; i++) {
        nebulae.push(`<ellipse cx="${randomBetween(w * 0.2, w * 0.8)}" cy="${randomBetween(h * 0.2, h * 0.8)}" rx="${randomBetween(80, 200)}" ry="${randomBetween(40, 120)}" fill="${randomFromArray(nebulaColors)}" opacity="${randomFloat(0.15, 0.35)}" transform="rotate(${randomBetween(-45, 45)} ${w / 2} ${h / 2})"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsGlow('starGlow', '#fff', 10)}${defsShadow('txtShadow', 0, 0, 8, '#000')}</defs>
        <rect width="${w}" height="${h}" fill="#050510"/>
        <radialGradient id="nebula1" cx="50%" cy="50%"><stop offset="0%" stop-color="#1a0533" stop-opacity="0.8"/><stop offset="100%" stop-color="#050510" stop-opacity="0"/></radialGradient>
        <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.5}" ry="${h * 0.4}" fill="url(#nebula1)"/>
        ${nebulae.join('')}
        ${stars.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.2), '#ffffff', { filter: 'starGlow', letterSpacing: 5, fontFamily: 'Georgia, serif' })}
        <text x="${w / 2}" y="${h * 0.75}" font-family="Georgia, serif" font-size="16" fill="#9b8ec4" text-anchor="middle" opacity="0.6" font-style="italic">✦ among the stars ✦</text>
      </svg>`;
    },
  },

  // ═══ 4. MINIMALIST ═══
  {
    name: 'minimalist',
    description: 'Clean, simple, elegant design',
    generate: (text, w, h) => {
      const palettes = [
        { bg: '#ffffff', fg: '#1a1a1a', accent: '#e63946' },
        { bg: '#f8f9fa', fg: '#212529', accent: '#0077b6' },
        { bg: '#fafafa', fg: '#2d3436', accent: '#fd79a8' },
        { bg: '#fff8f0', fg: '#2c2c2c', accent: '#e17055' },
        { bg: '#f0f4f8', fg: '#1a202c', accent: '#38b2ac' },
      ];
      const p = randomFromArray(palettes);
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="${p.bg}"/>
        <line x1="${w * 0.15}" y1="${h * 0.42}" x2="${w * 0.85}" y2="${h * 0.42}" stroke="${p.accent}" stroke-width="3"/>
        <line x1="${w * 0.15}" y1="${h * 0.62}" x2="${w * 0.85}" y2="${h * 0.62}" stroke="${p.accent}" stroke-width="3"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), p.fg, { fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: 8, fontWeight: '300' })}
        <rect x="${w * 0.45}" y="${h * 0.68}" width="${w * 0.1}" height="3" fill="${p.accent}"/>
      </svg>`;
    },
  },

  // ═══ 5. RETRO / 80s ═══
  {
    name: 'retro',
    description: 'Retro 80s synthwave sunset',
    generate: (text, w, h) => {
      const sunGrad: string[] = [];
      const sunColors = ['#ff6b6b', '#ff8e53', '#ffd93d', '#ff6b9d'];
      for (let i = 0; i < sunColors.length; i++) {
        sunGrad.push(`<stop offset="${(i / (sunColors.length - 1)) * 100}%" stop-color="${sunColors[i]}"/>`);
      }
      // Grid lines
      const gridLines: string[] = [];
      for (let i = 0; i < 15; i++) {
        const y = h * 0.6 + (i / 14) * (h * 0.4);
        const perspective = 1 + i * 0.3;
        gridLines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#ff00ff" stroke-width="${0.5 / perspective}" opacity="${0.6 - i * 0.03}"/>`);
      }
      for (let i = 0; i < 20; i++) {
        const x = (i / 19) * w;
        const perspX = w / 2 + (x - w / 2) * 0.3;
        gridLines.push(`<line x1="${perspX}" y1="${h * 0.6}" x2="${x}" y2="${h}" stroke="#ff00ff" stroke-width="0.5" opacity="0.4"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a001a"/><stop offset="50%" stop-color="#1a0033"/><stop offset="100%" stop-color="#330066"/></linearGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">${sunGrad.join('')}</linearGradient>
          ${defsGlow('retroGlow', '#ff00ff', 6)}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#sky)"/>
        <circle cx="${w / 2}" cy="${h * 0.55}" r="${Math.min(w, h) * 0.2}" fill="url(#sun)"/>
        <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#0a001a"/>
        ${gridLines.join('')}
        ${textSvg(text, w / 2, h * 0.3, Math.min(w / (text.length * 0.55), h * 0.18), '#ff00ff', { filter: 'retroGlow', fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 5 })}
        ${textSvg(text, w / 2, h * 0.3 + 2, Math.min(w / (text.length * 0.55), h * 0.18), '#00ffff', { fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 5, opacity: 0.4 })}
      </svg>`;
    },
  },

  // ═══ 6. GRADIENT ═══
  {
    name: 'gradient',
    description: 'Beautiful color gradients',
    generate: (text, w, h) => {
      const gradients = [
        ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
        ['#fccb90', '#d57eeb'], ['#e0c3fc', '#8ec5fc'], ['#f5576c', '#ff9a9e'],
        ['#0250c5', '#d43f8d'], ['#0ba360', '#3cba92'], ['#ff0844', '#ffb199'],
      ];
      const [c1, c2] = randomFromArray(gradients);
      const angle = randomBetween(0, 360);
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" gradientTransform="rotate(${angle})"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>
          ${defsShadow('ds', 3, 3, 6, 'rgba(0,0,0,0.4)')}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#bg)"/>
        <circle cx="${w * 0.2}" cy="${h * 0.3}" r="${w * 0.15}" fill="rgba(255,255,255,0.08)"/>
        <circle cx="${w * 0.8}" cy="${h * 0.7}" r="${w * 0.2}" fill="rgba(255,255,255,0.06)"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.22), '#ffffff', { filter: 'ds', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 7. WATERCOLOR ═══
  {
    name: 'watercolor',
    description: 'Soft watercolor paint splash',
    generate: (text, w, h) => {
      const blobs: string[] = [];
      const waterColors = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
      for (let i = 0; i < 12; i++) {
        const cx = randomBetween(w * 0.1, w * 0.9);
        const cy = randomBetween(h * 0.1, h * 0.9);
        const rx = randomBetween(60, 180);
        const ry = randomBetween(40, 120);
        blobs.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${randomFromArray(waterColors)}" opacity="${randomFloat(0.2, 0.5)}" transform="rotate(${randomBetween(-30, 30)} ${cx} ${cy})"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="waterBlur"><feGaussianBlur stdDeviation="15"/></filter>
          ${defsShadow('wShadow', 1, 1, 3, 'rgba(0,0,0,0.2)')}
        </defs>
        <rect width="${w}" height="${h}" fill="#fefefe"/>
        <g filter="url(#waterBlur)">${blobs.join('')}</g>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#2d3436', { filter: 'wShadow', fontFamily: 'Georgia, Times New Roman, serif', letterSpacing: 3 })}
      </svg>`;
    },
  },

  // ═══ 8. VINTAGE ═══
  {
    name: 'vintage',
    description: 'Aged paper with ornate border',
    generate: (text, w, h) => {
      const corners: string[] = [];
      const m = 30;
      // Ornate double border
      corners.push(`<rect x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}" fill="none" stroke="#8B4513" stroke-width="3" rx="5"/>`);
      corners.push(`<rect x="${m + 8}" y="${m + 8}" width="${w - m * 2 - 16}" height="${h - m * 2 - 16}" fill="none" stroke="#8B4513" stroke-width="1" rx="3"/>`);
      // Corner ornaments
      const cornerSize = 20;
      const positions = [[m, m], [w - m, m], [m, h - m], [w - m, h - m]];
      for (const [px, py] of positions) {
        corners.push(`<circle cx="${px}" cy="${py}" r="${cornerSize / 3}" fill="none" stroke="#8B4513" stroke-width="2"/>`);
        corners.push(`<circle cx="${px}" cy="${py}" r="${cornerSize / 6}" fill="#8B4513"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="${randomBetween(1, 100)}"/><feColorMatrix type="matrix" values="0 0 0 0 0.95 0 0 0 0 0.9 0 0 0 0 0.8 0 0 0 0.15 0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="#f4e4c1"/>
        <rect width="${w}" height="${h}" fill="rgba(139,69,19,0.03)" filter="url(#paper)"/>
        ${corners.join('')}
        <text x="${w / 2}" y="${h * 0.3}" font-family="Georgia, serif" font-size="14" fill="#8B4513" text-anchor="middle" font-style="italic" opacity="0.6">— EST. ${new Date().getFullYear()} —</text>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), '#3e2723', { fontFamily: 'Georgia, Times New Roman, serif', letterSpacing: 4 })}
        <line x1="${w * 0.3}" y1="${h * 0.63}" x2="${w * 0.7}" y2="${h * 0.63}" stroke="#8B4513" stroke-width="1" opacity="0.5"/>
        <text x="${w / 2}" y="${h * 0.72}" font-family="Georgia, serif" font-size="12" fill="#8B4513" text-anchor="middle" opacity="0.5">PREMIUM QUALITY</text>
      </svg>`;
    },
  },

  // ═══ 9. GRAFFITI ═══
  {
    name: 'graffiti',
    description: 'Street art graffiti style',
    generate: (text, w, h) => {
      const sprayCans: string[] = [];
      const graffitiColors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff69b4'];
      // Paint drips and splatters
      for (let i = 0; i < 30; i++) {
        const sx = randomBetween(0, w);
        const sy = randomBetween(0, h);
        const color = randomFromArray(graffitiColors);
        sprayCans.push(`<circle cx="${sx}" cy="${sy}" r="${randomBetween(3, 15)}" fill="${color}" opacity="${randomFloat(0.1, 0.4)}"/>`);
      }
      // Drip lines
      for (let i = 0; i < 8; i++) {
        const dx = randomBetween(w * 0.1, w * 0.9);
        const dy = randomBetween(h * 0.4, h * 0.6);
        const dh = randomBetween(30, 100);
        sprayCans.push(`<line x1="${dx}" y1="${dy}" x2="${dx + randomBetween(-5, 5)}" y2="${dy + dh}" stroke="${randomFromArray(graffitiColors)}" stroke-width="${randomBetween(2, 5)}" stroke-linecap="round" opacity="0.4"/>`);
      }
      const mainColor = randomFromArray(graffitiColors);
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${defsShadow('grafShadow', 4, 4, 2, '#000')}
          <filter id="rough"><feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="#2c2c2c"/>
        <rect width="${w}" height="${h}" fill="rgba(100,100,100,0.1)"/>
        ${sprayCans.join('')}
        ${textSvg(text, w / 2 + 4, h / 2 + 4, Math.min(w / (text.length * 0.5), h * 0.25), '#000000', { fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 2, opacity: 0.5 })}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.5), h * 0.25), mainColor, { fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 2, stroke: '#ffffff', strokeWidth: 3 })}
      </svg>`;
    },
  },

  // ═══ 10. ELEGANT / LUXURY ═══
  {
    name: 'elegant',
    description: 'Gold foil on dark background',
    generate: (text, w, h) => {
      const ornaments: string[] = [];
      // Diamond shapes
      for (let i = 0; i < 6; i++) {
        const ox = randomBetween(w * 0.1, w * 0.9);
        const oy = randomBetween(h * 0.1, h * 0.9);
        const size = randomBetween(5, 15);
        ornaments.push(`<polygon points="${ox},${oy - size} ${ox + size},${oy} ${ox},${oy + size} ${ox - size},${oy}" fill="#d4af37" opacity="${randomFloat(0.1, 0.3)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4e18f"/><stop offset="25%" stop-color="#d4af37"/><stop offset="50%" stop-color="#f4e18f"/><stop offset="75%" stop-color="#d4af37"/><stop offset="100%" stop-color="#f4e18f"/></linearGradient>
          ${defsGlow('goldGlow', '#d4af37', 4)}
        </defs>
        <rect width="${w}" height="${h}" fill="#0d0d0d"/>
        ${ornaments.join('')}
        <line x1="${w * 0.15}" y1="${h * 0.35}" x2="${w * 0.85}" y2="${h * 0.35}" stroke="url(#gold)" stroke-width="1" opacity="0.6"/>
        <line x1="${w * 0.15}" y1="${h * 0.65}" x2="${w * 0.85}" y2="${h * 0.65}" stroke="url(#gold)" stroke-width="1" opacity="0.6"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), 'url(#gold)', { filter: 'goldGlow', fontFamily: 'Georgia, Times New Roman, serif', letterSpacing: 6 })}
        <text x="${w / 2}" y="${h * 0.78}" font-family="Georgia, serif" font-size="13" fill="#d4af37" text-anchor="middle" opacity="0.5" letter-spacing="8">PREMIUM</text>
      </svg>`;
    },
  },

  // ═══ 11. GAMING ═══
  {
    name: 'gaming',
    description: 'Esports / gaming team logo',
    generate: (text, w, h) => {
      const colors = ['#ff4655', '#00d4aa', '#ff6b00', '#7b61ff', '#00b4d8'];
      const accent = randomFromArray(colors);
      // Shield shape
      const shieldW = w * 0.5;
      const shieldH = h * 0.7;
      const sx = w / 2 - shieldW / 2;
      const sy = h * 0.12;
      const shield = `<path d="M${w / 2} ${sy} L${sx + shieldW} ${sy + shieldH * 0.3} L${sx + shieldW} ${sy + shieldH * 0.6} L${w / 2} ${sy + shieldH} L${sx} ${sy + shieldH * 0.6} L${sx} ${sy + shieldH * 0.3} Z" fill="rgba(0,0,0,0.8)" stroke="${accent}" stroke-width="3"/>`;
      // Diagonal slashes
      const slashes: string[] = [];
      for (let i = 0; i < 3; i++) {
        slashes.push(`<line x1="${w * 0.3 + i * 30}" y1="${h * 0.15}" x2="${w * 0.15 + i * 30}" y2="${h * 0.85}" stroke="${accent}" stroke-width="2" opacity="0.15"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gameBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f0f1a"/><stop offset="100%" stop-color="#1a1a2e"/></linearGradient>
          ${defsGlow('gameGlow', accent, 5)}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#gameBg)"/>
        ${slashes.join('')}
        ${shield}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.16), accent, { filter: 'gameGlow', fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 3 })}
        <text x="${w / 2}" y="${h * 0.8}" font-family="Arial" font-size="14" fill="${accent}" text-anchor="middle" opacity="0.6" letter-spacing="5">TEAM</text>
      </svg>`;
    },
  },

  // ═══ 12. SPORTS ═══
  {
    name: 'sports',
    description: 'Athletic sports team badge',
    generate: (text, w, h) => {
      const combos = [
        { primary: '#1d428a', secondary: '#c8102e', bg: '#ffffff' },
        { primary: '#006847', secondary: '#ffd700', bg: '#ffffff' },
        { primary: '#ce1141', secondary: '#13274f', bg: '#ffffff' },
        { primary: '#552583', secondary: '#fdb927', bg: '#000000' },
      ];
      const c = randomFromArray(combos);
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sportsBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c.primary}"/><stop offset="100%" stop-color="${c.primary}dd"/></linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#sportsBg)"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.35}" fill="none" stroke="${c.secondary}" stroke-width="4"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.32}" fill="none" stroke="${c.bg}" stroke-width="1"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), c.bg, { fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 3 })}
        <text x="${w / 2}" y="${h * 0.28}" font-family="Arial" font-size="16" fill="${c.secondary}" text-anchor="middle" font-weight="bold" letter-spacing="4">★ ★ ★</text>
        <text x="${w / 2}" y="${h * 0.76}" font-family="Arial" font-size="13" fill="${c.secondary}" text-anchor="middle" letter-spacing="6">ATHLETICS</text>
      </svg>`;
    },
  },

  // ═══ 13. GEOMETRIC ═══
  {
    name: 'geometric',
    description: 'Modern geometric patterns',
    generate: (text, w, h) => {
      const shapes: string[] = [];
      const geoColors = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'];
      // Triangles and polygons
      for (let i = 0; i < 20; i++) {
        const cx = randomBetween(0, w);
        const cy = randomBetween(0, h);
        const size = randomBetween(20, 80);
        const color = randomFromArray(geoColors);
        const sides = randomBetween(3, 6);
        const points = Array.from({ length: sides }, (_, j) => {
          const angle = (j / sides) * Math.PI * 2 + randomFloat(-0.2, 0.2);
          return `${cx + Math.cos(angle) * size},${cy + Math.sin(angle) * size}`;
        }).join(' ');
        shapes.push(`<polygon points="${points}" fill="${color}" opacity="${randomFloat(0.1, 0.35)}" stroke="${color}" stroke-width="1" stroke-opacity="0.2"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="#fafafa"/>
        ${shapes.join('')}
        <rect x="${w * 0.1}" y="${h * 0.35}" width="${w * 0.8}" height="${h * 0.3}" fill="rgba(255,255,255,0.85)" rx="5"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), '#264653', { fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 14. CYBERPUNK ═══
  {
    name: 'cyberpunk',
    description: 'Cyberpunk 2077-style glitch',
    generate: (text, w, h) => {
      const glitches: string[] = [];
      // Glitch bars
      for (let i = 0; i < 15; i++) {
        const gy = randomBetween(0, h);
        const gw = randomBetween(50, w);
        const gx = randomBetween(0, w - gw);
        glitches.push(`<rect x="${gx}" y="${gy}" width="${gw}" height="${randomBetween(1, 4)}" fill="${randomFromArray(['#ff003c', '#00f0ff', '#fff700'])}" opacity="${randomFloat(0.1, 0.3)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${defsGlow('cyberGlow', '#ff003c', 6)}
          <clipPath id="glitchClip"><rect x="0" y="${h * 0.45}" width="${w}" height="${h * 0.05}"/></clipPath>
        </defs>
        <rect width="${w}" height="${h}" fill="#0a0014"/>
        <rect width="${w}" height="${h}" fill="rgba(255,0,60,0.03)"/>
        ${glitches.join('')}
        ${textSvg(text, w / 2 - 3, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#00f0ff', { fontFamily: 'Impact, sans-serif', letterSpacing: 3, opacity: 0.4 })}
        ${textSvg(text, w / 2 + 3, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#ff003c', { fontFamily: 'Impact, sans-serif', letterSpacing: 3, opacity: 0.4 })}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#ffffff', { filter: 'cyberGlow', fontFamily: 'Impact, sans-serif', letterSpacing: 3 })}
        <text x="${w / 2}" y="${h * 0.78}" font-family="Courier New" font-size="12" fill="#ff003c" text-anchor="middle" opacity="0.5">WAKE UP SAMURAI</text>
      </svg>`;
    },
  },

  // ═══ 15. VAPORWAVE ═══
  {
    name: 'vaporwave',
    description: 'Aesthetic vaporwave vibes',
    generate: (text, w, h) => {
      const columns: string[] = [];
      for (let i = 0; i < 5; i++) {
        const cx = randomBetween(w * 0.1, w * 0.9);
        columns.push(`<rect x="${cx}" y="${h * 0.5}" width="${randomBetween(20, 40)}" height="${h * 0.5}" fill="rgba(255,105,180,0.15)" rx="2"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vapBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff71ce"/><stop offset="50%" stop-color="#01cdfe"/><stop offset="100%" stop-color="#05ffa1"/></linearGradient>
          ${defsGlow('vapGlow', '#ff71ce', 8)}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#vapBg)"/>
        ${columns.join('')}
        <circle cx="${w / 2}" cy="${h * 0.45}" r="${Math.min(w, h) * 0.18}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        ${textSvg(text, w / 2, h * 0.4, Math.min(w / (text.length * 0.55), h * 0.18), '#ffffff', { filter: 'vapGlow', fontFamily: 'Impact, sans-serif', letterSpacing: 5 })}
        <text x="${w / 2}" y="${h * 0.62}" font-family="Courier New" font-size="16" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="3">A E S T H E T I C</text>
      </svg>`;
    },
  },

  // ═══ 16. OCEAN ═══
  {
    name: 'ocean',
    description: 'Deep ocean underwater theme',
    generate: (text, w, h) => {
      const bubbles: string[] = [];
      for (let i = 0; i < 30; i++) {
        const bx = randomBetween(10, w - 10);
        const by = randomBetween(10, h - 10);
        const br = randomBetween(3, 15);
        bubbles.push(`<circle cx="${bx}" cy="${by}" r="${br}" fill="none" stroke="rgba(255,255,255,${randomFloat(0.1, 0.3)})" stroke-width="1"/>`);
      }
      // Waves
      const waves: string[] = [];
      for (let i = 0; i < 3; i++) {
        const y = h * 0.75 + i * 15;
        waves.push(`<path d="M0 ${y} Q${w * 0.25} ${y - 15} ${w * 0.5} ${y} Q${w * 0.75} ${y + 15} ${w} ${y}" fill="none" stroke="rgba(255,255,255,${0.15 - i * 0.04})" stroke-width="2"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="oceanBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#006994"/><stop offset="50%" stop-color="#003d5b"/><stop offset="100%" stop-color="#001a2e"/></linearGradient>
          ${defsGlow('oceanGlow', '#00d4ff', 6)}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#oceanBg)"/>
        ${bubbles.join('')}
        ${waves.join('')}
        ${textSvg(text, w / 2, h * 0.45, Math.min(w / (text.length * 0.55), h * 0.2), '#00d4ff', { filter: 'oceanGlow', fontFamily: 'Georgia, serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 17. FIRE ═══
  {
    name: 'fire',
    description: 'Blazing fire and flames',
    generate: (text, w, h) => {
      const flames: string[] = [];
      const fireColors = ['#ff0000', '#ff4500', '#ff6600', '#ff8c00', '#ffd700', '#ffff00'];
      for (let i = 0; i < 25; i++) {
        const fx = randomBetween(w * 0.1, w * 0.9);
        const fy = randomBetween(h * 0.3, h);
        const fh = randomBetween(30, 120);
        const fw = randomBetween(10, 40);
        const color = randomFromArray(fireColors);
        flames.push(`<ellipse cx="${fx}" cy="${fy}" rx="${fw / 2}" ry="${fh / 2}" fill="${color}" opacity="${randomFloat(0.1, 0.4)}" transform="rotate(${randomBetween(-15, 15)} ${fx} ${fy})"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fireBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0000"/><stop offset="100%" stop-color="#330000"/></linearGradient>
          ${defsGlow('fireGlow', '#ff4500', 8)}
          <filter id="fireBlur"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#fireBg)"/>
        <g filter="url(#fireBlur)">${flames.join('')}</g>
        ${textSvg(text, w / 2, h * 0.4, Math.min(w / (text.length * 0.55), h * 0.2), '#ffd700', { filter: 'fireGlow', fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 4, stroke: '#ff4500', strokeWidth: 2 })}
      </svg>`;
    },
  },

  // ═══ 18. MARBLE ═══
  {
    name: 'marble',
    description: 'Luxurious marble texture',
    generate: (text, w, h) => {
      const veins: string[] = [];
      for (let i = 0; i < 8; i++) {
        const points = Array.from({ length: 5 }, () => `${randomBetween(0, w)},${randomBetween(0, h)}`).join(' ');
        veins.push(`<polyline points="${points}" fill="none" stroke="rgba(180,170,160,${randomFloat(0.1, 0.3)})" stroke-width="${randomFloat(0.5, 2)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="marbleTex"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="6" seed="${randomBetween(1, 100)}"/><feColorMatrix type="matrix" values="0 0 0 0 0.93 0 0 0 0 0.91 0 0 0 0 0.89 0 0 0 0.3 0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
          ${defsShadow('marbleShadow', 2, 2, 4, 'rgba(0,0,0,0.3)')}
        </defs>
        <rect width="${w}" height="${h}" fill="#f5f0eb"/>
        <rect width="${w}" height="${h}" filter="url(#marbleTex)"/>
        ${veins.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), '#2c2c2c', { filter: 'marbleShadow', fontFamily: 'Georgia, serif', letterSpacing: 5 })}
      </svg>`;
    },
  },

  // ═══ 19. TRIBAL ═══
  {
    name: 'tribal',
    description: 'Bold tribal patterns',
    generate: (text, w, h) => {
      const patterns: string[] = [];
      // Zigzag borders
      for (let row = 0; row < 2; row++) {
        const y = row === 0 ? h * 0.15 : h * 0.85;
        let zigzag = `M0 ${y}`;
        for (let x = 0; x <= w; x += 20) {
          zigzag += ` L${x} ${y + (x % 40 === 0 ? -10 : 10)}`;
        }
        patterns.push(`<path d="${zigzag}" fill="none" stroke="#c0392b" stroke-width="3"/>`);
      }
      // Dots
      for (let i = 0; i < 20; i++) {
        patterns.push(`<circle cx="${randomBetween(30, w - 30)}" cy="${randomBetween(h * 0.2, h * 0.8)}" r="${randomBetween(3, 8)}" fill="#c0392b" opacity="${randomFloat(0.1, 0.3)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="#1a1a1a"/>
        ${patterns.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#e74c3c', { fontFamily: 'Impact, sans-serif', letterSpacing: 5, stroke: '#c0392b', strokeWidth: 1 })}
      </svg>`;
    },
  },

  // ═══ 20. AFRICAN ═══
  {
    name: 'african',
    description: 'Bold African kente-inspired patterns',
    generate: (text, w, h) => {
      const kenteColors = ['#c0392b', '#f39c12', '#27ae60', '#2c3e50', '#8e44ad'];
      const strips: string[] = [];
      const stripW = 30;
      for (let x = 0; x < w; x += stripW) {
        const color = kenteColors[Math.floor(x / stripW) % kenteColors.length];
        strips.push(`<rect x="${x}" y="0" width="${stripW}" height="${h}" fill="${color}" opacity="0.15"/>`);
        // Cross pattern within strip
        for (let y = 0; y < h; y += stripW) {
          if (Math.random() > 0.5) {
            strips.push(`<rect x="${x + 5}" y="${y + 5}" width="${stripW - 10}" height="${stripW - 10}" fill="none" stroke="${color}" stroke-width="2" opacity="0.25"/>`);
          }
        }
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsShadow('afShadow', 2, 2, 3, '#000')}</defs>
        <rect width="${w}" height="${h}" fill="#2c3e50"/>
        ${strips.join('')}
        <rect x="${w * 0.08}" y="${h * 0.32}" width="${w * 0.84}" height="${h * 0.36}" fill="rgba(0,0,0,0.7)" rx="5"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#f39c12', { filter: 'afShadow', fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 21. LUXURY / GOLD ═══
  {
    name: 'luxury',
    description: 'Black and gold luxury brand',
    generate: (text, w, h) => {
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="luxGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#BF953F"/><stop offset="25%" stop-color="#FCF6BA"/><stop offset="50%" stop-color="#B38728"/><stop offset="75%" stop-color="#FBF5B7"/><stop offset="100%" stop-color="#AA771C"/></linearGradient>
          ${defsGlow('luxGlow', '#d4af37', 3)}
        </defs>
        <rect width="${w}" height="${h}" fill="#000000"/>
        <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="url(#luxGold)" stroke-width="2"/>
        <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="url(#luxGold)" stroke-width="0.5"/>
        <line x1="${w * 0.2}" y1="${h * 0.4}" x2="${w * 0.8}" y2="${h * 0.4}" stroke="url(#luxGold)" stroke-width="1" opacity="0.5"/>
        <line x1="${w * 0.2}" y1="${h * 0.6}" x2="${w * 0.8}" y2="${h * 0.6}" stroke="url(#luxGold)" stroke-width="1" opacity="0.5"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), 'url(#luxGold)', { filter: 'luxGlow', fontFamily: 'Georgia, serif', letterSpacing: 8 })}
        <text x="${w / 2}" y="${h * 0.25}" font-family="Georgia, serif" font-size="12" fill="url(#luxGold)" text-anchor="middle" letter-spacing="10" opacity="0.6">EXCLUSIVE</text>
      </svg>`;
    },
  },

  // ═══ 22. MUSIC ═══
  {
    name: 'music',
    description: 'Music notes and sound waves',
    generate: (text, w, h) => {
      const waves: string[] = [];
      // Sound wave bars
      const barCount = 40;
      for (let i = 0; i < barCount; i++) {
        const bx = (i / barCount) * w;
        const bh = randomBetween(10, h * 0.6);
        const by = h / 2 - bh / 2;
        waves.push(`<rect x="${bx}" y="${by}" width="${w / barCount - 2}" height="${bh}" fill="rgba(147,51,234,${randomFloat(0.1, 0.3)})" rx="2"/>`);
      }
      // Notes
      const notes = ['♪', '♫', '♬', '♩'];
      const noteElems: string[] = [];
      for (let i = 0; i < 8; i++) {
        noteElems.push(`<text x="${randomBetween(20, w - 20)}" y="${randomBetween(20, h - 20)}" font-size="${randomBetween(16, 40)}" fill="rgba(147,51,234,${randomFloat(0.15, 0.4)})">${randomFromArray(notes)}</text>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsGlow('musicGlow', '#9333ea', 5)}</defs>
        <rect width="${w}" height="${h}" fill="#0f0520"/>
        ${waves.join('')}
        ${noteElems.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#e879f9', { filter: 'musicGlow', fontFamily: 'Impact, sans-serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 23. ANIME ═══
  {
    name: 'anime',
    description: 'Anime/manga style with speed lines',
    generate: (text, w, h) => {
      const lines: string[] = [];
      // Speed/action lines from center
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const r1 = Math.min(w, h) * 0.2;
        const r2 = Math.min(w, h) * 0.55;
        const x1 = w / 2 + Math.cos(angle) * r1;
        const y1 = h / 2 + Math.sin(angle) * r1;
        const x2 = w / 2 + Math.cos(angle) * r2;
        const y2 = h / 2 + Math.sin(angle) * r2;
        lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="${randomFloat(0.5, 2)}" opacity="${randomFloat(0.1, 0.5)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsShadow('animeShadow', 3, 3, 0, '#000')}</defs>
        <rect width="${w}" height="${h}" fill="#fff5f5"/>
        ${lines.join('')}
        <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.35}" ry="${h * 0.22}" fill="rgba(255,255,255,0.9)"/>
        ${textSvg(text, w / 2 + 3, h / 2 + 3, Math.min(w / (text.length * 0.5), h * 0.22), '#000000', { fontFamily: 'Impact, sans-serif', letterSpacing: 2, opacity: 0.2 })}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.5), h * 0.22), '#e74c3c', { fontFamily: 'Impact, sans-serif', letterSpacing: 2, stroke: '#000', strokeWidth: 3 })}
      </svg>`;
    },
  },

  // ═══ 24. MATRIX ═══
  {
    name: 'matrix',
    description: 'The Matrix green rain',
    generate: (text, w, h) => {
      const chars: string[] = [];
      const matrixChars = 'ｱｲｳｴｵｶｷｸｹｺ01234567890ABCDEF';
      for (let col = 0; col < w; col += 18) {
        const streamLen = randomBetween(5, 20);
        const startY = randomBetween(-h * 0.5, h);
        for (let i = 0; i < streamLen; i++) {
          const ch = matrixChars[randomBetween(0, matrixChars.length - 1)];
          const cy = startY + i * 18;
          if (cy < 0 || cy > h) continue;
          const opacity = i === 0 ? 1 : Math.max(0.05, 1 - i / streamLen);
          const color = i === 0 ? '#ffffff' : '#00ff41';
          chars.push(`<text x="${col}" y="${cy}" font-family="monospace" font-size="14" fill="${color}" opacity="${opacity}">${ch}</text>`);
        }
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsGlow('matrixGlow', '#00ff41', 6)}</defs>
        <rect width="${w}" height="${h}" fill="#000000"/>
        ${chars.join('')}
        <rect x="${w * 0.05}" y="${h * 0.35}" width="${w * 0.9}" height="${h * 0.3}" fill="rgba(0,0,0,0.75)" rx="5"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), '#00ff41', { filter: 'matrixGlow', fontFamily: 'Courier New, monospace', letterSpacing: 5 })}
      </svg>`;
    },
  },

  // ═══ 25. HOLOGRAPHIC ═══
  {
    name: 'holographic',
    description: 'Iridescent holographic foil',
    generate: (text, w, h) => {
      const bands: string[] = [];
      const holoColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#ff6b9d'];
      for (let i = 0; i < 30; i++) {
        const y = (i / 30) * h;
        bands.push(`<rect x="0" y="${y}" width="${w}" height="${h / 30 + 2}" fill="${holoColors[i % holoColors.length]}" opacity="0.15"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff6b6b"/><stop offset="20%" stop-color="#ffd93d"/>
            <stop offset="40%" stop-color="#6bcb77"/><stop offset="60%" stop-color="#4d96ff"/>
            <stop offset="80%" stop-color="#9b59b6"/><stop offset="100%" stop-color="#ff6b9d"/>
          </linearGradient>
          ${defsGlow('holoGlow', '#fff', 4)}
        </defs>
        <rect width="${w}" height="${h}" fill="#e8e8e8"/>
        ${bands.join('')}
        <rect width="${w}" height="${h}" fill="rgba(255,255,255,0.2)"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), 'url(#holoGrad)', { filter: 'holoGlow', fontFamily: 'Arial, sans-serif', letterSpacing: 4, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1 })}
      </svg>`;
    },
  },

  // ═══ 26. AURORA ═══
  {
    name: 'aurora',
    description: 'Northern lights aurora borealis',
    generate: (text, w, h) => {
      const auroraWaves: string[] = [];
      const auroraColors = ['#00ff87', '#60efff', '#0061ff', '#ff00e5'];
      for (let i = 0; i < 8; i++) {
        const y = h * 0.2 + i * (h * 0.06);
        const cp1x = w * 0.25;
        const cp1y = y + randomBetween(-40, 40);
        const cp2x = w * 0.75;
        const cp2y = y + randomBetween(-40, 40);
        auroraWaves.push(`<path d="M0 ${y} C${cp1x} ${cp1y} ${cp2x} ${cp2y} ${w} ${y + randomBetween(-20, 20)}" fill="none" stroke="${auroraColors[i % auroraColors.length]}" stroke-width="${randomBetween(15, 40)}" opacity="${randomFloat(0.08, 0.2)}" stroke-linecap="round"/>`);
      }
      // Stars
      const stars: string[] = [];
      for (let i = 0; i < 60; i++) {
        stars.push(`<circle cx="${randomBetween(0, w)}" cy="${randomBetween(0, h * 0.6)}" r="${randomFloat(0.3, 1.5)}" fill="white" opacity="${randomFloat(0.3, 0.8)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${defsGlow('auroraGlow', '#00ff87', 8)}
          <filter id="auroraBlur"><feGaussianBlur stdDeviation="12"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="#0a0a2e"/>
        <g filter="url(#auroraBlur)">${auroraWaves.join('')}</g>
        ${stars.join('')}
        <rect x="0" y="${h * 0.75}" width="${w}" height="${h * 0.25}" fill="#0a0a1a"/>
        ${textSvg(text, w / 2, h * 0.55, Math.min(w / (text.length * 0.55), h * 0.2), '#ffffff', { filter: 'auroraGlow', fontFamily: 'Georgia, serif', letterSpacing: 5 })}
      </svg>`;
    },
  },

  // ═══ 27. FLORAL ═══
  {
    name: 'floral',
    description: 'Soft flowers and botanical elements',
    generate: (text, w, h) => {
      const flowers: string[] = [];
      const petalColors = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff'];
      for (let i = 0; i < 15; i++) {
        const fx = randomBetween(20, w - 20);
        const fy = randomBetween(20, h - 20);
        const size = randomBetween(15, 40);
        const color = randomFromArray(petalColors);
        const petalCount = randomBetween(5, 8);
        for (let p = 0; p < petalCount; p++) {
          const angle = (p / petalCount) * 360;
          flowers.push(`<ellipse cx="${fx}" cy="${fy - size * 0.6}" rx="${size * 0.25}" ry="${size * 0.5}" fill="${color}" opacity="${randomFloat(0.2, 0.5)}" transform="rotate(${angle} ${fx} ${fy})"/>`);
        }
        flowers.push(`<circle cx="${fx}" cy="${fy}" r="${size * 0.15}" fill="#ffd700" opacity="0.4"/>`);
      }
      // Leaves
      for (let i = 0; i < 10; i++) {
        const lx = randomBetween(0, w);
        const ly = randomBetween(0, h);
        flowers.push(`<ellipse cx="${lx}" cy="${ly}" rx="${randomBetween(8, 20)}" ry="${randomBetween(15, 35)}" fill="rgba(76,175,80,${randomFloat(0.1, 0.25)})" transform="rotate(${randomBetween(-60, 60)} ${lx} ${ly})"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="#fff9f9"/>
        ${flowers.join('')}
        <rect x="${w * 0.1}" y="${h * 0.35}" width="${w * 0.8}" height="${h * 0.3}" fill="rgba(255,255,255,0.8)" rx="10"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), '#5d4037', { fontFamily: 'Georgia, Times New Roman, serif', letterSpacing: 3 })}
      </svg>`;
    },
  },

  // ═══ 28. COSMIC ═══
  {
    name: 'cosmic',
    description: 'Cosmic nebula with swirling colors',
    generate: (text, w, h) => {
      const nebulae: string[] = [];
      const cosmicColors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#8b5cf6'];
      for (let i = 0; i < 10; i++) {
        const cx = randomBetween(w * 0.1, w * 0.9);
        const cy = randomBetween(h * 0.1, h * 0.9);
        nebulae.push(`<ellipse cx="${cx}" cy="${cy}" rx="${randomBetween(50, 200)}" ry="${randomBetween(30, 150)}" fill="${randomFromArray(cosmicColors)}" opacity="${randomFloat(0.08, 0.25)}" transform="rotate(${randomBetween(0, 360)} ${cx} ${cy})"/>`);
      }
      const stars: string[] = [];
      for (let i = 0; i < 100; i++) {
        stars.push(`<circle cx="${randomBetween(0, w)}" cy="${randomBetween(0, h)}" r="${randomFloat(0.3, 2)}" fill="white" opacity="${randomFloat(0.2, 0.9)}"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${defsGlow('cosmicGlow', '#a855f7', 10)}
          <filter id="cosmicBlur"><feGaussianBlur stdDeviation="20"/></filter>
        </defs>
        <rect width="${w}" height="${h}" fill="#0c0015"/>
        <g filter="url(#cosmicBlur)">${nebulae.join('')}</g>
        ${stars.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#ffffff', { filter: 'cosmicGlow', fontFamily: 'Georgia, serif', letterSpacing: 5 })}
      </svg>`;
    },
  },

  // ═══ 29. PIXEL ART ═══
  {
    name: 'pixel',
    description: '8-bit pixel art retro gaming',
    generate: (text, w, h) => {
      const pixels: string[] = [];
      const pixSize = 12;
      const pixelColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
      // Random pixel noise background
      for (let px = 0; px < w; px += pixSize) {
        for (let py = 0; py < h; py += pixSize) {
          if (Math.random() > 0.85) {
            pixels.push(`<rect x="${px}" y="${py}" width="${pixSize}" height="${pixSize}" fill="${randomFromArray(pixelColors)}" opacity="${randomFloat(0.1, 0.3)}"/>`);
          }
        }
      }
      // Border pixels
      for (let px = 0; px < w; px += pixSize) {
        pixels.push(`<rect x="${px}" y="0" width="${pixSize}" height="${pixSize}" fill="${randomFromArray(pixelColors)}" opacity="0.3"/>`);
        pixels.push(`<rect x="${px}" y="${h - pixSize}" width="${pixSize}" height="${pixSize}" fill="${randomFromArray(pixelColors)}" opacity="0.3"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="#1a1a2e"/>
        ${pixels.join('')}
        <rect x="${w * 0.08}" y="${h * 0.32}" width="${w * 0.84}" height="${h * 0.36}" fill="rgba(0,0,0,0.7)" rx="0"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.6), h * 0.18), '#2ecc71', { fontFamily: 'Courier New, monospace', letterSpacing: 4 })}
        <text x="${w / 2}" y="${h * 0.78}" font-family="Courier New" font-size="14" fill="#3498db" text-anchor="middle" opacity="0.5">PLAYER 1 READY</text>
      </svg>`;
    },
  },

  // ═══ 30. NATURE / FOREST ═══
  {
    name: 'nature',
    description: 'Green forest and leaves',
    generate: (text, w, h) => {
      const trees: string[] = [];
      const greens = ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784'];
      // Tree canopies
      for (let i = 0; i < 15; i++) {
        const tx = randomBetween(0, w);
        const ty = randomBetween(h * 0.1, h * 0.6);
        const size = randomBetween(40, 100);
        trees.push(`<ellipse cx="${tx}" cy="${ty}" rx="${size}" ry="${size * 0.7}" fill="${randomFromArray(greens)}" opacity="${randomFloat(0.15, 0.4)}"/>`);
      }
      // Light rays
      const rays: string[] = [];
      for (let i = 0; i < 5; i++) {
        const rx = randomBetween(w * 0.2, w * 0.8);
        rays.push(`<polygon points="${rx},0 ${rx - 30},${h} ${rx + 30},${h}" fill="rgba(255,255,200,0.04)"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="forestBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d1f0d"/><stop offset="100%" stop-color="#1a3a1a"/></linearGradient>
          ${defsShadow('forestShadow', 2, 2, 4, '#000')}
        </defs>
        <rect width="${w}" height="${h}" fill="url(#forestBg)"/>
        ${trees.join('')}
        ${rays.join('')}
        <rect x="${w * 0.08}" y="${h * 0.35}" width="${w * 0.84}" height="${h * 0.3}" fill="rgba(0,0,0,0.5)" rx="10"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), '#a5d6a7', { filter: 'forestShadow', fontFamily: 'Georgia, serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 31. ABSTRACT ═══
  {
    name: 'abstract',
    description: 'Modern abstract art composition',
    generate: (text, w, h) => {
      const elements: string[] = [];
      const abstractColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#ff8a5c', '#ea8685'];
      // Random shapes
      for (let i = 0; i < 20; i++) {
        const color = randomFromArray(abstractColors);
        const op = randomFloat(0.1, 0.4);
        if (Math.random() > 0.5) {
          elements.push(`<circle cx="${randomBetween(0, w)}" cy="${randomBetween(0, h)}" r="${randomBetween(20, 100)}" fill="${color}" opacity="${op}"/>`);
        } else {
          elements.push(`<rect x="${randomBetween(0, w)}" y="${randomBetween(0, h)}" width="${randomBetween(30, 150)}" height="${randomBetween(30, 150)}" fill="${color}" opacity="${op}" transform="rotate(${randomBetween(0, 45)} ${w / 2} ${h / 2})"/>`);
        }
      }
      // Lines
      for (let i = 0; i < 5; i++) {
        elements.push(`<line x1="${randomBetween(0, w)}" y1="${randomBetween(0, h)}" x2="${randomBetween(0, w)}" y2="${randomBetween(0, h)}" stroke="${randomFromArray(abstractColors)}" stroke-width="${randomBetween(2, 5)}" opacity="0.3"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>${defsShadow('absShadow', 2, 2, 5, 'rgba(0,0,0,0.4)')}</defs>
        <rect width="${w}" height="${h}" fill="#fefefe"/>
        ${elements.join('')}
        <rect x="${w * 0.1}" y="${h * 0.35}" width="${w * 0.8}" height="${h * 0.3}" fill="rgba(255,255,255,0.85)" rx="5"/>
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.18), '#2c3e50', { filter: 'absShadow', fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: 4 })}
      </svg>`;
    },
  },

  // ═══ 32. DARK MOODY ═══
  {
    name: 'dark',
    description: 'Dark moody atmospheric',
    generate: (text, w, h) => {
      const fog: string[] = [];
      for (let i = 0; i < 6; i++) {
        fog.push(`<ellipse cx="${randomBetween(0, w)}" cy="${randomBetween(h * 0.3, h)}" rx="${randomBetween(100, 300)}" ry="${randomBetween(30, 80)}" fill="rgba(50,50,70,${randomFloat(0.1, 0.25)})"/>`);
      }
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="darkSpot" cx="50%" cy="40%"><stop offset="0%" stop-color="#1a1a2e" stop-opacity="0.5"/><stop offset="100%" stop-color="#0a0a0a"/></radialGradient>
          ${defsGlow('darkGlow', '#8e8e8e', 5)}
        </defs>
        <rect width="${w}" height="${h}" fill="#0a0a0a"/>
        <rect width="${w}" height="${h}" fill="url(#darkSpot)"/>
        ${fog.join('')}
        ${textSvg(text, w / 2, h / 2, Math.min(w / (text.length * 0.55), h * 0.2), '#c0c0c0', { filter: 'darkGlow', fontFamily: 'Georgia, serif', letterSpacing: 5 })}
      </svg>`;
    },
  },
];

// ─── Style Index ─────────────────────────────────────────────────────────────

const STYLE_MAP = new Map<string, LogoStyle>();
for (const style of STYLES) {
  STYLE_MAP.set(style.name, style);
}

const STYLE_LIST = STYLES.map(s => s.name).join(', ');

// ─── Main Handler ────────────────────────────────────────────────────────────

async function handleLogo(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    const styleGroups = [
      { label: 'TECH & DIGITAL', styles: 'techy, neon, cyberpunk, matrix, pixel, holographic' },
      { label: 'NATURE & ELEMENTS', styles: 'galaxy, ocean, fire, aurora, nature, floral, cosmic' },
      { label: 'ART & CREATIVE', styles: 'watercolor, graffiti, abstract, anime, vaporwave' },
      { label: 'CLASSIC & ELEGANT', styles: 'minimalist, vintage, elegant, luxury, marble' },
      { label: 'CULTURE & SPORT', styles: 'tribal, african, sports, gaming, music' },
      { label: 'COLOR & MOOD', styles: 'gradient, retro, geometric, dark' },
    ];

    let helpMsg = `*LOGO GENERATOR*\n\n`;
    helpMsg += `Create stunning logos with 32 unique styles!\n\n`;
    helpMsg += `*Usage:*\n`;
    helpMsg += `!logo [style] [text]\n`;
    helpMsg += `!logo random [text]\n`;
    helpMsg += `!logo [text] _(random style)_\n\n`;
    helpMsg += `*Styles:*\n`;
    for (const group of styleGroups) {
      helpMsg += `\n*${group.label}*\n${group.styles}\n`;
    }
    helpMsg += `\n*Examples:*\n`;
    helpMsg += `!logo neon MyBrand\n`;
    helpMsg += `!logo galaxy STARLIGHT\n`;
    helpMsg += `!logo cyberpunk NEXUS\n`;
    helpMsg += `!logo african UBUNTU\n`;
    helpMsg += `!logo random CoolName`;

    await sendReply(context.chatJid, helpMsg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Parse style and text
  let styleName = args[0].toLowerCase();
  let logoText: string;

  if (styleName === 'random') {
    styleName = randomFromArray(STYLES).name;
    logoText = args.slice(1).join(' ') || context.pushName || 'LOGO';
  } else if (STYLE_MAP.has(styleName)) {
    logoText = args.slice(1).join(' ') || context.pushName || 'LOGO';
  } else {
    // No recognized style — use full args as text, random style
    styleName = randomFromArray(STYLES).name;
    logoText = args.join(' ');
  }

  const style = STYLE_MAP.get(styleName);
  if (!style) {
    await sendReply(context.chatJid, `Unknown style "${styleName}".\n\nAvailable: ${STYLE_LIST}\n\nOr use: !logo random [text]`, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Limit text length
  if (logoText.length > 30) {
    logoText = logoText.slice(0, 30);
  }

  try {
    // Generate at high resolution
    const width = 1200;
    const height = 675;
    const svg = style.generate(logoText.toUpperCase(), width, height);

    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 95 })
      .toBuffer();

    await sendReply(
      context.chatJid,
      {
        image: pngBuffer,
        caption: `*${logoText.toUpperCase()}*\nStyle: ${style.name} — ${style.description}\n\n_Generated by BotWave Logo Generator_\n_Try: !logo for all ${STYLES.length} styles_`,
      },
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error) {
    console.error('[LOGO] Error generating logo:', error);
    await sendReply(context.chatJid, 'Failed to generate logo. Try a different style or shorter text.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Wallpaper Generator (bonus — high-res backgrounds without text) ─────────

async function handleLogoWallpaper(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      `*WALLPAPER GENERATOR*\n\nGenerate beautiful wallpapers!\n\n!wallpaper [style]\n\nStyles: ${STYLE_LIST}\n\nExample: !wallpaper galaxy`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  const styleName = args[0].toLowerCase() === 'random'
    ? randomFromArray(STYLES).name
    : args[0].toLowerCase();

  const style = STYLE_MAP.get(styleName);
  if (!style) {
    await sendReply(context.chatJid, `Unknown style. Try: ${STYLE_LIST}`, sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    // Phone wallpaper resolution
    const width = 1080;
    const height = 1920;
    // Generate with minimal text
    const svg = style.generate('', width, height);

    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 95 })
      .toBuffer();

    await sendReply(
      context.chatJid,
      {
        image: pngBuffer,
        caption: `*${style.name.toUpperCase()} WALLPAPER*\n${style.description}\n\n_Generated by BotWave_`,
      },
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error) {
    console.error('[WALLPAPER] Error:', error);
    await sendReply(context.chatJid, 'Failed to generate wallpaper.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Register Commands ───────────────────────────────────────────────────────

registerCommand({
  name: 'logo',
  aliases: ['logo', 'logogen', 'logocreate', 'logomaker'],
  category: 'creative',
  description: 'Generate logos with 32 styles',
  execute: (ctx, args, sock) => handleLogo(ctx, args, sock),
});

registerCommand({
  name: 'wallpaper',
  aliases: ['wallpaper', 'wp', 'wallgen'],
  category: 'creative',
  description: 'Generate wallpapers',
  execute: (ctx, args, sock) => handleLogoWallpaper(ctx, args, sock),
});
