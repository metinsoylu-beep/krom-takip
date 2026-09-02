const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function kimlikKumesiOlustur");
const bitis = index.indexOf("function secimiGecerliKayitlarlaSinirla", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Toplu işlem veri işlevleri bulunamadı");

const context = {
  console, String, Set, Array, Date,
  faturaKalanTutari: inv => Math.max(0, Number(inv.tutar) - (inv.odemeler || []).reduce((toplam, odeme) => toplam + Number(odeme.tutar), 0)),
  odemeKimligiOlustur: id => `test-${id}`,
  bugununTarihi: () => "2026-09-02",
  faturaOdemeOzetiniUygula(inv) {
    const odenen = (inv.odemeler || []).reduce((toplam, odeme) => toplam + Number(odeme.tutar), 0);
    inv.odendi = odenen >= Number(inv.tutar);
    inv.odemeTarihi = inv.odendi ? inv.odemeler.reduce((son, odeme) => odeme.tarih > son ? odeme.tarih : son, "") : "";
    return inv;
  }
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

const odenenListe = context.seciliFaturalariOdendiYap(liste, [1, 2], "2026-09-02");
assert.equal(odenenListe[0].odendi, true, "Seçili ödenmemiş fatura ödendi yapılmalı");
assert.equal(odenenListe[0].odemeTarihi, "2026-09-02", "Yeni ödeme tarihi kaydedilmeli");
assert.equal(odenenListe[0].odemeler[0].tutar, 100, "Toplu işlem kalan tutar kadar ödeme kaydı oluşturmalı");
assert.equal(odenenListe[1].odemeTarihi, "2026-08-15", "Önceden ödenmiş faturanın tarihi korunmalı");
assert.equal(odenenListe[2].odendi, false, "Seçilmemiş fatura değişmemeli");

const kalanListe = context.seciliFaturalariSil(liste, new Set(["1", "3"]));
assert.deepEqual(Array.from(kalanListe, inv => inv.id), [2], "Yalnız seçilen faturalar silinmeli");
assert.equal(context.seciliFaturalariSil(liste, []).length, 3, "Boş seçim veriyi değiştirmemeli");

assert.match(index, /id="gorunenlerin-tumunu-sec"/, "Görünenleri seç kutusu bulunmalı");
assert.match(index, /id="toplu-islem-panel"[^>]*yalnızca-yonetici|class="toplu-islem-panel yalnızca-yonetici"/, "Toplu işlemler yalnız yöneticide görünmeli");
assert.match(index, /function secilenleriCsvIndir\(/, "Seçilen CSV işlemi bulunmalı");
assert.match(index, /id="toplu-sil-overlay"/, "Toplu silme ikinci onay ekranı bulunmalı");
assert.match(index, /function topluSilmeyiOnayla\(/, "Toplu silme onayı bulunmalı");

console.log("Toplu seçim, ödeme, CSV ve güvenli silme testleri başarılı.");
