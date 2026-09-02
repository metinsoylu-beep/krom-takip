const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function cariEkstreBelgesiVerisi");
const bitis = index.indexOf("function cariEkstreBelgesiniGoster", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Cari ekstre belge veri işlevi bulunamadı");

const context = {
  Date,
  String,
  Array,
  tutarSayiyaCevir: deger => Number(deger) || 0,
  cariLogoKimligi: () => ({ kod:"ab12cd34" }),
  bakiyeBilgisi: bakiye => bakiye > 0
    ? { etiket:"Borç Bakiyesi", sinif:"bakiye-borc", tutar:bakiye }
    : bakiye < 0
      ? { etiket:"Alacak Bakiyesi", sinif:"bakiye-alacak", tutar:Math.abs(bakiye) }
      : { etiket:"Kapalı Hesap", sinif:"bakiye-kapali", tutar:0 },
  bugununTarihi: tarih => `${tarih.getFullYear()}-${String(tarih.getMonth()+1).padStart(2,"0")}-${String(tarih.getDate()).padStart(2,"0")}`,
  cariEkstreHareketleriniOlustur: () => { throw new Error("Hazır hareketler kullanıldığında veri tekrar okunmamalı"); },
  cariOzetiniGetir: () => { throw new Error("Hazır hesap özeti kullanıldığında veri tekrar okunmamalı"); }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const hareketler = [
  { id:"f-1", tarih:"2026-08-01", tur:"Fatura", detay:"F-1", borc:1000, alacak:0, bakiye:1000 },
  { id:"h-1", tarih:"2026-08-15", tur:"Havale / EFT", detay:"Ref: 123", borc:0, alacak:400, bakiye:600 },
  { id:"c-1", tarih:"2026-08-20", tur:"Çek · Verildi", detay:"Çek 45", borc:0, alacak:250, bakiye:350 }
];
const hesap = { faturaToplami:1000, odemeToplami:400, cekToplami:250, bekleyenCek:250, bakiye:350 };
const belge = context.cariEkstreBelgesiVerisi("Örnek Metal", hareketler, hesap, new Date(2026,8,2));

assert.equal(belge.cari, "Örnek Metal");
assert.equal(belge.belgeNo, "EKT-20260902-AB12CD", "Belge numarası tarih ve cari kimliğinden üretilmeli");
assert.equal(belge.raporTarihi, "2026-09-02");
assert.equal(belge.ilkTarih, "2026-08-01");
assert.equal(belge.sonTarih, "2026-08-20");
assert.equal(belge.hesap.bakiye, 350);
assert.equal(belge.bakiye.etiket, "Borç Bakiyesi");
assert.equal(belge.hareketler.length, 3);

assert.match(index, /id="cari-ekstre-overlay"/, "Müşteri ekstresi için ayrı pencere bulunmalı");
assert.match(index, /CARİ HESAP EKSTRESİ/, "Belge başlığı bulunmalı");
assert.match(index, /function cariEkstreYazdir\(/, "Ekstre PDF veya yazdırma çıktısına hazırlanabilmeli");
assert.match(index, /function cariEkstreCsvIndir\(/, "Ekstre CSV olarak indirilebilmeli");
assert.match(index, /cariEkstreBelgesiniGoster\(cariEkstreBelgesiVerisi\(cari\)\)/, "Ekstre düğmesi belgeyi oluşturmalı");
assert.doesNotMatch(index, /function cariEkstreAc\(cari\) \{\s*cariHesaplariKapat\(\);\s*odemeYonetiminiAc/, "Ekstre düğmesi ödeme girişini açmamalı");

console.log("Müşteriye gönderilebilir cari hesap ekstresi testleri başarılı.");
