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

assert.match(index, /data-modul="stok-degerleme"/, "Stok değerleme sol menüde bulunmalı");
assert.match(index, /case "stok-degerleme": urunStokMerkeziniAc\("degerleme"\)/, "Stok değerleme menüsü doğru görünüme bağlanmalı");
assert.match(index, /option value="degerleme">Stok değerleme<\/option>/, "Stok merkezinden değerleme seçilebilmeli");
assert.match(index, /id="urun-stok-csv"[^>]*onclick="urunStokRaporCsvIndir\(\)"/, "Stok raporları CSV olarak indirilebilmeli");
assert.match(index, /\.urun-stok-csv\[hidden\] \{ display: none; \}/, "Rapor düğmesi diğer stok görünümlerinde gizlenmeli");
assert.match(index, /ağırlıklı ortalama veya geçmiş maliyet yöntemi uygulanmaz/, "Değerleme yönteminin sınırı kullanıcıya açıklanmalı");

const context = {
  console, String, Number, Math, Array, Map, Set,
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger)); },
  urunKartlariniYukle() { return []; },
  stokHareketleriniYukle() { return []; }
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
  "stokDegerlemeRaporunuHesapla",
  "stokDegerlemeSatirlariniFiltrele"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const urunler = [
  { id:"u1", kod:"HAM-01", ad:"Krom Levha", tur:"urun", birim:"Kg", durum:"Aktif", alisFiyati:100, satisFiyati:150, acilisStogu:10, kritikStok:4 },
  { id:"u2", kod:"BOR-02", ad:"Krom Boru", tur:"urun", birim:"Metre", durum:"Pasif", alisFiyati:20, satisFiyati:35, acilisStogu:5, kritikStok:2 },
  { id:"u3", kod:"EKS-03", ad:"Fiyatsız Ürün", tur:"urun", birim:"Adet", durum:"Aktif", alisFiyati:0, satisFiyati:10, acilisStogu:3, kritikStok:3 },
  { id:"h1", kod:"HIZ-01", ad:"Montaj", tur:"hizmet", satisFiyati:500 }
];
const hareketler = context.stokHareketleriniNormallestir([
  { id:"s1", tarih:"2026-09-01", urunId:"u1", tur:"cikis", miktar:2, durum:"Aktif" },
  { id:"s2", tarih:"2026-09-02", urunId:"u1", tur:"giris", miktar:1, durum:"İptal" }
]);
const rapor = context.stokDegerlemeRaporunuHesapla(urunler, hareketler);

assert.equal(rapor.satirlar.length, 3, "Hizmet kartları stok değerlemesine girmemeli");
assert.equal(rapor.satirlar.find(satir=>satir.id === "u1").miktar, 8, "Aktif hareketlerle güncel stok hesaplanmalı");
assert.equal(rapor.toplamMaliyet, 900, "Güncel alış fiyatıyla toplam maliyet hesaplanmalı");
assert.equal(rapor.toplamSatis, 1405, "Güncel satış fiyatıyla satış potansiyeli hesaplanmalı");
assert.equal(rapor.toplamBrutFark, 505, "Tahmini brüt fark hesaplanmalı");
assert.equal(rapor.fiyatEksikSayisi, 1, "Stoklu fakat alış fiyatı eksik kart uyarılmalı");
assert.equal(rapor.pasifStokSayisi, 1, "Stok bakiyesi olan pasif kart uyarılmalı");
assert.equal(rapor.satirlar.find(satir=>satir.id === "u3").kritik, true, "Kritik stok durumu korunmalı");
assert.deepEqual(
  JSON.parse(JSON.stringify(context.stokDegerlemeSatirlariniFiltrele(rapor.satirlar,"boru").map(satir=>satir.id))),
  ["u2"],
  "Arama değerleme satırlarını ürün adına göre filtrelemeli"
);

console.log("stock-valuation.test.js: stok değerleme kontrolleri geçti");
