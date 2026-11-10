// Destellos: estrellitas de cuatro puntas como las de los renders de los 90.
import * as THREE from 'three';
import { canvasTexture } from './util.js';

let _star;
export function starTexture() {
  if (_star) return _star;
  _star = canvasTexture(128, 128, (g, w) => {
    const c = w / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c * 0.45);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.3, 'rgba(255,255,255,.45)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
    g.fillStyle = '#fff';
    g.shadowColor = '#fff'; g.shadowBlur = 5;
    const star = (L, k, rot, alpha) => {
      g.save(); g.translate(c, c); g.rotate(rot); g.globalAlpha = alpha;
      g.beginPath();
      g.moveTo(0, -L);
      g.quadraticCurveTo(k, -k, L, 0);
      g.quadraticCurveTo(k, k, 0, L);
      g.quadraticCurveTo(-k, k, -L, 0);
      g.quadraticCurveTo(-k, -k, 0, -L);
      g.fill(); g.restore();
    };
    star(60, 5, 0, 1);
    star(26, 3, Math.PI / 4, 0.6);
  });
  return _star;
}

export function starSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: starTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  s.scale.setScalar(size);
  return s;
}

const COLORS = ['#fff6e0', '#ffd9ef', '#e4d6ff', '#ffe2b8'];

/** Un montón de destellos que salen, flotan hacia arriba y se apagan. */
export function createSparkles(max = 120) {
  const group = new THREE.Group();
  const ps = [];
  for (let i = 0; i < max; i++) {
    const s = starSprite(COLORS[i % COLORS.length], 0.05, 0);
    s.visible = false;
    s.renderOrder = 5;
    group.add(s);
    ps.push({ s, life: 0, max: 1, v: new THREE.Vector3(), size: 0.05, phase: Math.random() * 10 });
  }
  let next = 0;
  const rnd = () => Math.random() * 2 - 1;

  return {
    object: group,
    emit(pos, n = 1, { spread = 0.25, speed = 0.35, up = 0.25, life = 1.1, size = 0.07 } = {}) {
      for (let k = 0; k < n; k++) {
        const p = ps[next]; next = (next + 1) % max;
        p.s.position.set(pos.x + rnd() * spread, pos.y + rnd() * spread, pos.z + rnd() * spread);
        p.v.set(rnd() * speed, up + Math.random() * speed * 0.6, rnd() * speed);
        p.life = p.max = life * (0.6 + Math.random() * 0.8);
        p.size = size * (0.5 + Math.random() * 0.9);
        p.s.material.rotation = Math.random() * 0.6 - 0.3;
        p.s.visible = true;
      }
    },
    update(t, _cam, dt) {
      for (const p of ps) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.s.visible = false; continue; }
        p.s.position.addScaledVector(p.v, dt);
        p.v.multiplyScalar(1 - Math.min(1, dt * 2));
        const k = p.life / p.max;
        const tw = 0.65 + 0.35 * Math.sin(t * 18 + p.phase);
        p.s.scale.setScalar(p.size * Math.sqrt(Math.sin(Math.PI * k)) * tw);
        p.s.material.opacity = Math.min(1, k * 2.5);
      }
    },
  };
}
