const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function raporDonemAraligi");
const bitis = index.indexOf("function raporFiltreleriniOku", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Gelişmiş raporlama işlevleri bulunamadı");

function bugununTarihi(tarih = new Date()) {
  return `${tarih.getFullYear()}-${String(tarih.getMonth()+1).padStart(2,"0")}-${String(tarih.getDate()).padStart(2,"0")}`;
}
function vadeTarihi(tarih, vadeGun) {
  const [yil, ay, gun] = tarih.split("-").map(Number);
  const sonuc = new Date(yil, ay-1, gun, 12, 0, 0, 0);
  sonuc.setDate(sonuc.getDate() + Number(vadeGun));
  return sonuc;
}

const context = {
  console,
  Date,
  Number,
  String,
  Math,
  bugununTarihi,
  vadeTarihi,
  tutarSayiyaCevir: deger => Number(deger) || 0
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.deepEqual(
  { ...context.raporDonemAraligi("bu-ay", new Date(2026,1,10)) },
  { baslangic:"2026-02-01", bitis:"2026-02-28" },
  "Şubat ayı 28 günle bitmeli"
);
assert.deepEqual(
  { ...context.raporDonemAraligi("bu-ay", new Date(2024,1,10)) },
  { baslangic:"2024-02-01", bitis:"2024-02-29" },
  "Artık yılda Şubat 29 günle bitmeli"
);
assert.deepEqual(
  { ...context.raporDonemAraligi("gelecek-30", new Date(2026,1,10)) },
  { baslangic:"2026-02-10", bitis:"2026-03-11" },
  "Gelecek 30 günlük dönem takvim aylarını doğru aşmalı"
);

const liste = [
  { id:1, no:"F-1", tarih:"2026-01-01", vadeGun:40, tutar:"100", odendi:false },
  { id:2, no:"F-2", tarih:"2026-01-01", vadeGun:30, tutar:"200", odendi:false },
  { id:3, no:"F-3", tarih:"2026-02-01", vadeGun:20, tutar:"300", odendi:true, odemeTarihi:"2026-02-05" },
  { id:4, no:"F-4", tarih:"2026-02-15", vadeGun:30, tutar:"400", odendi:false }
];
const referans = new Date(2026,1,10);
const aylik = context.raporListesiniOlustur(
  liste,
  { baslangic:"2026-02-01", bitis:"2026-02-28", durum:"tumu" },
  referans
);
assert.deepEqual(Array.from(aylik, x => x.no), ["F-1","F-3"], "Aylık rapor vade tarihine göre filtrelenmeli");

const geciken = context.raporListesiniOlustur(liste, { durum:"geciken" }, referans);
assert.deepEqual(Array.from(geciken, x => x.no), ["F-2"], "Geciken raporu yalnızca ödenmemiş geçmiş vadeleri içermeli");

const yaklasan = context.raporListesiniOlustur(liste, { durum:"yaklasan" }, referans);
assert.deepEqual(Array.from(yaklasan, x => x.no), ["F-1"], "30 gün içindeki ödenmemiş vadeler doğru seçilmeli");

const ozet = context.raporOzetiniHesapla(aylik);
assert.deepEqual({ ...ozet }, { kayit:2, toplam:400, odenen:300, kalan:100 });
assert.equal(context.htmlGuvenli('<Fatura "A">'), "&lt;Fatura &quot;A&quot;&gt;", "Rapor tablosu metni güvenli olmalı");

assert.match(index, /Yazdır \/ PDF/);
assert.match(index, /Vade tarihine göre hazırlanır/);
console.log("Gelişmiş raporlama tarih, durum, toplam ve çıktı testleri başarılı.");
