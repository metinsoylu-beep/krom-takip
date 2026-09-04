const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("sw.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

assert.match(worker, /odeme-takip-v60/, "Önbellek sürümü yükseltilmeli");
assert.doesNotMatch(worker, /odeme-takip-v37/, "Eski önbellek sürümü kullanılmamalı");
assert.match(worker, /e\.request\.mode === 'navigate'/, "Sayfa gezinmeleri ayrı ele alınmalı");
assert.match(worker, /fetch\(e\.request, \{ cache: 'no-store' \}\)/, "Ana sayfa ağdan güncel alınmalı");
assert.match(worker, /caches\.match\(`\$\{BASE\}index\.html`\)/, "Çevrimdışı ana sayfa yedeği korunmalı");
assert.match(index, /updateViaCache: 'none'/, "Servis çalışanı güncellemesi tarayıcı önbelleğine takılmamalı");
assert.match(index, /controllerchange/, "Yeni sürüm etkinleştiğinde sayfa yenilenmeli");

console.log("Servis çalışanı güncelleme ve çevrimdışı önbellek testleri başarılı.");
