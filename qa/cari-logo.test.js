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

assert.equal(context.cariBasHarfleri("Krom Mutfak Sanayi"), "K", "Cari adının ilk harfi kullanılmalı");
assert.equal(context.cariBasHarfleri("Şahin"), "Ş", "Türkçe tek kelimeli cari adı desteklenmeli");
assert.equal(context.cariBasHarfleri(""), "?", "Eksik cari nötr simge göstermeli");
assert.equal(context.cariBasHarfleri("Belirtilmedi"), "?", "Eksik cari özeti de nötr simge göstermeli");
assert.deepEqual(context.cariLogoKimligi("Krom Mutfak"), context.cariLogoKimligi("Krom Mutfak"), "Aynı cari her zaman aynı logoyu kullanmalı");
assert.notEqual(context.cariLogoKimligi("Krom Mutfak").kod, context.cariLogoKimligi("Kütahya Askeriye").kod, "Aynı harfle başlayan farklı firmaların logoları ayrılmalı");
assert.notEqual(context.cariLogoKimligi("Krom Mutfak").stil, context.cariLogoKimligi("Kütahya Askeriye").stil, "Farklı firmaların görsel kimlikleri farklı olmalı");
assert.equal(context.cariLogoKimligi("").sinif, "cari-logo-belirsiz", "Eksik cari nötr logo sınıfını kullanmalı");

const guvenliLogo = context.cariLogosuHtml("<script> Firma");
assert.doesNotMatch(guvenliLogo, /<script>/, "Cari adı HTML olarak çalıştırılmamalı");
assert.match(guvenliLogo, /&lt;script&gt; Firma/, "Cari adı güvenli biçimde gösterilmeli");
assert.match(guvenliLogo, /data-logo-kimligi="[a-z0-9]+"/, "Her firma için sabit logo kimliği üretilmeli");
assert.match(guvenliLogo, /--logo-zemin:hsl\(/, "Firma adına özel renkler logoya uygulanmalı");
assert.doesNotMatch(index, /\.cari-logo-7/, "Sınırlı sabit renk paleti kullanılmamalı");
assert.equal((index.match(/\$\{cariLogosuHtml\(/g) || []).length, 5, "Logolar ana liste, raporlar, cari hesaplar ve çek takibinde kullanılmalı");

console.log("Firmaya özel tek harfli logo testleri başarılı.");
