const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function faturaListeSirasiniKarsilastir");
const bitis = index.indexOf("// ── TOPLU İŞLEMLER", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Fatura listeleme işlevi bulunamadı");

const faturalar = [
  { id: 1, tarih: "2026-01-15", vadeGun: 30, takipKapali: true },
  { id: 2, tarih: "2026-08-20", vadeGun: 30, takipKapali: false },
  { id: 3, tarih: "2026-08-05", vadeGun: 30, takipKapali: false },
  { id: 4, tarih: "2026-08-05", vadeGun: 30, takipKapali: false }
];
const context = {
  Number,
  aktifIstatistikFiltresi: "",
  faturaYukle: () => faturalar.slice(),
  arayuzFiltresineUyar: () => true,
  filtreyeUyar: () => true,
  faturaTakibiKapali: fatura => fatura.takipKapali === true,
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
assert.match(index, /Duruma göre · Yaklaşan vade önce/, "Liste sıralama açıklaması güncel olmalı");

console.log("Durum ve yaklaşan vade sıralama testi başarılı.");
