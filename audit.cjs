const fs = require("fs");
const h = fs.readFileSync("index.html", "utf8");
const wins = [];
let m;
const re = /<video id="(wvid\d+)"[^>]*src="([^"]+)"[^>]*data-start="([\d.]+)"[^>]*data-duration="([\d.]+)"/g;
while ((m = re.exec(h))) {
  wins.push({ id: m[1], f: m[2].split("/").pop().split("#")[0], s: +m[3], d: +m[4], e: +( +m[3] + +m[4] ).toFixed(2) });
}
console.log("--- WINDOWS ---");
wins.forEach((w) => console.log(w.id, w.f, w.s + "->" + w.e));
console.log("--- HOLES (>1.5s sin card) ---");
for (let i = 0; i < wins.length; i++) {
  const a = wins[i].e;
  const b = wins[i + 1] ? wins[i + 1].s : 90;
  if (b - a > 1.5) console.log(a + "->" + b, "(" + (b - a).toFixed(1) + "s)");
}
const re2 = /<div id="ph(\d+)" class="clip" data-start="([\d.]+)" data-duration="([\d.]+)"/g;
console.log("--- PHRASES 6-16s ---");
while ((m = re2.exec(h))) {
  const s = +m[2];
  if (s >= 6 && s <= 16) console.log("ph" + m[1], "start=" + s, "dur=" + m[3]);
}
