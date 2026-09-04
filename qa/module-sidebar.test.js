const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(index, /<aside class="modul-panel" id="modul-panel" aria-label="Ön muhasebe modülleri">/, "Erişilebilir sol modül paneli bulunmalı");
[
  "Alış &amp; Satış",
  "Cari Yönetimi",
  "Kasa &amp; Banka",
  "Gelir &amp; Gider",
  "Çek Yönetimi",
  "Raporlar",
  "Yönetim"
].forEach(baslik => assert.ok(index.includes(baslik), `${baslik} modül başlığı bulunmalı`));

[
  "Yeni Alış Faturası",
  "Yeni Satış Faturası",
  "Cari Hesaplar &amp; Ekstre",
  "Tahsilat / Ödeme Girişi",
  "Hesap Transferleri",
  "Aylık Finans Özeti",
  "Kullanıcılar &amp; Yetkiler",
  "Veri Kontrol Merkezi",
  "Depolama Sağlığı"
].forEach(altBaslik => assert.ok(index.includes(altBaslik), `${altBaslik} alt başlığı bulunmalı`));

assert.match(index, /class="modul-alt-baglanti yalnizca-yonetici"[^>]+data-modul="kullanicilar"/, "Kullanıcı yönetimi yalnızca yöneticiye açık olmalı");
assert.match(index, /@media \(max-width: 1180px\)[\s\S]*?body\.modul-panel-acik \.modul-panel/, "Panel küçük ekranlarda açılır menüye dönüşmeli");

const baslangic = index.indexOf("function modulPaneliniAc()");
const bitis = index.indexOf("// ── BAŞLANGIÇ", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Modül navigasyon işlevleri bulunmalı");

const cagrilar = [];
const dugme = {
  classList: { add(ad) { cagrilar.push(["aktif", ad]); } },
  closest() { return null; }
};
const context = {
  document: {
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
    getElementById() { return { setAttribute() {} }; },
    querySelectorAll() { return [{ classList: { remove() {} } }]; },
    querySelector() { return null; }
  },
  window: {},
  setTimeout,
  yoneticiGerekli() { return true; },
  yeniFaturaAc() { cagrilar.push(["yeniFaturaAc"]); },
  cariHesaplariAc() { cagrilar.push(["cariHesaplariAc"]); },
  odemeYonetiminiAc() { cagrilar.push(["odemeYonetiminiAc"]); },
  finansHesaplariniAc() { cagrilar.push(["finansHesaplariniAc"]); },
  hesapTransferleriniAc() { cagrilar.push(["hesapTransferleriniAc"]); },
  gelirGiderMerkeziniAc() { cagrilar.push(["gelirGiderMerkeziniAc"]); },
  aylikFinansOzetiniAc() { cagrilar.push(["aylikFinansOzetiniAc"]); },
  cekTakibiniAc() { cagrilar.push(["cekTakibiniAc"]); },
  raporAc() { cagrilar.push(["raporAc"]); },
  csvRaporIndir() { cagrilar.push(["csvRaporIndir"]); },
  kullaniciPaneliniAc() { cagrilar.push(["kullaniciPaneliniAc"]); },
  islemGecmisiniAc() { cagrilar.push(["islemGecmisiniAc"]); },
  bulutYedekleriniAc() { cagrilar.push(["bulutYedekleriniAc"]); }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

context.modulNavigasyon("finans-hesaplari", dugme);
context.modulNavigasyon("hesap-transferleri", dugme);
context.modulNavigasyon("gelir-gider", dugme);
context.modulNavigasyon("aylik-ozet", dugme);
context.modulNavigasyon("cek-takibi", dugme);

assert.ok(cagrilar.some(([ad]) => ad === "finansHesaplariniAc"), "Kasa/banka bağlantısı mevcut ekrana bağlanmalı");
assert.ok(cagrilar.some(([ad]) => ad === "hesapTransferleriniAc"), "Transfer bağlantısı mevcut ekrana bağlanmalı");
assert.ok(cagrilar.some(([ad]) => ad === "gelirGiderMerkeziniAc"), "Gelir/gider bağlantısı mevcut ekrana bağlanmalı");
assert.ok(cagrilar.some(([ad]) => ad === "aylikFinansOzetiniAc"), "Aylık özet bağlantısı mevcut ekrana bağlanmalı");
assert.ok(cagrilar.some(([ad]) => ad === "cekTakibiniAc"), "Çek bağlantısı mevcut ekrana bağlanmalı");

console.log("Modüler ön muhasebe yan menüsü doğrulandı.");
