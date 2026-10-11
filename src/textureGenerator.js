import * as THREE from 'three';

/**
 * Procedural texture generator to ensure 100% reliable, zero-latency,
 * self-contained textures with rich visuals and no external CDN dependencies.
 */

// Cache textures to avoid regenerating identical canvases
const textureCache = new Map();

/**
 * Creates ancient temple stone path texture with stone slabs, cracks and subtle moss
 */
export function createStoneTexture() {
  if (textureCache.has('stone')) return textureCache.get('stone');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base stone gray-brown tone
  ctx.fillStyle = '#4a443b';
  ctx.fillRect(0, 0, 512, 512);

  // Noise & stone flecks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 3 + 1;
    const lightness = Math.floor(Math.random() * 60 + 50);
    ctx.fillStyle = `rgba(${lightness}, ${lightness - 5}, ${lightness - 15}, 0.25)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Carved stone slab grid
  const cols = 4;
  const rows = 4;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  ctx.lineWidth = 6;
  for (let r = 0; r <= rows; r++) {
    ctx.strokeStyle = '#23201b';
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(512, r * cellH);
    ctx.stroke();

    ctx.strokeStyle = '#686055';
    ctx.beginPath();
    ctx.moveTo(0, r * cellH + 3);
    ctx.lineTo(512, r * cellH + 3);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    const offset = (c % 2 === 0) ? 0 : cellH / 2;
    ctx.strokeStyle = '#23201b';
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, 512);
    ctx.stroke();

    ctx.strokeStyle = '#686055';
    ctx.beginPath();
    ctx.moveTo(c * cellW + 3, 0);
    ctx.lineTo(c * cellW + 3, 512);
    ctx.stroke();
  }

  // Moss patches in corners & cracks
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(${Math.floor(Math.random() * 30 + 40)}, ${Math.floor(Math.random() * 50 + 90)}, ${Math.floor(Math.random() * 20 + 30)}, 0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 12 + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('stone', texture);
  return texture;
}

/**
 * Creates ancient temple wall texture with carved ancient Aztec/Mayan patterns
 */
export function createWallTexture() {
  if (textureCache.has('wall')) return textureCache.get('wall');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep stone background
  ctx.fillStyle = '#3a342c';
  ctx.fillRect(0, 0, 512, 512);

  // Stone grain
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(${Math.random() * 40 + 70}, ${Math.random() * 35 + 65}, ${Math.random() * 30 + 55}, 0.2)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Carved temple decorative glyphs / stepped borders
  ctx.strokeStyle = '#5a5245';
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, 452, 452);

  ctx.strokeStyle = '#221f1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 432, 432);

  // Center sun / relic medallion carving
  ctx.strokeStyle = '#6e6352';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 256, 120, 0, Math.PI * 2);
  ctx.stroke();

  // Stepped geometric corners
  for (let c = 0; c < 4; c++) {
    const angle = (c * Math.PI) / 2;
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(angle);
    ctx.fillStyle = '#26221c';
    ctx.fillRect(100, 100, 40, 40);
    ctx.fillStyle = '#5c5243';
    ctx.fillRect(110, 110, 20, 20);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('wall', texture);
  return texture;
}

/**
 * Creates metallic gold coin face texture with embossed ancient skull/idol
 */
export function createCoinTexture() {
  if (textureCache.has('coin')) return textureCache.get('coin');

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Radial metallic gold gradient
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, '#fff494');
  grad.addColorStop(0.5, '#f5c518');
  grad.addColorStop(0.85, '#c99208');
  grad.addColorStop(1, '#825600');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Embossed border
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 105, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#8a5c00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.stroke();

  // Center idol mask embossing
  ctx.fillStyle = '#b57e05';
  // Eyes
  ctx.beginPath();
  ctx.ellipse(100, 110, 14, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(156, 110, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose and mouth
  ctx.fillRect(122, 115, 12, 28);
  ctx.fillRect(105, 155, 46, 10);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('coin', texture);
  return texture;
}

/**
 * Creates glowing volcanic lava texture for bottomless pits & lava hazards
 */
export function createLavaTexture() {
  if (textureCache.has('lava')) return textureCache.get('lava');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark obsidian crust
  ctx.fillStyle = '#1f0d05';
  ctx.fillRect(0, 0, 512, 512);

  // Fiery glowing magma veins
  for (let i = 0; i < 40; i++) {
    const x1 = Math.random() * 512;
    const y1 = Math.random() * 512;
    const x2 = x1 + (Math.random() - 0.5) * 200;
    const y2 = y1 + (Math.random() - 0.5) * 200;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#ff3300');
    grad.addColorStop(0.5, '#ffaa00');
    grad.addColorStop(1, '#ffeedd');

    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.random() * 14 + 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(
      x1 + Math.random() * 60 - 30, y1 + Math.random() * 60 - 30,
      x2 + Math.random() * 60 - 30, y2 + Math.random() * 60 - 30,
      x2, y2
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('lava', texture);
  return texture;
}

/**
 * Creates soft glowing particle disc texture for sparks, flames, and stars
 */
export function createParticleTexture() {
  if (textureCache.has('particle')) return textureCache.get('particle');

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 220, 120, 0.8)');
  grad.addColorStop(0.7, 'rgba(255, 120, 30, 0.3)');
  grad.addColorStop(1, 'rgba(255, 60, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('particle', texture);
  return texture;
}
