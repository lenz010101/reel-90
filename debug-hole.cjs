const fs = require("fs");
const tr = JSON.parse(fs.readFileSync("../edit-base/transcript.json", "utf8"));
const words = Array.isArray(tr) ? tr : tr.words;
const S = 90 / words[words.length - 1].end;
const holes = [[9.86, 12.24], [29.74, 30.72], [52.98, 54.19], [86.06, 87.27]];
for (const [s, e] of holes) {
  const ws = words.filter((w) => w.start * S < e + 0.5 && w.end * S > s - 0.5);
  console.log(`--- ${s}-${e} ---`);
  console.log(ws.map((w) => `${w.start.toFixed(2)}:${w.text}`).join(" "));
}
