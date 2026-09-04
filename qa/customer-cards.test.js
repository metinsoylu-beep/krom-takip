const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = index.indexOf("function cariKimligiOlustur");
const bitis = index.indexOf("function odemeKaydiniNormallestir", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Cari kart veri modeli bulunamadı");

const depo = new Map();
const faturalar = [{ id:1, cari:"Firma A", no:"F-1", tarih:"2026-09-01", vadeGun:30, tutar:100 }];
const hareketler = [{ id:"h-1", cari:"Firma A", tarih:"2026-09-02", tutar:25 }];
const context = {
  console, Date, Math, Number, String, Array, Set, Map, JSON,
  CARI_KART_ANAHTAR:"cariler",
  localStorage:{
    getItem: anahtar => depo.get(anahtar) || null,
    setItem: (anahtar,deger) => depo.set(anahtar,String(deger))
  },
  cariAdiAnahtari: cari => String(cari || "Belirtilmedi").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ") || "BELİRTİLMEDİ",
  faturaTurunuNormallestir: deger => String(deger || "").toLowerCase() === "satis" ? "satis" : "alis",
  cariHareketTurunuNormallestir: deger => String(deger || "").toLowerCase() === "tahsilat" ? "tahsilat" : "odeme",
  tutarSayiyaCevir: deger => Number(deger) || 0,
  tarihGecerliMi: deger => /^\d{4}-\d{2}-\d{2}$/.test(String(deger || "")),
  faturaYukle: () => faturalar,
  cariHareketleriYukle: () => hareketler,
  cekleriYukle: () => []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const kartlar = context.cariKartlariniNormallestir([
  { id:"a", cari:"Firma A", vergiNo:"123", acilisTarihi:"2026-01-01", acilisBorc:50 },
  { id:"b", cari:"  firma   a ", vergiNo:"999" },
  { id:"c", cari:"Firma B", vergiNo:"123" },
  { id:"d", cari:"Firma C", acilisTarihi:"2026-01-01", acilisBorc:10, acilisAlacak:30 }
]);
assert.equal(kartlar.length, 2, "Aynı ad veya vergi numarasına sahip cari kartlar yinelenmemeli");
assert.equal(kartlar.find(kart => kart.cari === "Firma C").acilisAlacak, 20, "Çift yönlü açılış bakiyesi netleştirilmeli");

depo.set("cariler", JSON.stringify([{ id:"a", cari:"Firma A", acilisTarihi:"2026-01-01", acilisBorc:50 }]));
const hesap = context.cariOzetleriniHesapla(faturalar, hareketler, [], context.cariKartlariniYukle())[0];
assert.equal(hesap.bakiye, 125, "Devir borcu cari bakiyeye eklenmeli");

assert.match(index, /id="cari-kart-formu"/, "Cari kart ekleme ve düzenleme formu bulunmalı");
assert.match(index, /id="cari-kart-vergi"/, "Vergi numarası alanı bulunmalı");
assert.match(index, /id="cari-kart-bakiye-turu"/, "Devir borç veya alacak türü seçilebilmeli");
assert.match(index, /Devir borç bakiyesi/, "Devir bakiyesi ekstrede ayrı hareket olmalı");
assert.match(index, /list="cari-kart-listesi"/, "Fatura ve ödeme formlarında kayıtlı cari seçimi bulunmalı");
assert.match(code, /const CUSTOMER_SHEET_NAME = "Cariler"/);
assert.match(code, /const CARI_BASLIK = \[/);
assert.match(code, /customerSheet\.getRange/);
assert.match(code, /cariler: durum\.cariler/);

console.log("Cari kart, mükerrer önleme ve devir bakiyesi testleri başarılı.");
