const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function jsonYedekKontrolKodu");
const bitis = index.indexOf("function jsonYedekSeciminiTemizle", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "JSON yedek doğrulama işlevleri bulunamadı");

const context = {
  Math,
  JSON,
  faturalariTekillestir: liste => ({ liste:Array.isArray(liste) ? liste : [], kaldirilan:0 }),
  cariHareketleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cekleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cariKartlariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  finansHesaplariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  isletmeHareketleriniNormallestir: liste => Array.isArray(liste) ? liste : [],
  hesapTransferleriniNormallestir: liste => Array.isArray(liste) ? liste : []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const durum = {
  items:[{ id:1, no:"F-1" }],
  cariHareketler:[{ id:"H-1" }],
  cekler:[{ id:"C-1" }],
  cariler:[{ id:"K-1" }],
  hesaplar:[{ id:"B-1" }],
  isletmeHareketler:[{ id:"FIS-1" }]
};
const kod = context.jsonYedekKontrolKodu(JSON.stringify(durum));
const sonuc = context.jsonYedekVerisiniDogrula({
  format:"arlinoks-merkezi-yedek-v1",
  kayitZamani:"2026-09-03T12:00:00.000Z",
  revision:18,
  kontrol:{ kod },
  durum
}, "arlinoks-yedek.json");

assert.equal(sonuc.kodDogrulandi, true, "Doğru kontrol kodu onaylanmalı");
assert.equal(sonuc.sayilar.fatura, 1, "Fatura sayısı okunmalı");
assert.equal(sonuc.sayilar.cariHareket, 1, "Ödeme sayısı okunmalı");
assert.equal(sonuc.sayilar.cek, 1, "Çek sayısı okunmalı");
assert.equal(sonuc.sayilar.cariKart, 1, "Cari sayısı okunmalı");
assert.equal(sonuc.sayilar.finansHesap, 1, "Kasa/banka hesabı sayısı okunmalı");
assert.equal(sonuc.sayilar.isletmeHareket, 1, "Gelir/gider fişi sayısı okunmalı");

assert.throws(() => context.jsonYedekVerisiniDogrula({
  format:"arlinoks-merkezi-yedek-v1",
  kontrol:{ kod:"00000000" },
  durum
}), /kontrol kodu eşleşmiyor/, "Bozuk veya değiştirilmiş yedek reddedilmeli");

assert.throws(() => context.jsonYedekVerisiniDogrula({ format:"bilinmeyen", durum }), /Arlinoks merkezi yedek biçiminde değil/, "Bilinmeyen dosya biçimi reddedilmeli");

console.log("JSON yedek doğrulama ve güvenli içe aktarma testleri başarılı.");
