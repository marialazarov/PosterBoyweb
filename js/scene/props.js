// Sillas plegables rojas, mesita blanca, lámpara, radio, latas y cañas de pescar.
import * as THREE from 'three';
import { WATER_Y, rand, glowSprite, canvasTexture } from './util.js';
import { groundHeight } from './beach.js';

export const CHAIR_X = { maria: -0.85, luz: 0.85 };   // vistas desde detrás
export const CHAIR_Z = 0;

const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

function makeChair() {
  const g = new THREE.Group();
  const red = lam('#c2392b');
  const frame = lam('#141014');
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.44), red); seat.position.set(0, 0.45, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.025), red); back.position.set(0, 0.83, 0.22);
  g.add(seat, back);
  const leg = new THREE.CylinderGeometry(0.012, 0.012, 1, 5);
  const bar = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const m = new THREE.Mesh(leg, frame);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.y = a.distanceTo(b);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    g.add(m);
  };
  for (const x of [-0.29, 0.29]) {
    bar(x, 0, -0.22, x, 0.66, -0.22);      // patas delanteras hasta el reposabrazos
    bar(x, 0, 0.22, x, 1.0, 0.22);         // postes del respaldo
    bar(x, 0.66, -0.24, x, 0.66, 0.22);    // reposabrazos
    bar(x, 0.05, -0.22, x, 0.44, 0.22);    // aspa lateral
  }
  bar(-0.29, 0.05, -0.22, 0.29, 0.44, -0.22);   // aspa frontal
  return g;
}

// Radio de transistores pequeñita. El frente mira hacia +z (hacia la cámara).
export function makeRadio() {
  const g = new THREE.Group();
  const W = 0.15, H = 0.095, D = 0.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), lam('#7fb2a2'));
  g.add(body);

  // frente: rejilla de altavoz a la izquierda y dial con frecuencias a la derecha
  const face = canvasTexture(256, 160, (c, w, h) => {
    c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#b9ad95';
    for (let y = 18; y < h - 10; y += 11) for (let x = 16; x < 132; x += 11) {
      c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#2b2622'; c.fillRect(148, 22, 94, 58);
    c.strokeStyle = '#d9cdb4'; c.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { const x = 156 + i * 10; c.beginPath(); c.moveTo(x, 30); c.lineTo(x, i % 2 ? 40 : 46); c.stroke(); }
    c.fillStyle = '#d9cdb4'; c.font = '13px Futura, Jost, sans-serif';
    c.fillText('88   96   104', 152, 70);
    c.fillStyle = '#c2392b'; c.fillRect(186, 26, 3, 50);          // aguja
    c.fillStyle = '#5c8f80'; c.font = 'bold 15px Futura, Jost, sans-serif';
    c.fillText('PB', 182, 130);
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, H * 0.86), new THREE.MeshLambertMaterial({ map: face }));
  front.position.z = D / 2 + 0.001;
  g.add(front);

  // brillo del dial cuando suena
  const dialGlow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.34, H * 0.31),
    new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  dialGlow.position.set(W * 0.21, H * 0.12, D / 2 + 0.002);
  g.add(dialGlow);

  // ruedecita del volumen, asa y antena
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 14), lam('#efe6d2'));
  knob.rotation.z = Math.PI / 2; knob.position.set(W / 2 + 0.005, H * 0.18, 0.004);
  g.add(knob);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 6, 16, Math.PI), lam('#2a2422'));
  handle.position.set(0, H / 2, -0.005);
  g.add(handle);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0026, 0.11, 5).translate(0, 0.055, 0), lam('#c9c4c0'));
  antenna.position.set(-W / 2 + 0.015, H / 2, -0.015);
  antenna.rotation.set(-0.25, 0, 0.55);
  g.add(antenna);

  // lucecita de encendido
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a3c' }));
  led.position.set(W * 0.38, -H * 0.32, D / 2 + 0.003);
  g.add(led);
  const ledGlow = glowSprite('#ff7a50', 0.07, 0.6);
  ledGlow.position.copy(led.position);
  g.add(ledGlow);

  // zona de clic más grande que la radio, para acertar fácil (también en móvil)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.22), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.04;
  g.add(hit);

  return { object: g, hit, dialGlow, led, ledGlow, knob };
}

function blobShadow(w, d, opacity = 0.55) {
  const tex = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return c;
  })());
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function createProps() {
  const group = new THREE.Group();
  const R = rand(11);

  // sillas
  for (const x of [CHAIR_X.maria, CHAIR_X.luz]) {
    const c = makeChair();
    const y = groundHeight(x, CHAIR_Z);
    c.position.set(x, y, CHAIR_Z);
    c.rotation.y = x < 0 ? 0.08 : -0.08;
    group.add(c);
    const sh = blobShadow(0.9, 0.8); sh.position.set(x, y + 0.04, CHAIR_Z - 0.05); group.add(sh);
  }

  // mesita blanca de plástico
  const TX = 0, TZ = -0.3;
  const ty = groundHeight(TX, TZ);
  const table = new THREE.Group();
  const white = lam('#e9e4e6');
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.46), white); top.position.y = 0.45;
  table.add(top);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), white);
    l.position.set(x, 0.225, z); table.add(l);
  }
  table.position.set(TX, ty, TZ);
  group.add(table);
  const tsh = blobShadow(0.8, 0.8, 0.45); tsh.position.set(TX, ty + 0.04, TZ); group.add(tsh);

  // lámpara: pie de madera torneado + pantalla crema
  const lamp = new THREE.Group();
  const wood = lam('#b0753c');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.03, 12), wood); base.position.y = 0.015;
  lamp.add(base);
  for (let i = 0; i < 9; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), wood);
    k.scale.set(1, 0.75, 1);
    k.position.set(Math.sin(i * 1.4) * 0.006, 0.05 + i * 0.038, 0);
    lamp.add(k);
  }
  const shadeMat = new THREE.MeshBasicMaterial({ color: '#ffe2ad', side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.2, 18, 1, true), shadeMat);
  shade.position.y = 0.46;
  lamp.add(shade);
  const halo = glowSprite('#ffc483', 2.2, 0.55); halo.position.y = 0.46; lamp.add(halo);
  const bulb = glowSprite('#fff3dc', 0.5, 0.9); bulb.position.y = 0.42; lamp.add(bulb);
  const light = new THREE.PointLight('#ffb36e', 3.2, 0, 1.25);
  light.position.y = 0.44;
  lamp.add(light);
  lamp.position.set(TX + 0.03, ty + 0.47, TZ + 0.04);
  group.add(lamp);

  // radio, a la izquierda de la lámpara, girada un poco hacia vosotras
  const radio = makeRadio();
  const RS = 1.45;   // un poco más grande que una radio real, para que se vea desde la cámara
  radio.object.scale.setScalar(RS);
  radio.object.position.set(TX - 0.125, ty + 0.4675 + 0.0475 * RS, TZ - 0.02);
  radio.object.rotation.y = 0.28;
  group.add(radio.object);
  let radioOn = false, radioLevel = 0;

  // «tap here» discreto encima de la radio, como en un videojuego
  const tapTex = canvasTexture(256, 128, (c, w) => {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(30,14,40,.8)'; c.shadowBlur = 8;
    c.fillStyle = '#fffbf0';
    c.font = '500 34px Futura, "Futura PT", Jost, sans-serif';
    c.fillText('tap here', w / 2, 40);
    c.beginPath(); c.moveTo(w / 2 - 11, 82); c.lineTo(w / 2 + 11, 82); c.lineTo(w / 2, 98); c.closePath(); c.fill();
  });
  const tap = new THREE.Sprite(new THREE.SpriteMaterial({ map: tapTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  tap.scale.set(0.32, 0.16, 1);
  tap.renderOrder = 10;
  const TAP_Y = ty + 0.47 + 0.3;
  tap.position.set(radio.object.position.x - 0.12, TAP_Y, radio.object.position.z + 0.05);
  group.add(tap);
  let tapShow = 0, tapVisible = true;

  // latas y piedras sobre la mesa
  const can = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 10);
  const green = lam('#2c5a36');
  for (const [x, z] of [[0.17, 0.13], [0.1, 0.18]]) {
    const c = new THREE.Mesh(can, green); c.position.set(TX + x, ty + 0.53, TZ + z); group.add(c);
  }
  const pebble = new THREE.IcosahedronGeometry(0.035, 0);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(pebble, lam('#a07b58', { flatShading: true }));
    p.position.set(TX + 0.05 + R() * 0.12, ty + 0.48, TZ + (R() - 0.5) * 0.15);
    p.scale.y = 0.7; group.add(p);
  }

  // cañas de pescar clavadas entre las piedras, a la izquierda
  const rods = [];
  const rodMats = [lam('#8e2a22'), lam('#e6c94a')];
  const lineMat = new THREE.LineBasicMaterial({ color: '#e8d9e6', transparent: true, opacity: 0.5 });
  [
    { base: [-1.6, -0.55], lean: [-0.3, -0.9], len: 2.7, end: [-4.5, -16] },   // junto a María
    { base: [1.2, -0.85], lean: [0.2, -0.8], len: 2.8, end: [3.2, -17] },      // delante de Luz
  ].forEach((cfg, ci) => {
    const rodMat = rodMats[ci];
    const pivot = new THREE.Group();
    const y = groundHeight(cfg.base[0], cfg.base[1]);
    pivot.position.set(cfg.base[0], y, cfg.base[1]);
    const dir = new THREE.Vector3(cfg.lean[0], 1, cfg.lean[1]).normalize();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.016, cfg.len, 5).translate(0, cfg.len / 2, 0), rodMat);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    pivot.add(rod);
    group.add(pivot);
    const tipLocal = new THREE.Vector3(0, cfg.len, 0);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(new Array(12).fill(0).map(() => new THREE.Vector3()));
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 24),
      new THREE.MeshBasicMaterial({ color: '#f3dce8', transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cfg.end[0], WATER_Y + 0.04, cfg.end[1]);
    group.add(ring);
    rods.push({ pivot, rod, tipLocal, line, end: new THREE.Vector3(cfg.end[0], WATER_Y, cfg.end[1]), ring, bite: 0, phase: R() * 6 });
  });
  let nextBite = 6 + R() * 8;

  let lampBoost = 0, lampTarget = 0;
  const tip = new THREE.Vector3();

  return {
    object: group,
    setFocus(key) { lampTarget = key === 'lamp' ? 1 : 0; },
    radioHit: radio.hit,
    setRadio(on) { radioOn = on; },
    /** Muestra u oculta el «tap here» (p. ej. mientras una está de pie). */
    setTapHint(on) { tapVisible = on; },
    update(t, _cam, dt) {
      // radio: el dial se enciende al sonar; apagada, la luz parpadea despacio para que la toques
      radioLevel += ((radioOn ? 1 : 0) - radioLevel) * Math.min(1, dt * 6);
      radio.dialGlow.material.opacity = 0.55 * radioLevel * (0.92 + 0.08 * Math.sin(t * 9));
      const invite = 0.5 + 0.5 * Math.sin(t * 2.4);
      radio.ledGlow.material.opacity = radioOn ? 0.9 : 0.15 + 0.5 * invite;
      radio.ledGlow.scale.setScalar(radioOn ? 0.09 : 0.06 + 0.03 * invite);
      radio.led.material.color.set(radioOn ? '#ffb070' : '#ff5a3c');
      radio.knob.rotation.x = radioLevel * 1.4;
      tapShow += (((tapVisible && !radioOn) ? 1 : 0) - tapShow) * Math.min(1, dt * 3);
      tap.visible = tapShow > 0.01;
      tap.material.opacity = tapShow * (0.72 + 0.2 * Math.sin(t * 3));
      tap.position.y = TAP_Y + Math.abs(Math.sin(t * 3)) * 0.015;

      // lámpara: parpadeo suave + énfasis desde el menú
      lampBoost += (lampTarget - lampBoost) * Math.min(1, dt * 3);
      const flick = 1 + 0.035 * Math.sin(t * 13.1) * Math.sin(t * 7.3) + (Math.random() < 0.01 ? -0.08 : 0);
      light.intensity = 3.2 * flick * (1 + lampBoost * 0.6);
      halo.scale.setScalar(2.2 * (1 + lampBoost * 0.5));
      halo.material.opacity = 0.55 * flick;

      // cañas: balanceo con la brisa y, de vez en cuando, ¡pica!
      nextBite -= dt;
      if (nextBite <= 0) {
        rods[Math.floor(Math.random() * rods.length)].bite = 1;
        nextBite = 10 + Math.random() * 16;
      }
      for (const r of rods) {
        r.bite = Math.max(0, r.bite - dt * 0.6);
        const jerk = r.bite > 0 ? Math.sin(t * 22) * 0.05 * r.bite : 0;
        r.pivot.rotation.x = Math.sin(t * 1.1 + r.phase) * 0.012 + jerk;
        r.pivot.rotation.z = Math.sin(t * 0.8 + r.phase) * 0.01;
        r.ring.material.opacity = r.bite * 0.6;
        r.ring.scale.setScalar(1 + (1 - r.bite) * 4);

        r.pivot.updateMatrixWorld();
        tip.copy(r.tipLocal).applyMatrix4(r.rod.matrix).applyMatrix4(r.pivot.matrixWorld);
        const p = r.line.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const k = i / (p.count - 1);
          const x = tip.x + (r.end.x - tip.x) * k;
          const z = tip.z + (r.end.z - tip.z) * k;
          const y = tip.y + (r.end.y - tip.y) * k - Math.sin(Math.PI * k) * 0.6;
          p.setXYZ(i, x, y, z);
        }
        p.needsUpdate = true;
      }
    },
  };
}
