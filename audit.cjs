const fs = require("fs");
const h = fs.readFileSync("index.html", "utf8");
const LENS = { "w_face1.mp4": 11, "w_gen.mp4": 16, "w_hands.mp4": 14, "w_mid.mp4": 10, "w_meta.mp4": 20, "w_meta2.mp4": 16, "w_face2.mp4": 24 };
const re = /<video id="(wvid\d+)"[^>]*src="([^"]+)"[^>]*data-start="([\d.]+)"[^>]*data-duration="([\d.]+)"/g;
let m;
while ((m = re.exec(h))) {
  const file = m[2].split("#")[0].split("/").pop();
  const off = parseFloat((m[2].split("#t=")[1] || "0"));
  const st = parseFloat(m[3]), d = parseFloat(m[4]);
  const over = off + d - (LENS[file] || 99);
  console.log(m[1], file, "start=" + st, "dur=" + d, "off=" + off, over > 0 ? "FREEZE+" + over.toFixed(1) + "s" : "ok");
}
// tiny beats
const re2 = /<div id="s(\d+)" class="clip" data-start="([\d.]+)" data-duration="([\d.]+)">/g;
let n = 0;
while ((m = re2.exec(h))) { if (parseFloat(m[3]) < 0.5) { console.log("tiny beat", m[1], m[2], m[3]); n++; } }
console.log("tiny total=" + n);
