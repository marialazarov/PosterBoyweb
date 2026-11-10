import { createScene } from './scene/index.js';
import * as audio from './audio.js';
import { initUI } from './ui.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const world = createScene(document.getElementById('scene'), { reducedMotion });
initUI({ audio, world });
initGrain();

// Grano de película, suave: lo justo para que todo parezca de la misma foto
function initGrain() {
  const c = document.getElementById('grain');
  c.width = 192; c.height = 108;
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const draw = () => {
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  };
  draw();
  if (!reducedMotion) setInterval(draw, 90);
}
