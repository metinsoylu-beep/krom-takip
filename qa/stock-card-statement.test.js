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

assert.match(index, /data-modul="stok-ekstresi"/, "Stok kart ekstresi sol menüde bulunmalı");
assert.match(index, /case "stok-ekstresi": urunStokMerkeziniAc\("ekstre"\)/, "Ekstre menüsü doğru görünüme bağlanmalı");
assert.match(index, /option value="ekstre">Stok kart ekstresi<\/option>/, "Ekstre stok merkezinden seçilebilmeli");
assert.match(index, /İptal edilen hareketler denetim amacıyla gösterilir ancak giriş, çıkış ve kalan stok hesabını etkilemez/, "İptal kayıtlarının hesap davranışı açıklanmalı");
assert.match(index, /function stokKartEkstresiCsvIndir\(/, "Stok kart ekstresi CSV olarak indirilebilmeli");

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
  "stokKartEkstresiniHesapla"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const urunler = [
  { id:"u1", kod:"KR-01", ad:"Krom Levha", tur:"urun", birim:"Kg", acilisStogu:10, durum:"Aktif" },
  { id:"h1", kod:"HZ-01", ad:"Montaj", tur:"hizmet", birim:"Hizmet" }
];
const hareketler = [
  { id:"h3", tarih:"2026-09-03", urunId:"u1", tur:"giris", miktar:99, durum:"İptal", kayitZamani:"2026-09-03T08:00:00Z" },
  { id:"h2", tarih:"2026-09-02", urunId:"u1", tur:"cikis", miktar:3, durum:"Aktif", kayitZamani:"2026-09-02T08:00:00Z" },
  { id:"h1", tarih:"2026-09-01", urunId:"u1", tur:"giris", miktar:5, durum:"Aktif", kayitZamani:"2026-09-01T08:00:00Z" },
  { id:"baska", tarih:"2026-09-01", urunId:"u2", tur:"giris", miktar:50, durum:"Aktif" }
];
const rapor = context.stokKartEkstresiniHesapla("u1", urunler, hareketler);

assert.equal(rapor.urun.kod, "KR-01");
assert.equal(rapor.acilisStogu, 10);
assert.equal(rapor.toplamGiris, 5, "İptal giriş toplamı etkilememeli");
assert.equal(rapor.toplamCikis, 3);
assert.equal(rapor.mevcutStok, 12);
assert.equal(rapor.iptalSayisi, 1);
assert.deepEqual(JSON.parse(JSON.stringify(rapor.satirlar.map(satir=>satir.id))), ["h1","h2","h3"], "Hareketler eski tarihten yeni tarihe sıralanmalı");
assert.deepEqual(JSON.parse(JSON.stringify(rapor.satirlar.map(satir=>satir.bakiye))), [15,12,12], "Her satırdan sonra yürüyen stok bakiyesi hesaplanmalı");
assert.equal(context.stokKartEkstresiniHesapla("h1", urunler, hareketler).urun, null, "Hizmet kartı için stok ekstresi oluşmamalı");

console.log("stock-card-statement.test.js: stok kart ekstresi kontrolleri geçti");
