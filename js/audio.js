// Sonido de la playa: olas y brisa siempre, y una radio en la mesa
// que, al encenderla, suena «motel» (slowed + reverb) desde el 4:03.

const SONG_URL = 'assets/audio/motel.m4a';
const SONG_GAIN = 0.9;

// La descarga empieza ya, para que la canción esté lista cuando enciendas la radio.
const songData = fetch(SONG_URL).then(r => r.arrayBuffer()).catch(() => null);

let ctx, master, radioGain;
// para probar la web sin que suene nada: index.html?silencio
const SILENT = new URLSearchParams(location.search).has('silencio');
let started = false;
let radioOn = false;

function noiseBuffer(seconds, brown) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

export function start() {
  if (started) { if (ctx.state === 'suspended') ctx.resume(); return; }
  started = true;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // los navegadores no dejan sonar nada hasta que la persona toca o pulsa algo:
  // en cuanto lo hace, el mar empieza a sonar
  if (ctx.state === 'suspended') {
    const wake = () => ctx.resume().then(() => {
      if (ctx.state === 'running') ['pointerdown', 'keydown', 'touchstart'].forEach(ev => removeEventListener(ev, wake, true));
    });
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, wake, true));
  }
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // olas: ruido marrón con volumen que sube y baja como la marea
  const waves = ctx.createBufferSource();
  waves.buffer = noiseBuffer(4, true); waves.loop = true;
  const wlp = ctx.createBiquadFilter(); wlp.type = 'lowpass'; wlp.frequency.value = 650;
  const wg = ctx.createGain(); wg.gain.value = 0.25;
  const swell = ctx.createOscillator(); swell.frequency.value = 0.11;
  const swellAmt = ctx.createGain(); swellAmt.gain.value = 0.2;
  swell.connect(swellAmt).connect(wg.gain);
  waves.connect(wlp).connect(wg).connect(master);
  waves.start(); swell.start();

  // brisa: ruido blanco filtrado, muy bajito
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(3, false); wind.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
  const gust = ctx.createOscillator(); gust.frequency.value = 0.05;
  const gustAmt = ctx.createGain(); gustAmt.gain.value = 400;
  gust.connect(gustAmt).connect(bp.frequency);
  const windGain = ctx.createGain(); windGain.gain.value = 0.025;
  wind.connect(bp).connect(windGain).connect(master);
  wind.start(); gust.start();

  master.gain.setTargetAtTime(SILENT ? 0 : 0.8, ctx.currentTime, 1.5);

  // la radio: un poco de color de altavoz pequeño, pero que se oiga bien
  radioGain = ctx.createGain(); radioGain.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500;
  hp.connect(lp).connect(radioGain).connect(master);
  loadSong(hp);
}

async function loadSong(out) {
  const data = await songData;
  if (!data) return;
  // decodeAudioData con callbacks: Safari antiguo no devuelve promesa
  const buffer = await new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)).catch(() => null);
  if (!buffer) return;
  // suena siempre por dentro, como una emisora: la radio solo sube o baja el volumen
  const song = ctx.createBufferSource();
  song.buffer = buffer; song.loop = true;
  song.connect(out);
  song.start();
}

/** Enciende o apaga la radio de la mesa. */
export function setRadio(on) {
  radioOn = on;
  if (!ctx) return;
  const t = ctx.currentTime;
  radioGain.gain.cancelScheduledValues(t);
  radioGain.gain.setTargetAtTime(on ? SONG_GAIN : 0, t + (on ? 0.15 : 0), on ? 0.25 : 0.08);
  click();
  if (on) staticBurst();
}

export const isRadioOn = () => radioOn;

// «clac» del botón de la radio
function click() {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.03, false);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  src.connect(f).connect(g).connect(SILENT ? master : ctx.destination);
  src.start(t);
}

// un instante de estática mientras «sintoniza»
function staticBurst() {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.5, false);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export function blip(kind = 'move') {
  if (!ctx) return;
  const notes = {
    move:   [[880, 0]],
    select: [[659.25, 0], [987.77, 0.08]],
    back:   [[783.99, 0], [587.33, 0.08]],
  }[kind];
  notes.forEach(([f, delay]) => {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(SILENT ? master : ctx.destination);
    o.start(t); o.stop(t + 0.5);
  });
}
