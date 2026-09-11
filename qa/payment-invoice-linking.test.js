const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const appsScript = fs.readFileSync("google-apps-script/Code.gs", "utf8");

const baslangic = index.indexOf("function faturaTakipBaglantilariniUygula");
const bitis = index.indexOf("function odemeYonetiminiAc", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Ödeme-fatura bağlantısı işlevi bulunmalı");

const context = {
  console, String, Set, Map, Array,
  faturaKimlikleriniNormallestir(liste) {
    return [...new Set((Array.isArray(liste) ? liste : []).map(String).filter(Boolean))];
  },
  faturalariTekillestir(liste) { return { liste }; },
  cariHareketleriNormallestir(liste) { return liste; },
  cariHareketAktifMi(hareket) { return hareket.durum !== "İptal"; },
  cariHareketTurunuNormallestir(tur) { return tur === "tahsilat" ? "tahsilat" : "odeme"; }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const faturalar = [
  { id:1, no:"A-1", takipKapali:false, kapanisTarihi:"" },
  { id:2, no:"A-2", takipKapali:false, kapanisTarihi:"" }
];
const odeme = { id:"h-1", tarih:"2026-09-11", islemTuru:"odeme", durum:"Aktif", kapatilanFaturaIds:["1"] };
let sonuc = context.faturaTakipBaglantilariniUygula(faturalar,["1"],[odeme]);
assert.equal(sonuc[0].takipKapali, true, "Seçilen fatura ödendi olarak kapatılmalı");
assert.equal(sonuc[0].kapanisTarihi, "2026-09-11", "Ödeme tarihi kapanış tarihi olmalı");
assert.equal(sonuc[1].takipKapali, false, "Seçilmeyen fatura açık kalmalı");

sonuc = context.faturaTakipBaglantilariniUygula(sonuc,["1"],[{ ...odeme, durum:"İptal" }]);
assert.equal(sonuc[0].takipKapali, false, "Bağlı ödeme iptal edilince fatura yeniden açılmalı");
assert.equal(sonuc[0].kapanisTarihi, "", "İptal edilen bağlantının kapanış tarihi temizlenmeli");

sonuc = context.faturaTakipBaglantilariniUygula(sonuc,["1"],[
  { ...odeme, durum:"İptal" },
  { id:"h-2", tarih:"2026-09-12", islemTuru:"odeme", durum:"Aktif", kapatilanFaturaIds:["1"] }
]);
assert.equal(sonuc[0].takipKapali, true, "Başka aktif ödeme bağlantısı varsa fatura kapalı kalmalı");
assert.equal(sonuc[0].kapanisTarihi, "2026-09-12");

assert.match(index, /id="odeme-fatura-kapatma-alani"/, "Ödeme formunda isteğe bağlı fatura seçimi bulunmalı");
assert.match(index, /Tutar faturalara otomatik dağıtılmaz/, "Otomatik dağıtım yapılmadığı açıkça yazılmalı");
assert.match(index, /kapatilanFaturaIds:faturaKimlikleriniNormallestir/, "Ödeme hareketi seçilen faturaları saklamalı");
assert.match(index, /faturaTakipBaglantilariniUygula\(faturaYukle\(\),kapatilanFaturaIds,hareketler\)/, "Yeni ödeme seçilen faturaları kapatmalı");
assert.match(appsScript, /"Kapatılan Fatura ID'leri"/, "Bağlantılar Google Sheets sütununda saklanmalı");
assert.match(appsScript, /JSON\.stringify\(hareket\.kapatilanFaturaIds \|\| \[\]\)/, "Bağlantılar Sheets'e yazılmalı");

console.log("Manuel ödeme-fatura bağlantısı testleri başarılı.");
