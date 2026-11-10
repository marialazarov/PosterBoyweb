// Opciones que salen flotando de la cabeza de la elegida: batería (María) o
// guitarra (Luz) = conciertos, radio = música, camiseta Poster Boy = merch.
// Al pasar el ratón brillan con destellos, como los renders de juguetes de los 90.
import * as THREE from 'three';
import { canvasTexture, glowSprite } from './util.js';
import { starSprite } from './sparkles.js';
import { makeRadio } from './props.js';

const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOutBack = x => { const c = 1.9; x -= 1; return 1 + (c + 1) * x * x * x + c * x * x; };

const FONT = '"Futura", "Futura PT", "Jost", sans-serif';

// ── Batería azul pastel ──
function makeDrums() {
  const g = new THREE.Group();
  const blue = lam('#a9d3f2'), cream = lam('#fbf3e4'), metal = lam('#d9d4cf'), gold = lam('#e8c66e');
  const head = canvasTexture(128, 128, (c) => {
    c.fillStyle = '#fbf3e4'; c.beginPath(); c.arc(64, 64, 64, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a9d3f2'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#6f9fc4'; c.font = `500 30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('PB', 64, 66);
  });
  // bombo, de cara a la cámara
  const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 22), blue);
  kick.rotation.x = Math.PI / 2;
  g.add(kick);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.07, 22), new THREE.MeshLambertMaterial({ map: head }));
  face.position.z = 0.036;
  g.add(face);
  // tom encima, caja a la izquierda, timbal a la derecha
  const drum = (r, h, x, y, z, tilt) => {
    const d = new THREE.Group();
    d.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), blue));
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 18), cream);
    top.rotation.x = -Math.PI / 2; top.position.y = h / 2 + 0.001;
    d.add(top);
    d.position.set(x, y, z); d.rotation.x = tilt;
    g.add(d);
  };
  drum(0.035, 0.03, 0.0, 0.1, 0.0, 0.5);
  drum(0.04, 0.025, -0.11, 0.0, 0.03, 0.45);
  drum(0.045, 0.05, 0.115, -0.03, 0.02, 0.3);
  // platillo
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2), metal);
  stand.position.set(-0.13, 0.04, -0.02);
  g.add(stand);
  const cymbal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 22), gold);
  cymbal.position.set(-0.13, 0.14, -0.02); cymbal.rotation.x = 0.4; cymbal.rotation.z = -0.2;
  g.add(cymbal);
  // baquetas
  for (const s of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0045, 0.15), lam('#e3c08f'));
    st.position.set(s * 0.025, 0.16, 0.04); st.rotation.z = s * 0.55;
    g.add(st);
  }
  return g;
}

// ── Guitarra amarilla pastel (la de Luz) ──
function makeGuitar() {
  const g = new THREE.Group();
  const yellow = lam('#fbe67e'), white = lam('#fbf6ec'), wood = lam('#e2b878'), dark = lam('#3a2a26');
  // cuerpo con forma de telecaster: dos lóbulos y cintura
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.11);
  shape.bezierCurveTo(0.085, -0.11, 0.09, -0.04, 0.065, 0.0);
  shape.bezierCurveTo(0.055, 0.02, 0.07, 0.05, 0.06, 0.075);
  shape.bezierCurveTo(0.05, 0.095, 0.02, 0.09, 0.0, 0.085);
  shape.bezierCurveTo(-0.03, 0.095, -0.06, 0.09, -0.065, 0.06);
  shape.bezierCurveTo(-0.07, 0.035, -0.055, 0.02, -0.065, 0.0);
  shape.bezierCurveTo(-0.09, -0.04, -0.085, -0.11, 0, -0.11);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2 }), yellow);
  body.position.z = -0.0125;
  g.add(body);
  // golpeador blanco, pastillas y puente
  const guard = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), white);
  guard.position.set(-0.02, 0.0, 0.019); guard.scale.set(1, 1.3, 1);
  g.add(guard);
  for (const [y, w] of [[0.035, 0.03], [-0.06, 0.04]]) {
    const pu = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.004), dark);
    pu.position.set(0, y, 0.02);
    g.add(pu);
  }
  // mástil y pala
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.2, 0.012), wood);
  neck.position.set(0, 0.18, 0.006);
  g.add(neck);
  const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.055, 0.01), wood);
  headstock.position.set(0.004, 0.305, 0.006); headstock.rotation.z = -0.12;
  g.add(headstock);
  // cuerdas
  const strings = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(
    [-0.007, -0.0025, 0.0025, 0.007].flatMap(x => [new THREE.Vector3(x, -0.07, 0.022), new THREE.Vector3(x * 0.8, 0.28, 0.014)])),
    new THREE.LineBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0.8 }));
  g.add(strings);
  g.rotation.z = -0.45;
  g.scale.setScalar(0.85);
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.position.y = -0.03;
  return wrap;
}

// ── Camiseta Poster Boy: blanca, corazón marrón, «Recuerdos del Verano 26'» ──
function makeShirt() {
  const s = new THREE.Shape();
  [[0.38, 1], [0.22, 0.97], [0, 0.78], [0.12, 0.66], [0.21, 0.73], [0.21, 0], [0.79, 0],
   [0.79, 0.73], [0.88, 0.66], [1, 0.78], [0.78, 0.97], [0.62, 1]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.quadraticCurveTo(0.5, 0.86, 0.38, 1);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
  geo.translate(-0.5, -0.5, -0.015);
  const brown = '#6b3d29';
  const print = canvasTexture(512, 512, (c, w) => {
    c.fillStyle = '#fbf8f2'; c.fillRect(0, 0, w, w);
    c.fillStyle = brown; c.textAlign = 'center';
    c.font = `500 36px ${FONT}`;
    c.fillText('Poster Boy®', w / 2, 188);
    // corazón
    c.save(); c.translate(w / 2, 280); c.scale(1.5, 1.5);
    c.beginPath();
    c.moveTo(0, 22);
    c.bezierCurveTo(-34, 0, -30, -26, -12, -26);
    c.bezierCurveTo(-4, -26, 0, -20, 0, -14);
    c.bezierCurveTo(0, -20, 4, -26, 12, -26);
    c.bezierCurveTo(30, -26, 34, 0, 0, 22);
    c.fill(); c.restore();
    c.font = `400 22px ${FONT}`;
    c.fillText('Recuerdos del Verano 26’', w / 2, 360);
    // cuello y mangas con un poquito de sombra
    c.strokeStyle = 'rgba(120,100,90,.25)'; c.lineWidth = 6;
    c.beginPath(); c.arc(w / 2, 0, 66, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  });
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: print }));
  m.scale.setScalar(0.24);
  const g = new THREE.Group();
  g.add(m);
  return g;
}

function makeRadioOption() {
  const r = makeRadio();
  r.dialGlow.material.opacity = 0.35;
  r.object.remove(r.hit);
  r.object.scale.setScalar(1.35);
  const g = new THREE.Group();
  g.add(r.object);
  return g;
}

function labelSprite(text) {
  const tex = canvasTexture(512, 128, (c, w, h) => {
    c.font = `500 58px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(30,14,40,.75)'; c.shadowBlur = 14;
    c.fillStyle = '#fffbf0';
    c.fillText(text, w / 2, h / 2);
    c.shadowBlur = 0; c.fillText(text, w / 2, h / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  s.scale.set(0.36, 0.09, 1);
  s.renderOrder = 10;
  return s;
}

const MAKERS = { drums: makeDrums, guitar: makeGuitar, radio: makeRadioOption, shirt: makeShirt };
const LABELS = { conciertos: 'conciertos', musica: 'música', merch: 'merchandising' };
export const OPTIONS = {
  maria: [['conciertos', 'drums'], ['musica', 'radio'], ['merch', 'shirt']],
  luz: [['conciertos', 'guitar'], ['musica', 'radio'], ['merch', 'shirt']],
};

export function createOptions({ sparkles }) {
  const group = new THREE.Group();
  let items = [];
  let shownAt = -1, hidden = true, hovered = null, clock = 0;
  const anchor = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), toCam = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const cache = {};

  function build(name) {
    if (cache[name]) return cache[name];
    const list = OPTIONS[name].map(([key, model], i, arr) => {
      const root = new THREE.Group();
      const model3d = MAKERS[model]();
      root.add(model3d);
      const halo = glowSprite('#ffe6c4', 0.55, 0);
      halo.renderOrder = 4;
      root.add(halo);
      const stars = [0, 1, 2, 3].map(k => {
        const st = starSprite(['#fff6e0', '#ffd9ef', '#e4d6ff', '#fff6e0'][k], 0.08, 0);
        st.renderOrder = 6;
        root.add(st);
        return st;
      });
      const label = labelSprite(LABELS[key]);
      label.position.y = -0.17;
      root.add(label);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.pick = { type: 'option', id: key };
      root.add(hit);
      const a = arr.length === 1 ? 0 : -1 + (2 * i) / (arr.length - 1);   // -1..1 de izquierda a derecha
      return { key, root, model: model3d, halo, stars, label, hit, a, p: 0, hl: 0, phase: i * 1.7 };
    });
    cache[name] = list;
    return list;
  }

  return {
    object: group,
    get hits() { return hidden ? [] : items.map(i => i.hit); },
    keys() { return items.map(i => i.key); },
    /** Saca las opciones de la cabeza de name. headFn(out) da la posición de su cabeza. */
    show(name, headFn) {
      items.forEach(i => group.remove(i.root));
      items = build(name);
      items.forEach(i => { i.p = 0; i.hl = 0; group.add(i.root); });
      this.headFn = headFn;
      hidden = false; shownAt = clock; hovered = null;
    },
    hide() { hidden = true; hovered = null; },
    highlight(key) { hovered = key; },
    update(t, camera, dt) {
      clock = t;
      if (!items.length) return;
      if (this.headFn) this.headFn(anchor);
      camera.matrixWorld.extractBasis(right, up, toCam);
      // el arco queda centrado justo encima de la cabeza
      const arcAnchor = anchor;
      const R = 0.36;

      let any = false;
      items.forEach((it, i) => {
        const target = hidden ? 0 : clamp01((t - shownAt - i * 0.14) / 0.65);
        it.p = hidden ? Math.max(0, it.p - dt * 3) : target;
        if (it.p <= 0) { it.root.visible = false; return; }
        any = true;
        it.root.visible = true;
        const e = hidden ? it.p * it.p : easeOutBack(it.p);

        // arco por encima de la cabeza, mirando a la cámara
        const ang = it.a * 0.95;
        tmp.copy(arcAnchor)
          .addScaledVector(right, Math.sin(ang) * R * 1.25)
          .addScaledVector(up, 0.1 + Math.cos(ang) * R * 0.7)
          .addScaledVector(toCam, 0.1);
        it.root.position.copy(anchor).lerp(tmp, e);
        it.root.position.y += Math.sin(t * 1.6 + it.phase) * 0.018;
        it.root.quaternion.copy(camera.quaternion);

        it.hl += ((hovered === it.key && !hidden ? 1 : 0) - it.hl) * Math.min(1, dt * 8);
        const sc = Math.max(0.001, e) * (1 + 0.18 * it.hl);
        it.root.scale.setScalar(sc);
        it.model.rotation.y = Math.sin(t * 0.9 + it.phase) * 0.35 + it.hl * Math.sin(t * 2.2) * 0.15;
        it.model.rotation.x = 0.12;

        it.halo.material.opacity = 0.12 + 0.55 * it.hl;
        it.halo.scale.setScalar(0.45 + 0.25 * it.hl);
        it.stars.forEach((st, k) => {
          const a = t * 0.8 + k * Math.PI / 2 + it.phase;
          st.position.set(Math.cos(a) * 0.15, Math.sin(a * 1.3) * 0.1 + 0.02, 0.06);
          const tw = 0.5 + 0.5 * Math.sin(t * 6 + k * 2.1 + it.phase);
          st.material.opacity = (0.15 + 0.85 * it.hl) * tw;
          st.scale.setScalar((0.05 + 0.07 * it.hl) * (0.6 + 0.4 * tw));
        });
        it.label.material.opacity = it.hl;

        // estela de destellos al salir y chispas al pasar el ratón
        if (sparkles) {
          if (!hidden && it.p > 0 && it.p < 1 && Math.random() < 0.5) {
            sparkles.emit(it.root.position, 1, { spread: 0.04, speed: 0.15, up: 0.05, size: 0.05, life: 0.8 });
          }
          if (it.hl > 0.5 && Math.random() < dt * 10) {
            it.root.getWorldPosition(tmp);
            sparkles.emit(tmp, 1, { spread: 0.13, speed: 0.12, up: 0.12, size: 0.06, life: 0.9 });
          }
        }
      });
      if (!any && hidden) items.forEach(i => (i.root.visible = false));
    },
  };
}
