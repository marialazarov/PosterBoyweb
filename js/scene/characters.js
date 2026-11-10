// Luz y María sentadas, vistas de espaldas (como en la escena del videoclip).
import * as THREE from 'three';
import { canvasTexture, limb, rand } from './util.js';
import { groundHeight } from './beach.js';
import { CHAIR_X, CHAIR_Z } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

const SKIN = '#e0ad93';

// ── Texturas de ropa ──
const plaid = () => canvasTexture(32, 32, (g) => {
  g.fillStyle = '#6f7c4c'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(48,58,32,.65)'; g.fillRect(0, 10, 32, 6); g.fillRect(10, 0, 6, 32);
  g.fillStyle = 'rgba(200,196,150,.45)'; g.fillRect(0, 24, 32, 1); g.fillRect(24, 0, 1, 32);
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

// ── Cuerpo base sentado (mirando hacia -z) ──
function seatedBody({ top, topSleeves, arms, thighs, shins, shoes, armsCrossed }) {
  const body = new THREE.Group();
  const skin = lam(SKIN);

  // tronco
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 4, 10), top);
  torso.scale.set(1.25, 1, 0.78);
  torso.position.set(0, 0.76, 0.07);
  body.add(torso);

  // piernas
  for (const sx of [-1, 1]) {
    body.add(limb(V(sx * 0.08, 0.52, 0.02), V(sx * 0.1, 0.53, -0.36), 0.065, thighs));
    body.add(limb(V(sx * 0.1, 0.5, -0.38), V(sx * 0.12, 0.1, -0.44), 0.05, shins));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.2), shoes);
    shoe.position.set(sx * 0.12, 0.04, -0.5);
    body.add(shoe);
  }

  // brazos
  for (const sx of [-1, 1]) {
    const shoulder = V(sx * 0.17, 0.95, 0.08);
    const elbow = armsCrossed ? V(sx * 0.21, 0.74, -0.02) : V(sx * 0.25, 0.71, 0.02);
    const hand = armsCrossed ? V(-sx * 0.08, 0.82, -0.12) : V(sx * 0.28, 0.67, -0.22);
    body.add(limb(shoulder, elbow, 0.045, arms));
    body.add(limb(elbow, hand, 0.04, arms));
    if (topSleeves) body.add(limb(shoulder, shoulder.clone().lerp(elbow, 0.45), 0.058, topSleeves));
  }

  // cuello
  body.add(limb(V(0, 0.98, 0.08), V(0, 1.06, 0.07), 0.04, skin));

  // cabeza (grupo propio para poder girarla)
  const head = new THREE.Group();
  head.position.set(0, 1.06, 0.07);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), skin);
  skull.scale.set(0.95, 1.1, 1);
  skull.position.y = 0.1;
  head.add(skull);
  body.add(head);

  return { body, torso, head };
}

// ── Luz: pelo largo castaño semirrecogido, camiseta ringer, falda de cuadros ──
function makeLuz() {
  const tee = lam('#efe8dc');
  const trim = lam('#5a3a26');
  const skirt = lam('#ffffff', { map: plaid() });
  const { body, torso, head } = seatedBody({
    top: tee, topSleeves: tee, arms: lam(SKIN),
    thighs: skirt, shins: lam('#2a2422'), shoes: lam('#111'),
  });

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), trim);
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.98, 0.075);
  body.add(collar);

  // falda que cae por delante de las rodillas
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.16, 12, 1, true), skirt);
  hem.position.set(0, 0.42, -0.36);
  hem.material.side = THREE.DoubleSide;
  body.add(hem);

  const hairMat = lam('#5a3826', { flatShading: true });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.104, 12, 10), hairMat);
  cap.scale.set(1, 1.08, 1.02); cap.position.set(0, 0.115, 0.012);
  head.add(cap);
  const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.048, 1), hairMat);
  bun.position.set(0, 0.2, 0.08);
  head.add(bun);
  // melena larga que cae por la espalda (se mueve con la brisa)
  const tail = new THREE.Group();
  tail.position.set(0, 0.1, 0.06);
  const strands = limb(V(0, 0, 0), V(0, -0.3, 0.05), 0.08, hairMat);
  strands.scale.set(1.35, 1, 0.55);
  tail.add(strands);
  head.add(tail);

  return { body, torso, head, hair: tail, lookBias: 0.35 };
}

// ── María: rizos grandes y oscuros, tirantes blanca, tatuajes, camuflaje ──
function makeMaria() {
  const tank = lam('#f1ece6');
  const arms = lam('#ffffff', { map: tattooedSkin() });
  const pants = lam('#ffffff', { map: camo() });
  const { body, torso, head } = seatedBody({
    top: tank, arms, thighs: pants, shins: pants, shoes: lam('#5a3a28'), armsCrossed: true,
  });
  // pantalón ancho: muslos más gruesos
  body.children.forEach(c => { if (c.material === pants) c.scale.x = c.scale.z = 1.25; });

  const hairMat = lam('#22140e', { flatShading: true });
  const afro = new THREE.Group();
  afro.position.set(0, 0.13, 0.02);
  const R = rand(21);
  for (let i = 0; i < 16; i++) {
    const th = R() * Math.PI * 2;
    const ph = Math.acos(1 - R() * 1.45);            // casi toda la esfera menos la cara
    const r = 0.1 + R() * 0.04;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075 + R() * 0.035, 1), hairMat);
    blob.position.set(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.9, Math.sin(ph) * Math.sin(th) * r + 0.02);
    afro.add(blob);
  }
  head.add(afro);

  return { body, torso, head, hair: afro, lookBias: -0.3 };
}

export function createCharacters() {
  const group = new THREE.Group();
  const people = [
    { ...makeMaria(), x: CHAIR_X.maria, phase: 0 },
    { ...makeLuz(), x: CHAIR_X.luz, phase: 2.1 },
  ];
  for (const p of people) {
    p.body.position.set(p.x, groundHeight(p.x, CHAIR_Z), CHAIR_Z);
    p.body.rotation.y = p.x < 0 ? 0.08 : -0.08;
    group.add(p.body);
  }

  return {
    object: group,
    update(t) {
      const gust = Math.max(0, Math.sin(t * 0.23)) * Math.sin(t * 2.7);
      for (const p of people) {
        // respiración
        p.torso.scale.y = 1 + Math.sin(t * 1.4 + p.phase) * 0.012;
        // mirar despacio hacia los lados (como en las fotos)
        const look = Math.sin(t * 0.11 + p.phase) * 0.5 + 0.5;
        p.head.rotation.y = p.lookBias * Math.pow(look, 3) + Math.sin(t * 0.4 + p.phase) * 0.04;
        p.head.rotation.x = Math.sin(t * 0.3 + p.phase) * 0.03;
        // brisa en el pelo
        p.hair.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.03 + gust * 0.05;
        p.hair.rotation.x = Math.sin(t * 1.1 + p.phase) * 0.025 + gust * 0.03;
      }
    },
  };
}
