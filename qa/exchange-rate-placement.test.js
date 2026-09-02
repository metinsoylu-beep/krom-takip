const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

const containerStart = html.indexOf('<div class="konteyner">');
const ratePanel = html.indexOf('<section class="kur-panel"');
const filterPanel = html.indexOf('<section class="filtre-panel"');

assert.ok(containerStart >= 0, "Ana içerik konteyneri bulunmalı");
assert.ok(ratePanel > containerStart, "Döviz kuru şeridi ana konteyner içinde olmalı");
assert.ok(ratePanel < filterPanel, "Döviz kuru şeridi filtrelerin üstünde yer almalı");
assert.equal((html.match(/<section class="kur-panel"/g) || []).length, 1, "Sayfada yalnızca bir döviz kuru şeridi olmalı");
assert.match(html, /grid-template-columns: minmax\(230px, \.8fr\) minmax\(460px, 1\.8fr\) auto/, "Masaüstünde tek satırlık üst şerit düzeni korunmalı");
assert.match(html, /\.kur-satirlar \{ grid-column: 1 \/ -1; grid-row: 2;/, "Mobilde kurlar başlığın altında akmalı");
assert.match(html, /grid-template-columns: repeat\(2, minmax\(205px, 240px\)\)/, "USD ve EUR grupları birbirine yakın tutulmalı");
assert.match(html, /\.kur-fiyat-alis \{ grid-row: 2; \}/, "Alış kuru üst satırda olmalı");
assert.match(html, /\.kur-fiyat-satis \{ grid-row: 3; \}/, "Satış kuru alt satırda olmalı");
assert.match(html, /class="kur-fiyat kur-fiyat-alis"/, "Alış kuru dikey yerleşim sınıfını kullanmalı");
assert.match(html, /class="kur-fiyat kur-fiyat-satis"/, "Satış kuru dikey yerleşim sınıfını kullanmalı");

console.log("Döviz kuru şeridi konum ve duyarlı yerleşim testleri başarılı.");
