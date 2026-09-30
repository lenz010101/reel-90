const fs = require("fs");
const h = fs.readFileSync("index.html", "utf8");
const parts = h.split(/<div id="ph(\d+)" class="clip" data-start="([\d.]+)" data-duration="([\d.]+)"><div class="group (wc|nc)"/);
// parts: [pre, id, start, dur, cls, content, id, start, dur, cls, content...]
for (let i = 1; i + 4 < parts.length; i += 5) {
  const id = parts[i], start = parts[i + 1], dur = parts[i + 2], cls = parts[i + 3];
  const content = parts[i + 4].split("</div></div>")[0];
  if (cls === "nc") {
    const txt = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log("ph" + id, "t=" + start, "dur=" + dur, "|", txt);
  }
}
