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
  cariKartlariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  finansHesaplariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  isletmeHareketleriniNormallestir: liste => Array.isArray(liste) ? liste : [],
  hesapTransferleriniNormallestir: liste => Array.isArray(liste) ? liste : []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const mevcut = {
  items:[{ id:1, tutar:100 }, { id:2, tutar:200 }],
  cariHareketler:[{ id:"H-1", tutar:50 }],
  cekler:[{ id:"C-1", durum:"Verildi" }],
  cariler:[{ id:"K-1", cari:"Firma A" }],
  hesaplar:[{ id:"B-1", ad:"Ana Banka" }],
  isletmeHareketler:[{ id:"FIS-1", tur:"gelir", tutar:100 }]
};
const yedek = {
  items:[{ id:1, tutar:125 }, { id:3, tutar:300 }],
  cariHareketler:[{ id:"H-1", tutar:50 }],
  cekler:[],
  cariler:[{ id:"K-1", cari:"Firma A" }, { id:"K-2", cari:"Firma B" }],
  hesaplar:[{ id:"B-1", ad:"Ana Banka", durum:"Pasif" }],
  isletmeHareketler:[{ id:"FIS-1", tur:"gider", tutar:100 }, { id:"FIS-2", tur:"gelir", tutar:25 }]
};

const farklar = context.yedekFarklariniHesapla(mevcut, yedek);
const faturalar = farklar.find(satir => satir.ad === "Faturalar");
const cariler = farklar.find(satir => satir.ad === "Cari kartlar");
const odemeler = farklar.find(satir => satir.ad === "Ödemeler");
const cekler = farklar.find(satir => satir.ad === "Çekler");
const hesaplar = farklar.find(satir => satir.ad === "Kasa / Banka");
const fisler = farklar.find(satir => satir.ad === "Gelir / Gider");

assert.equal(faturalar.eklenecek, 1, "Yedekteki yeni fatura sayılmalı");
assert.equal(faturalar.guncellenecek, 1, "Değişen fatura sayılmalı");
assert.equal(faturalar.kaldirilacak, 1, "Yedekte bulunmayan mevcut fatura sayılmalı");
assert.equal(cariler.eklenecek, 1, "Yedekteki yeni cari sayılmalı");
assert.equal(odemeler.eklenecek + odemeler.guncellenecek + odemeler.kaldirilacak, 0, "Aynı ödeme değişmiş sayılmamalı");
assert.equal(cekler.kaldirilacak, 1, "Yedekte bulunmayan çek sayılmalı");
assert.equal(hesaplar.guncellenecek, 1, "Değişen kasa/banka hesabı sayılmalı");
assert.equal(fisler.eklenecek, 1, "Yedekteki yeni gelir/gider fişi sayılmalı");
assert.equal(fisler.guncellenecek, 1, "Değişen gelir/gider fişi sayılmalı");

console.log("Yedek geri yükleme etki analizi testleri başarılı.");
