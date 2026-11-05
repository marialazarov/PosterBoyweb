// Playa de piedras redondeadas y la espuma de la orilla.
import * as THREE from 'three';
import { WATER_Y, rand } from './util.js';

// Altura del suelo en cada punto (la orilla queda hacia z ≈ -8)
export function groundHeight(x, z) {
  const base = z > -5 ? (z + 5) * 0.05 : (z + 5) * 0.12;
  const bumps = Math.sin(x * 0.7) * 0.04 + Math.sin(x * 0.23 + z * 0.5) * 0.06;
  const leftRise = x < -9 ? (-(x + 9)) * 0.1 : 0;
  return base + bumps + leftRise;
}
export const SHORE_Z = -7.9;

export function createBeach() {
  const group = new THREE.Group();
  const R = rand(3);

  // suelo
  const geo = new THREE.PlaneGeometry(70, 34, 140, 68);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -3);
  const pos = geo.attributes.position;
  const colors = [];
  const cA = new THREE.Color('#2e231f'), cB = new THREE.Color('#4a3830'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    c.copy(cA).lerp(cB, R());
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // piedras
  const COUNT = 5200;
  const stones = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({ flatShading: true }),
    COUNT,
  );
  const palette = ['#7a5e4c', '#9a7a5e', '#5a4538', '#b39274', '#6e6260', '#8c6a50', '#4a3a33'].map(h => new THREE.Color(h));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    // más densidad cerca de la cámara y del centro
    const x = (R() - 0.5) * 2 * (6 + Math.pow(R(), 1.5) * 14);
    const z = SHORE_Z - 0.4 + Math.pow(R(), 0.8) * 16;
    const near = Math.max(0, z - 1) / 5;          // más pequeñas cerca de la cámara
    const r = (0.05 + Math.pow(R(), 2.4) * 0.14) * (1 - near * 0.45);
    s.set(r * (0.9 + R() * 0.5), r * (0.5 + R() * 0.25), r * (0.9 + R() * 0.4));
    p.set(x, groundHeight(x, z) + s.y * 0.35, z);
    q.setFromEuler(e.set(R() * 0.4, R() * 6.3, R() * 0.4));
    stones.setMatrixAt(i, m.compose(p, q, s));
    stones.setColorAt(i, palette[Math.floor(R() * palette.length)]);
  }
  group.add(stones);

  // espuma de la orilla
  const foamU = { uTime: { value: 0 } };
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 2.2, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: foamU, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv; varying vec3 vW;
        void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uTime; varying vec2 vUv; varying vec3 vW;
        void main() {
          float wave = sin(uTime * 0.9 + vW.x * 0.15) * 0.5 + 0.5;
          float edge = 1.0 - abs(vUv.y - 0.35 - wave * 0.3) * 4.0;
          float n = sin(vW.x * 3.1 + uTime * 0.6) * sin(vW.x * 1.3 - uTime * 0.4);
          float a = clamp(edge + n * 0.4, 0.0, 1.0) * smoothstep(30.0, 10.0, abs(vW.x));
          gl_FragColor = vec4(vec3(0.95, 0.85, 0.88), a * 0.35);
        }`,
    }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, WATER_Y + 0.03, SHORE_Z + 0.2);
  group.add(foam);

  return {
    object: group,
    update(t) { foamU.uTime.value = t; },
  };
}
