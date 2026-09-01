const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function csvHucre");
const bitis = index.indexOf("function filtreBasligi", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "CSV dışa aktarma işlevleri bulunamadı");

const context = {
  console,
  String,
  Math,
  Blob,
  URL,
  setTimeout,
  goruntulenenFaturalariGetir: () => [],
  syncGoster() {},
  vadeTarihi() {},
  kalanGun() {},
  bugununTarihi() { return "2026-09-01"; },
  tutarSayiyaCevir: Number,
  document: {
    createElement: () => ({ click() {}, remove() {} }),
    body: { appendChild() {} }
  }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.equal(context.csvHucre("Normal Fatura"), '"Normal Fatura"');
assert.equal(context.csvHucre('Fatura "A"'), '"Fatura ""A"""');
assert.equal(context.csvHucre("=2+2"), '"\'=2+2"', "Excel formülü metin olarak güvenli hale getirilmeli");
assert.equal(context.csvHucre("+KOMUT"), '"\'+KOMUT"', "Artı işaretiyle başlayan değer güvenli hale getirilmeli");
assert.ok(index.includes("\\uFEFF"), "Excel için UTF-8 BOM eklenmeli");
assert.match(index, /goruntulenenFaturalariGetir\(\)/, "CSV ekrandaki filtrelenmiş listeyi kullanmalı");

console.log("CSV dışa aktarma ve formül güvenliği testleri başarılı.");
