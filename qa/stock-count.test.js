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

assert.match(index, /data-modul="stok-sayimi"[^>]*yalnizca-yonetici|class="modul-alt-baglanti yalnizca-yonetici"[^>]*data-modul="stok-sayimi"/, "Stok sayımı menüde yalnızca yöneticiye açık olmalı");
assert.match(index, /id="stok-sayim-formu"[^>]*onsubmit="stokSayiminiKaydet\(event\)"/, "Fiziki sayım formu bulunmalı");
assert.match(index, /case "stok-sayimi": urunStokMerkeziniAc\("sayim"\)/, "Menü stok sayımı formuna bağlanmalı");
assert.match(index, /kaynakTuru:"manuel"/, "Sayım farkı manuel stok hareketi olarak kaydedilmeli");
assert.match(index, /stokHareketleriniKaydet\([\s\S]*stok sayımı/, "Sayım mevcut güvenli stok kayıt akışını kullanmalı");
assert.match(index, /düzeltme hareketi oluşturulmadı/, "Fark yoksa gereksiz hareket oluşturulmamalı");
assert.doesNotMatch(fonksiyonuAl(index, "stokSayiminiKaydet"), /acilisStogu\s*=/, "Sayım ürün kartının açılış stoğunu değiştirmemeli");

const context = { console, String, Number, Math };
vm.createContext(context);
vm.runInContext(fonksiyonuAl(index, "tutarSayiyaCevir"), context);
vm.runInContext(fonksiyonuAl(index, "stokSayimFarkiniHesapla"), context);

assert.deepEqual(
  JSON.parse(JSON.stringify(context.stokSayimFarkiniHesapla(10, 12.375))),
  { mevcutStok:10, fizikiStok:12.375, fark:2.375, hareketTuru:"giris", hareketMiktari:2.375 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.stokSayimFarkiniHesapla(10, 7.25))),
  { mevcutStok:10, fizikiStok:7.25, fark:-2.75, hareketTuru:"cikis", hareketMiktari:2.75 }
);
assert.equal(context.stokSayimFarkiniHesapla(10, 10).hareketTuru, "esit");
assert.equal(context.stokSayimFarkiniHesapla(0.1 + 0.2, 0.3).hareketMiktari, 0, "Ondalık yuvarlama hayalet fark üretmemeli");

assert.match(appsScript, /const STOCK_MOVEMENT_SHEET_NAME = "Stok Hareketleri"/);
assert.match(appsScript, /const STOK_HAREKET_BASLIK = \[[\s\S]*"Kaynak Türü"/, "Sayımın kullandığı kaynak türü Google Sheets'e aktarılmalı");
assert.match(appsScript, /stockMovementSheet\.getRange\(1, 1, stokHareketSatirlari\.length/, "Stok hareketleri Google Sheets'e yazılmalı");

console.log("stock-count.test.js: tüm kontroller geçti");
