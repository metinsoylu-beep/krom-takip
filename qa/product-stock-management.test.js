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

[
  "Ürün &amp; Stok",
  "Ürün / Hizmet Kartları",
  "Stok Hareketleri",
  "Kritik Stok"
].forEach(metin => assert.ok(index.includes(metin), `${metin} menüde bulunmalı`));
assert.match(index, /id="urun-stok-overlay"/, "Ürün ve stok yönetim ekranı bulunmalı");
assert.match(index, /class="urun-stok-aksiyon yalnizca-yonetici"/, "Kart oluşturma yalnızca yöneticiye açık olmalı");
assert.match(index, /case "urun-kartlari": urunStokMerkeziniAc\("kartlar"\)/, "Kartlar menüye bağlanmalı");
assert.match(index, /case "stok-hareketleri": urunStokMerkeziniAc\("hareketler"\)/, "Stok hareketleri menüye bağlanmalı");
assert.match(index, /case "kritik-stok": urunStokMerkeziniAc\("kritik"\)/, "Kritik stok menüye bağlanmalı");
assert.match(index, /eksiyeDusenUrun[\s\S]*stok miktarı eksiye düşemez/, "Tarayıcı tarafı hiçbir stok işleminin eksi stok üretmesine izin vermemeli");
assert.match(index, /hareket\.tur === "giris"[\s\S]*Önce bu stoğa bağlı çıkışları iptal edin/, "Kullanılmış stok girişinin iptali güvenli biçimde engellenmeli");

const context = {
  console, String, Number, Math, Array, Map, Set,
  localStorage: { getItem() { return "[]"; } },
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger)); },
  stokHareketleriniYukle() { return []; },
  urunKartlariniYukle() { return []; }
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "urunTurunuNormallestir",
  "urunKartiniNormallestir",
  "urunKartlariniNormallestir",
  "stokHareketTurunuNormallestir",
  "stokHareketiniNormallestir",
  "stokHareketleriniNormallestir",
  "stokHareketiAktifMi",
  "urunStokMiktariniHesapla",
  "urunStokOzetleriniHesapla"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const kartlar = context.urunKartlariniNormallestir([
  { id:"u1", kod:" kr-01 ", ad:"Krom Levha", tur:"urun", birim:"Kg", alisFiyati:"120,50", satisFiyati:150, acilisStogu:10, kritikStok:4 },
  { id:"h1", kod:"HZ-01", ad:"Montaj", tur:"hizmet", birim:"Adet", acilisStogu:99, kritikStok:5 },
  { id:"u2", kod:"KR-01", ad:"Tekrar eden kod", tur:"urun" }
]);
assert.equal(kartlar.length, 2, "Aynı kart kodu ikinci kez kabul edilmemeli");
assert.equal(kartlar.find(kart => kart.id === "u1").kod, "KR-01");
assert.equal(kartlar.find(kart => kart.id === "u1").alisFiyati, 120.5);
assert.equal(kartlar.find(kart => kart.id === "h1").birim, "Hizmet");
assert.equal(kartlar.find(kart => kart.id === "h1").acilisStogu, 0, "Hizmet kartına stok yazılmamalı");

const hareketler = context.stokHareketleriniNormallestir([
  { id:"s1", tarih:"2026-09-04", urunId:"u1", tur:"giris", miktar:5, durum:"Aktif" },
  { id:"s2", tarih:"2026-09-04", urunId:"u1", tur:"cikis", miktar:8, durum:"Aktif" },
  { id:"s3", tarih:"2026-09-04", urunId:"u1", tur:"cikis", miktar:50, durum:"İptal" }
]);
const urun = kartlar.find(kart => kart.id === "u1");
assert.equal(context.urunStokMiktariniHesapla(urun, hareketler), 7, "İptal hareketleri hariç giriş ve çıkışlardan stok hesaplanmalı");
const ozet = context.urunStokOzetleriniHesapla(kartlar, hareketler);
assert.equal(ozet.hizmet, 1);
assert.equal(ozet.kritik, 0);
assert.equal(ozet.maliyetDegeri, 843.5);

assert.match(appsScript, /const PRODUCT_SHEET_NAME = "Ürün Hizmet Kartları"/);
assert.match(appsScript, /const STOCK_MOVEMENT_SHEET_NAME = "Stok Hareketleri"/);
assert.match(appsScript, /function urunKartVerileriniOku\(\)/);
assert.match(appsScript, /function stokHareketVerileriniOku\(\)/);
assert.match(appsScript, /stok miktarı eksiye düşemez/);
assert.match(appsScript, /productSheet\.getRange\(1, 1, urunKartSatirlari\.length/);
assert.match(appsScript, /stockMovementSheet\.getRange\(1, 1, stokHareketSatirlari\.length/);

console.log("product-stock-management.test.js: tüm kontroller geçti");
