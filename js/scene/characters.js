// Luz y María: sentadas de espaldas mirando el mar. Al elegir una, se levanta,
// sale de la silla, se gira hacia la cámara y saluda.
// Estilo PS1 «trashy»: cuerpos de pocos polígonos con su foto de cuerpo entero
// pegada encima (proyectada de frente), sin el fondo gris, y sombreado facetado.
// La espalda es inventada: se rellena con trozos de pelo y ropa de la misma foto.
import * as THREE from 'three';
import { glowSprite, rand, canvasTexture } from './util.js';
import { groundHeight } from './beach.js';
import { CHAIR_X, CHAIR_Z } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const phong = (c, extra = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: 14, specular: 0x2a1c18, ...extra });
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

const LIFT = 0.36;            // cuánto sube la cadera al ponerse de pie
const DROP = 0.03;            // sentada, un poco más abajo (sillas más bajitas)
const DURATION = 2.6;         // segundos de levantarse → girarse → venir
const SEG = 7;                // lados de cada tubo del cuerpo (pocos = más PS1)

// ── La foto ──────────────────────────────────────────────────────
// Las zonas de cada parte se miden en píxeles de la foto (864×1184). La foto
// viene ya sin fondo: el gris se ha rellenado con el color de al lado.
const IMG = { w: 864, h: 1184 };

const canvas2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function pixelTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
/**
 * Textura del cuerpo: la foto a tamaño completo (tatuajes nítidos). cfg.covers
 * tapa las manos de la foto con trozos de ropa de al lado: [x, y, w, h, dx].
 */
function dollTextures(url, cfg) {
  const bodyC = canvas2d(IMG.w, IMG.h);
  const body = pixelTex(bodyC);
  const img = new Image();
  img.onload = () => {
    // foto de trabajo a tamaño original, con las manos tapadas
    const full = canvas2d(IMG.w, IMG.h), fg = full.getContext('2d');
    fg.drawImage(img, 0, 0, IMG.w, IMG.h);
    for (const [x, y, w, h, dx, dy = 0] of cfg.covers || []) fg.drawImage(full, x + dx, y + dy, w, h, x, y, w, h);
    if (cfg.paint) cfg.paint(fg);
    // tono de la piel de los brazos (mediana), para pintar la cara igual
    if (cfg.skinAt) {
      const [x, y, w, h] = cfg.skinAt, d = fg.getImageData(x, y, w, h).data;
      const ch = k => { const v = []; for (let i = k; i < d.length; i += 4) v.push(d[i]); v.sort((a, b) => a - b); return v[v.length >> 1] / 255; };
      out.onSkin?.(new THREE.Color().setRGB(ch(0), ch(1), ch(2), THREE.SRGBColorSpace));
    }
    bodyC.getContext('2d').drawImage(full, 0, 0);
    body.needsUpdate = true;
  };
  img.src = url;
  const out = { body, onSkin: null };
  return out;
}

// copia un trozo de la foto encima de otro con los bordes difuminados (para borrar cosas)
function softCopy(g, x, y, w, h, dx, dy) {
  const t = canvas2d(w, h), tg = t.getContext('2d');
  tg.drawImage(g.canvas, x + dx, y + dy, w, h, 0, 0, w, h);
  tg.globalCompositeOperation = 'destination-in';
  const gr = tg.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.55);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  tg.fillStyle = gr; tg.fillRect(0, 0, w, h);
  g.drawImage(t, x, y);
}

// ── Cara de muñeco pintada sobre una cabeza redonda de verdad ──
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
      const x = cx + sx * 0.41 * pxRad;
      shade(x, eyeY - 4, 46, 0.16);                                  // cuenca
      shade(x + sx * 14, yAt(Math.PI / 2 + 0.38), 40, 0.24, '230,105,110'); // colorete
      // ojo almendrado, un poco más grande
      g.save(); g.translate(x, eyeY); g.scale(1.5, 1.5);
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
      g.save(); g.translate(x, eyeY); g.scale(1.5, 1.5);
      g.strokeStyle = '#1a0f0e'; g.lineWidth = lashes; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-25, 2); g.quadraticCurveTo(-4, -17, 25, -3); g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(110,60,50,.6)';
      g.beginPath(); g.moveTo(-22, -9); g.quadraticCurveTo(-2, -24, 22, -10); g.stroke();
      g.beginPath(); g.moveTo(-20, 5); g.quadraticCurveTo(2, 12, 22, 0); g.stroke();
      g.restore();
      // ceja
      g.save(); g.translate(x, eyeY - 42); g.scale(1.2, 1.2);
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
    g.save(); g.translate(cx, my); g.scale(1.45, 1.45); g.translate(-cx, -my);
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
    g.restore();
    shade(cx, my + 24, 16, 0.12);   // hoyuelo de la barbilla
  });
}

// la foto ya trae su luz: brilla un poco por sí misma para no apagarse al atardecer
const PHOTO_GLOW = new THREE.Color(0.62, 0.58, 0.56);
const ARM_LIGHT = 1.2;          // cuánto más clara va la piel de los brazos que la foto
const photoMat = (map, extra = {}) => new THREE.MeshLambertMaterial({
  map, emissiveMap: map, emissive: PHOTO_GLOW, flatShading: true, ...extra,
});

// punto de la foto a lo largo de una zona A→B: t 0..1 (de A a B), s -1..1
// (+1 = su derecha, que en la foto queda a la izquierda)
function segUV(spec, t, s) {
  const [ax, ay] = spec.A, [bx, by] = spec.B;
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = dy / L, ny = -dx / L;
  const wA = spec.wA ?? spec.w, wB = spec.wB ?? spec.w;
  const w = wA + (wB - wA) * t;
  return [(ax + dx * t - nx * s * w) / IMG.w, 1 - (ay + dy * t - ny * s * w) / IMG.h];
}

/**
 * Proyecta la foto sobre un tubo vertical: cada anillo de vértices se reparte
 * a lo ancho de la zona. Delante usa `spec`; detrás, `back` (o la misma).
 * frontZ: hacia dónde mira su cara delantera · fromBottom: A está abajo (huesos)
 */
function projectTube(geo, spec, back, frontZ, fromBottom = false) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const h = max.y - min.y || 1;
  const ring = new Map();
  const key = y => Math.round(y * 1e4);
  for (let i = 0; i < p.count; i++) {
    const k = key(p.getY(i));
    ring.set(k, Math.max(ring.get(k) || 0, Math.abs(p.getX(i))));
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = clamp01(fromBottom ? (y - min.y) / h : (max.y - y) / h);
    const r = ring.get(key(y)) || 0;
    const s = r > 1e-5 ? Math.max(-1, Math.min(1, x / r)) : 0;
    const sp = z * frontZ >= -1e-6 ? spec : (back || spec);
    const [u, v] = segUV(sp, t, s);
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Proyección plana de frente sobre un rectángulo (cabeza, pelo, zapatos…). */
function projectRect(geo, rect, backRect = rect, frontZ = -1, backFrom = 0.25, size = IMG) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
  const hx = (max.x - min.x) / 2 || 1, hy = (max.y - min.y) / 2 || 1, hz = (max.z - min.z) / 2 || 1;
  for (let i = 0; i < p.count; i++) {
    const sx = (p.getX(i) - cx) / hx, sy = (p.getY(i) - cy) / hy;
    const behind = (p.getZ(i) - cz) * frontZ / hz < -backFrom;
    const [x0, y0, x1, y1] = behind ? backRect : rect;
    const px = (x0 + x1) / 2 - sx * (x1 - x0) / 2;
    const py = (y0 + y1) / 2 - sy * (y1 - y0) / 2;
    uv.setXY(i, px / size.w, 1 - py / size.h);
  }
  uv.needsUpdate = true;
  return geo;
}

// ── Huesos: tubos de pocos lados recolocados en cada fotograma ──
// Con giro estable: su cara delantera (+z de la pieza) mira siempre hacia
// delante del cuerpo, para que la foto no se dé la vuelta al moverse.
const FWD = V(0, 0, -1), RIGHT = V(1, 0, 0);
const _x = V(0, 0, 0), _y = V(0, 0, 0), _z = V(0, 0, 0), _m = new THREE.Matrix4();
function place(m, a, b) {
  _y.subVectors(b, a);
  const len = Math.max(0.001, _y.length());
  _y.divideScalar(len);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  const f = _y.dot(FWD);
  if (Math.abs(f) < 0.8) {
    _z.copy(FWD).addScaledVector(_y, -f).normalize();
    _x.crossVectors(_y, _z);
  } else {
    _x.copy(RIGHT).addScaledVector(_y, -_y.dot(RIGHT)).normalize();
    _z.crossVectors(_x, _y);
  }
  _m.makeBasis(_x, _y, _z);
  m.quaternion.setFromRotationMatrix(_m);
  m.scale.y = len / m.userData.len;
}
// tubo del punto a (abajo en la geometría, radio rA) al b (arriba, radio rB)
function bone(rA, rB, len, mat, spec, back, seg = SEG) {
  const g = new THREE.CylinderGeometry(rB, rA, len, seg, 2);
  projectTube(g, spec, back, 1, true);
  const m = new THREE.Mesh(g, mat);
  m.userData.len = len;
  return m;
}
const joint = (r, mat, rect, detail = 0) => new THREE.Mesh(projectRect(new THREE.IcosahedronGeometry(r, detail), rect), mat);

const around = ([x, y], w, h = w) => [x - w, y - h, x + w, y + h];

/**
 * Cuerpo articulado (mirando hacia -z) con la foto encima.
 * S: zonas de la foto · o: medidas propias de cada una
 */
function photoBody(mat, S, o) {
  // piel de brazos, manos y cuello: la misma foto, un poco más clara
  const skinMat = mat.clone();
  skinMat.flatShading = false;           // la piel, suave
  skinMat.color.setScalar(ARM_LIGHT);
  skinMat.emissive.multiplyScalar(ARM_LIGHT);
  const body = new THREE.Group();     // en el suelo
  const upper = new THREE.Group();    // tronco, cuello y cabeza: sube al levantarse
  body.add(upper);

  // tronco: de la cadera (0.47) a los hombros (1.0), en coordenadas de sentada
  // tronco recto (sin cadera ni pecho), redondo y suave, con los hombros
  // redondeados arriba para que la foto no parezca pegada en un bloque
  const prof = [[0.13, 0.47], [0.13, 0.6], [0.13, 0.75], [0.13, 0.88], [0.128, 0.93], [0.118, 0.965],
    [0.09, 0.99], [0.05, 1.002], [0.0001, 1.006]];
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y - 0.738)));
  const tg = new THREE.LatheGeometry(curve.getPoints(28), 20);
  projectTube(tg, S.torso, S.torsoBack, -1);
  tg.scale(o.torso[0] / 0.13, 1, 0.62 * o.torso[0] / 0.13);
  tg.translate(0, 0.738, 0.07);
  tg.computeVertexNormals();
  const torsoMat = mat.clone();
  torsoMat.flatShading = false;
  torsoMat.emissive.multiplyScalar(0.75);   // menos brillo propio: que se note el volumen
  torsoMat.color.setScalar(1.15);
  const torso = new THREE.Mesh(tg, torsoMat);
  upper.add(torso);

  const neck = bone(0.045, 0.04, 0.09, skinMat, S.neck, null, 6);
  place(neck, V(0, 0.98, 0.08), V(0, 1.08, 0.075));
  upper.add(neck);

  // cabeza redonda de tamaño natural, piel lisa y cara de muñeco pintada
  const head = new THREE.Group();
  head.position.set(0, 1.06, 0.07);
  // misma luz que el cuerpo de la foto, para que la cara tenga el tono de los brazos
  const skin = new THREE.MeshLambertMaterial();
  const skull = new THREE.Mesh(shapeHead(new THREE.SphereGeometry(0.088, 24, 18)), skin);
  skull.position.y = 0.1;
  const faceMap = faceTexture(o.face);
  skull.add(new THREE.Mesh(
    shapeHead(new THREE.SphereGeometry(0.0886, 40, 28, FACE.phi0, FACE.phiLen, FACE.th0, FACE.thLen)),
    new THREE.MeshLambertMaterial({ map: faceMap, emissiveMap: faceMap, emissive: PHOTO_GLOW, transparent: true,
      depthWrite: false })));
  // naricita y orejas
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), skin);
  nose.scale.set(0.8, 1.5, 0.7); nose.position.set(0, -0.016, -0.085);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), skin);
  tip.scale.set(1, 0.9, 0.8); tip.position.set(0, -0.026, -0.088);
  skull.add(nose, tip);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), skin);
    ear.scale.set(0.45, 1.2, 0.8); ear.position.set(sx * 0.08, 0.0, 0.0);
    skull.add(ear);
  }
  head.add(skull);
  upper.add(head);

  // piernas y brazos (+1 = su derecha)
  const L = o.legs;
  const legs = [1, -1].map(sx => {
    const k = sx > 0 ? 'R' : 'L';
    const thigh = bone(L[0], L[1], 0.36, mat, S['thigh' + k]);
    const shin = bone(L[2], L[3], 0.4, mat, S['shin' + k]);
    const knee = joint(L[1] * 1.02, mat, around(S['shin' + k].A, S['shin' + k].w * 0.7));
    const shoe = new THREE.Mesh(projectRect(new THREE.BoxGeometry(o.shoe[0], 0.075, o.shoe[1]), S['shoe' + k].rect, S['shoe' + k].rect, -1, 2), mat);
    body.add(thigh, shin, knee, shoe);
    return { sx, thigh, shin, knee, shoe };
  });
  const A = o.arms;
  const armsList = [1, -1].map(sx => {
    const k = sx > 0 ? 'R' : 'L';
    // brazos redondos (más lados) para que no parezcan de madera
    const up = bone(A[0], A[1], 0.26, skinMat, S['up' + k], null, 12);
    const fore = bone(A[2], A[3], 0.235, skinMat, S['fore' + k], null, 12);
    const elbow = joint(A[1] * 1.02, skinMat, around(S['up' + k].B, S['up' + k].w * 0.6), 2);
    const hand = bone(0.03, 0.026, 0.085, skinMat, S['hand' + k], null, 5);
    // hombro: redondo y metido en el tronco, con piel de un poco más abajo del borde
    const [sxp, syp] = S['up' + k].A;
    // hombro grande que tapa el corte de arriba del brazo y llega al tronco
    const shoulderAt = S['shoulder' + k] || [sxp + sx * 4, syp + 22];   // un trozo de piel limpia
    const shoulder = joint(A[0] * 1.35, skinMat, around(shoulderAt, S.shoulderR ? 14 : 5), 2);
    shoulder.scale.set(1.05, 0.95, 0.9);
    if (o.noShoulderBall) {
      // sin bola: solo remata la punta del brazo, del mismo grosor y con la misma foto
      shoulder.geometry.dispose();
      shoulder.geometry = projectRect(new THREE.SphereGeometry(A[0] * 1.02, 14, 10), around([sxp, syp + 12], S['up' + k].w * 0.9));
      shoulder.scale.set(1, 0.8, 1);
      shoulder.userData.flush = true;
    }
    body.add(up, fore, elbow, hand, shoulder);
    return { sx, up, fore, elbow, hand, shoulder };
  });

  const P = { hip: V(0, 0, 0), knee: V(0, 0, 0), ankle: V(0, 0, 0), sh: V(0, 0, 0), el: V(0, 0, 0), hand: V(0, 0, 0) };
  const tmp = V(0, 0, 0), dir = V(0, 0, 0);
  const mix = (out, a, b, k) => out.copy(a).lerp(b, k);
  const armsCrossed = o.armsCrossed;

  /**
   * b: 0 sentada → 1 de pie · stride: fase del paso · walk: 0..1 cuánto camina
   * wave: 0..1 saludo con el brazo de fuera (waveSide)
   */
  function pose({ b, stride = 0, walk = 0, wave = 0, waveSide = 1, t = 0 }) {
    upper.position.y = -DROP + (LIFT + DROP) * b;
    for (const Lg of legs) {
      const { sx } = Lg;
      const sw = Math.sin(stride + (sx > 0 ? 0 : Math.PI)) * walk;
      const lift = Math.max(0, Math.cos(stride + (sx > 0 ? 0 : Math.PI))) * walk;
      mix(P.hip, V(sx * 0.075, 0.53 - DROP, 0.03), V(sx * 0.075, 0.53 + LIFT, 0.03), b);
      mix(P.knee, V(sx * 0.095, 0.52 - DROP, -0.33), V(sx * 0.085, 0.5, 0.02), b);
      P.knee.z -= Math.sin(Math.PI * b) * 0.08 + sw * 0.07;
      P.knee.y += lift * 0.05;
      mix(P.ankle, V(sx * 0.11, 0.09, -0.4), V(sx * 0.09, 0.09, 0.03), b);
      P.ankle.z -= sw * 0.12; P.ankle.y += lift * 0.07;
      place(Lg.thigh, P.hip, P.knee);
      place(Lg.shin, P.knee, P.ankle);
      Lg.knee.position.copy(P.knee);
      Lg.shoe.position.set(P.ankle.x, P.ankle.y - 0.05, P.ankle.z - 0.03);
    }
    for (const Ar of armsList) {
      const { sx } = Ar;
      P.sh.set(sx * (o.shoulderX ?? 0.165), (o.shoulderY ?? 0.94) - DROP + (LIFT + DROP) * b, 0.08);
      const seatEl = armsCrossed ? V(sx * 0.2, 0.74 - DROP, -0.02) : V(sx * 0.23, 0.71 - DROP, 0.02);
      const seatHand = armsCrossed ? V(-sx * 0.08, 0.82 - DROP, -0.11) : V(sx * 0.2, 0.62 - DROP, -0.2);
      const swing = Math.sin(stride + (sx > 0 ? Math.PI : 0)) * walk * 0.07;
      const breathe = Math.sin(t * 1.4) * 0.006;
      mix(P.el, seatEl, V(sx * (o.elbowX ?? 0.2), 0.69 + LIFT, 0.08 + swing), b);
      mix(P.hand, seatHand, V(sx * (o.handX ?? 0.215), 0.46 + LIFT + breathe, 0.05 + swing * 2), b);
      if (wave > 0 && sx === waveSide) {
        P.el.lerp(V(sx * 0.29, 0.82 + LIFT, 0.05), wave);
        P.hand.lerp(V(sx * (0.31 + Math.sin(t * 9) * 0.05), 1.03 + LIFT, 0.01), wave);
      }
      place(Ar.up, P.sh, P.el);
      place(Ar.fore, P.el, P.hand);
      Ar.elbow.position.copy(P.el);
      if (Ar.shoulder.userData.flush) Ar.shoulder.position.copy(P.sh);
      else Ar.shoulder.position.copy(P.sh).add(tmp.set(-sx * 0.014, -0.004, 0));
      // mano: sigue la dirección del antebrazo
      dir.subVectors(P.hand, P.el).normalize();
      place(Ar.hand, P.hand, tmp.copy(P.hand).addScaledVector(dir, 0.085));
    }
  }

  // la foto se convierte de sRGB al usarla como textura: el color de piel sacado
  // de ella pasa por lo mismo (a medias, para que la cara quede un poco más
  // clara que los brazos), y lleva la misma luz que el cuerpo
  const FACE_LIGHT = 0.35;     // 0 = tono exacto de los brazos · 1 = muy clara
  const setSkin = c => {
    skin.color.copy(c).convertSRGBToLinear().lerp(c, FACE_LIGHT);
    skin.emissive.copy(skin.color).multiply(PHOTO_GLOW);
  };
  setSkin(new THREE.Color(o.skin));
  return { body, upper, torso, head, skull, legs, armsList, pose, setSkin };
}

// ── Pelo de los muñecos de antes ──
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
// casquete con forma de cabeza (mandíbula, nuca llena)
function shapeHead(geo) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = v.length() || 1, ny = v.y / r;
    const jaw = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
    v.x *= 0.9 * jaw;
    v.z *= (ny < 0 ? 1 - 0.12 * -ny : 1) * (v.z > 0 ? 1.06 : 1);
    v.y *= 1.12;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── María: rizos, tirantes rosa, tatuajes, cargo de camuflaje muy anchos ──
const MARIA = {
  head: { rect: [332, 88, 532, 278] },
  hairBack: [470, 105, 515, 150],
  neck: { A: [432, 250], B: [432, 292], w: 20 },
  torso: { A: [432, 292], B: [432, 600], w: 86 },
  torsoBack: { A: [432, 360], B: [432, 600], w: 70 },
  upR: { A: [337, 300], B: [318, 495], w: 18 },
  foreR: { A: [318, 495], B: [312, 590], w: 12 },
  handR: { A: [314, 528], B: [313, 560], w: 8 },          // manos: piel lisa, sin la mancha de la muñeca
  upL: { A: [527, 300], B: [545, 495], w: 18 },
  shoulderR: [330, 345], shoulderL: [530, 345],             // piel del hombro, sin tatuaje
  foreL: { A: [545, 495], B: [550, 590], w: 12 },
  handL: { A: [549, 555], B: [550, 590], w: 8 },
  thighR: { A: [385, 610], B: [350, 860], w: 55 },
  shinR: { A: [350, 860], B: [300, 1045], w: 55 },
  thighL: { A: [480, 610], B: [515, 860], w: 55 },
  shinL: { A: [515, 860], B: [565, 1045], w: 55 },
  shoeR: { rect: [238, 1065, 306, 1122] },
  shoeL: { rect: [544, 1065, 612, 1122] },
};

function makeMaria() {
  const tex = dollTextures('assets/characters/maria.webp', {
    head: MARIA.head.rect,
    // tapa las manos de la foto (que no salgan pintadas en el pantalón)
    covers: [[286, 590, 50, 130, 52], [526, 590, 52, 130, -52]],
    skinAt: [309, 525, 9, 25],
    paint: g => {
      softCopy(g, 312, 490, 26, 30, 0, 22);   // fuera el corazón del antebrazo (piel de justo debajo)
      // tatuaje: mancha suave arriba de la muñeca derecha (punteado, no muy oscuro)
      const R = rand(9), cx = 314, cy = 578;
      const gr = g.createRadialGradient(cx, cy, 1, cx, cy, 12);
      gr.addColorStop(0, 'rgba(58,60,72,.38)'); gr.addColorStop(0.6, 'rgba(58,60,72,.2)'); gr.addColorStop(1, 'rgba(58,60,72,0)');
      g.save(); g.translate(cx, cy); g.scale(1, 0.7); g.translate(-cx, -cy);
      g.fillStyle = gr; g.fillRect(cx - 13, cy - 13, 26, 26);
      g.restore();
      g.fillStyle = 'rgba(50,52,62,.35)';
      for (let i = 0; i < 60; i++) {
        const a = R() * Math.PI * 2, r = Math.pow(R(), 0.7) * 9.5;
        g.fillRect(cx + Math.cos(a) * r - 0.5, cy + Math.sin(a) * r * 0.7 - 0.5, 1, 1);
      }
    },
  });
  const mat = photoMat(tex.body);
  const rig = photoBody(mat, MARIA, {
    shoulderX: 0.14, shoulderY: 0.925, noShoulderBall: true,   // el brazo sale del tronco, sin bola
    elbowX: 0.17, handX: 0.2,              // brazos pegados al cuerpo, como en la foto
    skin: '#d9a487', face: { brows: '#1e130e', lips: '#b3272f', iris: '#3e2618', lashes: 6 },
    torso: [0.16, 0.155], legs: [0.115, 0.105, 0.105, 0.125], arms: [0.04, 0.032, 0.03, 0.024],
    shoe: [0.1, 0.22], armsCrossed: true,
  });
  tex.onSkin = rig.setSkin;
  // cintura del pantalón
  const wg = new THREE.CylinderGeometry(0.15, 0.16, 0.1, 20);
  projectTube(wg, { A: [432, 590], B: [432, 625], w: 92 }, null, -1);
  const waistMat = mat.clone();
  waistMat.flatShading = false;
  const waist = new THREE.Mesh(wg, waistMat);
  waist.position.set(0, 0.52, 0.06); waist.scale.z = 0.8;
  rig.upper.add(waist);

  // el afro de los muñecos de antes, agrandado a la cabeza nueva
  const hairMat = phong('#2a1a12', { flatShading: true, shininess: 8 });
  const hairMat2 = phong('#1c110c', { flatShading: true, shininess: 8 });
  const hair = new THREE.Group();
  const afro = new THREE.Group();
  hair.add(afro);
  afro.position.set(0, 0.03, 0.02);
  const R = rand(21);
  // puntos de la cara que los rizos no deben tapar (en coordenadas del rizo)
  const facePts = [V(-0.032, -0.035, -0.1), V(0.032, -0.035, -0.1), V(0, -0.07, -0.095), V(0, -0.1, -0.08)];
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
  rig.skull.add(hair);
  return { ...rig, hair, lookBias: -0.3 };
}

// ── Camiseta ringer de Luz (pintada, como los muñecos de antes) ──
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
const ringerTex = (skin) => canvasTexture(512, 256, (g, w, h) => {
  g.fillStyle = '#f6f1e8'; g.fillRect(0, 0, w, h);
  folds(g, w, h, 10, 0.05, rand(4));
  g.fillStyle = skin; g.fillRect(0, 0, w, h * 0.07);
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
function torsoGeo() {
  const prof = [[0.0001, 0.47], [0.1, 0.478], [0.134, 0.53], [0.135, 0.58], [0.127, 0.65], [0.124, 0.72],
    [0.125, 0.79], [0.128, 0.86], [0.14, 0.915], [0.134, 0.952],
    [0.1, 0.982], [0.05, 0.998], [0.0001, 1.004]];
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(48), 16);
  g.scale(1.2, 1, 0.6);
  g.translate(0, 0, 0.07);
  return g;
}

// ── Luz: melena con flequillo y moñito, ringer de Laagam, falda midi de cuadros ──
const LUZ = {
  head: { rect: [384, 100, 500, 265] },
  hairBack: [428, 136, 452, 152],
  bun: [425, 102, 462, 135],
  neck: { A: [441, 255], B: [441, 292], w: 18 },
  torso: { A: [441, 290], B: [441, 590], w: 92 },
  torsoBack: { A: [441, 385], B: [441, 555], w: 80 },
  upR: { A: [335, 412], B: [333, 470], w: 13 },          // solo la piel, bajo la manga
  foreR: { A: [333, 470], B: [330, 555], w: 11 },
  handR: { A: [331, 520], B: [331, 555], w: 8 },          // manos: piel lisa del antebrazo
  upL: { A: [547, 412], B: [549, 470], w: 13 },
  foreL: { A: [549, 470], B: [553, 555], w: 11 },
  handL: { A: [552, 520], B: [552, 555], w: 8 },
  thighR: { A: [410, 900], B: [411, 980], w: 14 },
  thighL: { A: [410, 900], B: [411, 980], w: 14 },
  shinR: { A: [410, 890], B: [413, 1048], w: 20 },
  shinL: { A: [470, 890], B: [468, 1048], w: 20 },
  shoeR: { rect: [380, 1052, 440, 1122] },
  shoeL: { rect: [440, 1052, 500, 1122] },
  skirt: { A: [442, 565], B: [442, 885], wA: 100, wB: 138 },
  hem: { A: [442, 760], B: [442, 885], wA: 128, wB: 138 },
};

function makeLuz() {
  const tex = dollTextures('assets/characters/luz.webp', {
    head: LUZ.head.rect,
    covers: [[298, 555, 54, 160, 54], [530, 555, 58, 160, -56]],
    skinAt: [327, 485, 7, 30],
  });
  const mat = photoMat(tex.body);
  const rig = photoBody(mat, LUZ, {
    skin: '#f0c7b2', face: { brows: '#3a2418', lips: '#c4706c', iris: '#5a3a24', lashes: 6.5 },
    torso: [0.16, 0.145], legs: [0.07, 0.046, 0.04, 0.03], arms: [0.034, 0.026, 0.025, 0.02],
    shoe: [0.085, 0.2],
  });
  tex.onSkin = rig.setSkin;
  const { upper, head } = rig;
  // camiseta ringer pintada, con mangas cortas y ribete oscuro
  const tee = photoMat(ringerTex('#f0c7b2'));
  rig.torso.geometry.dispose();
  rig.torso.geometry = torsoGeo();
  rig.torso.material = tee;
  const sleeveMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: new THREE.Color(0.55, 0.55, 0.55) });
  const trim = lam('#111111');
  const sleeves = rig.armsList.map(A => {
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.05, 0.1, 12), sleeveMat);
    sl.userData.len = 0.1;                 // place() la estira según esto
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0028, 4, 16), trim);   // bordecito negro
    cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.05;
    sl.add(cuff);
    A.shoulder.material = sleeveMat;
    rig.body.add(sl);
    return { A, sl };
  });
  const sleeveEnd = V(0, 0, 0);
  const twoSided = photoMat(mat.map, { side: THREE.DoubleSide });

  // falda midi con vuelo: sentada cae por delante de las rodillas; de pie, de la cadera a media pierna
  const hem = new THREE.Mesh(projectTube(new THREE.CylinderGeometry(0.17, 0.22, 0.16, 8, 1, true), LUZ.hem, null, -1), twoSided);
  const fg = new THREE.CylinderGeometry(0.15, 0.25, 1, 10, 3, true);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) {   // pliegues
    const x = fp.getX(i), z = fp.getZ(i), y = fp.getY(i);
    const a = Math.atan2(z, x), k = 1 + Math.sin(a * 5) * 0.06 * (0.5 - y);
    fp.setXYZ(i, x * k, y, z * k);
  }
  projectTube(fg, LUZ.skirt, null, -1);
  const flare = new THREE.Mesh(fg, twoSided);
  const wg = new THREE.CylinderGeometry(0.13, 0.15, 0.08, 8);
  projectTube(wg, { A: [442, 565], B: [442, 600], w: 100 }, null, -1);
  const waist = new THREE.Mesh(wg, mat);
  waist.position.set(0, 0.53, 0.04); waist.scale.z = 0.8;
  upper.add(waist);
  rig.body.add(hem, flare);

  // el pelo de los muñecos de antes, agrandado a la cabeza nueva
  // (todo en coordenadas de la cabeza antigua, centrado en el cráneo)
  const hairMat = phong('#ffffff', { map: hairStrands('#a07a4c', 'rgba(222,190,140,1)', 'rgba(110,78,46,1)', 7), side: THREE.DoubleSide, shininess: 30 });
  const hairs = new THREE.Group();
  rig.skull.add(hairs);
  // gorro de pelo: por detrás y por arriba, con raya en medio
  for (const geo of [
    new THREE.SphereGeometry(0.096, 16, 12, 0, Math.PI, 0, Math.PI * 0.75),
    new THREE.SphereGeometry(0.096, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.3),
  ]) {
    const cap = new THREE.Mesh(shapeHead(geo), hairMat);
    cap.position.set(0, 0.005, 0.006);
    hairs.add(cap);
  }
  // melena larga detrás (lámina curva)
  const hair = new THREE.Group();
  hair.position.set(0, 0.02, 0.03);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 14, 4, true, -Math.PI / 2 - 0.1, Math.PI + 0.2), hairMat);
  back.position.set(0, -0.2, 0.02);
  back.scale.z = 0.75;
  hair.add(back);
  hairs.add(hair);
  // mechones delante de los hombros, enmarcando la cara
  for (const sx of [-1, 1]) {
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.32, 8, 3, true, 0, Math.PI * 2), hairMat);
    lock.position.set(sx * 0.085, -0.16, -0.01);
    lock.rotation.z = sx * 0.12;
    lock.scale.z = 0.5;
    hairs.add(lock);
  }
  // flequillo cortina, abierto en medio
  for (const sx of [-1, 1]) {
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8, Math.PI * 1.5 - (sx < 0 ? 0.95 : -0.05), 0.9, Math.PI * 0.2, Math.PI * 0.2), hairMat);
    fringe.position.set(0, 0.005, 0.004);
    fringe.scale.set(0.95, 1.12, 1.0);
    hairs.add(fringe);
  }
  // moñito arriba
  const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), hairMat);
  bun.position.set(0, 0.115, 0.03);
  hairs.add(bun);

  const pose = rig.pose;
  rig.pose = (o) => {
    pose(o);
    for (const { A, sl } of sleeves) {
      sleeveEnd.copy(A.shoulder.position).lerp(A.elbow.position, 0.42);
      place(sl, sleeveEnd, A.shoulder.position);
    }
    const b = o.b;
    hem.visible = b < 0.5;
    hem.position.set(0, 0.36 + 0.26 * b, -0.33 + 0.27 * b);
    flare.visible = b >= 0.5;
    const len = 0.3 + 0.16 * smooth((b - 0.5) * 2);
    flare.scale.set(1, len, 0.85);
    flare.position.set(0, 0.88 + 0.02 - len / 2, 0.03);
    flare.rotation.z = Math.sin((o.t || 0) * 1.3) * 0.03;
  };

  return { ...rig, hair, lookBias: 0.35 };
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
    p.body.scale.setScalar(0.93);   // tamaño de persona junto a las sillas
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
