const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function yedekKayitAnahtari");
const bitis = index.indexOf("function yedekGeriYuklemeOnayiAl", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Yedek karşılaştırma işlevleri bulunamadı");

const context = {
  JSON,
  Map,
  faturalariTekillestir: liste => ({ liste:Array.isArray(liste) ? liste : [] }),
  cariHareketleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cekleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cariKartlariniNormallestir: liste => Array.isArray(liste) ? liste : []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const mevcut = {
  items:[{ id:1, tutar:100 }, { id:2, tutar:200 }],
  cariHareketler:[{ id:"H-1", tutar:50 }],
  cekler:[{ id:"C-1", durum:"Verildi" }],
  cariler:[{ id:"K-1", cari:"Firma A" }]
};
const yedek = {
  items:[{ id:1, tutar:125 }, { id:3, tutar:300 }],
  cariHareketler:[{ id:"H-1", tutar:50 }],
  cekler:[],
  cariler:[{ id:"K-1", cari:"Firma A" }, { id:"K-2", cari:"Firma B" }]
};

const farklar = context.yedekFarklariniHesapla(mevcut, yedek);
const faturalar = farklar.find(satir => satir.ad === "Faturalar");
const cariler = farklar.find(satir => satir.ad === "Cari kartlar");
const odemeler = farklar.find(satir => satir.ad === "Ödemeler");
const cekler = farklar.find(satir => satir.ad === "Çekler");

assert.equal(faturalar.eklenecek, 1, "Yedekteki yeni fatura sayılmalı");
assert.equal(faturalar.guncellenecek, 1, "Değişen fatura sayılmalı");
assert.equal(faturalar.kaldirilacak, 1, "Yedekte bulunmayan mevcut fatura sayılmalı");
assert.equal(cariler.eklenecek, 1, "Yedekteki yeni cari sayılmalı");
assert.equal(odemeler.eklenecek + odemeler.guncellenecek + odemeler.kaldirilacak, 0, "Aynı ödeme değişmiş sayılmamalı");
assert.equal(cekler.kaldirilacak, 1, "Yedekte bulunmayan çek sayılmalı");

console.log("Yedek geri yükleme etki analizi testleri başarılı.");
