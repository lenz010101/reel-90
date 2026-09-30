// reel-90 v11: sin retrato del joven después de los 10s, motion graphics de
// relleno en los huecos sin card (clave por contenido hablado), subtítulos con
// aire (gap 20 / lh 1.12 / cap 3). Total 90.00.
import fs from "fs";
const TOTAL = 90.0;
const tr = JSON.parse(fs.readFileSync("../edit-base/transcript.json", "utf8"));
const words = Array.isArray(tr) ? tr : tr.words;
const lastEnd = words[words.length - 1].end;
const S = TOTAL / lastEnd;
const SERIF = ["extra", "irresistibles", "irresistible", "chau", "pasos", "paso", "diferencian", "diferencia", "vos", "mes", "sistema", "academia", "captación", "difícil", "sola", "frío"];
// keyword -> media slice (2:1 landscape) or portrait (young man)
const WMAP = [
  [/guion|herramienta|inteligencia|datos|generador/, { v: "w_gen.mp4", len: 19, form: "land" }],
  [/complet|tipo|campo|arroj|listo/, { v: "w_hands.mp4", len: 14, form: "land" }],
  [/objetivo|meta|campa|clientes|prefiltra|anuncio|publicar|eleg/, { v: "w_meta.mp4", len: 24, form: "land" }],
  [/versi|distint|diferenciarte|crea|conseguir|alumnos/, { v: "w_meta2.mp4", len: 16, form: "land" }],
];
const FACE1 = { v: "w_face1.mp4", len: 11, form: "port" };
const FACE2 = { v: "w_face2.mp4", len: 24.03, form: "port" };
const winFileFor = (txt) => { for (const [re, spec] of WMAP) if (re.test(txt)) return spec; return null; };

// ---- beats: frases cortas (max 3 palabras) ----
const beats = [];
let cur = [];
const flush = () => { if (cur.length) beats.push(cur); cur = []; };
for (const w of words) {
  cur.push(w);
  const nx = words[words.indexOf(w) + 1];
  const gap = nx ? nx.start - w.end : 0;
  if (cur.length >= 3 || /[.!?,:;]$/.test(w.text) || gap > 0.55) flush();
}
flush();
// fusiona beats parpadeantes (<0.6s)
{
  for (let i = beats.length - 1; i > 0; i--) {
    const b = beats[i];
    const d = (b[b.length - 1].end + 0.12 - b[0].start) * S;
    if (d < 0.6) { beats[i - 1] = beats[i - 1].concat(b); beats.splice(i, 1); }
  }
}

// ---- timing + spec por beat (forward-fill visual) ----
beats.forEach((b) => {
  b._t0 = +(b[0].start * S).toFixed(2);
  b._t1 = Math.min(TOTAL, +((b[b.length - 1].end + 0.12) * S).toFixed(2));
  b._d = Math.max(0.35, +(b._t1 - b._t0).toFixed(2));
  b._txt = b.map((w) => w.text).join(" ");
  b._low = b._txt.toLowerCase();
  b._paso = /\bpaso\b/.test(b._low);
  b._spec0 = b._paso ? null : (b[0].start < 10 ? FACE1 : b[0].start > 68 ? FACE2 : winFileFor(b._low));
});
{
  let last = null;
  beats.forEach((b) => {
    // sin cara del joven después de los 10s (feedback: "sacame al joven")
    if (last && last.v === FACE1.v && b[0].start >= 10) last = null;
    if (b._spec0) last = b._spec0;
    if (!b._spec0 && !b._paso && last && b[0].start >= 10 && b[0].start <= 68) b._spec0 = last;
  });
}
beats.forEach((b) => { b._spec = b._spec0; });

// ---- ventanas sticky: beats consecutivos con el mismo slice ----
const windows = [];
{
  let g = null;
  beats.forEach((b) => {
    const v = b._spec ? b._spec.v : null;
    if (v && g && g.v === v) { g.end = b._t1; }
    else {
      if (g) windows.push(g);
      g = v ? { v, form: b._spec.form, len: b._spec.len, start: b._t0, end: b._t1 } : null;
    }
  });
  if (g) windows.push(g);
}
const overlapsWindow = (b) => windows.some((w) => w.start < b._t1 && w.end > b._t0);

// ---- huecos sin card -> motion graphics de relleno (clave = contenido hablado) ----
const holes = [];
{
  const ws = windows.slice().sort((a, b) => a.start - b.start);
  let t = 0;
  ws.forEach((w) => {
    if (w.start - t > 0.95 && t > 0.5) holes.push({ s: +t.toFixed(2), e: +w.start.toFixed(2) });
    t = Math.max(t, w.end);
  });
  if (TOTAL - t > 0.95) holes.push({ s: +t.toFixed(2), e: TOTAL });
}
const STOPW = new Set("que de la el los las un una y en para por con se su al lo como más o a es del no lo".split(" "));
const pickMG = (s, e) => {
  const ws = words.filter((w) => w.start * S < e + 0.5 && w.end * S > s - 0.5);
  const txt = ws.map((w) => w.text).join(" ").toLowerCase();
  const cands = ws.map((w) => w.text.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑüÜ]/g, ""))
    .filter((w) => w.length > 4 && !STOPW.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  const kw = (cands[0] || "idea").toUpperCase();
  if (/administrador|anuncios|publicidad/.test(txt)) return { k: "anuncios", kw };
  if (/comunicar|comunicaci|mensaje/.test(txt)) return { k: "comunicar", kw };
  if (/documento|lista|revisar|paso a paso/.test(txt)) return { k: "checklist", kw };
  if (/guion|n[uú]mero|cuatro/.test(txt)) return { k: "guiones", kw };
  return { k: "word", kw };
};
const mgs = holes.map((h) => ({ ...h, pick: pickMG(h.s, h.e) })).filter((m) => m.e - m.s >= 1.0);
const overlapsMG = (t0, t1) => mgs.some((m) => m.s < t1 && m.e > t0);
console.log("holes=" + holes.map((h) => `${h.s}-${h.e}:${pickMG(h.s, h.e).k}`).join(" "));

// ---- frases: acumulan líneas hasta punto fuerte / gap grande / cap por card ----
const phrases = [];
let cp = [];
const closePhrase = () => { if (cp.length) { phrases.push(cp); cp = []; } };
for (const b of beats) {
  if (cp.length) {
    const prev = cp[cp.length - 1];
    const gap = b._t0 - prev._t1;
    const strong = /[.!?]$/.test(prev._txt) || prev._paso || b._paso;
    const cap = (overlapsWindow(b) || overlapsMG(b._t0, b._t1)) ? 3 : 4;
    if (strong || gap > 1.0 || cp.length >= cap) closePhrase();
  }
  cp.push(b);
}
closePhrase();

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const isSerif = (w) => SERIF.includes(w.toLowerCase().replace(/[.,!?]/g, ""));

// ---- emisión de frases (animación: pop por línea + salida) ----
let clips = "", tweens = "", mgClips = "", mgN = 0;
const kartelPh = [];
phrases.forEach((ph, i) => { if (kartelPh.length < 3 && ph.some((b) => b._paso)) kartelPh.push(i); });
phrases.forEach((ph, i) => {
  if (kartelPh.includes(i)) return; // solo las 3 primeras "Paso" -> kartel negro
  const t0 = ph[0]._t0;
  const lastT = ph[ph.length - 1]._t1;
  const nextStart = phrases[i + 1] ? phrases[i + 1][0]._t0 : TOTAL;
  const dur = +Math.max(lastT - t0 + 0.35, Math.min(nextStart - t0, lastT - t0 + 2.2)).toFixed(2);
  const end = Math.min(TOTAL, +(t0 + dur).toFixed(2));
  const hasCard = windows.some((w) => w.start < end && w.end > t0) || overlapsMG(t0, end);
  const lines = ph.map((b, j) => {
    const maxch = Math.max(...b.map((w) => w.text.length));
    const totch = b.reduce((a, w) => a + w.text.length, 0);
    const hero = !b._spec && b.length <= 2 && totch <= 11;
    const fs = hero
      ? Math.min(250, Math.floor(1000 / (maxch * 0.62)))
      : Math.min(104, Math.floor(940 / Math.max(totch * 0.62, maxch * 1.05)));
    const inner = b.map((w) => isSerif(w.text) ? `<em>${esc(w.text)}</em>` : `<span>${esc(w.text)}</span>`).join(" ");
    if (hero) {
      tweens += `      tl.fromTo("#pl${i}_${j}", { opacity: 0, scale: 0.6, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: .24, ease: "back.out(1.9)", immediateRender: false }, ${b._t0});\n`;
    } else {
      tweens += `      tl.fromTo("#pl${i}_${j}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .16, ease: "power3.out", immediateRender: false }, ${b._t0});\n`;
    }
    return `        <div class="ln grot${hero ? " hero" : ""}" id="pl${i}_${j}" style="font-size:${fs}px">${inner}</div>\n`;
  }).join("");
  clips += `      <div id="ph${i}" class="clip" data-start="${t0}" data-duration="${(end - t0).toFixed(2)}"><div class="group ${hasCard ? "wc" : "nc"}" data-layout-allow-overlap>\n${lines}      </div></div>\n`;
  console.log(`ph${i} ${t0}→${end} ${ph.map((b) => b._txt).join(" | ")}`);
  // salida: termina (casi) cuando entra la frase siguiente — evita texto doble
  const exitAt = i + 1 < phrases.length ? Math.max(t0 + 0.1, Math.min(end - 0.13, nextStart - 0.07)) : end - 0.13;
  tweens += `      tl.to("#ph${i}", { opacity: 0, y: -16, duration: .12, ease: "power2.in" }, ${+exitAt.toFixed(2)});\n`;
});

// ---- ventanas media (cards): pop + blur in / out ----
let winClips = "";
windows.forEach((gr, j) => {
  const span = +(gr.end - gr.start).toFixed(2);
  if (span < 1.2) return;
  const base = gr.form === "port" ? (gr.v === "w_face1.mp4" ? 0 : 68) : ({ "w_gen.mp4": 10, "w_hands.mp4": 22, "w_mid.mp4": 32, "w_meta.mp4": 38, "w_meta2.mp4": 54 }[gr.v] || 0);
  let off = gr.start / S - base;
  off = Math.max(0, Math.min(off, Math.max(0, gr.len - span - 0.3)));
  winClips += `      <video id="wvid${j}" class="clip wvid ${gr.form}" src="assets/vid/${gr.v}#t=${off.toFixed(2)}" muted playsinline preload="auto" data-start="${gr.start.toFixed(2)}" data-duration="${span}"></video>\n`;
  tweens += `      tl.fromTo("#wvid${j}", { opacity: 0, scale: .94, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: .2, ease: "power3.out", immediateRender: false }, ${gr.start.toFixed(2)});\n`;
  tweens += `      tl.fromTo("#wvid${j}", { filter: "blur(14px)" }, { filter: "blur(0px)", duration: .2, ease: "power2.out", immediateRender: false }, ${gr.start.toFixed(2)});\n`;
  tweens += `      tl.to("#wvid${j}", { scale: .95, opacity: 0, duration: .14, ease: "power2.in" }, ${+(gr.end - 0.14).toFixed(2)});\n`;
});
console.log("phrases=" + phrases.length + " beats=" + beats.length + " windows=" + windows.length);

// ---- kartel negro "Paso N": pop back.out ----
const pasoPhrases = phrases.filter((ph) => ph.some((b) => b._paso));
const pasoRanges = [];
let blackClips = "";
pasoPhrases.slice(0, 3).forEach((ph, k) => {
  const t0 = +Math.max(0, ph[0]._t0 - 0.25).toFixed(2);
  const dur = +Math.min(2.0, ph[ph.length - 1]._t1 + 0.4 - t0).toFixed(2);
  pasoRanges.push({ s: t0, e: +(t0 + dur).toFixed(2) });
  blackClips += `      <div id="blk${k}" class="clip blk" data-layout-allow-overlap data-start="${t0}" data-duration="${dur}"><div class="bgroup" data-layout-allow-overlap><div class="bword grot" data-layout-allow-overlap>Paso ${k + 1}</div></div></div>\n`;
  tweens += `      tl.fromTo("#blk${k} .bword", { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .22, ease: "back.out(1.6)", immediateRender: false }, ${+(t0 + 0.05).toFixed(2)});\n`;
  tweens += `      tl.to("#blk${k} .bword", { opacity: 0, duration: .12, ease: "power2.in" }, ${+(t0 + dur - 0.13).toFixed(2)});\n`;
});
console.log("pasos=" + Math.min(3, pasoPhrases.length) + " ranges=" + pasoRanges.map((r) => `${r.s}-${r.e}`).join(" "));

// ---- motion graphics de relleno: pop de card + entrada por elemento ----
const J = (o) => JSON.stringify(o);
const mgFrom = (sel, from, to, at) => `      tl.fromTo("${sel}", ${J(from)}, { ...${J(to)}, immediateRender: false }, ${at});\n`;
const mgTo = (sel, to, at) => `      tl.to("${sel}", ${J(to)}, ${at});\n`;
mgs.forEach((m) => {
  if (pasoRanges.some((r) => r.s <= m.s && m.e <= r.e)) return; // 100% tapado por kartel negro
  const n = mgN++;
  // si un kartel negro tapa el arranque, el MG entra cuando el negro se va
  let s = m.s;
  const blk = pasoRanges.find((r) => r.s <= s && r.e > s);
  if (blk && m.e - blk.e >= 1.1) s = +blk.e.toFixed(2);
  const e = m.e, d = +(e - s).toFixed(2);
  const id = (i) => `mge${n}_${i}`;
  const A = [];
  let inner = "";
  if (m.pick.k === "guiones") {
    inner = `<div class="mg-kick grot" id="${id(0)}">PASO 01</div>` +
      `<div class="mg-big grot" id="${id(1)}">CUATRO <em>guiones</em></div>` +
      `<div class="mg-bars"><i id="${id(2)}" style="width:150px"></i><i id="${id(3)}" style="width:195px"></i><i id="${id(4)}" style="width:165px"></i><i id="${id(5)}" style="width:215px"></i></div>`;
    A.push([0, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .2, ease: "power3.out" }, .14]);
    A.push([1, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .24, ease: "power3.out" }, .24]);
    [2, 3, 4, 5].forEach((i, ix) => A.push([i, { opacity: 0, scaleX: .12 }, { opacity: 1, scaleX: 1, duration: .26, ease: "back.out(1.7)" }, .46 + ix * .1]));
  } else if (m.pick.k === "anuncios") {
    inner = `<div class="mg-kick grot" id="${id(0)}">PLATAFORMA</div>` +
      `<div class="mg-big grot" id="${id(1)}">ADMIN DE <em>anuncios</em></div>` +
      `<div class="mg-cols"><i id="${id(2)}" style="height:54px"></i><i id="${id(3)}" style="height:92px"></i><i id="${id(4)}" style="height:70px"></i></div>`;
    A.push([0, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .2, ease: "power3.out" }, .14]);
    A.push([1, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .24, ease: "power3.out" }, .24]);
    [2, 3, 4].forEach((i, ix) => A.push([i, { opacity: 0, scaleY: .05 }, { opacity: 1, scaleY: 1, duration: .3, ease: "back.out(1.6)" }, .46 + ix * .1]));
  } else if (m.pick.k === "comunicar") {
    inner = `<div class="mg-kick grot" id="${id(0)}">COMUNICACIÓN</div>` +
      `<div class="mg-big grot" id="${id(1)}">COMUNICAR</div>` +
      `<div class="mg-rings"><i class="r1" id="${id(2)}"></i><i class="r2" id="${id(3)}"></i><i class="r3" id="${id(4)}"></i></div>`;
    A.push([0, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .2, ease: "power3.out" }, .14]);
    A.push([1, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .24, ease: "power3.out" }, .24]);
    [2, 3, 4].forEach((i, ix) => A.push([i, { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .34, ease: "back.out(1.8)" }, .46 + ix * .1]));
  } else if (m.pick.k === "checklist") {
    inner = `<div class="mg-kick grot" id="${id(0)}">DOCUMENTO</div>` +
      `<div class="mg-big grot" id="${id(1)}">PASO A PASO</div>` +
      `<div class="mg-list"><div id="${id(2)}"><b></b><u></u></div><div id="${id(3)}"><b></b><u></u></div><div id="${id(4)}"><b></b><u></u></div></div>`;
    A.push([0, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .2, ease: "power3.out" }, .14]);
    A.push([1, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .24, ease: "power3.out" }, .24]);
    [2, 3, 4].forEach((i, ix) => A.push([i, { opacity: 0, x: -26 }, { opacity: 1, x: 0, duration: .26, ease: "power3.out" }, .46 + ix * .1]));
  } else {
    const kw = m.pick.kw.length > 14 ? m.pick.kw.slice(0, 14) : m.pick.kw;
    inner = `<div class="mg-kick grot" id="${id(0)}">CLAVE</div>` +
      `<div class="mg-big grot" id="${id(1)}">${esc(kw)}</div>` +
      `<div class="mg-rule" id="${id(2)}"></div>`;
    A.push([0, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .2, ease: "power3.out" }, .14]);
    A.push([1, { opacity: 0, scale: .7 }, { opacity: 1, scale: 1, duration: .28, ease: "back.out(1.9)" }, .24]);
    A.push([2, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: .3, ease: "power3.out" }, .5]);
  }
  mgClips += `      <div id="mg${n}" class="clip" data-start="${s}" data-duration="${d}"><div class="mgcard">${inner}</div></div>\n`;
  tweens += mgFrom(`#mg${n} .mgcard`, { opacity: 0, scale: .94, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: .2, ease: "power3.out" }, s);
  tweens += mgFrom(`#mg${n} .mgcard`, { filter: "blur(14px)" }, { filter: "blur(0px)", duration: .2, ease: "power2.out" }, s);
  A.forEach(([i, f, t, dl]) => { tweens += mgFrom("#" + id(i), f, t, +(s + dl).toFixed(2)); });
  tweens += mgTo(`#mg${n} .mgcard`, { scale: .95, opacity: 0, duration: .14, ease: "power2.in" }, +(e - 0.14).toFixed(2));
  console.log(`mg${n} ${m.pick.k} ${s}→${e}`);
});

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
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #EDEAE3; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background-color: #EDEAE3;
        background-image: radial-gradient(rgba(20,18,12,.15) 1.3px, transparent 1.4px); background-size: 34px 34px; }
      .clip { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
      .clip.blk { background: #101010; }
      .group { position: absolute; left: 0; width: 1080px; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 20px; will-change: transform, opacity; }
      .group.wc { top: 0; height: 800px; justify-content: flex-end; padding-bottom: 44px; }
      .group.nc { top: 0; height: 1660px; }
      .ln { opacity: 0; text-align: center; line-height: 1.12; color: #14120C; white-space: nowrap; will-change: transform, opacity; }
      .ln.hero { line-height: 1.0; }
      .grot { font-family: "Archivo", sans-serif; font-weight: 900; letter-spacing: -2px; }
      .grot em, em { font-family: "Playfair", serif; font-style: italic; font-weight: 700; letter-spacing: -1px; }
      .bgroup { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; display: flex;
        align-items: center; justify-content: center; }
      .bword { color: #F6F3EC; font-size: 168px; letter-spacing: -4px; opacity: 0; will-change: transform, opacity; }
      .wvid { object-fit: cover; border-radius: 22px; box-shadow: 0 26px 64px rgba(20,18,12,.24); background: #000;
        will-change: transform, opacity, filter; }
      .wvid.land { left: 90px; top: 837px; width: 893px; height: 445px; }
      .wvid.port { left: 270px; top: 837px; width: 540px; height: 619px; }
      .mgcard { position: absolute; left: 90px; top: 837px; width: 893px; height: 445px; border-radius: 22px;
        background: #101010; color: #F6F3EC; box-shadow: 0 26px 64px rgba(20,18,12,.24); overflow: hidden;
        padding: 40px 52px; display: flex; flex-direction: column; justify-content: center; gap: 16px;
        will-change: transform, opacity, filter; }
      .mg-kick { font-size: 26px; letter-spacing: 8px; opacity: 0; }
      .mg-big { font-size: 84px; line-height: 1.0; letter-spacing: -3px; opacity: 0; }
      .mg-big em { font-size: 88px; letter-spacing: -2px; }
      .mg-bars { display: flex; gap: 14px; align-items: center; }
      .mg-bars i { display: block; height: 24px; border-radius: 12px; background: #F6F3EC; opacity: 0; transform-origin: left center; }
      .mg-cols { display: flex; gap: 18px; align-items: flex-end; height: 96px; }
      .mg-cols i { display: block; width: 74px; border-radius: 12px 12px 4px 4px; background: #F6F3EC; opacity: 0; transform-origin: bottom center; }
      .mg-rings { position: relative; width: 170px; height: 170px; }
      .mg-rings i { position: absolute; top: 50%; left: 50%; border: 7px solid #F6F3EC; border-radius: 50%; opacity: 0; }
      .mg-rings i.r1 { width: 62px; height: 62px; margin: -31px 0 0 -31px; }
      .mg-rings i.r2 { width: 116px; height: 116px; margin: -58px 0 0 -58px; }
      .mg-rings i.r3 { width: 170px; height: 170px; margin: -85px 0 0 -85px; }
      .mg-list { display: flex; flex-direction: column; gap: 14px; }
      .mg-list div { display: flex; align-items: center; gap: 16px; opacity: 0; }
      .mg-list b { width: 34px; height: 34px; border: 5px solid #F6F3EC; border-radius: 9px; flex: none; }
      .mg-list u { height: 20px; border-radius: 10px; background: #F6F3EC; flex: 1; text-decoration: none; }
      .mg-rule { height: 14px; width: 340px; border-radius: 7px; background: #F6F3EC; opacity: 0; transform-origin: left center; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <audio id="voice" src="assets/vo90.m4a" data-start="0" data-duration="${TOTAL}"></audio>
${winClips}${mgClips}${clips}${blackClips}    </div>
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
