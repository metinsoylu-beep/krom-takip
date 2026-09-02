const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function htmlGuvenli");
const bitis = index.indexOf("function raporFiltreleriniOku", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Cari logo işlevleri bulunamadı");

const context = {
  String,
  Array,
  cariAdiAnahtari: cari => String(cari || "Belirtilmedi").trim().toLocaleUpperCase("tr-TR") || "BELİRTİLMEDİ"
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.equal(context.cariBasHarfleri("Krom Mutfak Sanayi"), "KM", "İlk iki kelimenin baş harfleri kullanılmalı");
assert.equal(context.cariBasHarfleri("Şahin"), "Ş", "Türkçe tek kelimeli cari adı desteklenmeli");
assert.equal(context.cariBasHarfleri(""), "?", "Eksik cari nötr simge göstermeli");
assert.equal(context.cariBasHarfleri("Belirtilmedi"), "?", "Eksik cari özeti de nötr simge göstermeli");
assert.equal(context.cariLogoRenkSinifi("Krom Mutfak"), context.cariLogoRenkSinifi("Krom Mutfak"), "Aynı cari her zaman aynı renkte olmalı");

const guvenliLogo = context.cariLogosuHtml("<script> Firma");
assert.doesNotMatch(guvenliLogo, /<script>/, "Cari adı HTML olarak çalıştırılmamalı");
assert.match(guvenliLogo, /&lt;script&gt; Firma/, "Cari adı güvenli biçimde gösterilmeli");
assert.match(index, /\.cari-logo-7/, "Sekiz sabit logo rengi tanımlanmalı");
assert.equal((index.match(/\$\{cariLogosuHtml\(/g) || []).length, 3, "Logolar ana liste, rapor ve cari hesaplarda kullanılmalı");

console.log("Cari baş harf logosu ve sabit renk testleri başarılı.");
