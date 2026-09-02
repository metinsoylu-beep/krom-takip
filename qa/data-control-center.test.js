const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function tarihGecerliMi");
const bitis = index.indexOf("function veriKontrolSayaciniGuncelle", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Veri Kontrol Merkezi işlevleri bulunamadı");

function tutarSayiyaCevir(deger) {
  const sayi = Number(String(deger ?? "").replace(",", "."));
  return Number.isFinite(sayi) ? sayi : 0;
}

const context = {
  console,
  Date,
  Number,
  String,
  Map,
  Set,
  tutarSayiyaCevir,
  formatPara: deger => `${Number(deger)} ₺`,
  faturaImzasi: inv => [
    String(inv.no).trim().toLocaleUpperCase("tr-TR"),
    inv.tarih,
    Number(inv.vadeGun),
    Number(inv.tutar).toFixed(2)
  ].join("|")
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.equal(context.tarihGecerliMi("2024-02-29"), true, "Artık yıl tarihi geçerli olmalı");
assert.equal(context.tarihGecerliMi("2026-02-29"), false, "Olmayan takvim günü reddedilmeli");
assert.equal(context.tarihGecerliMi("2026-02-30"), false, "Ay gün sayısı doğru doğrulanmalı");

const hamListe = [
  { id: 1, no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: "100", odendi: false },
  { id: 2, no: "F-1", tarih: "2026-09-02", vadeGun: 30, tutar: "200", odendi: false },
  { id: 1, no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: "100", odendi: false },
  { id: 4, no: "F-4", tarih: "2026-02-30", vadeGun: 0, tutar: "0", odendi: true, odemeTarihi: "" }
];
const gecerliListe = hamListe.slice(0, 2);
const dogruOzet = { toplam: "300 ₺", odenen: "0 ₺", kalan: "300 ₺" };
const rapor = context.veriKontrolRaporuOlustur(hamListe, gecerliListe, dogruOzet);

assert.equal(rapor.gecersizSayisi, 1, "Hatalı tarih/tutar tek kayıt olarak raporlanmalı");
assert.equal(rapor.yinelenenSayisi, 1, "Aynı id ve imzaya sahip satır bir kez sayılmalı");
assert.equal(rapor.ayniNumaraSayisi, 1, "Aynı fatura numarası grubu uyarılmalı");
assert.equal(rapor.toplamlarDogru, true, "Doğru özet değerleri onaylanmalı");
assert.equal(rapor.uyariSayisi, 3, "Kontrol uyarıları doğru toplanmalı");

const hataliOzet = context.veriKontrolRaporuOlustur(
  hamListe,
  gecerliListe,
  { toplam: "301 ₺", odenen: "0 ₺", kalan: "300 ₺" }
);
assert.equal(hataliOzet.toplamlarDogru, false, "Özet ve tablo toplamı farkı yakalanmalı");
assert.equal(hataliOzet.uyariSayisi, 4, "Toplam uyuşmazlığı ek uyarı oluşturmalı");

assert.match(index, /Bu merkez yalnızca denetler; hiçbir faturayı otomatik değiştirmez\./);
console.log("Veri Kontrol Merkezi doğrulama testleri başarılı.");
