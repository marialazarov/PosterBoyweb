// Luz y María: sentadas de espaldas mirando el mar. Al elegir una, se levanta,
// sale de la silla, se gira hacia la cámara (con cara de muñeco) y saluda.
import * as THREE from 'three';
import { canvasTexture, rand, glowSprite } from './util.js';
import { groundHeight } from './beach.js';
import { CHAIR_X, CHAIR_Z } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

const SKIN = '#e0ad93';
const LIFT = 0.36;            // cuánto sube la cadera al ponerse de pie
const DURATION = 2.6;         // segundos de levantarse → girarse → venir

// ── Texturas de ropa ──
const plaid = () => canvasTexture(32, 32, (g) => {
  g.fillStyle = '#626a5e'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(34,40,34,.6)'; g.fillRect(0, 10, 32, 6); g.fillRect(10, 0, 6, 32);
  g.fillStyle = 'rgba(190,196,180,.4)'; g.fillRect(0, 24, 32, 1); g.fillRect(24, 0, 1, 32);
}, { repeat: true });

const camo = () => canvasTexture(64, 64, (g) => {
  const R = rand(5);
  g.fillStyle = '#7d7449'; g.fillRect(0, 0, 64, 64);
  for (const c of ['#55502f', '#9a8a5c', '#3a3322', '#6a6a3c']) {
    g.fillStyle = c;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse(R() * 64, R() * 64, 3 + R() * 7, 2 + R() * 4, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
}, { repeat: true });

const tattooedSkin = () => canvasTexture(32, 64, (g) => {
  const R = rand(9);
  g.fillStyle = SKIN; g.fillRect(0, 0, 32, 64);
  g.strokeStyle = 'rgba(40,30,40,.55)'; g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = R() * 28, y = R() * 60;
    g.beginPath();
    if (R() < 0.5) g.arc(x, y, 2 + R() * 2, 0, Math.PI * 2);
    else { g.moveTo(x, y); g.lineTo(x + 3, y + 4); g.lineTo(x + 6, y); }
    g.stroke();
  }
}, {});

const stripedShoe = () => canvasTexture(32, 32, (g) => {
  g.fillStyle = '#141214'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#f2efe8';
  for (let i = 0; i < 3; i++) { g.save(); g.translate(9 + i * 6, 16); g.rotate(-0.5); g.fillRect(-1.5, -9, 3, 18); g.restore(); }
  g.fillRect(0, 28, 32, 4);   // suela blanca
}, {});

// ── Cara de muñeco: ojitos, colorete y una sonrisa pequeña ──
// Se pinta sobre un trozo de esfera; el lienzo guarda las proporciones del trozo.
const FACE = { phi0: Math.PI + 0.6, phiLen: Math.PI - 1.2, th0: 0.35 * Math.PI, thLen: 0.4 * Math.PI };
function faceTexture(blushColor, lips = '#8a3c3a') {
  const W = 256, H = Math.round(256 * FACE.thLen / FACE.phiLen);
  const pxRad = W / FACE.phiLen;
  const yAt = th => (th - FACE.th0) * pxRad;
  return canvasTexture(W, H, (g) => {
    const cx = W / 2, eyeY = yAt(Math.PI / 2 + 0.06);
    for (const sx of [-1, 1]) {
      const x = cx + sx * 0.37 * pxRad;
      // colorete
      const bx = x + sx * 0.1 * pxRad, by = yAt(Math.PI / 2 + 0.3);
      const r = g.createRadialGradient(bx, by, 0, bx, by, 17);
      r.addColorStop(0, blushColor); r.addColorStop(1, 'rgba(240,120,130,0)');
      g.fillStyle = r; g.fillRect(bx - 20, by - 20, 40, 40);
      // ojo
      g.fillStyle = '#2a1a1c';
      g.beginPath(); g.ellipse(x, eyeY, 10, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x + 3.5, eyeY - 5, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x - 3, eyeY + 5, 1.8, 0, Math.PI * 2); g.fill();
    }
    // sonrisa
    g.strokeStyle = lips; g.lineWidth = lips === '#8a3c3a' ? 3.5 : 5; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, yAt(Math.PI / 2 + 0.3), 10, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  });
}

// Cápsula "hueso" que se recoloca entre dos puntos en cada fotograma
const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
function bone(r, len, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat);
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

// ── Cuerpo articulado (mirando hacia -z) ──
function riggedBody({ top, sleeves, arms, thighs, shins, shoes, armsCrossed, blush, lips }) {
  const body = new THREE.Group();     // en el suelo
  const upper = new THREE.Group();    // tronco, cuello y cabeza: sube al levantarse
  body.add(upper);
  const skin = lam(SKIN);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 4, 10), top);
  torso.scale.set(1.25, 1, 0.78);
  torso.position.set(0, 0.76, 0.07);
  upper.add(torso);

  const neck = bone(0.04, 0.08, skin);
  place(neck, V(0, 0.98, 0.08), V(0, 1.06, 0.07));
  upper.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 1.06, 0.07);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), skin);
  skull.scale.set(0.95, 1.1, 1);
  skull.position.y = 0.1;
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.0962, 24, 16, FACE.phi0, FACE.phiLen, FACE.th0, FACE.thLen),
    new THREE.MeshLambertMaterial({ map: faceTexture(blush, lips), transparent: true, depthWrite: false }));
  skull.add(face);
  head.add(skull);
  upper.add(head);

  // piernas y brazos: huesos que se recolocan según la postura
  const legs = [-1, 1].map(sx => {
    const thigh = bone(0.065, 0.36, thighs), shin = bone(0.05, 0.4, shins);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.2), shoes);
    body.add(thigh, shin, shoe);
    return { sx, thigh, shin, shoe };
  });
  const armsList = [-1, 1].map(sx => {
    const up = bone(0.045, 0.26, arms), fore = bone(0.04, 0.245, arms);
    const sleeve = sleeves ? bone(0.058, 0.12, sleeves) : null;
    body.add(up, fore); if (sleeve) body.add(sleeve);
    return { sx, up, fore, sleeve };
  });

  const P = { hip: V(0, 0, 0), knee: V(0, 0, 0), ankle: V(0, 0, 0), sh: V(0, 0, 0), el: V(0, 0, 0), hand: V(0, 0, 0) };
  const tmp = V(0, 0, 0);
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
      mix(P.hip, V(sx * 0.08, 0.52, 0.02), V(sx * 0.08, 0.52 + LIFT, 0.02), b);
      mix(P.knee, V(sx * 0.1, 0.52, -0.37), V(sx * 0.09, 0.5, 0.02), b);
      P.knee.z -= Math.sin(Math.PI * b) * 0.08 + sw * 0.07;
      P.knee.y += lift * 0.05;
      mix(P.ankle, V(sx * 0.12, 0.1, -0.44), V(sx * 0.1, 0.1, 0.02), b);
      P.ankle.z -= sw * 0.12; P.ankle.y += lift * 0.07;
      place(L.thigh, P.hip, P.knee);
      place(L.shin, P.knee, P.ankle);
      mix(tmp, V(sx * 0.12, 0.04, -0.5), V(sx * 0.1, 0.04, -0.04), b);
      L.shoe.position.set(tmp.x, tmp.y + lift * 0.07, tmp.z - sw * 0.12);
    }
    for (const A of armsList) {
      const { sx } = A;
      P.sh.set(sx * 0.17, 0.95 + LIFT * b, 0.08);
      const seatEl = armsCrossed ? V(sx * 0.21, 0.74, -0.02) : V(sx * 0.25, 0.71, 0.02);
      const seatHand = armsCrossed ? V(-sx * 0.08, 0.82, -0.12) : V(sx * 0.28, 0.67, -0.22);
      const swing = Math.sin(stride + (sx > 0 ? Math.PI : 0)) * walk * 0.07;
      const breathe = Math.sin(t * 1.4) * 0.006;
      mix(P.el, seatEl, V(sx * 0.21, 0.7 + LIFT, 0.07 + swing), b);
      mix(P.hand, seatHand, V(sx * 0.235, 0.46 + LIFT + breathe, 0.03 + swing * 2), b);
      if (wave > 0 && sx === waveSide) {
        P.el.lerp(V(sx * 0.3, 0.83 + LIFT, 0.04), wave);
        P.hand.lerp(V(sx * (0.33 + Math.sin(t * 9) * 0.05), 1.05 + LIFT, 0.0), wave);
      }
      place(A.up, P.sh, P.el);
      place(A.fore, P.el, P.hand);
      if (A.sleeve) place(A.sleeve, P.sh, tmp.copy(P.sh).lerp(P.el, 0.45));
    }
  }

  return { body, upper, torso, head, skull, legs, armsList, pose };
}

// ── Luz: pelo largo castaño semirrecogido, camiseta ringer, falda de cuadros ──
function makeLuz() {
  const tee = lam('#efe8dc');
  const trim = lam('#3a2a2a');
  const skirt = lam('#ffffff', { map: plaid(), side: THREE.DoubleSide });
  const rig = riggedBody({
    top: tee, sleeves: tee, arms: lam(SKIN), blush: 'rgba(240,120,130,.7)',
    thighs: skirt, shins: lam('#1c1a1c'), shoes: lam('#ffffff', { map: stripedShoe() }),
  });
  const { upper, head } = rig;

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), trim);
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.98, 0.075);
  upper.add(collar);

  // ribete oscuro en las mangas
  for (const A of rig.armsList) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 14), trim);
    A.sleeve.add(cuff);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.06;
  }

  // falda midi con vuelo: sentada cae por delante de las rodillas; de pie, de la cadera a media pierna
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.16, 12, 1, true), skirt);
  const flareTex = plaid(); flareTex.repeat.set(4, 3);
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1, 16, 1, true),
    lam('#ffffff', { map: flareTex, side: THREE.DoubleSide }));
  rig.body.add(hem, flare);

  const hairMat = lam('#5a3826', { flatShading: true });
  // gorro de pelo: por detrás y por arriba, dejando la cara libre
  for (const geo of [
    new THREE.SphereGeometry(0.104, 12, 10, 0, Math.PI, 0, Math.PI),
    new THREE.SphereGeometry(0.104, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.36),
  ]) {
    const cap = new THREE.Mesh(geo, hairMat);
    cap.scale.set(1, 1.08, 1.02); cap.position.set(0, 0.115, 0.012);
    head.add(cap);
  }
  // mechones a los lados de la cara
  for (const sx of [-1, 1]) {
    const lock = bone(0.032, 0.22, hairMat);
    place(lock, V(sx * 0.085, 0.16, -0.01), V(sx * 0.1, -0.08, 0.02));
    lock.scale.z = 0.6;
    head.add(lock);
  }
  const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.048, 1), hairMat);
  bun.position.set(0, 0.2, 0.08);
  head.add(bun);
  // melena larga que cae por la espalda (se mueve con la brisa)
  const tail = new THREE.Group();
  tail.position.set(0, 0.1, 0.06);
  const strands = bone(0.08, 0.3, hairMat);
  place(strands, V(0, 0, 0), V(0, -0.3, 0.05));
  strands.scale.set(1.35, strands.scale.y, 0.55);
  tail.add(strands);
  head.add(tail);

  const pose = rig.pose;
  rig.pose = (o) => {
    pose(o);
    const b = o.b;
    hem.visible = b < 0.5;
    hem.position.set(0, 0.42 + 0.2 * b, -0.36 + 0.3 * b);
    flare.visible = b >= 0.5;
    const len = 0.3 + 0.16 * smooth((b - 0.5) * 2);
    flare.scale.set(1, len, 1);
    flare.position.set(0, 0.88 + 0.02 - len / 2, 0.02);
    flare.rotation.z = Math.sin((o.t || 0) * 1.3) * 0.03;
  };

  return { ...rig, hair: tail, lookBias: 0.35 };
}

// ── María: rizos grandes y oscuros, tirantes blanca, tatuajes, camuflaje ──
function makeMaria() {
  const tank = lam('#f1ece6');
  const arms = lam('#ffffff', { map: tattooedSkin() });
  const pants = lam('#ffffff', { map: camo() });
  const rig = riggedBody({
    top: tank, arms, thighs: pants, shins: pants, shoes: lam('#5a3a28'), armsCrossed: true,
    blush: 'rgba(235,110,115,.6)', lips: '#b3272f',
  });
  // pantalón ancho
  for (const L of rig.legs) for (const m of [L.thigh, L.shin]) m.scale.x = m.scale.z = m === L.thigh ? 1.35 : 1.55;

  const hairMat = lam('#22140e', { flatShading: true });
  const afro = new THREE.Group();
  afro.position.set(0, 0.13, 0.02);
  const R = rand(21);
  // puntos de la cara que los rizos no deben tapar (en coordenadas del rizo)
  const facePts = [V(-0.036, -0.035, -0.115), V(0.036, -0.035, -0.115), V(0, -0.065, -0.108)];
  for (let i = 0; i < 16; i++) {
    const th = R() * Math.PI * 2;
    const ph = Math.acos(1 - R() * 1.45);
    const r = 0.1 + R() * 0.04;
    const size = 0.075 + R() * 0.035;
    const pos = V(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.9, Math.sin(ph) * Math.sin(th) * r + 0.02);
    if (facePts.some(p => p.distanceTo(pos) < size * 1.05 + 0.012)) continue;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), hairMat);
    blob.position.copy(pos);
    afro.add(blob);
  }
  // rizos de flequillo sobre la frente
  for (const [x, y, s] of [[-0.06, 0.035, 0.05], [0.0, 0.05, 0.055], [0.06, 0.035, 0.05]]) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), hairMat);
    blob.position.set(x, y, -0.085);
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
