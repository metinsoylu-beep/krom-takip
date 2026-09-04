const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function cakismaYedekleriniOku");
const bitis = index.indexOf("function bekleyenBulutKaydiniDogrula", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Çakışma kurtarma yardımcıları bulunmalı");

const depo = new Map();
let kimlikSirasi = 0;
let indirilenBlob = null;
let indirmeTiklandi = false;
let silmeOnayi = false;
class TestBlob {
  constructor(parcalar, secenekler={}) {
    this.parcalar = parcalar;
    this.type = secenekler.type || "";
    this.size = parcalar.map(parca => String(parca)).join("").length;
  }
}
const context = {
  Date, JSON, Number, String, Array, Blob:TestBlob,
  BULUT_CAKISMA_ANAHTAR:"cakisma-yedekleri",
  BULUT_CAKISMA_YEDEK_SINIRI:5,
  bulutSurumu:4,
  bulutCakismaUyarildi:true,
  localStorage:{
    getItem:anahtar => depo.has(anahtar) ? depo.get(anahtar) : null,
    setItem:(anahtar,deger) => depo.set(anahtar,String(deger)),
    removeItem:anahtar => depo.delete(anahtar)
  },
  istekKimligiOlustur:() => `cakisma-${++kimlikSirasi}`,
  uygulamaDurumuOlustur:liste => ({ items:liste, cariHareketler:[], cekler:[], cariler:[] }),
  syncGoster() {},
  alert() {},
  confirm:() => silmeOnayi,
  yoneticiGerekli:() => true,
  htmlGuvenli:deger => String(deger),
  veriKontrolunuGuncelle() {},
  hamFaturaVerisiniYukle:() => [],
  faturaYukle:() => [],
  jsonYedekKontrolKodu:() => "A1B2C3D4",
  oturumKullanici:{ email:"yonetici@example.com" },
  URL:{
    createObjectURL:blob => { indirilenBlob = blob; return "blob:test"; },
    revokeObjectURL() {}
  },
  document:undefined
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const eskiTekKayit = {
  kayitZamani:"2026-09-04T08:00:00.000Z",
  cihazSurumu:3,
  bulutSurumu:4,
  yerelDurum:{ items:[{ id:"eski" }], cariHareketler:[], cekler:[], cariler:[] },
  bulutDurum:{ revision:4, items:[] }
};
depo.set("cakisma-yedekleri", JSON.stringify(eskiTekKayit));
assert.equal(context.cakismaYedekleriniOku().length, 1, "Eski tek kayıt biçimi geçmiş listesine dönüştürülmeli");

for (let sira = 1; sira <= 6; sira += 1) {
  context.bulutCakismasiniKaydet(
    { items:[{ id:`yerel-${sira}` }], cariHareketler:[], cekler:[], cariler:[] },
    { revision:4 + sira, items:[] },
    { syncMesaji:`Çakışma ${sira}` }
  );
}

const yedekler = context.cakismaYedekleriniOku();
assert.equal(yedekler.length, 5, "Tarayıcı depolaması için en fazla beş çakışma kopyası tutulmalı");
assert.equal(yedekler[0].yerelDurum.items[0].id, "yerel-6", "En yeni çakışma ilk sırada korunmalı");
assert.equal(yedekler[4].yerelDurum.items[0].id, "yerel-2", "Sınır aşılınca yalnızca en eski kopya bırakılmalı");
assert.ok(Array.isArray(JSON.parse(depo.get("cakisma-yedekleri"))), "Çakışma geçmişi dizi biçiminde saklanmalı");

const baglanti = { href:"", download:"", click:() => { indirmeTiklandi = true; }, remove() {} };
const listeAlani = { innerHTML:"" };
context.document = {
  createElement:etiket => { assert.equal(etiket, "a"); return baglanti; },
  getElementById:id => id === "cakisma-yedekleri-liste" ? listeAlani : null,
  body:{ appendChild() {} }
};
assert.equal(context.sonCakismaYedeginiIndir(), true, "Son çakışma kopyası indirilebilmeli");
assert.equal(indirmeTiklandi, true, "Tarayıcı indirmesi başlatılmalı");
assert.match(baglanti.download, /^arlinoks-esitleme-kopyasi-.*\.json$/, "Dosya adı kurtarma kopyasını açıklamalı");
const indirilen = JSON.parse(indirilenBlob.parcalar.join(""));
assert.equal(indirilen.format, "arlinoks-merkezi-yedek-v1", "Dosya mevcut yedek içe aktarma biçiminde olmalı");
assert.equal(indirilen.durum.items[0].id, "yerel-6", "İndirilen dosya en yeni korunmuş yerel durumu içermeli");
assert.equal(indirilen.kontrol.kod, "A1B2C3D4", "İndirilen dosyada bütünlük kontrol kodu bulunmalı");

assert.equal(context.cakismaYedeginiIndir(2), true, "Listedeki herhangi bir çakışma kopyası ayrı indirilebilmeli");
const seciliIndirilen = JSON.parse(indirilenBlob.parcalar.join(""));
assert.equal(seciliIndirilen.durum.items[0].id, "yerel-4", "Seçilen sıra doğru kopyayı indirmeli");

const silmeOncesi = context.cakismaYedekleriniOku().map(yedek => yedek.id);
assert.equal(context.cakismaYedeginiSil(1), false, "Kullanıcı onaylamazsa silme iptal edilmeli");
assert.deepEqual(context.cakismaYedekleriniOku().map(yedek => yedek.id), silmeOncesi, "İptal edilen silme hiçbir kopyayı değiştirmemeli");
silmeOnayi = true;
assert.equal(context.cakismaYedeginiSil(1), true, "Onaylanan silme işlemi tamamlanmalı");
const silmeSonrasi = context.cakismaYedekleriniOku();
assert.equal(silmeSonrasi.length, 4, "Silme yalnızca bir kopyayı kaldırmalı");
assert.equal(silmeSonrasi.some(yedek => yedek.id === silmeOncesi[1]), false, "Yalnızca seçilen kopya kaldırılmalı");

assert.match(index, /id="kontrol-cakisma"/, "Veri Kontrol Merkezi çakışma kopyası sayısını göstermeli");
assert.match(index, /function sonCakismaYedeginiIndir\(\)/, "Son çakışma kopyası indirilebilmeli");
assert.match(index, /id="cakisma-yedekleri-overlay"/, "Eşitleme kurtarma yönetim paneli bulunmalı");
assert.match(index, /function cakismaYedekleriniGoster\(\)/, "Korunan kopyaların tamamı listelenebilmeli");
assert.match(index, /function cakismaYedeginiSil\(sira\)/, "Seçilen kopya onayla silinebilmeli");
assert.match(index, /format:"arlinoks-merkezi-yedek-v1"/, "İndirilen kopya mevcut güvenli geri yükleme biçimini kullanmalı");
const gonderBaslangici = index.indexOf("async function bulutKaydiniGonder");
const gonderBitisi = index.indexOf("async function bulutKayitKuyrugunuCalistir", gonderBaslangici);
assert.ok(gonderBaslangici >= 0 && gonderBitisi > gonderBaslangici, "Bulut gönderim akışı bulunmalı");
assert.doesNotMatch(index.slice(gonderBaslangici, gonderBitisi), /localStorage\.removeItem\(BULUT_CAKISMA_ANAHTAR\)/, "Başarılı bulut gönderimi çakışma kopyalarını sessizce silmemeli");

console.log("Kalıcı eşitleme çakışması geçmişi, ayrı indirme ve onaylı silme testleri başarılı.");
