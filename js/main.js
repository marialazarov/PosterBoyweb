import { createScene } from './scene/index.js';
import * as audio from './audio.js';
import { initUI } from './ui.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const world = createScene(document.getElementById('scene'), { reducedMotion });
initUI({ audio, world });
