// Fondo de la bahía (según el videoclip «motel»):
// peñón rocoso a la izquierda, isla baja en el centro del horizonte,
// rocas oscuras a la derecha y luces del pueblo al otro lado del agua.
import * as THREE from 'three';
import { WATER_Y, rand, jitter, glowSprite, canvasTexture } from './util.js';

export function createBay() {
  const group = new THREE.Group();
  const R = rand(7);

  const rockMat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // ── Peñón: masa rocosa que baja desde la izquierda hasta el mar ──
  const penonMat = rockMat('#4a3448');
  const penon = new THREE.Group();
  const penonParts = [
    // [x, z, ancho, alto, fondo]
    [-230, -260, 90, 58, 70],
    [-175, -245, 70, 38, 55],
    [-130, -232, 52, 22, 42],
    [-96, -222, 34, 10, 30],
    [-74, -215, 18, 4, 18],
  ];
  penonParts.forEach(([x, z, w, h, d], i) => {
    const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 2), 0.35, i + 1), penonMat);
    m.scale.set(w, h, d);
    m.position.set(x, WATER_Y - 1, z);
    penon.add(m);
  });
  group.add(penon);

  // ── Isla: silueta baja y alargada con un bulto, al fondo en el centro ──
  const islandMat = rockMat('#5a3d58');
  const island = new THREE.Group();
  [
    [-10, -620, 120, 14, 50],
    [25, -630, 60, 26, 40],
    [60, -615, 70, 9, 40],
  ].forEach(([x, z, w, h, d], i) => {
    const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 2), 0.3, i + 20), islandMat);
    m.scale.set(w, h, d);
    m.position.set(x, WATER_Y - 2, z);
    island.add(m);
  });
  group.add(island);
  const islandHalo = glowSprite('#d9b4ff', 260, 0);
  islandHalo.position.set(20, 18, -650);
  group.add(islandHalo);

  // ── Rocas oscuras cerca de la orilla, a la derecha ──
  const nearRockMat = rockMat('#33242e');
  [
    [30, -70, 7, 3.5, 6], [36, -74, 5, 5, 5], [41, -68, 5, 2.5, 5], [25, -76, 3, 1.8, 3],
  ].forEach(([x, z, w, h, d], i) => {
    const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 1), 0.4, i + 40), nearRockMat);
    m.scale.set(w, h, d);
    m.position.set(x, WATER_Y - 0.4, z);
    group.add(m);
  });

  // ── Pueblo al otro lado (derecha del horizonte) ──
  const town = new THREE.Group();
  const lights = [];
  const winTex = canvasTexture(32, 64, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 6) {
      if (Math.random() < 0.35) {
        g.fillStyle = Math.random() < 0.8 ? '#ffc98a' : '#fff1d6';
        g.fillRect(x, y, 3, 3);
      }
    }
  }, { repeat: true });
  const buildingMats = [];
  const townBase = (x) => -480 - (x - 120) * 0.12;
  for (let x = 120; x < 560;) {
    const w = 10 + R() * 22;
    const h = 6 + R() * (R() < 0.15 ? 40 : 16);
    const tex = winTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(w / 16, h / 16);
    const mat = new THREE.MeshLambertMaterial({ color: '#3f3044', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.9 });
    buildingMats.push(mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 14), mat);
    b.position.set(x + w / 2, WATER_Y + h / 2 + 1, townBase(x));
    town.add(b);
    x += w + R() * 4;
  }
  // torre alta
  {
    const tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, 5);
    const mat = new THREE.MeshLambertMaterial({ color: '#3f3044', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.9 });
    buildingMats.push(mat);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(14, 44, 14), mat);
    tower.position.set(200, WATER_Y + 22, townBase(200) - 6);
    town.add(tower);
  }
  // colinas detrás del pueblo
  const hill = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 2), 0.25, 60), rockMat('#3a2a40'));
  hill.scale.set(320, 40, 80); hill.position.set(360, WATER_Y - 6, -580);
  town.add(hill);

  // farolas del paseo y luces del puerto
  for (let x = 110; x < 560; x += 9 + R() * 6) {
    const white = R() < 0.18;
    const s = glowSprite(white ? '#eef2ff' : '#ffc27a', white ? 11 : 6 + R() * 3, 0.9);
    s.position.set(x, WATER_Y + 3 + R() * 2, townBase(x) + 10);
    town.add(s);
    lights.push({ sprite: s, base: s.material.opacity, phase: R() * 10 });
  }
  // otro grupito de luces lejos a la izquierda, detrás del peñón
  for (let i = 0; i < 10; i++) {
    const s = glowSprite('#ffd08f', 5 + R() * 4, 0.8);
    s.position.set(-40 + i * 9, WATER_Y + 2 + R() * 2, -720);
    town.add(s);
    lights.push({ sprite: s, base: 0.8, phase: R() * 10 });
  }
  group.add(town);

  // ── Reflejos de las luces en el agua ──
  const streakTex = canvasTexture(16, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 2) {
      const a = Math.random() * Math.pow(y / h, 0.6);
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(Math.random() * 4, y, w - Math.random() * 8, 1);
    }
  }, { repeat: true });
  const streaks = [];
  const camXZ = new THREE.Vector2(0, 5);
  lights.forEach((l, i) => {
    if (i % 2 && l.sprite.scale.x < 9) return;
    const tex = streakTex.clone(); tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: l.sprite.material.color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const p = l.sprite.position;
    const dir = camXZ.clone().sub(new THREE.Vector2(p.x, p.z));
    const len = dir.length() * 0.45;
    dir.normalize();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l.sprite.scale.x * 0.45, len), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(dir.x, -dir.y) + Math.PI;
    m.position.set(p.x + dir.x * len / 2, WATER_Y + 0.05, p.z + dir.y * len / 2);
    group.add(m);
    streaks.push({ mesh: m, mat, tex, phase: R() * 10 });
  });

  // ── Énfasis al pasar por el menú ──
  let townBoost = 0, townTarget = 0, islandGlow = 0, islandTarget = 0;

  return {
    object: group,
    setFocus(key) {
      townTarget = key === 'town' ? 1 : 0;
      islandTarget = key === 'island' ? 1 : 0;
    },
    update(t, _cam, dt) {
      townBoost += (townTarget - townBoost) * Math.min(1, dt * 3);
      islandGlow += (islandTarget - islandGlow) * Math.min(1, dt * 3);

      for (const l of lights) {
        const tw = 0.85 + 0.15 * Math.sin(t * 2.3 + l.phase) * Math.sin(t * 0.7 + l.phase * 2);
        l.sprite.material.opacity = Math.min(1, l.base * tw * (1 + townBoost * 0.6));
      }
      for (const s of streaks) {
        s.tex.offset.y = (t * 0.06 + s.phase) % 1;
        s.mat.opacity = (0.35 + 0.2 * Math.sin(t * 1.7 + s.phase)) * (1 + townBoost * 0.8);
      }
      for (const m of buildingMats) m.emissiveIntensity = 0.9 + townBoost * 0.8;

      islandMat.emissive.setRGB(0.35 * islandGlow, 0.25 * islandGlow, 0.5 * islandGlow);
      islandHalo.material.opacity = islandGlow * 0.35;
    },
  };
}
