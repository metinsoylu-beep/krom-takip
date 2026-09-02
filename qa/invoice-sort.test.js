const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function aktifSiralamaTuru");
const bitis = index.indexOf("// ── TOPLU İŞLEMLER", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Fatura listeleme işlevi bulunamadı");

const faturalar = [
  { id: 1, cari: "Çelik", tarih: "2026-01-15", vadeGun: 30, tutar: 100, takipKapali: true },
  { id: 2, cari: "Arı", tarih: "2026-08-20", vadeGun: 30, tutar: 500, takipKapali: false },
  { id: 3, cari: "Başak", tarih: "2026-08-05", vadeGun: 30, tutar: 300, takipKapali: false },
  { id: 4, cari: "Başak", tarih: "2026-08-05", vadeGun: 30, tutar: 200, takipKapali: false }
];
const context = {
  Number,
  document: { getElementById: () => ({ value: "durum-vade" }) },
  aktifIstatistikFiltresi: "",
  faturaYukle: () => faturalar.slice(),
  arayuzFiltresineUyar: () => true,
  filtreyeUyar: () => true,
  faturaTakibiKapali: fatura => fatura.takipKapali === true,
  tarihOlusturYerel: tarih => new Date(`${tarih}T12:00:00`),
  tutarSayiyaCevir: Number,
  vadeTarihi: (tarih,vadeGun) => {
    const d = new Date(`${tarih}T12:00:00`);
    d.setDate(d.getDate() + vadeGun);
    return d;
  }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.deepEqual(
  Array.from(context.goruntulenenFaturalariGetir(), fatura => fatura.id),
  [4, 3, 2, 1],
  "Takibi açık faturalar önce, kendi aralarında yaklaşan vade tarihine göre sıralanmalı"
);
const sirala = tur => Array.from(
  faturalar.slice().sort((a,b) => context.faturaListeSirasiniKarsilastir(a,b,tur)),
  fatura => fatura.id
);
assert.deepEqual(sirala("tarih-yeni"), [2, 4, 3, 1], "Yeni tarih önce sıralaması çalışmalı");
assert.deepEqual(sirala("tarih-eski"), [1, 4, 3, 2], "Eski tarih önce sıralaması çalışmalı");
assert.deepEqual(sirala("tutar-buyuk"), [2, 3, 4, 1], "Büyük tutar önce sıralaması çalışmalı");
assert.deepEqual(sirala("cari-az"), [2, 4, 3, 1], "Türkçe cari adına göre sıralama çalışmalı");
assert.match(index, /id="filtre-siralama"/, "Sıralama seçicisi arayüzde bulunmalı");
assert.match(index, /Durum \+ Yaklaşan Vade/, "Varsayılan sıralama kullanıcıya açıklanmalı");
assert.equal(context.siralamaAciklamasi("tutar-buyuk"), "Tutar · Büyük tutar önce");

console.log("Kullanıcı seçilebilir fatura sıralama testleri başarılı.");
