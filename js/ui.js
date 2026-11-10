// Menú principal y ventanas de sección.
// El contenido de las secciones es de ejemplo: lo iremos sustituyendo.

const SECTIONS = {
  conciertos: {
    tag: '01',
    title: 'conciertos',
    html: `
      <p class="note">// próximas fechas (contenido de ejemplo)</p>
      <ul class="rows">
        <li><span>--.--.--</span><span>Ciudad · Sala</span><span>pronto</span></li>
        <li><span>--.--.--</span><span>Ciudad · Sala</span><span>pronto</span></li>
        <li><span>--.--.--</span><span>Ciudad · Sala</span><span>pronto</span></li>
      </ul>`,
  },
  musica: {
    tag: '02',
    title: 'música',
    html: `
      <p class="note">// tracklist (contenido de ejemplo)</p>
      <ul class="rows">
        <li><span>01</span><span>motel</span><span>--:--</span></li>
        ${[2, 3, 4, 5].map(n => `<li><span>0${n}</span><span>— — —</span><span>--:--</span></li>`).join('')}
      </ul>`,
  },
  merch: {
    tag: '03',
    title: 'merchandising',
    html: `
      <p class="note">// tienda (contenido de ejemplo)</p>
      <ul class="rows">
        <li><span>camiseta</span><span>— — —</span><span>pronto</span></li>
        <li><span>vinilo</span><span>— — —</span><span>pronto</span></li>
        <li><span>póster</span><span>— — —</span><span>pronto</span></li>
      </ul>`,
  },
};

const FOCUS = { conciertos: 'town', musica: 'lamp', merch: 'island' };
const CHARS = ['maria', 'luz'];   // de izquierda a derecha, como en la escena

export function initUI({ audio, world }) {
  const body = document.body;
  const charBtns = [...document.querySelectorAll('.menu button[data-char]')];
  const panel = document.getElementById('panel');
  const panelTag = document.getElementById('panel-tag');
  const panelTitle = document.getElementById('panel-title');
  const panelBody = document.getElementById('panel-body');
  const backBtn = document.getElementById('panel-back');
  const charBack = document.getElementById('char-back');

  let state = 'intro';
  let charIndex = 0;
  let chosen = null;
  let optKeys = [];        // opciones de la elegida, cuando ya han salido
  let optIndex = -1;
  const setState = s => { state = s; body.dataset.state = s; world.setMode(s); };

  // el mar y la brisa suenan desde el principio; si el navegador lo bloquea,
  // arrancan con el primer toque o tecla
  audio.start();

  function selectChar(i, sound = true) {
    const next = (i + CHARS.length) % CHARS.length;
    if (next !== charIndex && sound) audio.blip('move');
    charIndex = next;
    charBtns.forEach((b, j) => b.classList.toggle('is-active', j === charIndex));
    world.highlightChar(CHARS[charIndex]);
  }

  function start() {
    if (state !== 'intro') return;
    audio.start();
    setState('menu');
    selectChar(0, false);
  }

  function choose(name) {
    if (state !== 'menu') return;
    audio.blip('select');
    chosen = name;
    optKeys = []; optIndex = -1;
    world.highlightChar(null);
    world.chooseChar(name);
    setState('char');
    charBack.focus({ preventScroll: true });
  }

  function unchoose() {
    if (state !== 'char') return;
    audio.blip('back');
    chosen = null; optKeys = []; optIndex = -1;
    world.highlightOption(null);
    world.setFocus(null);
    world.chooseChar(null);
    setState('menu');
    selectChar(charIndex, false);
  }

  world.onArrive((name, keys) => {
    if (name !== chosen) return;
    optKeys = keys;
  });

  function selectOption(i, sound = true) {
    if (!optKeys.length) return;
    const next = (i + optKeys.length) % optKeys.length;
    if (next !== optIndex && sound) audio.blip('move');
    optIndex = next;
    world.highlightOption(optKeys[optIndex]);
    world.setFocus(FOCUS[optKeys[optIndex]]);
  }

  function toggleRadio() {
    if (state === 'intro') start();
    const on = !audio.isRadioOn();
    audio.setRadio(on);
    world.setRadio(on);
    body.classList.toggle('radio-on', on);
  }

  world.onHover(p => {
    if (p && p.type === 'char' && state === 'menu') selectChar(CHARS.indexOf(p.id));
    if (state === 'char') {
      if (p && p.type === 'option') selectOption(optKeys.indexOf(p.id));
      else { optIndex = -1; world.highlightOption(null); world.setFocus(null); }
    }
  });

  world.onPick(p => {
    if (p.type === 'radio') toggleRadio();
    else if (p.type === 'char') { if (state === 'intro') start(); choose(p.id); }
    else if (p.type === 'option') open(p.id);
  });

  function open(key) {
    if (state !== 'char') return;
    const s = SECTIONS[key];
    setState('panel');
    audio.blip('select');
    panelTag.textContent = s.tag;
    panelTitle.textContent = s.title;
    panelBody.innerHTML = s.html;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    backBtn.focus({ preventScroll: true });
  }

  function close() {
    if (state !== 'panel') return;
    setState('char');
    audio.blip('back');
    panel.classList.remove('is-open');
    setTimeout(() => { if (state !== 'panel') panel.hidden = true; }, 350);
    charBack.focus({ preventScroll: true });
  }

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (state === 'intro') { e.preventDefault(); start(); return; }

    const k = e.key.toLowerCase();
    if (k === 'r') { toggleRadio(); return; }
    const prev = ['arrowleft', 'arrowup', 'a', 'w'].includes(k);
    const next = ['arrowright', 'arrowdown', 'd', 's'].includes(k);
    const ok = k === 'enter' || k === ' ';
    const back = k === 'escape' || k === 'backspace';

    if (state === 'menu') {
      if (prev) { e.preventDefault(); selectChar(charIndex - 1); }
      if (next) { e.preventDefault(); selectChar(charIndex + 1); }
      if (ok)   { e.preventDefault(); choose(CHARS[charIndex]); }
    } else if (state === 'char') {
      if (prev) { e.preventDefault(); selectOption(optIndex < 0 ? 0 : optIndex - 1); }
      if (next) { e.preventDefault(); selectOption(optIndex < 0 ? 0 : optIndex + 1); }
      if (ok && optIndex >= 0) { e.preventDefault(); open(optKeys[optIndex]); }
      if (back) { e.preventDefault(); unchoose(); }
    } else if (state === 'panel') {
      if (back) { e.preventDefault(); close(); }
    }
  });

  window.addEventListener('pointerdown', () => { audio.start(); if (state === 'intro') start(); });

  charBtns.forEach((b, j) => {
    b.addEventListener('pointerenter', () => { if (state === 'menu') selectChar(j); });
    b.addEventListener('click', () => { selectChar(j, false); choose(CHARS[j]); });
  });
  charBack.addEventListener('click', unchoose);

  backBtn.addEventListener('click', close);
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
}
