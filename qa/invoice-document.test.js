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

assert.match(index, /id="fatura-detay-overlay"/, "Fatura ayrıntısı için ayrı pencere bulunmalı");
assert.match(index, /onclick="faturaBelgesiYazdir\(\)"/, "Fatura belgesi yazdırılabilmeli veya PDF kaydedilebilmeli");
assert.match(index, /data-fatura-id="\$\{htmlGuvenli\(kimlik\)\}" onclick="faturaDetayAc\(this\.dataset\.faturaId\)"/, "Fatura numarası ayrıntı belgesini açmalı");
assert.match(index, /body\.fatura-yazdiriliyor #fatura-detay-overlay/, "Yazdırırken yalnızca fatura belgesi görünmeli");
assert.match(index, /e-Fatura, e-Arşiv Fatura veya yasal mali belge yerine geçmez/, "Belgenin yasal fatura olmadığı açıkça belirtilmeli");
assert.doesNotMatch(index.match(/id="fatura-detay-overlay"[^>]*>/)?.[0] || "", /yalnizca-yonetici/, "İzleyici de salt okunur fatura belgesini açabilmeli");

const context = {
  console, Date, String, Number, Math,
  faturaKalemleriniNormallestir(liste) { return Array.isArray(liste) ? liste : []; },
  faturaKalemToplamlariniHesapla(liste) {
    return liste.reduce((sonuc, kalem) => ({
      araToplam:sonuc.araToplam + kalem.netTutar,
      kdvToplami:sonuc.kdvToplami + kalem.kdvTutari,
      genelToplam:sonuc.genelToplam + kalem.toplamTutar
    }), { araToplam:0, kdvToplami:0, genelToplam:0 });
  },
  tutarSayiyaCevir(deger) { return Number(deger) || 0; },
  vadeTarihi(tarih,vadeGun) { const d = new Date(`${tarih}T12:00:00`); d.setDate(d.getDate()+vadeGun); return d; },
  faturaTakibiKapali(inv) { return Boolean(inv.takipKapali); },
  kalanGun() { return 12; },
  durumBilgi() { return { label:"Vadeye 12 gün", renk:"#3b82f6", bg:"#3b82f622" }; },
  cariKartiniBul() { return { vergiNo:"1234567890", telefon:"555", eposta:"test@example.com" }; },
  localStorage:{ getItem() { return "Örnek İşletme"; } },
  faturaTurunuNormallestir(deger) { return deger === "satis" ? "satis" : "alis"; },
  faturaTuruEtiketi(deger) { return deger === "satis" ? "Satış" : "Alış"; },
  bugununTarihi(tarih) {
    return `${tarih.getFullYear()}-${String(tarih.getMonth()+1).padStart(2,"0")}-${String(tarih.getDate()).padStart(2,"0")}`;
  },
  FIRMA_ANAHTAR:"firma"
};
vm.createContext(context);
vm.runInContext(fonksiyonuAl(index,"faturaBelgesiVerisi"),context);

const kalemli = context.faturaBelgesiVerisi({
  id:7, no:"SF-7", cari:"Örnek Cari", faturaTuru:"satis", tarih:"2026-09-04", vadeGun:30, tutar:236,
  kalemler:[{ netTutar:200, kdvTutari:36, toplamTutar:236 }]
},new Date(2026,8,4,10,30));
assert.equal(kalemli.faturaTuruEtiketi,"Satış Faturası");
assert.equal(kalemli.vadeTarihi,"2026-10-04");
assert.equal(kalemli.araToplam,200);
assert.equal(kalemli.kdvToplami,36);
assert.equal(kalemli.genelToplam,236);
assert.equal(kalemli.eskiKayit,false);
assert.equal(kalemli.duzenleyenFirma,"Örnek İşletme");

const eski = context.faturaBelgesiVerisi({
  id:8, no:"AF-8", cari:"Eski Cari", faturaTuru:"alis", tarih:"2026-09-04", vadeGun:15, tutar:500, kalemler:[]
});
assert.equal(eski.eskiKayit,true,"Kalemsiz eski faturalar belge ekranında desteklenmeli");
assert.equal(eski.araToplam,500);
assert.equal(eski.kdvToplami,0);
assert.equal(eski.genelToplam,500);

console.log("invoice-document.test.js: tüm kontroller geçti");
