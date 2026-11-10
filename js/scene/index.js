// Monta la escena de Mazarrón: renderizador, cámara, luces y bucle de animación.
import * as THREE from 'three';
import { FOG_COLOR, FOG_NEAR, FOG_FAR } from './util.js';
import { createSky } from './sky.js';
import { createSea } from './sea.js';
import { createBay } from './bay.js';
import { createBeach } from './beach.js';
import { createProps } from './props.js';
import { createCharacters } from './characters.js';
import { createSparkles } from './sparkles.js';
import { createOptions } from './options.js';

THREE.ColorManagement.enabled = false;   // colores "tal cual"


export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 4000);
  const CAM = new THREE.Vector3(0.25, 1.95, 3.3);
  const LOOK = new THREE.Vector3(-0.3, 0.9, -10);

  // luz ambiente de atardecer: cielo lila, suelo cálido
  scene.add(new THREE.HemisphereLight('#8f7cc4', '#3a2420', 0.9));
  // contraluz del sol ya puesto (desde el horizonte, a la izquierda)
  const rim = new THREE.DirectionalLight('#ff9a70', 0.9);
  rim.position.set(-250, 30, -500);
  scene.add(rim);
  // relleno suave desde detrás de la cámara, para que se os lea de espaldas
  const fill = new THREE.DirectionalLight('#b897d6', 0.55);
  fill.position.set(2, 4, 10);
  scene.add(fill);
  // luz de frente (desde la cámara) que se enciende al elegir personaje, para verle la cara
  const key = new THREE.DirectionalLight('#ffe6d2', 0);
  key.position.set(0, 0.6, 1);
  camera.add(key, key.target);
  key.target.position.set(0, 0, -1);
  scene.add(camera);

  const props = createProps();
  const sparkles = createSparkles();
  const chars = createCharacters({ sparkles });
  const options = createOptions({ sparkles });
  const parts = [createSky(), createSea(), createBay(), createBeach(), props, chars, options, sparkles];
  parts.forEach(p => scene.add(p.object));

  // mirar un poco con el ratón
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });

  let camBack = 0;
  let chosen = null, camShift = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = w / h < 1;
    camera.fov = portrait ? 66 : 50;   // en móvil, más angular y algo más lejos para que quepa todo
    camBack = portrait ? 2.4 : 0;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  let t = 0;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const k = reducedMotion ? 0 : 1;

    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 1.5);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 1.5);
    // al elegir una, la cámara se acerca un poquito hacia ella
    camShift += ((chosen ? chars.frontX(chosen) * 0.6 : 0) - camShift) * Math.min(1, dt * 1.2);
    key.intensity += ((chosen ? 1.1 : 0) - key.intensity) * Math.min(1, dt * 1.5);
    camera.position.set(
      CAM.x + camShift + Math.sin(t * 0.13) * 0.12 * k + pointer.sx * 0.15,
      CAM.y + camBack * 0.35 + Math.sin(t * 0.21) * 0.05 * k - pointer.sy * 0.08,
      CAM.z + camBack + Math.sin(t * 0.09) * 0.1 * k,
    );
    look.set(LOOK.x + camShift * 1.5 + pointer.sx * 1.6, LOOK.y - pointer.sy * 0.8, LOOK.z);
    camera.lookAt(look);

    for (const p of parts) p.update(t, camera, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // clic (o toque) en la radio, en un personaje o en una opción
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  props.radioHit.userData.pick = { type: 'radio' };
  let mode = 'intro';
  const pickFns = [], hoverFns = [], arriveFns = [];
  function pick(e) {
    if (e.target !== canvas) return null;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets = [props.radioHit];
    if (mode === 'menu') targets.push(...chars.hits);
    if (mode === 'char') targets.push(...options.hits);
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? hit.object.userData.pick : null;
  }
  let lastHover = null;
  window.addEventListener('pointermove', e => {
    const p = pick(e);
    canvas.style.cursor = p ? 'pointer' : '';
    const id = p && p.type !== 'radio' ? p.type + ':' + p.id : null;
    if (id !== lastHover) { lastHover = id; hoverFns.forEach(fn => fn(p && p.type !== 'radio' ? p : null)); }
  });
  window.addEventListener('click', e => { const p = pick(e); if (p) pickFns.forEach(fn => fn(p)); });

  chars.onArrive(name => {
    options.show(name, out => chars.headWorld(name, out));
    arriveFns.forEach(fn => fn(name, options.keys()));
  });

  return {
    /** 'intro' | 'menu' | 'char' | 'panel': qué se puede tocar en la escena. */
    setMode(m) { mode = m; },
    /** fn({type:'radio'|'char'|'option', id}) al tocar algo de la escena. */
    onPick(fn) { pickFns.push(fn); },
    /** fn({type, id} | null) al pasar el ratón por un personaje u opción. */
    onHover(fn) { hoverFns.push(fn); },
    /** fn(name, keys) cuando la elegida ha llegado y le salen las opciones. */
    onArrive(fn) { arriveFns.push(fn); },
    /** Enciende o apaga la radio en la escena (luces del dial). */
    setRadio(on) { props.setRadio(on); },
    highlightChar(name) { chars.highlight(name); },
    /** La elegida se levanta y viene (null: se vuelve a sentar). */
    chooseChar(name) {
      chosen = name;
      options.hide();
      chars.select(name, camera);
      props.setTapHint(!name);
    },
    highlightOption(key) { options.highlight(key); },
    /** Ilumina un elemento de la escena: 'town' | 'lamp' | 'island' | null */
    setFocus(key) { parts.forEach(p => p.setFocus && p.setFocus(key)); },
  };
}
