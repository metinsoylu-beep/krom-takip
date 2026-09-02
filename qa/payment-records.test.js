const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = index.indexOf("function odemeKaydiniNormallestir");
const bitis = index.indexOf("function faturaImzasi", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Ödeme veri modeli işlevleri bulunamadı");

const context = {
  console, Date, Math, Number, String, Array, Set,
  tutarSayiyaCevir: deger => Number(deger) || 0
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const kismi = {
  id:1, tarih:"2026-09-01", tutar:100, odendi:false, odemeTarihi:"",
  odemeler:[{ id:"odm-1", tarih:"2026-09-02", tutar:40, yontem:"Havale / EFT", referans:"R-1", aciklama:"İlk ödeme" }]
};
assert.equal(context.faturaOdenenTutari(kismi), 40);
assert.equal(context.faturaKalanTutari(kismi), 60);
assert.equal(context.faturaOdemeDurumu(kismi), "kismi");

const tamamlanan = context.faturaOdemeOzetiniUygula({
  ...kismi,
  odemeler:[...kismi.odemeler, { id:"odm-2", tarih:"2026-09-05", tutar:60, yontem:"Çek" }]
}, false);
assert.equal(tamamlanan.odendi, true, "Toplam ödeme fatura tutarına ulaşınca kapanmalı");
assert.equal(tamamlanan.odemeTarihi, "2026-09-05", "Tamamlanma tarihi son ödeme tarihi olmalı");

const eski = context.faturaOdemeOzetiniUygula({
  id:9, tarih:"2026-08-01", tutar:250, odendi:true, odemeTarihi:"2026-08-20", odemeler:[]
}, true);
assert.equal(eski.odemeler.length, 1, "Eski ödenmiş kayıt için ödeme geçmişi üretilmeli");
assert.equal(eski.odemeler[0].id, "legacy-9");
assert.equal(eski.odemeler[0].tutar, 250);

assert.match(index, /id="odeme-yonetim-overlay"/, "Manuel ödeme penceresi bulunmalı");
assert.match(index, /id="odeme-tarih"/, "Ödeme tarihi alanı bulunmalı");
assert.match(index, /id="odeme-tutar"/, "Ödeme tutarı alanı bulunmalı");
assert.match(index, /id="odeme-yontem"/, "Ödeme yöntemi alanı bulunmalı");
assert.match(index, /id="odeme-referans"/, "Dekont veya referans alanı bulunmalı");
assert.match(index, /function odemeKaydiniSil\(/, "Yanlış ödeme kaydı silinebilmeli");
assert.match(index, /Kısmi Ödendi/, "Kısmi ödeme durumu arayüzde bulunmalı");
assert.match(code, /const PAYMENT_SHEET_NAME = "Ödemeler"/, "Ödemeler ayrı Sheets sayfasında tutulmalı");
assert.match(code, /paymentSheet\.getRange/, "Ödeme satırları Sheets'e yazılmalı");

console.log("Manuel, kısmi ve çoklu ödeme kayıt sistemi testleri başarılı.");
