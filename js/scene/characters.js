// Luz y María: sentadas de espaldas mirando el mar. Al elegir una, se levanta,
// sale de la silla, se gira hacia la cámara y saluda.
// Estilo: personajes de videojuego de principios de los 2000 (formas suaves,
// texturas pintadas a mano, piel con un poco de brillo).
import * as THREE from 'three';
import { canvasTexture, rand, glowSprite } from './util.js';
import { groundHeight } from './beach.js';
import { CHAIR_X, CHAIR_Z } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const phong = (c, extra = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: 14, specular: 0x2a1c18, ...extra });
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

const SKIN = '#efc8b0';
const LIFT = 0.36;            // cuánto sube la cadera al ponerse de pie
const DURATION = 2.6;         // segundos de levantarse → girarse → venir

// ── Texturas pintadas ────────────────────────────────────────────

// pliegues verticales suaves, como la ropa ancha de los juegos de PS2
function folds(g, w, h, n, alpha, R) {
  for (let i = 0; i < n; i++) {
    const x = R() * w, wid = 3 + R() * 10;
    const gr = g.createLinearGradient(x - wid, 0, x + wid, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, `rgba(0,0,0,${alpha * (0.5 + R())})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - wid, 0, wid * 2, h);
  }
}

const plaid = (rx = 1, ry = 1) => {
  const t = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#5e665a'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(30,36,30,.6)'; g.fillRect(0, 20, 64, 12); g.fillRect(20, 0, 12, 64);
    g.fillStyle = 'rgba(30,36,30,.35)'; g.fillRect(0, 50, 64, 4); g.fillRect(50, 0, 4, 64);
    g.fillStyle = 'rgba(195,200,185,.35)'; g.fillRect(0, 44, 64, 2); g.fillRect(44, 0, 2, 64);
  }, { repeat: true });
  t.repeat.set(rx, ry);
  return t;
};

const camo = () => {
  const t = canvasTexture(256, 256, (g, w, h) => {
    const R = rand(5);
    g.fillStyle = '#7d6a44'; g.fillRect(0, 0, w, h);
    for (const c of ['#cfb27c', '#5a3a1e', '#1c140e', '#5f5a30', '#cfb27c', '#4a3018']) {
      g.fillStyle = c;
      for (let i = 0; i < 9; i++) {
        // manchas alargadas e irregulares (woodland), que también cruzan el borde
        const x = R() * w, y = R() * h, sx = 22 + R() * 26, sy = 7 + R() * 9, rot = (R() - 0.5) * 1.2;
        for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          g.save(); g.translate(x + ox, y + oy); g.rotate(rot);
          g.beginPath();
          for (let k = 0; k <= 14; k++) {
            const a = (k / 14) * Math.PI * 2, rr = 0.55 + R() * 0.6;
            const px = Math.cos(a) * sx * rr, py = Math.sin(a) * sy * rr + Math.sin(a * 3) * 4;
            k ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.fill(); g.restore();
        }
      }
    }
    folds(g, w, h, 9, 0.12, R);
  }, { repeat: true });
  t.repeat.set(2, 2);
  return t;
};

// piel con tatuajes de línea fina (como los de María)
const tattooArm = () => canvasTexture(128, 128, (g, w, h) => {
  const R = rand(9);
  g.fillStyle = SKIN; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(40,28,36,.75)'; g.fillStyle = 'rgba(40,28,36,.75)'; g.lineWidth = 1.4;
  const heart = (x, y, s) => {
    g.beginPath(); g.moveTo(x, y + s);
    g.bezierCurveTo(x - s * 1.4, y, x - s * 0.8, y - s, x, y - s * 0.3);
    g.bezierCurveTo(x + s * 0.8, y - s, x + s * 1.4, y, x, y + s); g.stroke();
  };
  // (la textura se usa en brazo y antebrazo; v=1 arriba = hombro / codo)
  // dibujo de flor-insecto en lo alto del brazo, por fuera
  g.lineWidth = 1.6;
  g.save(); g.translate(30, 22);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(0, 0, 9, 3.5, i * Math.PI / 5, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-14, 6); g.quadraticCurveTo(-4, 14, 12, 10); g.stroke();
  g.beginPath(); g.moveTo(10, -10); g.lineTo(18, -16); g.moveTo(12, -6); g.lineTo(20, -8); g.stroke();
  g.restore();
  heart(32, 66, 6);                                       // corazón pequeño
  // mancha sombreada (blackwork) en el antebrazo
  const blot = g.createRadialGradient(86, 96, 2, 86, 96, 16);
  blot.addColorStop(0, 'rgba(45,50,60,.75)'); blot.addColorStop(1, 'rgba(45,50,60,0)');
  g.fillStyle = blot; g.fillRect(66, 76, 40, 40);
  g.fillStyle = 'rgba(40,28,36,.75)';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(78 + R() * 18, 88 + R() * 16, 0.8, 0, Math.PI * 2); g.fill(); }
  // símbolos pequeños por dentro
  g.beginPath(); g.arc(100, 40, 4, 0, Math.PI * 2); g.moveTo(100, 44); g.lineTo(100, 52); g.moveTo(96, 48); g.lineTo(104, 48); g.stroke();
  g.beginPath(); g.moveTo(110, 66); g.lineTo(116, 60); g.lineTo(122, 66); g.lineTo(116, 72); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(56, 112); g.lineTo(62, 104); g.lineTo(68, 112); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(10 + R() * 110, 10 + R() * 100, 1.2, 0, Math.PI * 2); g.fill(); }
});

// camiseta de tirantes blanca (María). Lathe: u da la vuelta (0,5 = delante), v sube.
const PINK = '#f5d5dd';
const tankTex = () => canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = PINK; g.fillRect(0, 0, w, h);
  folds(g, w, h, 8, 0.05, rand(3));
  // canalé
  g.fillStyle = 'rgba(0,0,0,.04)';
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.5, h);
  // hombros y escote al aire, con los tirantes
  g.fillStyle = SKIN;
  g.fillRect(0, 0, w, h * 0.1);
  g.beginPath(); g.ellipse(w * 0.5, 0, w * 0.085, h * 0.25, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, 0, w * 0.06, h * 0.16, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(w, 0, w * 0.06, h * 0.16, 0, 0, Math.PI * 2); g.fill();
  for (const u of [0.25, 0.75]) { g.beginPath(); g.ellipse(w * u, 0, w * 0.13, h * 0.22, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = PINK;
  for (const u of [0.36, 0.64, 0.12, 0.88]) g.fillRect(w * u - 5, 0, 10, h * 0.2);
  // tatuaje «tous les jours» bajo la clavícula
  g.fillStyle = 'rgba(40,28,36,.8)';
  g.font = 'italic 7px Georgia, serif'; g.textAlign = 'center';
  g.fillText('tous', w * 0.5, h * 0.105); g.fillText('les jours', w * 0.5, h * 0.14);
  // collar fino
  g.strokeStyle = 'rgba(220,170,180,.9)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(w * 0.47, h * 0.06); g.lineTo(w * 0.5, h * 0.17); g.lineTo(w * 0.53, h * 0.06); g.stroke();
});

// camiseta ringer blanca con ribete oscuro y letras en cursiva (Luz)
const ringerTex = () => canvasTexture(512, 256, (g, w, h) => {
  g.fillStyle = '#f6f1e8'; g.fillRect(0, 0, w, h);
  folds(g, w, h, 10, 0.05, rand(4));
  g.fillStyle = SKIN; g.fillRect(0, 0, w, h * 0.07);
  g.beginPath(); g.ellipse(w * 0.5, h * 0.04, w * 0.06, h * 0.1, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3e2c28'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(0, h * 0.075); g.lineTo(w * 0.44, h * 0.075);
  g.ellipse(w * 0.5, h * 0.04, w * 0.06, h * 0.105, 0, Math.PI, 0, true);
  g.moveTo(w * 0.56, h * 0.075); g.lineTo(w, h * 0.075); g.stroke();
  g.fillStyle = '#1f1a2a';
  g.font = 'italic 600 30px "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive';
  g.textAlign = 'center';
  g.fillText('Laagam', w * 0.5, h * 0.36);
});

// espinilla: rodilla de piel y calcetín negro alto
const sockTex = () => canvasTexture(32, 64, (g, w, h) => {
  g.fillStyle = '#16141a'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.fillStyle = SKIN; g.fillRect(0, 0, w, h * 0.28);
});

const stripedShoe = () => canvasTexture(64, 64, (g, w, h) => {
  g.fillStyle = '#121014'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2efe8';
  for (const cx of [w * 0.25, w * 0.75]) for (let i = 0; i < 3; i++) {
    g.save(); g.translate(cx - 7 + i * 7, h * 0.5); g.rotate(-0.45); g.fillRect(-2, -14, 4, 28); g.restore();
  }
});

const hairStrands = (base, light, dark, seed) => canvasTexture(128, 128, (g, w, h) => {
  const R = rand(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = R() < 0.5 ? light : dark;
    g.globalAlpha = 0.25 + R() * 0.4;
    g.lineWidth = 0.6 + R() * 1.4;
    const x = R() * w;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (R() - 0.5) * 8, h * 0.3, x + (R() - 0.5) * 8, h * 0.7, x + (R() - 0.5) * 6, h); g.stroke();
  }
  g.globalAlpha = 1;
}, { repeat: true });

// ── Cara pintada (ojos con iris, cejas, nariz, labios) ──
const FACE = { phi0: Math.PI + 0.55, phiLen: Math.PI - 1.1, th0: 0.3 * Math.PI, thLen: 0.48 * Math.PI };
function faceTexture({ brows, lips, iris, lashes }) {
  const W = 512, H = Math.round(W * FACE.thLen / FACE.phiLen);
  const pxRad = W / FACE.phiLen;
  const yAt = th => (th - FACE.th0) * pxRad;
  return canvasTexture(W, H, (g) => {
    const cx = W / 2;
    const eyeY = yAt(Math.PI / 2 + 0.02);
    // sombras suaves: cuencas, mejillas y debajo de la nariz
    const shade = (x, y, r, a, col = '120,60,50') => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const sx of [-1, 1]) {
      const x = cx + sx * 0.36 * pxRad;
      shade(x, eyeY - 4, 34, 0.18);                                  // cuenca
      shade(x + sx * 18, yAt(Math.PI / 2 + 0.36), 34, 0.16, '225,110,110'); // mejilla
      // ojo almendrado
      g.save(); g.translate(x, eyeY);
      g.beginPath();
      g.moveTo(-24, 2); g.quadraticCurveTo(-4, -16, 24 * 1, -2); g.quadraticCurveTo(4, 12, -24, 2);
      g.closePath();
      g.fillStyle = '#f3ece6'; g.fill();
      g.clip();
      g.fillStyle = iris; g.beginPath(); g.arc(sx * 1, -1, 10.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#120a08'; g.beginPath(); g.arc(sx * 1, -1, 4.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(sx * 1 + 4, -5, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(60,30,30,.35)'; g.fillRect(-26, -16, 52, 7);     // sombra del párpado
      g.restore();
      // línea de pestañas y párpado
      g.save(); g.translate(x, eyeY);
      g.strokeStyle = '#1a0f0e'; g.lineWidth = lashes; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-25, 2); g.quadraticCurveTo(-4, -17, 25, -3); g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(110,60,50,.6)';
      g.beginPath(); g.moveTo(-22, -9); g.quadraticCurveTo(-2, -24, 22, -10); g.stroke();
      g.beginPath(); g.moveTo(-20, 5); g.quadraticCurveTo(2, 12, 22, 0); g.stroke();
      g.restore();
      // ceja
      g.save(); g.translate(x, eyeY - 30);
      g.strokeStyle = brows; g.lineCap = 'round'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(-sx * 24, 5); g.quadraticCurveTo(sx * 2, -7, sx * 26, 1); g.stroke();
      g.restore();
    }
    // nariz: sombras laterales y aletas
    const ny = yAt(Math.PI / 2 + 0.3);
    shade(cx - 13, ny - 22, 16, 0.18); shade(cx + 13, ny - 22, 16, 0.18);
    g.fillStyle = 'rgba(110,50,45,.55)';
    g.beginPath(); g.ellipse(cx - 8, ny, 4, 2.5, 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 8, ny, 4, 2.5, -0.3, 0, Math.PI * 2); g.fill();
    // labios
    const my = yAt(Math.PI / 2 + 0.5);
    g.fillStyle = lips;
    g.beginPath();
    g.moveTo(cx - 25, my);
    g.quadraticCurveTo(cx - 12, my - 11, cx, my - 6);
    g.quadraticCurveTo(cx + 12, my - 11, cx + 25, my);
    g.quadraticCurveTo(cx, my + 15, cx - 25, my);
    g.fill();
    g.strokeStyle = 'rgba(70,20,25,.6)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - 24, my); g.quadraticCurveTo(cx, my + 2, cx + 24, my); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.beginPath(); g.ellipse(cx + 5, my + 5, 6, 2, 0, 0, Math.PI * 2); g.fill();
    shade(cx, my + 24, 16, 0.12);   // hoyuelo de la barbilla
  });
}

// Cabeza: esfera con mandíbula y barbilla
function shapeHead(geo) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = v.length() || 1, ny = v.y / r;
    const jaw = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
    v.x *= 0.9 * jaw;
    v.z *= (ny < 0 ? 1 - 0.12 * -ny : 1) * (v.z > 0 ? 1.06 : 1);     // nuca más llena
    v.y *= 1.12;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Huesos: cápsulas que se estrechan, recolocadas en cada fotograma ──
const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
function taperGeo(rA, rB, len, bulge = 0, at = 0.4, seg = 16) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * rA, -len / 2 + Math.sin(a) * rA)); }
  for (let i = 1; i < 10; i++) {
    const k = i / 10;
    const bump = bulge * Math.pow(Math.sin(Math.PI * Math.min(1, k < at ? k / at * 0.5 : 0.5 + (k - at) / (1 - at) * 0.5)), 1.5);
    pts.push(new THREE.Vector2(rA + (rB - rA) * k + bump, -len / 2 + len * k));
  }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * rB, len / 2 + Math.sin(a) * rB)); }
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, seg);
}
function bone(rA, rB, len, mat, bulge = 0, at = 0.4) {
  const m = new THREE.Mesh(taperGeo(rA, rB, len, bulge, at), mat);
  m.userData.len = len;
  return m;
}
function place(m, a, b) {
  _d.subVectors(b, a);
  const len = Math.max(0.001, _d.length());
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _d.normalize());
  m.scale.y = len / m.userData.len;
}

function torsoGeo(bust) {
  // perfil de cadera → cintura → pecho → hombros (en coordenadas de sentada)
  // tronco recto: cadera, cintura apenas marcada y hombros, sin pecho
  const prof = [[0.0001, 0.47], [0.1, 0.478], [0.136, 0.53], [0.138, 0.58], [0.128, 0.65], [0.124, 0.72],
    [0.128, 0.79], [0.132, 0.86], [0.142, 0.915], [0.136, 0.952],
    [0.1, 0.982], [0.05, 0.998], [0.0001, 1.004]];
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(48), 32);
  g.scale(1.18, 1, 0.72);
  g.translate(0, 0, 0.07);
  return g;
}

function sneaker(upperMat, soleColor) {
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.025, 0.21), lam(soleColor));
  sole.position.set(0, 0.0125, -0.03);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), upperMat);
  upper.scale.set(0.85, 0.75, 2.0);
  upper.position.set(0, 0.04, -0.035);
  g.add(sole, upper);
  return g;
}

function hand(mat) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), mat);
  palm.scale.set(0.95, 1.25, 0.5);
  palm.position.y = 0.032;
  const fingers = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), mat);
  fingers.scale.set(1.0, 1.4, 0.45);
  fingers.position.set(0, 0.07, 0.002);
  const thumb = bone(0.01, 0.008, 0.028, mat);
  place(thumb, V(0.018, 0.022, -0.008), V(0.026, 0.05, -0.014));
  g.add(palm, fingers, thumb);
  return g;
}

// ── Cuerpo articulado (mirando hacia -z) ──
function riggedBody({ top, sleeves, armMat, thighs, shins, shoes, armsCrossed, face, bust = 0.012, legR = [0.07, 0.05, 0.045, 0.036] }) {
  const body = new THREE.Group();     // en el suelo
  const upper = new THREE.Group();    // tronco, cuello y cabeza: sube al levantarse
  body.add(upper);
  const skin = phong(SKIN);

  const torso = new THREE.Mesh(torsoGeo(bust), top);
  upper.add(torso);

  const neck = bone(0.043, 0.038, 0.07, skin);
  place(neck, V(0, 0.98, 0.08), V(0, 1.07, 0.075));
  upper.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 1.06, 0.07);
  const skull = new THREE.Mesh(shapeHead(new THREE.SphereGeometry(0.088, 28, 20)), skin);
  skull.position.y = 0.1;
  const faceMesh = new THREE.Mesh(
    shapeHead(new THREE.SphereGeometry(0.0886, 40, 28, FACE.phi0, FACE.phiLen, FACE.th0, FACE.thLen)),
    new THREE.MeshPhongMaterial({ map: faceTexture(face), transparent: true, depthWrite: false, shininess: 14, specular: 0x2a1c18 }));
  faceMesh.material.color.set(SKIN).lerp(new THREE.Color('#ffffff'), 0.0);
  faceMesh.material.color.set('#ffffff');
  skull.add(faceMesh);
  // nariz y orejas
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), skin);
  nose.scale.set(0.85, 1.45, 1); nose.position.set(0, -0.012, -0.084);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), skin);
  tip.position.set(0, -0.026, -0.09);
  skull.add(nose, tip);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), skin);
    ear.scale.set(0.45, 1.2, 0.8); ear.position.set(sx * 0.08, 0.0, 0.0);
    skull.add(ear);
  }
  head.add(skull);
  upper.add(head);

  // piernas y brazos
  const legs = [-1, 1].map(sx => {
    const thigh = bone(legR[0], legR[1], 0.36, thighs, legR[4] || 0, 0.3), shin = bone(legR[2], legR[3], 0.4, shins, legR[5] || 0, 0.3);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(legR[1] * 1.02, 10, 8), thighs);
    const shoe = shoes();
    body.add(thigh, shin, knee, shoe);
    return { sx, thigh, shin, knee, shoe };
  });
  const armsList = [-1, 1].map(sx => {
    const up = bone(0.038, 0.029, 0.26, armMat, 0.006, 0.4), fore = bone(0.03, 0.021, 0.235, armMat, 0.005, 0.25);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.029, 12, 8), armMat);
    const h = hand(skin);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), sleeves || armMat);
    shoulder.scale.set(1, 0.9, 0.9);
    const sleeve = sleeves ? bone(0.05, 0.046, 0.1, sleeves) : null;
    body.add(up, fore, elbow, h, shoulder); if (sleeve) body.add(sleeve);
    return { sx, up, fore, elbow, hand: h, shoulder, sleeve };
  });

  const P = { hip: V(0, 0, 0), knee: V(0, 0, 0), ankle: V(0, 0, 0), sh: V(0, 0, 0), el: V(0, 0, 0), hand: V(0, 0, 0) };
  const tmp = V(0, 0, 0), dir = V(0, 0, 0);
  const mix = (out, a, b, k) => out.copy(a).lerp(b, k);

  /**
   * b: 0 sentada → 1 de pie · stride: fase del paso · walk: 0..1 cuánto camina
   * wave: 0..1 saludo con el brazo de fuera (waveSide)
   */
  function pose({ b, stride = 0, walk = 0, wave = 0, waveSide = 1, t = 0 }) {
    upper.position.y = LIFT * b;
    for (const L of legs) {
      const { sx } = L;
      const sw = Math.sin(stride + (sx > 0 ? 0 : Math.PI)) * walk;
      const lift = Math.max(0, Math.cos(stride + (sx > 0 ? 0 : Math.PI))) * walk;
      mix(P.hip, V(sx * 0.075, 0.53, 0.03), V(sx * 0.075, 0.53 + LIFT, 0.03), b);
      mix(P.knee, V(sx * 0.095, 0.52, -0.36), V(sx * 0.085, 0.5, 0.02), b);
      P.knee.z -= Math.sin(Math.PI * b) * 0.08 + sw * 0.07;
      P.knee.y += lift * 0.05;
      mix(P.ankle, V(sx * 0.11, 0.09, -0.43), V(sx * 0.09, 0.09, 0.03), b);
      P.ankle.z -= sw * 0.12; P.ankle.y += lift * 0.07;
      place(L.thigh, P.hip, P.knee);
      place(L.shin, P.knee, P.ankle);
      L.knee.position.copy(P.knee);
      L.shoe.position.set(P.ankle.x, P.ankle.y - 0.085, P.ankle.z);
    }
    for (const A of armsList) {
      const { sx } = A;
      P.sh.set(sx * 0.165, 0.94 + LIFT * b, 0.08);
      const seatEl = armsCrossed ? V(sx * 0.2, 0.74, -0.02) : V(sx * 0.23, 0.71, 0.02);
      const seatHand = armsCrossed ? V(-sx * 0.08, 0.82, -0.11) : V(sx * 0.2, 0.62, -0.2);
      const swing = Math.sin(stride + (sx > 0 ? Math.PI : 0)) * walk * 0.07;
      const breathe = Math.sin(t * 1.4) * 0.006;
      mix(P.el, seatEl, V(sx * 0.2, 0.69 + LIFT, 0.08 + swing), b);
      mix(P.hand, seatHand, V(sx * 0.215, 0.46 + LIFT + breathe, 0.05 + swing * 2), b);
      if (wave > 0 && sx === waveSide) {
        P.el.lerp(V(sx * 0.29, 0.82 + LIFT, 0.05), wave);
        P.hand.lerp(V(sx * (0.31 + Math.sin(t * 9) * 0.05), 1.03 + LIFT, 0.01), wave);
      }
      place(A.up, P.sh, P.el);
      place(A.fore, P.el, P.hand);
      A.elbow.position.copy(P.el);
      A.shoulder.position.copy(P.sh).add(tmp.set(-sx * 0.01, 0.0, 0));
      if (A.sleeve) place(A.sleeve, P.sh, tmp.copy(P.sh).lerp(P.el, 0.42));
      // mano: sigue la dirección del antebrazo
      dir.subVectors(P.hand, P.el).normalize();
      A.hand.position.copy(P.hand);
      A.hand.quaternion.setFromUnitVectors(UP, dir);
    }
  }

  return { body, upper, torso, head, skull, legs, armsList, pose };
}

// ── Luz: melena castaña lisa con moñito arriba, ringer blanca, falda midi de cuadros ──
function makeLuz() {
  const tee = lam('#ffffff', { map: ringerTex() });
  const sleeveMat = lam('#f6f1e8');
  const trim = lam('#3e2c28');
  const skirt = lam('#ffffff', { map: plaid(2, 1), side: THREE.DoubleSide });
  const rig = riggedBody({
    top: tee, sleeves: sleeveMat, armMat: phong(SKIN), bust: 0.014,
    thighs: phong(SKIN), shins: phong('#ffffff', { map: sockTex() }),
    shoes: () => sneaker(lam('#ffffff', { map: stripedShoe() }), '#f1ede6'),
    face: { brows: '#3a2418', lips: '#c4706c', iris: '#5a3a24', lashes: 5.5 },
    legR: [0.07, 0.046, 0.038, 0.029, 0.004, 0.012],
  });
  const { upper, head } = rig;

  // ribete oscuro en las mangas
  for (const A of rig.armsList) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.008, 6, 16), trim);
    A.sleeve.add(cuff);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.05;
  }
  // collar de cuentas
  const choker = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.005, 6, 18), lam('#1c1820'));
  choker.rotation.x = Math.PI / 2 - 0.15; choker.position.set(0, 1.035, 0.075);
  upper.add(choker);
  const silver = lam('#d6d6dc');
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0016, 4, 24, Math.PI), silver);
  chain.position.set(0, 1.0, 0.05); chain.rotation.set(Math.PI / 2 + 0.75, 0, Math.PI);
  upper.add(chain);
  for (const [x, y, s] of [[0, 0.935, 0.008], [0.012, 0.955, 0.006]]) {
    const charm = new THREE.Mesh(new THREE.OctahedronGeometry(s), x ? silver : lam('#222026'));
    charm.scale.y = 1.6; charm.position.set(x, y, -0.035);
    upper.add(charm);
  }

  // falda midi con vuelo: sentada cae por delante de las rodillas; de pie, de la cadera a media pierna
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.16, 16, 1, true), skirt);
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1, 20, 3, true),
    lam('#ffffff', { map: plaid(5, 3), side: THREE.DoubleSide }));
  // pliegues
  const fp = flare.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), z = fp.getZ(i), y = fp.getY(i);
    const a = Math.atan2(z, x), k = 1 + Math.sin(a * 10) * 0.05 * (0.5 - y);
    fp.setXYZ(i, x * k, y, z * k);
  }
  flare.geometry.computeVertexNormals();
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 18), skirt);
  waist.position.set(0, 0.53, 0.04);
  waist.scale.z = 0.8;
  upper.add(waist);
  rig.body.add(hem, flare);

  const hairMat = phong('#ffffff', { map: hairStrands('#a07a4c', 'rgba(222,190,140,1)', 'rgba(110,78,46,1)', 7), side: THREE.DoubleSide, shininess: 30 });
  // gorro de pelo: por detrás y por arriba, con raya en medio
  for (const geo of [
    new THREE.SphereGeometry(0.096, 16, 12, 0, Math.PI, 0, Math.PI * 0.75),
    new THREE.SphereGeometry(0.096, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.3),
  ]) {
    const cap = new THREE.Mesh(shapeHead(geo), hairMat);
    cap.position.set(0, 0.105, 0.006);
    head.add(cap);
  }
  // melena larga detrás (lámina curva, como el pelo de los juegos de PS2)
  const tail = new THREE.Group();
  tail.position.set(0, 0.12, 0.03);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 14, 4, true, -Math.PI / 2 - 0.1, Math.PI + 0.2), hairMat);
  back.position.set(0, -0.2, 0.02);
  back.scale.z = 0.75;
  tail.add(back);
  head.add(tail);
  // mechones delante de los hombros, enmarcando la cara
  for (const sx of [-1, 1]) {
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.32, 8, 3, true, 0, Math.PI * 2), hairMat);
    lock.position.set(sx * 0.085, -0.06, -0.01);
    lock.rotation.z = sx * 0.12;
    lock.scale.z = 0.5;
    head.add(lock);
  }
  // flequillo cortina, abierto en medio
  for (const sx of [-1, 1]) {
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8, Math.PI * 1.5 - (sx < 0 ? 0.95 : -0.05), 0.9, Math.PI * 0.2, Math.PI * 0.2), hairMat);
    fringe.position.set(0, 0.105, 0.004);
    fringe.scale.set(0.95, 1.12, 1.0);
    head.add(fringe);
  }
  // moñito arriba
  const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), hairMat);
  bun.position.set(0, 0.215, 0.03);
  head.add(bun);
  // pendientes
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0022, 6, 12), lam('#d8d8de'));
    ring.position.set(sx * 0.074, 0.065, 0.0); ring.rotation.y = Math.PI / 2;
    head.add(ring);
  }

  const pose = rig.pose;
  rig.pose = (o) => {
    pose(o);
    const b = o.b;
    hem.visible = b < 0.5;
    hem.position.set(0, 0.42 + 0.2 * b, -0.36 + 0.3 * b);
    flare.visible = b >= 0.5;
    const len = 0.3 + 0.16 * smooth((b - 0.5) * 2);
    flare.scale.set(1, len, 0.85);
    flare.position.set(0, 0.88 + 0.02 - len / 2, 0.03);
    flare.rotation.z = Math.sin((o.t || 0) * 1.3) * 0.03;
  };

  return { ...rig, hair: tail, lookBias: 0.35 };
}

// ── María: afro grande, tirantes blanca, tatuajes, cargo de camuflaje muy anchos ──
function makeMaria() {
  const pants = lam('#ffffff', { map: camo() });
  pants.color.setRGB(1.0, 0.97, 0.94);   // que el camuflaje se lea con la luz del atardecer
  const rig = riggedBody({
    top: phong('#ffffff', { map: tankTex() }), armMat: phong('#ffffff', { map: tattooArm() }),
    thighs: pants, shins: pants, armsCrossed: true, bust: 0.01,
    shoes: () => sneaker(lam('#4a3024'), '#3a2a20'),
    face: { brows: '#1e130e', lips: '#b3272f', iris: '#3e2618', lashes: 5 },
    legR: [0.115, 0.108, 0.108, 0.13],     // pantalón muy ancho que cae sobre las zapatillas
  });
  // cintura del pantalón
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.1, 18), pants);
  waist.position.set(0, 0.53, 0.05);
  waist.scale.z = 0.8;
  rig.upper.add(waist);
  // colgante
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0018, 4, 20, Math.PI), lam('#d9d4cc'));
  chain.position.set(0, 1.0, 0.04); chain.rotation.set(Math.PI / 2 + 0.6, 0, Math.PI);
  rig.upper.add(chain);

  const hairMat = phong('#2a1a12', { flatShading: true, shininess: 8 });
  const hairMat2 = phong('#1c110c', { flatShading: true, shininess: 8 });
  const afro = new THREE.Group();
  afro.position.set(0, 0.13, 0.02);
  const R = rand(21);
  // puntos de la cara que los rizos no deben tapar (en coordenadas del rizo)
  const facePts = [V(-0.032, -0.035, -0.1), V(0.032, -0.035, -0.1), V(0, -0.07, -0.095), V(0, -0.1, -0.08)];
  // base del afro: por detrás y por arriba, sin tapar la cara
  for (const geo of [
    new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI, 0, Math.PI * 0.62),
    new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.3),
  ]) {
    const core = new THREE.Mesh(geo, hairMat2);
    core.scale.set(1.15, 1, 1.1);
    afro.add(core);
  }
  for (let i = 0; i < 90; i++) {
    const th = R() * Math.PI * 2;
    const ph = Math.acos(1 - R() * 1.5);
    const r = 0.13 + R() * 0.035;
    const size = 0.03 + R() * 0.025;
    const pos = V(Math.sin(ph) * Math.cos(th) * r * 1.12, Math.cos(ph) * r * 0.92, Math.sin(ph) * Math.sin(th) * r * 1.05 + 0.01);
    if (facePts.some(p => p.distanceTo(pos) < size + 0.02)) continue;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), R() < 0.5 ? hairMat : hairMat2);
    blob.position.copy(pos);
    blob.rotation.set(R() * 3, R() * 3, R() * 3);
    afro.add(blob);
  }
  // rizos de flequillo sobre la frente
  for (let i = 0; i < 9; i++) {
    const x = -0.075 + i * 0.019;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.024 + R() * 0.01, 1), hairMat);
    blob.position.set(x, 0.03 + Math.abs(x) * 0.25 + R() * 0.012, -0.085 + Math.abs(x) * 0.3);
    afro.add(blob);
  }
  rig.head.add(afro);

  return { ...rig, hair: afro, lookBias: -0.3 };
}

export function createCharacters({ sparkles } = {}) {
  const group = new THREE.Group();
  const people = {
    maria: { ...makeMaria(), x: CHAIR_X.maria, phase: 0 },
    luz: { ...makeLuz(), x: CHAIR_X.luz, phase: 2.1 },
  };
  const hits = [];
  for (const [name, p] of Object.entries(people)) {
    const out = p.x < 0 ? -1 : 1;
    p.name = name;
    p.home = { x: p.x, z: CHAIR_Z, rot: -out * 0.08 };
    p.side = { x: p.x + out * 0.55, z: CHAIR_Z + 0.05 };
    p.front = { x: p.x * 1.15, z: CHAIR_Z + 0.5 };
    p.faceRot = 0;                                 // se calcula al elegirla (mirando a la cámara)
    p.waveSide = out < 0 ? 1 : -1;                 // saluda con el brazo de fuera
    p.s = 0; p.target = 0; p.hl = 0; p.waveT = 0; p.arrived = false;
    p.body.position.set(p.x, groundHeight(p.x, CHAIR_Z), CHAIR_Z);
    p.body.scale.setScalar(0.86);   // tamaño de persona junto a las sillas
    p.body.rotation.y = p.home.rot;
    group.add(p.body);

    // brillo suave cuando pasas por encima en «choose your fighter»
    p.glow = glowSprite('#ffd7b8', 1.4, 0);
    p.glow.position.set(0, 0.8, 0);
    p.body.add(p.glow);

    // zona de clic
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.25, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.7, 0);
    hit.userData.pick = { type: 'char', id: name };
    p.body.add(hit);
    hits.push(hit);
    p.pose({ b: 0 });
  }

  let highlighted = null;
  const arriveFns = [];
  const headPos = V(0, 0, 0);
  const tmp = V(0, 0, 0);
  let emitAcc = 0;

  return {
    object: group,
    hits,
    /** Brillo en la elegida del menú (o null). */
    highlight(name) { highlighted = name; },
    /** La elegida se levanta y viene; las demás se sientan. */
    select(name, camera) {
      for (const p of Object.values(people)) {
        p.target = p.name === name ? 1 : 0;
        if (p.name === name) {
          const dx = camera.position.x - p.front.x, dz = camera.position.z - p.front.z;
          let r = Math.atan2(-dx, -dz);
          // María gira hacia un lado y Luz hacia el otro
          if (p.x < 0 && r > 0) r -= Math.PI * 2;
          if (p.x > 0 && r < 0) r += Math.PI * 2;
          p.faceRot = r;
          p.arrived = false;
        }
      }
    },
    /** Llama a fn(name) cuando la elegida ha llegado delante. */
    onArrive(fn) { arriveFns.push(fn); },
    /** Posición de la cabeza (mundo) de la elegida. */
    headWorld(name, out) {
      const p = people[name];
      return p.skull.getWorldPosition(out);
    },
    frontX(name) { return people[name].front.x; },
    update(t, _cam, dt) {
      const gust = Math.max(0, Math.sin(t * 0.23)) * Math.sin(t * 2.7);
      emitAcc += dt;
      const doEmit = emitAcc > 0.06;
      if (doEmit) emitAcc = 0;

      for (const p of Object.values(people)) {
        // avanza (o deshace) el camino: levantarse → salir de la silla y girarse → venir
        const prev = p.s;
        const speed = p.target > p.s ? 1 / DURATION : 1 / 1.8;
        p.s = p.target > p.s ? Math.min(p.target, p.s + dt * speed) : Math.max(p.target, p.s - dt * speed);
        const s = p.s;
        const b = smooth(s / 0.28);
        const m1 = smooth((s - 0.22) / 0.35);
        const m2 = smooth((s - 0.52) / 0.36);
        const turn = smooth((s - 0.25) / 0.45);
        const walk = Math.sin(Math.PI * clamp01((s - 0.22) / 0.68)) * (s > 0.22 && s < 0.9 ? 1 : 0);

        const x = p.home.x + (p.side.x - p.home.x) * m1 + (p.front.x - p.side.x) * m2;
        const z = p.home.z + (p.side.z - p.home.z) * m1 + (p.front.z - p.side.z) * m2;
        const stride = s * Math.PI * 2 * 4.5;
        const bob = Math.abs(Math.sin(stride)) * 0.025 * walk;

        p.hl += ((highlighted === p.name && s === 0 ? 1 : 0) - p.hl) * Math.min(1, dt * 5);
        const hop = Math.abs(Math.sin(t * 5)) * 0.03 * p.hl;
        p.body.position.set(x, groundHeight(x, z) + bob + hop, z);
        p.body.rotation.y = p.home.rot + (p.faceRot - p.home.rot) * turn;
        p.glow.material.opacity = p.hl * (0.4 + 0.08 * Math.sin(t * 4));

        // llega delante: estallido de destellos y saludo
        if (prev < 1 && s >= 1 && p.target === 1) {
          p.arrived = true; p.waveT = 1.8;
          p.body.getWorldPosition(tmp); tmp.y += 0.9;
          sparkles && sparkles.emit(tmp, 26, { spread: 0.35, speed: 0.7, up: 0.35, size: 0.09 });
          arriveFns.forEach(fn => fn(p.name));
        }
        if (s < 1) p.arrived = false;
        p.waveT = Math.max(0, p.waveT - dt);
        const wave = smooth(Math.min(p.waveT, 1.8 - p.waveT) * 3) * (p.arrived ? 1 : 0);

        // destellos mientras se mueve, y alrededor de la que señalas en el menú
        if (sparkles && doEmit) {
          if (s > 0 && s < 1) {
            p.body.getWorldPosition(tmp); tmp.y += 0.5 + Math.random() * 0.9;
            sparkles.emit(tmp, 1, { spread: 0.3, speed: 0.2, up: 0.2, size: 0.06 });
          } else if (p.hl > 0.5 && Math.random() < 0.5) {
            p.body.getWorldPosition(tmp); tmp.y += 0.3 + Math.random() * 0.9;
            sparkles.emit(tmp, 1, { spread: 0.35, speed: 0.1, up: 0.15, size: 0.055 });
          }
        }

        p.pose({ b, stride, walk, wave, waveSide: p.waveSide, t: t + p.phase });

        // respiración
        p.torso.scale.y = 1 + Math.sin(t * 1.4 + p.phase) * 0.012;
        // sentada mira despacio a los lados; de pie, mira a la cámara con la cabeza ladeada
        const look = Math.sin(t * 0.11 + p.phase) * 0.5 + 0.5;
        const seatedLook = p.lookBias * Math.pow(look, 3) + Math.sin(t * 0.4 + p.phase) * 0.04;
        p.head.rotation.y = seatedLook * (1 - b) + Math.sin(t * 0.5 + p.phase) * 0.06 * b;
        p.head.rotation.x = Math.sin(t * 0.3 + p.phase) * 0.03;
        p.head.rotation.z = Math.sin(t * 0.7 + p.phase) * 0.06 * b;
        // brisa en el pelo
        p.hair.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.03 + gust * 0.05;
        p.hair.rotation.x = Math.sin(t * 1.1 + p.phase) * 0.025 + gust * 0.03;
      }
    },
  };
}
