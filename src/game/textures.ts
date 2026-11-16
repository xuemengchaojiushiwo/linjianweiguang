import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createMossGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3f6e42';
  ctx.fillRect(0, 0, 512, 512);

  // Soft mossy patches
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 10 + Math.random() * 34;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const shade = Math.random() > 0.5 ? 'rgba(92, 146, 76, 0.25)' : 'rgba(42, 82, 48, 0.28)';
    grad.addColorStop(0, shade);
    grad.addColorStop(1, 'rgba(63, 110, 66, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blades & clover specks
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = Math.random() > 0.45 ? 'rgba(130, 184, 96, 0.38)' : 'rgba(38, 70, 42, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 5 - Math.random() * 5);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, 14, 14, maxAnisotropy);
}

export function createCobbleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c6659';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 6;
  const rows = 6;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = r % 2 === 0 ? 0 : w * 0.45;
      const cx = ((c * w + offsetX) % 512) + 4;
      const cy = r * h + 4;
      const bw = w - 10;
      const bh = h - 10;
      const tone = 135 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${tone}, ${tone + 4}, ${tone - 5})`;
      ctx.beginPath();
      ctx.roundRect(cx, cy, bw, bh, 14);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 240, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  return finalizeColorTexture(canvas, 3, 3, maxAnisotropy);
}

export function createWoodPlankTexture(maxAnisotropy: number, warmTint = '#8a5c3b'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = warmTint;
  ctx.fillRect(0, 0, 512, 512);

  const plankCount = 8;
  const plankH = 512 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 235, 200, 0.06)' : 'rgba(40, 20, 10, 0.08)';
    ctx.fillRect(0, y, 512, plankH);

    // Wood grain lines
    for (let g = 0; g < 18; g++) {
      const gy = y + Math.random() * plankH;
      ctx.strokeStyle = 'rgba(45, 22, 10, 0.14)';
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + (Math.random() - 0.5) * 6, 340, gy + (Math.random() - 0.5) * 6, 512, gy);
      ctx.stroke();
    }

    // Plank seam
    ctx.fillStyle = 'rgba(26, 13, 6, 0.45)';
    ctx.fillRect(0, y, 512, 3);
  }

  return finalizeColorTexture(canvas, 3, 3, maxAnisotropy);
}

export function createBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#533b2b';
  ctx.fillRect(0, 0, 256, 512);

  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 512;
    const len = 30 + Math.random() * 70;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(32, 20, 14, 0.45)' : 'rgba(105, 82, 58, 0.3)';
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 8, y + len);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, 2, 2, maxAnisotropy);
}

export function createMushroomCapTexture(maxAnisotropy: number, baseColor = '#d65a47'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle rim gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,230,200,0.2)');
  grad.addColorStop(1, 'rgba(40,10,10,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Cream spots
  for (let i = 0; i < 42; i++) {
    const x = Math.random() * 512;
    const y = 30 + Math.random() * 190;
    const rx = 8 + Math.random() * 18;
    const ry = rx * 0.72;
    ctx.fillStyle = 'rgba(253, 244, 224, 0.88)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeColorTexture(canvas, 1, 1, maxAnisotropy);
}

export function createStarRugTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2f4b47';
  ctx.fillRect(0, 0, 512, 512);

  // Concentric woven rings
  const cx = 256;
  const cy = 256;
  ctx.strokeStyle = '#d9b56c';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#8cb99f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 185, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point woodland star
  ctx.fillStyle = 'rgba(227, 193, 118, 0.8)';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? 130 : 52;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  return finalizeColorTexture(canvas, 1, 1, maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 16, 12, 0.72)');
  grad.addColorStop(0.55, 'rgba(8, 16, 12, 0.3)');
  grad.addColorStop(1, 'rgba(8, 16, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1)');
  grad.addColorStop(0.28, 'rgba(210, 255, 210, 0.75)');
  grad.addColorStop(1, 'rgba(120, 240, 180, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
