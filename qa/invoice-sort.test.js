const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function goruntulenenFaturalariGetir");
const bitis = index.indexOf("// ── TOPLU İŞLEMLER", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Fatura listeleme işlevi bulunamadı");

const faturalar = [
  { id: 1, tarih: "2026-01-15" },
  { id: 2, tarih: "2026-09-02" },
  { id: 3, tarih: "2026-05-20" },
  { id: 4, tarih: "2026-09-02" }
];
const context = {
  Number,
  aktifIstatistikFiltresi: "",
  faturaYukle: () => faturalar.slice(),
  arayuzFiltresineUyar: () => true,
  filtreyeUyar: () => true,
  tarihOlusturYerel: tarih => new Date(`${tarih}T12:00:00`)
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.deepEqual(
  Array.from(context.goruntulenenFaturalariGetir(), fatura => fatura.id),
  [4, 2, 3, 1],
  "Faturalar en yeni fatura tarihinden en eskiye sıralanmalı"
);
assert.match(index, /Fatura tarihine göre yeni → eski/, "Liste sıralama açıklaması güncel olmalı");

console.log("Fatura tarihi yeni-eski sıralama testi başarılı.");
