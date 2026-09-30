const fs = require("fs");
const tr = JSON.parse(fs.readFileSync("../edit-base/transcript.json", "utf8"));
const words = Array.isArray(tr) ? tr : tr.words;
const lastEnd = words[words.length - 1].end;
const S = 90 / lastEnd;
const ranges = [[9.86, 12.3], [29.74, 31.5], [52.98, 54.3], [86.06, 87.4]];
for (const [a, b] of ranges) {
  const w = words.filter((x) => x.start * S >= a - 0.4 && x.start * S <= b);
  console.log("[" + a + "->" + b + "]", w.map((x) => x.text).join(" "));
}
