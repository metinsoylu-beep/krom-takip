const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");

function fonksiyonuAl(kaynak, ad) {
  const baslangic = kaynak.indexOf(`function ${ad}(`);
  assert.notEqual(baslangic, -1, `${ad} bulunmalı`);
  const govdeBaslangici = kaynak.indexOf("{", baslangic);
  let derinlik = 0, tek = false, cift = false, ters = false, kacis = false;
  for (let i = govdeBaslangici; i < kaynak.length; i++) {
    const karakter = kaynak[i];
    if (kacis) { kacis = false; continue; }
    if (karakter === "\\") { kacis = true; continue; }
    if (!cift && !ters && karakter === "'") tek = !tek;
    else if (!tek && !ters && karakter === '"') cift = !cift;
    else if (!tek && !cift && karakter === "`") ters = !ters;
    if (tek || cift || ters) continue;
    if (karakter === "{") derinlik++;
    if (karakter === "}" && --derinlik === 0) return kaynak.slice(baslangic, i + 1);
  }
  throw new Error(`${ad} gövdesi okunamadı`);
}

assert.match(index, /data-modul="genel-hareket"/, "Genel hareket defteri sol menüde bulunmalı");
assert.match(index, /id="genel-hareket-overlay"/, "Genel hareket defteri penceresi bulunmalı");
assert.match(index, /onclick="genelHareketDefteriCsvIndir\(\)"/, "Filtrelenen hareketler CSV olarak indirilebilmeli");
assert.match(index, /Bu ekran mevcut kayıtları değiştirmez/, "Ekranın salt okunur olduğu kullanıcıya açıklanmalı");
assert.match(index, /iç transferler nakit giriş-çıkış toplamını şişirmez/, "İç transferlerin özet kuralı kullanıcıya açıklanmalı");

const context = {
  console, Date, JSON, Math, Number, String, Array, Map, Set,
  tutarSayiyaCevir(deger) { return Number(deger) || 0; },
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger || "").split("T")[0]); },
  tarihOlusturYerel(deger) {
    const [yil, ay, gun] = String(deger || "").split("T")[0].split("-").map(Number);
    return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
  },
  vadeTarihi(tarih, vadeGun) {
    const [yil, ay, gun] = String(tarih || "").split("T")[0].split("-").map(Number);
    const d = new Date(yil, ay - 1, gun, 12, 0, 0, 0);
    d.setDate(d.getDate() + (parseInt(vadeGun, 10) || 90));
    return d;
  },
  formatTarih(deger) { return new Date(deger).toISOString().slice(0, 10); },
  faturaTurunuNormallestir(deger) { return String(deger || "").toLocaleLowerCase("tr-TR").includes("sat") ? "satis" : "alis"; },
  cariHareketTurunuNormallestir(deger) { return String(deger || "").toLocaleLowerCase("tr-TR") === "tahsilat" ? "tahsilat" : "odeme"; },
  isletmeHareketTurunuNormallestir(deger) { return String(deger || "").toLocaleLowerCase("tr-TR") === "gelir" ? "gelir" : "gider"; },
  faturalariTekillestir(liste) { return { liste }; },
  faturaTakibiKapali(fatura) { return fatura?.takipKapali === true; },
  faturaYukle() { return []; }, cariHareketleriYukle() { return []; }, cekleriYukle() { return []; },
  isletmeHareketleriniYukle() { return []; }, hesapTransferleriniYukle() { return []; },
  finansHesaplariniYukle() { return []; }, cariKartlariniYukle() { return []; }
};
vm.createContext(context);
["genelHareketDefteriOlustur", "genelHareketDefteriniFiltrele", "genelHareketDefteriniOzetle"]
  .forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const hesaplar = [
  { id:"b1", ad:"Ana Banka" },
  { id:"k1", ad:"Merkez Kasa" }
];
const cariler = [
  { id:"ca", cari:"Alfa Metal", acilisTarihi:"2026-01-01", acilisBorc:50, acilisAlacak:0 },
  { id:"cb", cari:"Beta Yapı", acilisTarihi:"2026-01-02", acilisBorc:0, acilisAlacak:20 }
];
const faturalar = [
  { id:"f1", no:"A-100", cari:"Alfa Metal", faturaTuru:"alis", tarih:"2026-09-01", vadeGun:30, tutar:500 },
  { id:"f2", no:"S-200", cari:"Beta Yapı", faturaTuru:"satis", tarih:"2026-09-02", vadeGun:15, tutar:800 }
];
const hareketler = [
  { id:"h1", cari:"Beta Yapı", tarih:"2026-09-03", islemTuru:"tahsilat", hesapId:"b1", yontem:"Havale", referans:"TH-1", tutar:300, durum:"Aktif" },
  { id:"h2", cari:"Alfa Metal", tarih:"2026-09-04", islemTuru:"odeme", hesapId:"k1", yontem:"Nakit", referans:"OD-1", tutar:200, durum:"Aktif" },
  { id:"h3", cari:"İptal Firma", tarih:"2026-09-05", islemTuru:"odeme", hesapId:"k1", tutar:999, durum:"İptal" }
];
const cekler = [
  { id:"c1", cari:"Alfa Metal", tarih:"2026-08-01", vadeTarihi:"2026-09-05", odemeTarihi:"2026-09-05", hesapId:"b1", cekNo:"Ç-1", banka:"Örnek Banka", tutar:100, durum:"Ödendi" },
  { id:"c2", cari:"Beta Yapı", tarih:"2026-09-06", vadeTarihi:"2026-10-06", cekNo:"Ç-2", banka:"Örnek Banka", tutar:150, durum:"Verildi" },
  { id:"c3", cari:"İptal Firma", tarih:"2026-09-07", vadeTarihi:"2026-10-07", cekNo:"Ç-3", tutar:200, durum:"İptal" }
];
const fisler = [
  { id:"g1", tarih:"2026-09-08", tur:"gelir", hesapId:"b1", kategori:"Diğer Gelir", belgeNo:"GF-1", tutar:250, durum:"Aktif" },
  { id:"g2", tarih:"2026-09-09", tur:"gider", hesapId:"k1", kategori:"Kira", belgeNo:"GD-1", tutar:75, durum:"Aktif" },
  { id:"g3", tarih:"2026-09-10", tur:"gider", hesapId:"k1", kategori:"İptal", tutar:999, durum:"İptal" }
];
const transferler = [
  { id:"t1", tarih:"2026-09-11", kaynakHesapId:"k1", hedefHesapId:"b1", referans:"TR-1", tutar:400, durum:"Aktif" }
];

const rapor = context.genelHareketDefteriOlustur(faturalar, hareketler, cekler, fisler, transferler, hesaplar, cariler);
const ozet = context.genelHareketDefteriniOzetle(rapor.satirlar);

assert.equal(rapor.satirlar.filter(satir => satir.id === "cek-odeme-c1").length, 1, "Ödenen çek ayrıca gerçek banka çıkışı üretmeli");
assert.equal(rapor.satirlar.filter(satir => satir.modul === "transfer").length, 1, "İç transfer tek bir izleme satırı üretmeli");
assert.equal(ozet.faturaHacmi, 1300, "Alış ve satış faturalarının hacmi ayrı etkiler korunarak toplanmalı");
assert.equal(ozet.nakitGiris, 550, "Tahsilat ve gelir fişi gerçek nakit girişine eklenmeli");
assert.equal(ozet.nakitCikis, 375, "Ödeme, ödenen çek ve gider fişi gerçek nakit çıkışına eklenmeli");
assert.ok(!rapor.satirlar.find(satir => satir.modul === "transfer").nakitEtkisi, "İç transfer işletme nakit toplamını değiştirmemeli");
assert.equal(rapor.satirlar[0].tarih, "2026-09-11", "Hareketler en yeni tarihten eskiye sıralanmalı");

const aktifFisler = context.genelHareketDefteriniFiltrele(rapor, "", "fis", "", "", "aktif");
assert.equal(aktifFisler.length, 2, "Modül ve durum filtreleri birlikte çalışmalı");
const tersTarih = context.genelHareketDefteriniFiltrele(rapor, "", "tumu", "2026-09-09", "2026-09-03", "aktif");
assert.ok(tersTarih.every(satir => satir.tarih >= "2026-09-03" && satir.tarih <= "2026-09-09"), "Ters girilen tarih aralığı güvenli biçimde düzeltilmeli");
assert.ok(context.genelHareketDefteriniFiltrele(rapor, "ç-2").some(satir => satir.id === "cek-verilis-c2"), "Arama belge numarasında Türkçe karakterle çalışmalı");
assert.equal(context.genelHareketDefteriniFiltrele(rapor, "İPTAL FİRMA", "tumu", "", "", "iptal").length, 2, "Arama ve iptal filtresi birlikte çalışmalı");

console.log("general-ledger.test.js: birleşik salt okunur hareket defteri kontrolleri geçti");
