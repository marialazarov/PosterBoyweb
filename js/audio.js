// Sonido ambiente provisional: olas que rompen suave y algo de brisa.
// Cuando llegue el audio de «motel», se reproducirá aquí.

let ctx, master;
let on = true;
let started = false;

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
  if (started) return;
  started = true;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
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

  master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 1.5);
}

export function toggle() {
  on = !on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.25);
  return on;
}

export function blip(kind = 'move') {
  if (!ctx || !on) return;
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
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.5);
  });
}
