// Mar en calma: refleja el cielo, con ondas suaves y bruma hacia el horizonte.
import * as THREE from 'three';
import { SKY_GLSL, WATER_Y, FOG_COLOR, FOG_NEAR, FOG_FAR } from './util.js';

export function createSea() {
  const uniforms = {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uFog: { value: new THREE.Color(FOG_COLOR) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: false,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uCam, uFog;
      varying vec3 vWorld;
      ${SKY_GLSL}
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        float d = length(vWorld - uCam);
        vec3 V = normalize(uCam - vWorld);

        // pendiente de las ondas (suma de senos), más planas a lo lejos
        float a1 = p.x * 0.9 + p.y * 0.35 + t * 0.8;
        float a2 = p.y * 1.7 + p.x * 0.4 - t * 1.15;
        float a3 = p.x * 3.4 + p.y * 2.9 - t * 1.9;
        float a4 = p.x * 0.17 - p.y * 0.23 + t * 0.35;
        vec2 g = vec2(0.9, 0.35) * cos(a1) * 0.5
               + vec2(0.4, 1.7) * cos(a2) * 0.32
               + vec2(3.4, 2.9) * cos(a3) * 0.06
               + vec2(0.17, -0.23) * cos(a4) * 2.0;
        float att = 1.0 / (1.0 + d * 0.025);
        vec3 N = normalize(vec3(-g.x * 0.16 * att, 1.0, -g.y * 0.16 * att));

        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 sky = skyGradient(R);
        float fres = 0.12 + 0.88 * pow(1.0 - max(dot(N, V), 0.0), 3.5);
        vec3 deep = vec3(0.06, 0.05, 0.11);
        vec3 col = mix(deep, sky * 0.92, fres);

        // brillos en las crestas
        float crest = smoothstep(0.82, 1.0, sin(a2) * 0.6 + sin(a3) * 0.4);
        col += vec3(1.0, 0.7, 0.55) * crest * 0.08 * (1.0 - att * 0.6);

        // bruma: lejos se funde con el horizonte
        float f = smoothstep(${FOG_NEAR.toFixed(1)}, ${FOG_FAR.toFixed(1)}, d);
        vec3 hor = skyGradient(vec3(V.x * -1.0, 0.0, V.z * -1.0));
        col = mix(col, mix(uFog, hor, 0.6), f * 0.9);

        col = floor(col * 60.0 + 0.5) / 60.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_Y;

  return {
    object: mesh,
    update(t, camera) {
      uniforms.uTime.value = t;
      uniforms.uCam.value.copy(camera.position);
    },
  };
}
