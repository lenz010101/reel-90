// reel-90 v2: audio VO + video windows (footage, no face) + black PASO cards. Total 90.00.
import fs from "fs";
const TOTAL = 90.0;
const tr = JSON.parse(fs.readFileSync("../edit-base/transcript.json", "utf8"));
const words = Array.isArray(tr) ? tr : tr.words;
const lastEnd = words[words.length - 1].end;
const S = TOTAL / lastEnd;
const SERIF = ["extra", "irresistibles", "irresistible", "chau", "pasos", "paso", "diferencian", "diferencia", "vos", "mes", "sistema", "academia"];
// keyword -> video window (slice file, slice len) or static card
const WMAP = [
  [/guion|herramienta|inteligencia|datos|generador/, { v: "w_gen.mp4", len: 12 }],
  [/complet|tipo|campo|arroj|listo/, { v: "w_hands.mp4", len: 10 }],
  [/objetivo|meta|campa|clientes|prefiltra|anuncio|publicar|eleg/, { v: "w_meta.mp4", len: 15 }],
  [/versi|distint|diferenciarte|crea|conseguir|alumnos/, { v: "w_meta2.mp4", len: 10 }],
];
const SMAP = [
  [/guion|herramienta|generador/, "cgen"],
  [/objetivo|meta|campa|formulario/, "cmeta"],
];
const beats = [];
let cur = [];
const flush = () => { if (cur.length) beats.push(cur); cur = []; };
for (const w of words) {
  cur.push(w);
  const nx = words[words.indexOf(w) + 1];
  const gap = nx ? nx.start - w.end : 0;
  if (cur.length >= 4 || /[.!?,:;]$/.test(w.text) || gap > 0.55 || cur.length >= 5) flush();
}
flush();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const isSerif = (w) => SERIF.includes(w.toLowerCase().replace(/[.,!?]/g, ""));
const SLICE_START = { "w_gen.mp4": 12, "w_hands.mp4": 24, "w_mid.mp4": 34, "w_meta.mp4": 40, "w_meta2.mp4": 58 };
const TIME_SLICES = [[10, 24, "w_gen.mp4", 12], [24, 34, "w_hands.mp4", 10], [34, 40, "w_mid.mp4", 6], [40, 56, "w_meta.mp4", 15], [56, 68, "w_meta2.mp4", 10]];
const winFileFor = (txt) => {
  for (const [re, spec] of WMAP) if (re.test(txt)) return spec;
  return null;
};
const cardFor = (txt) => { for (const [re, c] of SMAP) if (re.test(txt)) return c; return null; };
// pre-pass: annotate + forward-fill (visual persists until topic changes)
beats.forEach((b) => {
  const low = b.map((w) => w.text).join(" ").toLowerCase();
  const origT = b[0].start;
  b._isPaso = /\bpaso\b/.test(low);
  b._spec0 = (!b._isPaso && origT >= 10 && origT <= 68) ? winFileFor(low) : null;
  b._card0 = (!b._spec0 && !b._isPaso) ? cardFor(low) : null;
});
{
  let lastSpec = null, lastCard = null;
  beats.forEach((b) => {
    if (b._spec0) lastSpec = b._spec0;
    if (b._card0) lastCard = b._card0;
    const origT = b[0].start;
    if (!b._spec0 && !b._card0 && !b._isPaso) {
      if (lastSpec && origT >= 10 && origT <= 68) b._spec0 = lastSpec;
      else if (lastCard) b._card0 = lastCard;
      else b._card0 = origT < 34 ? "cgen" : "cmeta";
    }
    if (!b._spec0 && !b._card0 && !b._isPaso) b._card0 = origT < 34 ? "cgen" : "cmeta";
  });
}
let clips = "", tweens = "";
beats.forEach((b, i) => {
  const t0 = +(b[0].start * S).toFixed(2);
  const t1 = Math.min(TOTAL, +((b[b.length - 1].end + 0.12) * S).toFixed(2));
  const d = Math.max(0.35, +(t1 - t0).toFixed(2));
  const txt = b.map((w) => w.text).join(" ");
  const low = txt.toLowerCase();
  const isPaso = /\bpaso\b/.test(low);
  const spec = b._spec0; const card = b._card0;
  b._spec = spec; b._t0 = t0; b._t1 = t1; b._d = d;
  const maxch = Math.max(...b.map((w) => w.text.length));
  const totch = b.reduce((a, w) => a + w.text.length, 0);
  const fs = Math.min(150, Math.floor(1000 / Math.max(maxch * 1.1, totch * 0.34)));
  const rot = i % 2 === 0 ? -2 : 2;
  const lines = b.map((w) => {
    const t = esc(w.text);
    return isSerif(w.text) ? `<em>${t}</em>` : `<span>${t}</span>`;
  }).join(" ");
  let inner = `<div class="wl grot" data-layout-allow-overlap style="font-size:${fs}px">${lines}</div>`;
  if (card) inner += `<img class="card" src="assets/cards/${card}.png" alt=""/>`;
  clips += `      <div id="s${i}" class="clip" data-start="${t0}" data-duration="${d}"><div class="group" id="g${i}" data-layout-allow-overlap>${inner}</div></div>\n`;
  tweens += `      tl.fromTo("#g${i} .wl", { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: .22, ease: "power3.out" }, ${t0});\n`;
  if (card) tweens += `      tl.fromTo("#g${i} .card", { autoAlpha: 0, scale: .84, rotation: 0 }, { autoAlpha: 1, scale: 1, rotation: ${rot}, duration: .35, ease: "back.out(1.5)" }, ${+(t0 + 0.06).toFixed(2)});\n`;
  tweens += `      tl.to("#g${i}", { autoAlpha: 0, y: -24, duration: .12, ease: "power2.in" }, ${+(t0 + d - 0.2).toFixed(2)});\n`;
});
// sticky windows: consecutive beats sharing a slice -> one continuous window
let winClips = "";
{
  const groups = [];
  let g = null;
  beats.forEach((b) => {
    const v = b._spec ? b._spec.v : null;
    if (v && g && g.v === v) { g.beats.push(b); g.end = b._t1; }
    else {
      if (g) groups.push(g);
      g = v ? { v, len: b._spec.len, beats: [b], start: b._t0, end: b._t1 } : null;
    }
  });
  if (g) groups.push(g);
  groups.forEach((gr, j) => {
    const span = +(gr.end - gr.start).toFixed(2);
    if (span < 1.2) return;
    let off = gr.start / S - SLICE_START[gr.v];
    off = Math.max(0, Math.min(off, Math.max(0, gr.len - span - 0.3)));
    const rot = j % 2 === 0 ? -2 : 2;
    winClips += `      <video id="wvid${j}" class="clip card wvid" style="transform:rotate(${rot}deg)" src="assets/vid/${gr.v}#t=${off.toFixed(2)}" muted playsinline preload="auto" data-start="${gr.start.toFixed(2)}" data-duration="${span}"></video>\n`;
  });
  console.log("windows=" + groups.length);
}
const pasos = [];
beats.forEach((b) => { if (/\bpaso\b/i.test(b.map((w) => w.text).join(" "))) pasos.push(b); });
let blackClips = "";
pasos.slice(0, 3).forEach((b, k) => {
  const t0 = +Math.max(0, b[0].start * S - 0.3).toFixed(2);
  blackClips += `      <div id="blk${k}" class="clip blk" data-start="${t0}" data-duration="1.5"><div class="bgroup" data-layout-allow-overlap><div class="bword grot">PASO ${k + 1}</div></div></div>\n`;
  tweens += `      tl.fromTo("#blk${k} .bword", { autoAlpha: 0, scale: .85 }, { autoAlpha: 1, scale: 1, duration: .3, ease: "back.out(1.7)" }, ${t0});\n`;
  tweens += `      tl.to("#blk${k} .bword", { autoAlpha: 0, scale: .94, duration: .2, ease: "power2.in" }, ${+(t0 + 1.3).toFixed(2)});\n`;
});
console.log("beats=" + beats.length + " pasos=" + Math.min(3, pasos.length));
const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Archivo"; src: url("assets/fonts/ArchivoBlack.woff2") format("woff2"); font-weight: 900; }
      @font-face { font-family: "Playfair"; src: url("assets/fonts/PlayfairDisplay.woff2") format("woff2"); font-weight: 700; font-style: italic; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #EDE9E1; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background-color: #EDE9E1;
        background-image: radial-gradient(rgba(20,18,12,.16) 1.4px, transparent 1.5px); background-size: 34px 34px; }
      .clip { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
      .clip.blk { background: #131311; }
      .group { position: absolute; left: 0; top: 470px; width: 1080px; display: flex; flex-direction: column;
        align-items: center; gap: 40px; will-change: transform, opacity; }
      .bgroup { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; display: flex;
        align-items: center; justify-content: center; }
      .bword { color: #F5F2EA; font-size: 220px; }
      .wl { text-align: center; line-height: 1.04; color: #17150F; max-width: 980px; }
      .grot { font-family: "Archivo", sans-serif; font-weight: 900; letter-spacing: -1px; }
      .grot em, em { font-family: "Playfair", serif; font-style: italic; font-weight: 700; }
      .card { width: 880px; border-radius: 28px; box-shadow: 0 24px 60px rgba(20,18,12,.22); object-fit: cover; }
      video.clip.wvid { left: 100px; top: 880px; width: 880px; height: auto; }
      video.card { background: #000; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <audio id="voice" src="assets/vo90.m4a" data-start="0" data-duration="${TOTAL}"></audio>
${winClips}${clips}${blackClips}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
${tweens}      tl.seek(0);
    </script>
  </body>
</html>
`;
fs.writeFileSync("index.html", html);
console.log("wrote index.html total=" + TOTAL);
