// reel-90: 90.00s motion graphics from edit-base transcript (order kept, times scaled).
import fs from "fs";
const TOTAL = 90.0;
const tr = JSON.parse(fs.readFileSync("../edit-base/transcript.json", "utf8"));
const words = Array.isArray(tr) ? tr : tr.words;
const lastEnd = words[words.length - 1].end;
const K = ["90", TOTAL / lastEnd];
const SERIF = ["extra", "irresistibles", "irresistible", "chau", "pasos", "paso", "diferencian", "diferencia", "vos", "mes"];
const CARDKEYS = [
  [/guion|herramienta|inteligencia|datos|generador/, "cgen"],
  [/formulario|objetivo|meta|campa|clientes|prefiltra/, "cmeta"],
  [/propiedad|propiedades|inmobiliaria/, "chouse"],
  [/tel|llam|fr[ií]o|perseguir|referido/, "cshake"],
  [/anuncio|publicar|instagram|facebook/, "cui"],
  [/versiones|distintas|diferenciarte|crea/, "cform"],
  [/curioso|chau|decile/, "cvr"],
];
// group into beats
const beats = [];
let cur = [];
const flush = () => { if (cur.length) beats.push(cur); cur = []; };
for (const w of words) {
  cur.push(w);
  const gapNext = words[words.indexOf(w) + 1];
  const gap = gapNext ? gapNext.start - w.end : 0;
  if (cur.length >= 4 || /[.!?,:;]$/.test(w.text) || gap > 0.55 || cur.length >= 5) flush();
}
flush();
const S = TOTAL / lastEnd;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const isSerif = (w) => SERIF.some((k) => w.toLowerCase().replace(/[.,!?]/g, "") === k);
const cardFor = (beat) => {
  const txt = beat.map((w) => w.text).join(" ").toLowerCase();
  if (/paso\s+(uno|dos|tres|1|2|3|primero|segundo|tercero)/.test(txt)) return "BLACK";
  for (const [re, c] of CARDKEYS) if (re.test(txt)) return c;
  return null;
};
let clips = "", tweens = "";
beats.forEach((b, i) => {
  const t0 = +(b[0].start * S).toFixed(2);
  const t1 = Math.min(TOTAL, +((b[b.length - 1].end + 0.12) * S).toFixed(2));
  const d = Math.max(0.35, +(t1 - t0).toFixed(2));
  const card = cardFor(b);
  const black = card === "BLACK";
  const maxch = Math.max(...b.map((w) => w.text.length));
  const totch = b.reduce((a, w) => a + w.text.length, 0);
  const fs = Math.min(150, Math.floor(1000 / (Math.max(maxch * 1.1, totch * 0.34))));
  const rot = i % 2 === 0 ? -2 : 2;
  const lines = b.map((w) => {
    const t = esc(w.text);
    return isSerif(w.text) ? `<em>${t}</em>` : `<span>${t}</span>`;
  }).join(" ");
  let inner = `<div class="wl grot" data-layout-allow-overlap style="font-size:${fs}px">${lines}</div>`;
  if (card && !black) inner += `<img class="card" src="assets/cards/${card}.png" alt=""/>`;
  if (black) {
    const m = b.map((w) => w.text).join(" ").toUpperCase();
    inner = `<div class="wl grot bigblack" data-layout-allow-overlap>${esc(m)}</div>`;
  }
  clips += `      <div id="s${i}" class="clip${black ? " blk" : ""}" data-start="${t0}" data-duration="${d}"><div class="group" id="g${i}" data-layout-allow-overlap>${inner}</div></div>\n`;
  tweens += `      tl.fromTo("#g${i} .wl", { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: .22, ease: "power3.out" }, ${t0});\n`;
  if (card && !black) tweens += `      tl.fromTo("#g${i} .card", { autoAlpha: 0, scale: .84, rotation: 0 }, { autoAlpha: 1, scale: 1, rotation: ${rot}, duration: .35, ease: "back.out(1.5)" }, ${+(t0 + 0.06).toFixed(2)});\n`;
  tweens += `      tl.to("#g${i}", { autoAlpha: 0, y: -24, duration: .12, ease: "power2.in" }, ${+(t0 + d - 0.2).toFixed(2)});\n`;
});
console.log("beats=" + beats.length + " black=" + beats.filter((b) => cardFor(b) === "BLACK").length);
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
      .clip.blk .wl { color: #F5F2EA; }
      .group { position: absolute; left: 0; top: 470px; width: 1080px; display: flex; flex-direction: column;
        align-items: center; gap: 40px; will-change: transform, opacity; }
      .clip.blk .group { top: 0; height: 1920px; justify-content: center; }
      .wl { text-align: center; line-height: 1.04; color: #17150F; max-width: 980px; }
      .grot { font-family: "Archivo", sans-serif; font-weight: 900; letter-spacing: -1px; }
      .grot em, em { font-family: "Playfair", serif; font-style: italic; font-weight: 700; }
      .bigblack { font-size: 170px; }
      .card { width: 880px; border-radius: 28px; box-shadow: 0 24px 60px rgba(20,18,12,.22); object-fit: cover; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
${clips}    </div>
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
