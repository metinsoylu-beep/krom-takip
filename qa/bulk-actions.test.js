const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function kimlikKumesiOlustur");
const bitis = index.indexOf("function secimiGecerliKayitlarlaSinirla", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Toplu işlem veri işlevleri bulunamadı");

const context = {
  console, String, Set, Array, Date
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const liste = [
  { id:1, cari:"Firma A", no:"A-1", tutar:100, odendi:false, odemeTarihi:"" },
  { id:2, cari:"Firma B", no:"B-1", tutar:200, odendi:true, odemeTarihi:"2026-08-15", odemeler:[{id:"eski",tarih:"2026-08-15",tutar:200}] },
  { id:3, cari:"Firma C", no:"C-1", tutar:300, odendi:false, odemeTarihi:"" }
];

const secilenler = context.seciliFaturalariGetir(liste, new Set(["1", "3"]));
assert.deepEqual(Array.from(secilenler, inv => inv.id), [1, 3], "Yalnız seçilen kimlikler dönmeli");

const kalanListe = context.seciliFaturalariSil(liste, new Set(["1", "3"]));
assert.deepEqual(Array.from(kalanListe, inv => inv.id), [2], "Yalnız seçilen faturalar silinmeli");
assert.equal(context.seciliFaturalariSil(liste, []).length, 3, "Boş seçim veriyi değiştirmemeli");

assert.match(index, /id="gorunenlerin-tumunu-sec"/, "Görünenleri seç kutusu bulunmalı");
assert.match(index, /id="toplu-islem-panel"[^>]*yalnizca-yonetici|class="toplu-islem-panel yalnizca-yonetici"/, "Toplu işlemler yalnız yöneticide görünmeli");
assert.match(index, /function secilenleriCsvIndir\(/, "Seçilen CSV işlemi bulunmalı");
assert.match(index, /id="toplu-sil-overlay"/, "Toplu silme ikinci onay ekranı bulunmalı");
assert.match(index, /function topluSilmeyiOnayla\(/, "Toplu silme onayı bulunmalı");
assert.doesNotMatch(index, /function seciliFaturalariOdendiYap\(/, "Fatura bazlı toplu ödeme kaldırılmalı");
assert.doesNotMatch(index, /id="toplu-odendi-btn"/, "Toplu ödeme düğmesi kaldırılmalı");

console.log("Toplu seçim, CSV ve güvenli silme testleri başarılı.");
