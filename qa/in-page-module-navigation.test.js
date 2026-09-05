const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");

assert.match(index, /id="modul-calisma-alani"[\s\S]*?id="modul-calisma-icerik"/, "Ana sayfada ortak modül çalışma alanı bulunmalı");
assert.match(index, /id="ana-dashboard"/, "Genel bakış alanı modül ekranından bağımsız yönetilebilmeli");
assert.match(index, /\.dashboard-grid\[hidden\]\s*\{\s*display:\s*none/, "Modül açıkken genel bakış içeriği tamamen gizlenmeli");
assert.match(index, /function modulEkraniniAnaAlanaAc\(/, "Popup ekranları ana çalışma alanına taşıyan işlev bulunmalı");
assert.match(index, /function modulOverlayiniEskiYerineTasi\(/, "Kapatılan ekran özgün konumuna güvenle dönebilmeli");
assert.match(index, /new MutationObserver\([\s\S]*?modulCalismaAlaniniKapat\(\)/, "Ekranın kendi kapatma işlemi ana sayfaya dönüşü tetiklemeli");
assert.match(index, /\.modul-calisma-icerik > \.popup-overlay\.modul-sayfa[\s\S]*?position: static/, "Menü ekranı modal yerine sayfa içinde yerleşmeli");
assert.match(index, /\.modul-calisma-icerik > \.popup-overlay\.modul-sayfa > \.popup-kutu[\s\S]*?max-width: none/, "Modül ekranı ana alanın kullanılabilir genişliğini kullanmalı");
assert.match(index, /function modulHedefineGit\(secici, detayiAc=false\) \{\s*modulCalismaAlaniniKapat\(false\)/, "Sayfa içindeki hedefler seçildiğinde genel bakış görünür olmalı");

const beklenenEkranlar = {
  "yeni-alis":"yeni-fatura-overlay",
  "yeni-satis":"yeni-fatura-overlay",
  "urun-kartlari":"urun-stok-overlay",
  "stok-hareketleri":"urun-stok-overlay",
  "stok-sayimi":"urun-stok-overlay",
  "kritik-stok":"urun-stok-overlay",
  "stok-degerleme":"urun-stok-overlay",
  "stok-ekstresi":"urun-stok-overlay",
  "cari-hesaplar":"cari-hesaplar-overlay",
  "cari-islem":"odeme-yonetim-overlay",
  "finans-hesaplari":"finans-hesaplari-overlay",
  "hesap-transferleri":"hesap-transfer-overlay",
  "gelir-gider":"gelir-gider-overlay",
  "aylik-ozet":"aylik-ozet-overlay",
  "cek-takibi":"cek-takip-overlay",
  "fatura-raporu":"rapor-overlay",
  "cari-risk":"cari-risk-overlay",
  "genel-hareket":"genel-hareket-overlay",
  "vade-analizi":"vade-analiz-overlay",
  "nakit-tahmin":"nakit-tahmin-overlay",
  "kdv-ozeti":"kdv-ozet-overlay",
  "kullanicilar":"kullanici-yonetim-overlay",
  "islem-gecmisi":"islem-gecmisi-overlay",
  "bulut-yedekleri":"bulut-yedekleri-overlay"
};

Object.entries(beklenenEkranlar).forEach(([modul,overlay]) => {
  assert.ok(index.includes(`"${modul}":["${overlay}"`), `${modul} ana çalışma alanına bağlanmalı`);
});

["genel-bakis", "fatura-listesi", "hizli-istatistikler", "veri-kontrol", "depolama"].forEach(modul => {
  assert.match(index, new RegExp(`case "${modul}": modulHedefineGit\\(`), `${modul} ana sayfadaki kendi bölümüne gitmeli`);
});

console.log("in-page-module-navigation.test.js: tüm menü ekranları ana çalışma alanına bağlandı");
