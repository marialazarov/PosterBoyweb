// Utilidades compartidas por las piezas de la escena.
import * as THREE from 'three';

export const WATER_Y = -0.35;

// Color de la bruma lejana (se funde con el cielo junto al horizonte)
export const FOG_COLOR = '#c47f86';
export const FOG_NEAR = 60;
export const FOG_FAR = 1400;

// Degradado del cielo, compartido por el cielo y por los reflejos del mar.
// Golden hour: lila oscuro arriba, rosa y melocotón en el horizonte.
export const SKY_GLSL = /* glsl */`
  vec3 skyGradient(vec3 d) {
    d = normalize(d);
    float h = max(d.y, 0.0);
    vec3 top   = vec3(0.11, 0.07, 0.22);
    vec3 lilac = vec3(0.31, 0.21, 0.45);
    vec3 rose  = vec3(0.72, 0.41, 0.53);
    vec3 peach = vec3(1.00, 0.63, 0.44);
    vec3 col = peach;
    col = mix(col, rose,  smoothstep(0.0, 0.07, h));
    col = mix(col, lilac, smoothstep(0.05, 0.26, h));
    col = mix(col, top,   smoothstep(0.22, 0.8, h));
    vec3 sunDir = normalize(vec3(-0.45, -0.04, -1.0));   // el sol acaba de ponerse, a la izquierda
    float s = max(dot(d, sunDir), 0.0);
    col += vec3(1.0, 0.5, 0.28) * pow(s, 6.0) * 0.55 * (1.0 - smoothstep(0.0, 0.35, h));
    return col;
  }
`;

// Generador aleatorio con semilla: la escena sale igual en cada visita.
export function rand(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(w, h, draw, { repeat = false, nearest = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (nearest) tex.magFilter = THREE.NearestFilter;
  return tex;
}

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  _glow = canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  return _glow;
}

export function glowSprite(color, scale, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  s.scale.set(scale, scale, 1);
  return s;
}

// Deforma una geometría de forma determinista según la posición de cada vértice
// (los vértices compartidos se mueven igual, así no se abren grietas).
export function jitter(geo, amount, seed = 1) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719 + seed) * 43758.5453;
    const n = (h - Math.floor(h)) - 0.5;
    v.multiplyScalar(1 + n * amount);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Malla en forma de cápsula que va del punto a al punto b
const UP = new THREE.Vector3(0, 1, 0);
export function limb(a, b, r, mat) {
  const dir = b.clone().sub(a);
  const len = Math.max(0.001, dir.length());
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}
