const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const appsScript = fs.readFileSync("google-apps-script/Code.gs", "utf8");

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

[
  'id="fatura-kalem-urun"',
  'id="fatura-kalem-miktar"',
  'id="fatura-kalem-fiyat"',
  'id="fatura-kalem-kdv"',
  'id="fatura-genel-toplam"'
].forEach(parca => assert.ok(index.includes(parca), `${parca} yeni fatura formunda bulunmalı`));
assert.match(index, /faturaVeStokKaydet\(\[\.\.\.liste,yeniFatura\]/, "Kalemli fatura ve stok hareketi tek işlemde kaydedilmeli");
assert.match(index, /Fatura genel toplamı sıfırdan büyük olmalıdır/, "Sıfır tutarlı kalemler yetim stok hareketi oluşturmamalı");
assert.match(index, /faturaStokHareketleriniIptalEt[\s\S]*Kaynak fatura silindi/, "Fatura silinince bağlı stok hareketi geçmişte iptal olarak korunmalı");
assert.match(index, /Kalemli faturanın türü ve toplamı, stok geçmişini korumak için kilitlidir/, "Kalemli fatura düzenlemesinde stok tutarlılığı açıklanmalı");

const context = {
  console, String, Number, Math, Array, Map, Set, Date,
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger)); },
  faturaTurunuNormallestir(deger) { return String(deger).toLowerCase() === "satis" ? "satis" : "alis"; },
  faturaTuruEtiketi(deger) { return String(deger).toLowerCase() === "satis" ? "Satış" : "Alış"; }
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "urunTurunuNormallestir",
  "faturaKaleminiNormallestir",
  "faturaKalemleriniNormallestir",
  "faturaKalemToplamlariniHesapla",
  "stokHareketTurunuNormallestir",
  "stokHareketiniNormallestir",
  "faturaKalemlerindenStokHareketleriOlustur"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const kalemler = context.faturaKalemleriniNormallestir([
  { id:"k1", urunId:"u1", kod:"UR-1", ad:"Ürün", tur:"urun", birim:"Adet", miktar:2, birimFiyat:100, kdvOrani:20 },
  { id:"k2", urunId:"h1", kod:"HZ-1", ad:"Hizmet", tur:"hizmet", birim:"Hizmet", miktar:1, birimFiyat:50, kdvOrani:10 }
]);
const toplamlar = context.faturaKalemToplamlariniHesapla(kalemler);
assert.deepEqual(JSON.parse(JSON.stringify(toplamlar)), { araToplam:250, kdvToplami:45, genelToplam:295 });

const alisHareketleri = context.faturaKalemlerindenStokHareketleriOlustur({ id:10, no:"AF-10", tarih:"2026-09-04", faturaTuru:"alis", kalemler });
assert.equal(alisHareketleri.length, 1, "Hizmet kalemi stok hareketi oluşturmamalı");
assert.equal(alisHareketleri[0].tur, "giris");
assert.equal(alisHareketleri[0].kaynakTuru, "fatura");
assert.equal(alisHareketleri[0].kaynakId, "10");
assert.equal(alisHareketleri[0].kaynakKalemId, "k1");
const satisHareketleri = context.faturaKalemlerindenStokHareketleriOlustur({ id:11, no:"SF-11", tarih:"2026-09-04", faturaTuru:"satis", kalemler:[kalemler[0]] });
assert.equal(satisHareketleri[0].tur, "cikis");

const backend = {
  console, String, Number, Math, Array, Object,
  faturalariTekillestir(liste) { return liste; },
  urunKartlariniNormallestir(liste) { return liste; },
  stokHareketleriniNormallestir(liste) { return liste; },
  faturaKalemleriniNormallestir(liste) { return liste; },
  faturaTurunuNormallestir(deger) { return String(deger).toLowerCase() === "satis" ? "satis" : "alis"; }
};
vm.createContext(backend);
vm.runInContext(fonksiyonuAl(appsScript, "gecersizFaturaKalemBaglantilariniBul"), backend);
const faturalar = [{ id:10, faturaTuru:"alis", kalemler:[kalemler[0]] }];
const urunler = [{ id:"u1", kod:"UR-1", tur:"urun" }];
assert.equal(backend.gecersizFaturaKalemBaglantilariniBul(faturalar, urunler, alisHareketleri).length, 0, "Doğru fatura-stok bağlantısı kabul edilmeli");
assert.match(backend.gecersizFaturaKalemBaglantilariniBul(faturalar, urunler, [])[0].mesaj, /stok hareketi eksik/, "Eksik otomatik stok hareketi reddedilmeli");

assert.match(appsScript, /const INVOICE_LINE_SHEET_NAME = "Fatura Kalemleri"/);
assert.match(appsScript, /invoiceLineSheet\.getRange\(1, 1, faturaKalemSatirlari\.length/);
assert.match(appsScript, /"Kaynak Fatura ID"/);
assert.match(appsScript, /code:"INVALID_INVOICE_LINE"/);

console.log("invoice-line-stock.test.js: tüm kontroller geçti");
