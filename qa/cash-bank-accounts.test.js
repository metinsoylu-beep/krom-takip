const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const appsScript = fs.readFileSync("google-apps-script/Code.gs", "utf8");

function fonksiyonuAl(kaynak, ad) {
  const baslangic = kaynak.indexOf(`function ${ad}(`);
  assert.notEqual(baslangic, -1, `${ad} bulunmalı`);
  const govdeBaslangici = kaynak.indexOf("{", baslangic);
  let derinlik = 0;
  let tek = false;
  let cift = false;
  let ters = false;
  let kacis = false;
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

const adlar = [
  "tutarSayiyaCevir",
  "cariHareketTurunuNormallestir",
  "cariHareketAktifMi",
  "isletmeHareketTurunuNormallestir",
  "isletmeHareketiAktifMi",
  "hesapTransferiAktifMi",
  "finansHesapTurunuNormallestir",
  "finansHesabiniNormallestir",
  "finansHesaplariniNormallestir",
  "finansHesapOzetleriniHesapla"
];
const context = {
  console, String, Number, Math, Array, Map, Set,
  finansHesaplariniYukle: () => [],
  cariHareketleriYukle: () => [],
  cekleriYukle: () => [],
  isletmeHareketleriniYukle: () => [],
  hesapTransferleriniYukle: () => []
};
vm.createContext(context);
vm.runInContext(adlar.map(ad => fonksiyonuAl(index, ad)).join("\n"), context);

const hesaplar = [
  { id:"kasa-1", ad:"Merkez Kasa", tur:"kasa", acilisBakiyesi:"1.000,00", durum:"Aktif" },
  { id:"banka-1", ad:"Ana Banka", tur:"banka", bankaAdi:"Örnek Bank", iban:"TR001234567890123456789012", acilisBakiyesi:5000, durum:"Aktif" },
  { id:"tekrar", ad:"merkez kasa", tur:"kasa", acilisBakiyesi:99 }
];
const normal = context.finansHesaplariniNormallestir(hesaplar);
assert.equal(normal.length, 2, "Aynı adlı hesap ikinci kez oluşturulmamalı");
assert.equal(normal.find(hesap => hesap.id === "kasa-1").acilisBakiyesi, 1000);
assert.equal(normal.find(hesap => hesap.id === "banka-1").tur, "banka");

const hareketler = [
  { id:"h1", hesapId:"kasa-1", islemTuru:"tahsilat", tutar:600, durum:"Aktif" },
  { id:"h2", hesapId:"kasa-1", islemTuru:"odeme", tutar:200, durum:"Aktif" },
  { id:"h3", hesapId:"banka-1", islemTuru:"odeme", tutar:1000, durum:"Aktif" },
  { id:"h4", hesapId:"banka-1", islemTuru:"tahsilat", tutar:999, durum:"İptal" },
  { id:"h5", hesapId:"", islemTuru:"tahsilat", tutar:5000, durum:"Aktif" }
];
const cekler = [
  { id:"c1", hesapId:"banka-1", tutar:500, durum:"Ödendi" },
  { id:"c2", hesapId:"banka-1", tutar:700, durum:"Verildi" },
  { id:"c3", hesapId:"banka-1", tutar:900, durum:"İptal" }
];
const ozetler = context.finansHesapOzetleriniHesapla(hesaplar, hareketler, cekler, []);
const kasa = ozetler.find(hesap => hesap.id === "kasa-1");
const banka = ozetler.find(hesap => hesap.id === "banka-1");
assert.deepEqual({ giris:kasa.giris, cikis:kasa.cikis, bakiye:kasa.bakiye }, { giris:600, cikis:200, bakiye:1400 });
assert.deepEqual({ giris:banka.giris, cikis:banka.cikis, bakiye:banka.bakiye }, { giris:0, cikis:1500, bakiye:3500 });

assert.match(index, /id="finans-hesaplari-overlay"/, "Kasa/banka yönetim ekranı bulunmalı");
assert.match(index, /id="odeme-hesap"/, "Ödeme formunda hesap seçimi bulunmalı");
assert.match(appsScript, /Yeni veya ödenen çek için aktif bir banka hesabı seçin/, "Sunucu hesap bağlantısını doğrulamalı");
assert.match(appsScript, /const FINANCE_ACCOUNT_SHEET_NAME = "Kasa Banka Hesapları"/);
assert.match(appsScript, /"Hesap ID",\s*"Hesap Adı",\s*"Hesap Türü"/);

console.log("cash-bank-accounts.test.js: tüm kontroller geçti");
