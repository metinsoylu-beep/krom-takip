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

assert.match(index, /data-modul="cari-risk"/, "Cari bakiye raporu sol menüde bulunmalı");
assert.match(index, /id="cari-risk-overlay"/, "Cari bakiye raporu penceresi bulunmalı");
assert.match(index, /id="cari-risk-durum"/, "Bakiye türü filtresi bulunmalı");
assert.match(index, /onclick="cariRiskRaporuCsvIndir\(\)"/, "Cari bakiye raporu CSV olarak indirilebilmeli");
assert.match(index, /Ödeme ve çekler tek tek faturalara dağıtılmaz/, "Cari hesap yönteminin sınırı kullanıcıya açıklanmalı");

const context = {
  console, String, Number, Math, Array,
  cariOzetleriniHesapla() { return []; }
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "cariRiskRaporunuHesapla",
  "cariRiskSatirlariniFiltrele"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const hesaplar = [
  { cari:"Alfa Metal", kartId:"c1", borcToplami:1000, alacakToplami:400, bakiye:600, bekleyenCek:200 },
  { cari:"Beta Yapı", kartId:"c2", borcToplami:150, alacakToplami:400, bakiye:-250, bekleyenCek:0 },
  { cari:"Ceren Ltd", kartId:"c3", borcToplami:500, alacakToplami:500, bakiye:0, bekleyenCek:100 }
];
const rapor = context.cariRiskRaporunuHesapla(hesaplar);

assert.equal(rapor.toplamBorcBakiyesi, 600, "Pozitif cari bakiyeler borç toplamına girmeli");
assert.equal(rapor.toplamAlacakBakiyesi, 250, "Negatif cari bakiyeler alacak toplamına mutlak değerle girmeli");
assert.equal(rapor.netBakiye, 350, "Net cari bakiye doğru hesaplanmalı");
assert.equal(rapor.netDurum, "borc", "Net bakiye yönü doğru sınıflandırılmalı");
assert.equal(rapor.bekleyenCekToplami, 300, "Bekleyen çekler ayrı toplamda korunmalı");
assert.equal(rapor.kapaliHesapSayisi, 1, "Sıfır bakiyeli hesaplar kapalı sayılmalı");
assert.deepEqual(JSON.parse(JSON.stringify(rapor.satirlar.map(satir=>satir.cari))), ["Alfa Metal","Beta Yapı","Ceren Ltd"], "Cari hesaplar en yüksek bakiye riskinden başlayarak sıralanmalı");
assert.deepEqual(
  JSON.parse(JSON.stringify(context.cariRiskSatirlariniFiltrele(rapor.satirlar,"beta","alacak").map(satir=>satir.cari))),
  ["Beta Yapı"],
  "Arama ve bakiye türü filtresi birlikte çalışmalı"
);

console.log("customer-balance-report.test.js: cari bakiye raporu kontrolleri geçti");
