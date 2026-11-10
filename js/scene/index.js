// Monta la escena de Mazarrón: renderizador, cámara, luces y bucle de animación.
import * as THREE from 'three';
import { FOG_COLOR, FOG_NEAR, FOG_FAR } from './util.js';
import { createSky } from './sky.js';
import { createSea } from './sea.js';
import { createBay } from './bay.js';
import { createBeach } from './beach.js';
import { createProps } from './props.js';
import { createCharacters } from './characters.js';

THREE.ColorManagement.enabled = false;   // colores "tal cual"


export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(1);   // un pelín suave, sin llegar a pixelado

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

  const props = createProps();
  const parts = [createSky(), createSea(), createBay(), createBeach(), props, createCharacters()];
  parts.forEach(p => scene.add(p.object));

  // mirar un poco con el ratón
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });

  let camBack = 0;
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
    camera.position.set(
      CAM.x + Math.sin(t * 0.13) * 0.12 * k + pointer.sx * 0.15,
      CAM.y + camBack * 0.35 + Math.sin(t * 0.21) * 0.05 * k - pointer.sy * 0.08,
      CAM.z + camBack + Math.sin(t * 0.09) * 0.1 * k,
    );
    look.set(LOOK.x + pointer.sx * 1.6, LOOK.y - pointer.sy * 0.8, LOOK.z);
    camera.lookAt(look);

    for (const p of parts) p.update(t, camera, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // clic (o toque) en la radio de la mesa
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onRadio = [];
  function overRadio(e) {
    if (e.target !== canvas) return false;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(props.radioHit, false).length > 0;
  }
  window.addEventListener('pointermove', e => { canvas.style.cursor = overRadio(e) ? 'pointer' : ''; });
  window.addEventListener('click', e => { if (overRadio(e)) onRadio.forEach(fn => fn()); });

  return {
    /** Llama a fn cuando se toca la radio. */
    onRadioClick(fn) { onRadio.push(fn); },
    /** Enciende o apaga la radio en la escena (luces del dial). */
    setRadio(on) { props.setRadio(on); },
    /** Ilumina un elemento de la escena: 'town' | 'lamp' | 'island' | null */
    setFocus(key) { parts.forEach(p => p.setFocus && p.setFocus(key)); },
  };
}
