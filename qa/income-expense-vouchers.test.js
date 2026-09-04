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

const context = {
  console, Date, JSON, Math, Number, String, Array, Map, Set,
  finansHesaplariniYukle: () => [],
  cariHareketleriYukle: () => [],
  cekleriYukle: () => [],
  isletmeHareketleriniYukle: () => [],
  hesapTransferleriniYukle: () => []
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "tarihGecerliMi",
  "cariHareketTurunuNormallestir",
  "cariHareketAktifMi",
  "finansHesapTurunuNormallestir",
  "finansHesabiniNormallestir",
  "finansHesaplariniNormallestir",
  "isletmeHareketTurunuNormallestir",
  "isletmeHareketiniNormallestir",
  "isletmeHareketleriniNormallestir",
  "isletmeHareketiAktifMi",
  "hesapTransferiAktifMi",
  "finansHesapOzetleriniHesapla",
  "hesapHareketDokumuOlustur"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const hareketler = context.isletmeHareketleriniNormallestir([
  { id:"g1", tarih:"2026-09-04", tur:"Gelir", hesapId:"b1", kategori:"Diğer Gelir", tutar:"1.250,50", belgeNo:"F-1", durum:"Aktif" },
  { id:"g2", tarih:"2026-09-03", tur:"Gider", hesapId:"k1", kategori:"Kira", tutar:500, durum:"Aktif" },
  { id:"g3", tarih:"2026-09-02", tur:"Gelir", hesapId:"b1", kategori:"İade", tutar:100, durum:"İptal" },
  { id:"gecersiz", tarih:"2026-09-02", tur:"Gelir", hesapId:"", kategori:"İade", tutar:100 }
]);
assert.equal(hareketler.length, 3, "Hesapsız fiş kabul edilmemeli");
assert.equal(hareketler[0].tur, "gelir");
assert.equal(hareketler[0].tutar, 1250.5);

const hesaplar = [
  { id:"k1", ad:"Merkez Kasa", tur:"kasa", acilisBakiyesi:1000, durum:"Aktif" },
  { id:"b1", ad:"Ana Banka", tur:"banka", bankaAdi:"Banka", acilisBakiyesi:2000, durum:"Aktif" }
];
const ozetler = context.finansHesapOzetleriniHesapla(hesaplar, [], [], hareketler);
const kasa = ozetler.find(hesap => hesap.id === "k1");
const banka = ozetler.find(hesap => hesap.id === "b1");
assert.deepEqual({ giris:kasa.giris, cikis:kasa.cikis, bakiye:kasa.bakiye }, { giris:0, cikis:500, bakiye:500 });
assert.deepEqual({ giris:banka.giris, cikis:banka.cikis, bakiye:banka.bakiye }, { giris:1250.5, cikis:0, bakiye:3250.5 }, "İptal edilen gelir bakiyeye katılmamalı");

const hesapDokumu = context.hesapHareketDokumuOlustur(
  "b1",
  hesaplar,
  [
    { id:"t1", tarih:"2026-09-01", hesapId:"b1", islemTuru:"tahsilat", tutar:300, cari:"Firma A", durum:"Aktif" },
    { id:"o1", tarih:"2026-09-02", hesapId:"b1", islemTuru:"odeme", tutar:100, cari:"Firma B", durum:"Aktif" }
  ],
  [
    { id:"c1", tarih:"2026-08-01", odemeTarihi:"2026-09-03", hesapId:"b1", durum:"Ödendi", tutar:200, cari:"Firma C", cekNo:"Ç-1" },
    { id:"c2", tarih:"2026-08-01", vadeTarihi:"2026-10-01", hesapId:"b1", durum:"Verildi", tutar:999 }
  ],
  hareketler
);
assert.equal(hesapDokumu.hareketler.length, 4, "Hesap dökümü tahsilat, ödeme, ödenmiş çek ve gelir fişini birleştirmeli");
assert.equal(hesapDokumu.toplamGiris, 1550.5);
assert.equal(hesapDokumu.toplamCikis, 300);
assert.equal(hesapDokumu.bakiye, 3250.5);
assert.equal(hesapDokumu.hareketler[0].kaynak, "Gelir Fişi", "Hesap dökümü en yeni hareketi üstte göstermeli");

assert.match(index, /id="gelir-gider-overlay"/, "Gelir/gider merkezi bulunmalı");
assert.match(index, /onclick="gelirGiderMerkeziniAc\(\)"/, "Gelir/gider merkezi araç çubuğundan açılabilmeli");
assert.match(index, /gelirGiderCsvIndir/, "Fişler CSV olarak dışa aktarılabilmeli");
assert.match(index, /id="hesap-dokum-overlay"/, "Birleşik kasa/banka hareket dökümü bulunmalı");
assert.match(index, /onclick="hesapHareketDokumunuAc\('/, "Hesap satırındaki döküm tüm hareketleri açmalı");
assert.match(index, /Cari Tahsilat.*Cari Ödeme.*Ödenmiş Çek.*Gelir Fişi.*Gider Fişi/s, "Döküm bütün finans hareketi kaynaklarını birleştirmeli");
assert.match(index, /Gelir \/ Gider.*fa-receipt/s, "Ana ekranda gelir/gider düğmesi bulunmalı");
assert.match(appsScript, /const BUSINESS_MOVEMENT_SHEET_NAME = "Gelir Gider Fişleri"/);
assert.match(appsScript, /"Fiş ID",\s*"İşlem Tarihi",\s*"Fiş Türü"/);
assert.match(appsScript, /isletmeHareketler: durum\.isletmeHareketler/, "Bulut okuması fişleri ön yüze döndürmeli");
assert.match(appsScript, /businessMovementSheet\.clearContents\(\)/, "Fiş sayfası kilit altında güncellenmeli");

console.log("income-expense-vouchers.test.js: tüm kontroller geçti");
