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

export function initUI({ audio, world }) {
  const body = document.body;
  const items = [...document.querySelectorAll('.menu button')];
  const panel = document.getElementById('panel');
  const panelTag = document.getElementById('panel-tag');
  const panelTitle = document.getElementById('panel-title');
  const panelBody = document.getElementById('panel-body');
  const backBtn = document.getElementById('panel-back');

  let state = 'intro';
  let index = 0;
  const setState = s => { state = s; body.dataset.state = s; };

  function select(i, sound = true) {
    const next = (i + items.length) % items.length;
    if (next !== index && sound) audio.blip('move');
    index = next;
    items.forEach((b, j) => b.classList.toggle('is-active', j === index));
    world.setFocus(items[index].dataset.focus);
  }

  function start() {
    if (state !== 'intro') return;
    setState('menu');
    audio.start();
    select(0, false);
    items[0].focus({ preventScroll: true });
  }

  function open(key) {
    if (state !== 'menu') return;
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
    setState('menu');
    audio.blip('back');
    panel.classList.remove('is-open');
    setTimeout(() => { if (state !== 'panel') panel.hidden = true; }, 350);
    items[index].focus({ preventScroll: true });
  }

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (state === 'intro') { e.preventDefault(); start(); return; }

    const k = e.key.toLowerCase();
    if (k === 'm') { body.classList.toggle('is-muted', !audio.toggle()); return; }

    if (state === 'menu') {
      if (k === 'arrowup' || k === 'w')   { e.preventDefault(); select(index - 1); }
      if (k === 'arrowdown' || k === 's') { e.preventDefault(); select(index + 1); }
      if (k === 'enter' || k === ' ')     { e.preventDefault(); open(items[index].dataset.section); }
    } else if (state === 'panel') {
      if (k === 'escape' || k === 'backspace') { e.preventDefault(); close(); }
    }
  });

  window.addEventListener('pointerdown', () => { if (state === 'intro') start(); });

  items.forEach((b, j) => {
    b.addEventListener('pointerenter', () => { if (state === 'menu') select(j); });
    b.addEventListener('focus', () => { if (state === 'menu') select(j, false); });
    b.addEventListener('click', () => open(b.dataset.section));
  });

  backBtn.addEventListener('click', close);
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
}
