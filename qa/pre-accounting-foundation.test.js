const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");

const yardimciBaslangic = index.indexOf("function faturaTurunuNormallestir");
const yardimciBitis = index.indexOf("function cariHareketleriNormallestir", yardimciBaslangic);
const ozetBaslangic = index.indexOf("function cariOzetleriniHesapla");
const ozetBitis = index.indexOf("function cariOzetiniGetir", ozetBaslangic);
assert.ok(yardimciBaslangic >= 0 && yardimciBitis > yardimciBaslangic, "İşlem yönü yardımcıları bulunmalı");
assert.ok(ozetBaslangic >= 0 && ozetBitis > ozetBaslangic, "Cari bakiye hesaplayıcısı bulunmalı");

const context = {
  console, Date, Math, Number, String, Array, Set, Map, JSON,
  tutarSayiyaCevir: deger => Number(deger) || 0,
  cariAdiAnahtari: deger => String(deger || "").trim().toLocaleUpperCase("tr-TR")
};
vm.createContext(context);
vm.runInContext(index.slice(yardimciBaslangic, yardimciBitis), context);
vm.runInContext(index.slice(ozetBaslangic, ozetBitis), context);

assert.equal(context.faturaTurunuNormallestir(undefined), "alis", "Türü olmayan eski fatura alış sayılmalı");
assert.equal(context.cariHareketTurunuNormallestir(undefined), "odeme", "Türü olmayan eski hareket ödeme sayılmalı");
assert.equal(context.faturaTurunuNormallestir("Satış"), "satis");
assert.equal(context.cariHareketTurunuNormallestir("Tahsilat"), "tahsilat");

const hesap = context.cariOzetleriniHesapla(
  [
    { cari:"Firma A", faturaTuru:"alis", tutar:500 },
    { cari:"Firma A", faturaTuru:"satis", tutar:800 }
  ],
  [
    { cari:"Firma A", islemTuru:"odeme", tutar:200, durum:"Aktif" },
    { cari:"Firma A", islemTuru:"tahsilat", tutar:300, durum:"Aktif" }
  ],
  [{ cari:"Firma A", tutar:100, durum:"Verildi" }],
  [{ id:"c-1", cari:"Firma A", acilisBorc:100, acilisAlacak:0 }]
)[0];

assert.equal(hesap.alisFaturaToplami, 500);
assert.equal(hesap.satisFaturaToplami, 800);
assert.equal(hesap.odemeToplami, 200);
assert.equal(hesap.tahsilatToplami, 300);
assert.equal(hesap.borcToplami, 900, "Devir borcu, alış faturası ve tahsilat borç tarafına yazılmalı");
assert.equal(hesap.alacakToplami, 1100, "Satış faturası, ödeme ve verilen çek alacak tarafına yazılmalı");
assert.equal(hesap.bakiye, -200, "Cari net bakiye çift yönlü hesaplanmalı");

assert.match(index, /id="inp-fatura-turu"/, "Yeni faturada alış veya satış türü seçilebilmeli");
assert.match(index, /id="d-fatura-turu"/, "Fatura düzenlerken tür değiştirilebilmeli");
assert.match(index, /<option value="tahsilat">Tahsilat<\/option>/, "Cari işlem ekranında tahsilat seçeneği bulunmalı");
assert.match(code, /"Fatura Türü"/, "Fatura türü Google Sheets'e yazılmalı");
assert.match(code, /"İşlem Türü"/, "Cari hareket türü Google Sheets'e yazılmalı");

console.log("Ön muhasebe işlem yönleri ve eski veri uyumluluğu testleri başarılı.");
