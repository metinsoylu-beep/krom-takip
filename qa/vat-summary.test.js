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

const context = {
  console, Date, JSON, Math, Number, String, Array, Map, Set,
  faturaYukle: () => [],
  faturalariTekillestir: liste => ({ liste:Array.isArray(liste) ? liste : [] })
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "tarihGecerliMi",
  "bugununTarihi",
  "faturaTurunuNormallestir",
  "urunTurunuNormallestir",
  "faturaKaleminiNormallestir",
  "faturaKalemleriniNormallestir",
  "kdvOzetiniHesapla"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const kalem = (id, net, oran) => ({
  id, urunId:`urun-${id}`, kod:`UR-${id}`, ad:`Ürün ${id}`, tur:"urun", birim:"Adet",
  miktar:1, birimFiyat:net, kdvOrani:oran
});
const faturalar = [
  { id:1, no:"SF-1", tarih:"2026-09-01", faturaTuru:"satis", tutar:1750, kalemler:[kalem("s1",1000,20),kalem("s2",500,10)] },
  { id:2, no:"AF-1", tarih:"2026-09-12", faturaTuru:"alis", tutar:940, kalemler:[kalem("a1",600,20),kalem("a2",200,10)] },
  { id:3, no:"ESKI-1", tarih:"2026-09-20", faturaTuru:"alis", tutar:118, kalemler:[] },
  { id:4, no:"SF-0", tarih:"2026-08-31", faturaTuru:"satis", tutar:1200, kalemler:[kalem("s0",1000,20)] },
  { id:5, no:"AF-2", tarih:"2026-10-03", faturaTuru:"alis", tutar:1200, kalemler:[kalem("a3",1000,20)] }
];

const rapor = context.kdvOzetiniHesapla("2026-09", faturalar);
assert.equal(rapor.baslangic, "2026-09-01");
assert.equal(rapor.bitis, "2026-09-30");
assert.equal(rapor.satisMatrah, 1500);
assert.equal(rapor.hesaplananKdv, 250);
assert.equal(rapor.alisMatrah, 800);
assert.equal(rapor.indirilecekKdv, 140);
assert.equal(rapor.net, 110);
assert.equal(rapor.sonucTuru, "odenecek");
assert.equal(rapor.sonucEtiketi, "TAHMİNİ ÖDENECEK KDV");
assert.equal(rapor.donemFaturaSayisi, 3);
assert.equal(rapor.hesaplananFaturaSayisi, 2);
assert.equal(rapor.eksikSayisi, 1, "Kalem ayrıntısı bulunmayan eski faturalar yanlış KDV üretmemeli");
assert.equal(rapor.eksikBrutTutar, 118);
assert.deepEqual(JSON.parse(JSON.stringify(rapor.oranlar.map(satir=>satir.oran))), [10,20]);
assert.deepEqual(
  { ...rapor.oranlar.find(satir=>satir.oran === 20) },
  { oran:20, satisMatrah:1000, hesaplananKdv:200, alisMatrah:600, indirilecekKdv:120 }
);

const ekim = context.kdvOzetiniHesapla("2026-10", faturalar);
assert.equal(ekim.net, -200);
assert.equal(ekim.sonucTuru, "devreden");
assert.equal(ekim.sonucTutar, 200);
const subat = context.kdvOzetiniHesapla("2028-02", []);
assert.equal(subat.bitis, "2028-02-29", "KDV dönemi ayın gerçek son gününü kullanmalı");

assert.match(index, /id="kdv-ozet-overlay"/, "KDV durum özeti penceresi bulunmalı");
assert.match(index, /data-modul="kdv-ozeti"/, "KDV özeti Raporlar menüsünde bulunmalı");
assert.match(index, /case "kdv-ozeti": kdvOzetiniAc\(\)/, "KDV menüsü rapor penceresine bağlanmalı");
assert.match(index, /resmi beyanname yerine kullanılamaz/, "Raporun ön muhasebe sınırı açıkça belirtilmeli");
assert.match(index, /faturaTuru:faturaTurunuNormallestir\(row\["Fatura Türü"\].*row\["faturaTuru"\]/, "Bulut yüklemesi fatura türünü korumalı");
assert.match(index, /kalemler:Array\.isArray\(row\["kalemler"\]\)[\s\S]*row\["Fatura Kalemleri"\]/, "Bulut yüklemesi fatura kalemlerini korumalı");

console.log("KDV durum özeti ve bulut fatura ayrıntısı koruması testleri başarılı.");
