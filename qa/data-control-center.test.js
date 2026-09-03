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
  tarihOlusturYerel: deger => {
    const [yil, ay, gun] = String(deger || "").split("-").map(Number);
    return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
  },
  cariHareketleriYukle: () => [],
  cekleriYukle: () => [],
  cekNumarasiAnahtari: cek => {
    const temizle = deger => String(deger || "").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ");
    const no = temizle(cek?.cekNo);
    const banka = temizle(cek?.banka);
    return no && banka ? `${banka}|${no}` : "";
  },
  formatPara: deger => `${Number(deger)} ₺`,
  faturaImzasi: inv => [
    String(inv.cari || "").trim().toLocaleUpperCase("tr-TR"),
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
  { id: 4, no: "F-4", tarih: "2026-02-30", vadeGun: 0, tutar: "0" }
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

const farkliCariler = [
  { id:10, cari:"Firma A", no:"ORTAK-1", tarih:"2026-09-01", vadeGun:30, tutar:"100", odendi:false },
  { id:11, cari:"Firma B", no:"ORTAK-1", tarih:"2026-09-01", vadeGun:30, tutar:"100", odendi:false }
];
const cariRaporu = context.veriKontrolRaporuOlustur(farkliCariler, farkliCariler);
assert.equal(cariRaporu.yinelenenSayisi, 0, "Farklı carilerin aynı numaralı faturaları yinelenen sayılmamalı");
assert.equal(cariRaporu.ayniNumaraSayisi, 0, "Aynı fatura numarası farklı carilerde kullanılabilmeli");

const cekTarihiRaporu = context.veriKontrolRaporuOlustur(
  farkliCariler,
  farkliCariler,
  null,
  [],
  [
    { id:"cek-1", cari:"Firma A", cekNo:"CHK-1", banka:"Test Bank", tarih:"2026-08-01", vadeTarihi:"2026-09-01", tutar:100, durum:"Ödendi", odemeTarihi:"" },
    { id:"cek-2", cari:"Firma B", cekNo:"CHK-2", banka:"Test Bank", tarih:"2026-08-10", vadeTarihi:"2026-09-10", tutar:200, durum:"Ödendi", odemeTarihi:"2026-08-09" },
    { id:"cek-3", cari:"Firma C", cekNo:"CHK-3", banka:"Test Bank", tarih:"2026-08-15", vadeTarihi:"2026-09-15", tutar:300, durum:"Ödendi", odemeTarihi:"2026-09-04" },
    { id:"cek-4", cari:"Firma D", cekNo:"CHK-4", banka:"Test Bank", tarih:"2026-08-20", vadeTarihi:"2026-09-20", tutar:400, durum:"Ödendi", odemeTarihi:"2026-09-03" },
    { id:"cek-5", cari:"Firma E", cekNo:"CHK-5", banka:"Test Bank", tarih:"2026-09-02", vadeTarihi:"2026-09-01", tutar:500, durum:"Verildi", odemeTarihi:"" },
    { id:"cek-6", cari:"Firma F", cekNo:" chk-4 ", banka:" test bank ", tarih:"2026-08-21", vadeTarihi:"2026-09-21", tutar:600, durum:"Verildi", odemeTarihi:"" },
    { id:"cek-7", cari:"Firma G", cekNo:"", banka:"", tarih:"2026-08-22", vadeTarihi:"2026-09-22", tutar:700, durum:"Verildi", odemeTarihi:"" }
  ],
  new Date(2026, 8, 3, 12, 0, 0, 0)
);
assert.equal(cekTarihiRaporu.cekTarihiSorunuSayisi, 4, "Ödeme ve vade tarihi sorunları raporlanmalı");
assert.equal(cekTarihiRaporu.eksikCekBilgisiSayisi, 1, "Eksik çek numarası ve banka tek kayıt uyarısı olarak raporlanmalı");
assert.equal(cekTarihiRaporu.ayniCekNumarasiSayisi, 1, "Aynı banka ve çek numarası raporlanmalı");
assert.equal(cekTarihiRaporu.cekTarihiSorunlari[0].id, "cek-1", "Düzeltme bağlantısı için sorunlu çek kimliği korunmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /CHK-1.*ödeme tarihi eksik/, "Eksik ödeme tarihli çek açıklanmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /CHK-2.*veriliş tarihinden önce/, "Erken ödeme tarihli çek açıklanmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /CHK-3.*bugünden ileri/, "Gelecek ödeme tarihli çek açıklanmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /CHK-5.*vade tarihi veriliş tarihinden önce/, "Erken vade tarihli çek açıklanmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /CHK-4.*Firma D.*Firma F/i, "Aynı çek numarasının bağlı olduğu cariler açıklanmalı");
assert.match(cekTarihiRaporu.mesajlar.join("\n"), /Firma G.*çek numarası ve banka eksik/i, "Eksik çek bilgileri açıklanmalı");

assert.match(index, /id="kontrol-cek-tarihi"/, "Çek tarihleri kontrol sayacı bulunmalı");
assert.match(index, /id="kontrol-eksik-cek"/, "Eksik çek bilgisi kontrol sayacı bulunmalı");
assert.match(index, /id="kontrol-ayni-cek-no"/, "Aynı çek numarası kontrol sayacı bulunmalı");
assert.match(index, /className = "veri-kontrol-duzelt yalnizca-yonetici"/, "Çek tarihi uyarısında yönetici düzeltme düğmesi bulunmalı");
assert.match(index, /function veriKontrolCekiniDuzelt\(kimlik\)/, "Düzeltme düğmesi ilgili çek formunu açmalı");
assert.match(index, /cariHareketDuzenlemeyiBaslat\("cek", kimlik\)/, "Sorunlu çek doğrudan düzenlenebilmeli");
assert.match(index, /kayit\.durum !== "İptal"/, "Bekleyen ve ödenen sorunlu çekler düzeltmeye açılabilmeli");
assert.match(index, /Bu merkez yalnızca denetler; hiçbir kaydı otomatik değiştirmez\./);
const listeKonumu = index.indexOf('id="liste"');
const kontrolKonumu = index.indexOf('class="sayfa-sonu-kontroller"');
const footerKonumu = index.indexOf("<footer>");
assert.ok(listeKonumu >= 0 && kontrolKonumu > listeKonumu, "Kontrol panelleri fatura listesinin altında olmalı");
assert.ok(footerKonumu > kontrolKonumu, "Kontrol panelleri sayfa alt bilgisinden hemen önce yer almalı");
console.log("Veri Kontrol Merkezi doğrulama testleri başarılı.");
