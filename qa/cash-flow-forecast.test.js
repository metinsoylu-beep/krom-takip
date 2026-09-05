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

assert.match(index, /data-modul="nakit-tahmin"/, "Nakit akış tahmini sol menüde bulunmalı");
assert.match(index, /id="nakit-tahmin-overlay"/, "Nakit akış tahmini penceresi bulunmalı");
assert.match(index, /id="nakit-tahmin-tarih"[^>]+type="date"/, "Tahmin başlangıç tarihi seçilebilmeli");
assert.match(index, /onclick="nakitAkisTahminiCsvIndir\(\)"/, "Tahmin CSV olarak indirilebilmeli");
assert.match(index, /ödeme ve çekler faturalara otomatik dağıtılmaz/i, "Cari hesap yönteminin sınırı tahminde açıklanmalı");

const context = {
  console, String, Number, Math, Array, Date,
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger || "")); },
  tarihOlusturYerel(deger) {
    const [yil,ay,gun] = String(deger || "").split("T")[0].split("-").map(Number);
    return new Date(yil,ay-1,gun,12,0,0,0);
  },
  bugununTarihi(referans=new Date()) {
    return `${referans.getFullYear()}-${String(referans.getMonth()+1).padStart(2,"0")}-${String(referans.getDate()).padStart(2,"0")}`;
  },
  vadeTarihi(tarih,vadeGun) {
    const [yil,ay,gun] = String(tarih || "").split("T")[0].split("-").map(Number);
    const d = new Date(yil,ay-1,gun,12,0,0,0);
    d.setDate(d.getDate()+(parseInt(vadeGun,10)||90));
    return d;
  },
  tutarSayiyaCevir(deger) { return Number(deger)||0; },
  faturaTakibiKapali(fatura) { return fatura?.takipKapali === true; },
  faturaTurunuNormallestir(deger) { return String(deger||"").toLowerCase().includes("sat") ? "satis" : "alis"; },
  faturaYukle() { return []; },
  cekleriYukle() { return []; },
  finansHesapOzetleriniHesapla() { return []; }
};
vm.createContext(context);
["nakitAkisTahmininiHesapla","nakitAkisTahminiSatirlariniFiltrele"].forEach(ad=>vm.runInContext(fonksiyonuAl(index,ad),context));

const faturalar = [
  { id:1, cari:"Alfa Metal", no:"A-1", faturaTuru:"alis", tarih:"2026-09-01", vadeGun:9, tutar:300 },
  { id:2, cari:"Beta Yapı", no:"S-1", faturaTuru:"satis", tarih:"2026-09-20", vadeGun:30, tutar:800 },
  { id:3, cari:"Ceren Ltd", no:"S-ESKI", faturaTuru:"satis", tarih:"2026-08-01", vadeGun:31, tutar:200 },
  { id:4, cari:"Kapalı Ltd", no:"K-1", faturaTuru:"alis", tarih:"2026-09-01", vadeGun:10, tutar:900, takipKapali:true },
  { id:5, cari:"Uzak Ltd", no:"U-1", faturaTuru:"satis", tarih:"2026-09-05", vadeGun:100, tutar:1000 }
];
const cekler = [
  { id:"c1", cari:"Alfa Metal", cekNo:"Ç-1", banka:"Örnek Banka", vadeTarihi:"2026-11-15", tutar:100, durum:"Verildi" },
  { id:"c2", cari:"Alfa Metal", cekNo:"Ç-2", banka:"Örnek Banka", vadeTarihi:"2026-09-15", tutar:500, durum:"Ödendi" }
];
const hesaplar = [{ bakiye:1000 },{ bakiye:500 }];
const rapor = context.nakitAkisTahmininiHesapla("2026-09-05",faturalar,cekler,hesaplar);

assert.equal(rapor.mevcutNakit,1500,"Mevcut kasa ve banka bakiyeleri toplanmalı");
assert.equal(rapor.toplamGiris,1000,"Açık satış faturaları tahmini giriş sayılmalı");
assert.equal(rapor.toplamCikis,400,"Açık alış faturaları ve bekleyen çekler tahmini çıkış sayılmalı");
assert.equal(rapor.net,600,"90 günlük net nakit hareketi doğru hesaplanmalı");
assert.equal(rapor.tahminiNakit,2100,"90. gün tahmini nakit bakiyesi doğru hesaplanmalı");
assert.equal(rapor.gecikmisSayisi,1,"Vadesi geçen açık faturalar sayılmalı");
assert.deepEqual(JSON.parse(JSON.stringify(rapor.donemler.map(d=>[d.esik,d.giris,d.cikis,d.kapanis]))),[
  [30,200,300,1400],
  [60,800,0,2200],
  [90,0,100,2100]
],"30–60–90 günlük dönemler yürüyen nakit bakiyesiyle hesaplanmalı");
assert.deepEqual(JSON.parse(JSON.stringify(rapor.satirlar.map(s=>s.belge))),["S-ESKI","A-1","S-1","Ç-1 · Örnek Banka"],"Beklenen hareketler vade tarihine göre sıralanmalı");
assert.equal(context.nakitAkisTahminiSatirlariniFiltrele(rapor.satirlar,"cikis").length,2,"Çıkış filtresi alış faturası ve verilen çeki göstermeli");
assert.equal(context.nakitAkisTahminiSatirlariniFiltrele(rapor.satirlar,"gecikmis").length,1,"Gecikmiş filtresi yalnız vadesi geçen açık kaydı göstermeli");

console.log("cash-flow-forecast.test.js: 90 günlük nakit akış tahmini kontrolleri geçti");
