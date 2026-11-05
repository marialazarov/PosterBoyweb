// Cielo de golden hour: degradado lila, nubes finas y alguna estrella asomando.
import * as THREE from 'three';
import { SKY_GLSL } from './util.js';

export function createSky() {
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec3 vDir;
      ${SKY_GLSL}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = skyGradient(d);

        // nubes alargadas: lilas por arriba, encendidas en naranja por debajo
        if (h > 0.0) {
          vec2 uv = d.xz / (h + 0.06) * 0.3 + vec2(uTime * 0.003, 0.0);
          float c = fbm(uv * vec2(0.8, 3.6));
          c = smoothstep(0.52, 0.82, c) * smoothstep(0.015, 0.1, h) * (1.0 - smoothstep(0.3, 0.6, h));
          vec3 lit = mix(vec3(0.42, 0.27, 0.48), vec3(1.0, 0.6, 0.45), 1.0 - smoothstep(0.02, 0.2, h));
          col = mix(col, lit, c * 0.6);
        }

        // primeras estrellas, muy tenues
        vec2 sp = floor(d.xz / (h + 0.25) * 140.0);
        float st = step(0.996, hash(sp)) * smoothstep(0.3, 0.7, h);
        col += vec3(0.9, 0.85, 1.0) * st * (0.4 + 0.3 * sin(uTime * 2.0 + hash(sp) * 40.0));

        col = floor(col * 60.0 + 0.5) / 60.0;   // un poco de banding de época
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
  mesh.renderOrder = -1;

  return {
    object: mesh,
    update(t, camera) {
      uniforms.uTime.value = t;
      mesh.position.copy(camera.position);
    },
  };
}
