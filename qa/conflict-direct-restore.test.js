const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("async function cakismaYedeginiKarsilastir");
const bitis = index.indexOf("function cakismaYedeginiSil", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Doğrudan eşitleme kopyası karşılaştırma işlevi bulunmalı");

const hedefDurum = { items:[{ id:"F-2" }], cariHareketler:[], cekler:[], cariler:[] };
const mevcutDurum = { items:[{ id:"F-1" }], cariHareketler:[], cekler:[], cariler:[] };
const yedek = {
  kayitZamani:"2026-09-04T09:30:00.000Z",
  cihazSurumu:7,
  yerelDurum:hedefDurum
};
let onay = false;
let bulutSonucu = true;
let uygulananlar = [];
const olaylar = [];
const context = {
  Number,
  YEREL_GELISTIRME:false,
  yoneticiGerekli:() => true,
  cakismaYedekleriniOku:() => [yedek],
  uygulamaDurumuOlustur:() => mevcutDurum,
  jsonYedekVerisiniDogrula:veri => {
    olaylar.push("doğrula");
    assert.equal(veri.format, "arlinoks-merkezi-yedek-v1");
    return { durum:veri.durum };
  },
  bulutYedegiTarihiniFormatla:() => "04.09.2026 12:30",
  cakismaYedekleriniKapat:() => olaylar.push("paneli-kapat"),
  cakismaYedekleriniAc:() => olaylar.push("paneli-aç"),
  yedekGeriYuklemeOnayiAl:async () => {
    olaylar.push("karşılaştır");
    return onay;
  },
  otomatikYedekOlustur:() => olaylar.push("önce-yedekle"),
  uygulamaDurumunuYereldeUygula:durum => {
    olaylar.push(durum === mevcutDurum ? "geri-al" : "uygula");
    uygulananlar.push(durum);
    return durum;
  },
  bulutKaydiniGonder:async () => {
    olaylar.push("buluta-gönder");
    return bulutSonucu;
  },
  syncGoster:() => olaylar.push("başarılı"),
  alert:() => olaylar.push("hata")
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

(async () => {
  assert.equal(await context.cakismaYedeginiKarsilastir(0), false, "Karşılaştırma onaylanmazsa işlem iptal edilmeli");
  assert.deepEqual(uygulananlar, [], "Açık onaydan önce hiçbir veri uygulanmamalı");
  assert.equal(olaylar.includes("paneli-aç"), true, "İptalde kurtarma paneline geri dönülmeli");

  olaylar.length = 0;
  onay = true;
  assert.equal(await context.cakismaYedeginiKarsilastir(0), true, "Onaylanan kopya güvenle geri yüklenmeli");
  assert.deepEqual(olaylar, ["doğrula", "paneli-kapat", "karşılaştır", "önce-yedekle", "uygula", "buluta-gönder", "başarılı"], "Geri yükleme güvenli işlem sırasını izlemeli");

  olaylar.length = 0;
  uygulananlar = [];
  bulutSonucu = false;
  assert.equal(await context.cakismaYedeginiKarsilastir(0), false, "Bulut kaydı başarısızsa işlem başarısız sayılmalı");
  assert.equal(uygulananlar[0], hedefDurum, "Onaylanan hedef önce yerelde uygulanmalı");
  assert.equal(uygulananlar[1], mevcutDurum, "Bulut kaydı başarısızsa mevcut durum geri alınmalı");
  assert.equal(olaylar.includes("hata"), true, "Başarısızlık kullanıcıya bildirilmeli");
  assert.equal(olaylar.includes("paneli-aç"), true, "Başarısızlıkta kurtarma paneline dönülmeli");

  assert.match(index, /onclick="cakismaYedeginiKarsilastir\(\$\{sira\}\)"/, "Her güvenlik kopyasında Karşılaştır düğmesi bulunmalı");
  assert.match(index, /Eşitleme kopyası geri yüklenmeden önce/, "Mevcut kayıtlar geri yükleme öncesinde yedeklenmeli");
  assert.doesNotMatch(index.slice(baslangic, bitis), /removeItem\(BULUT_CAKISMA_ANAHTAR\)/, "Geri yüklenen güvenlik kopyası sessizce silinmemeli");

  console.log("Eşitleme kopyasını doğrudan karşılaştırma, onay ve geri alma testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exit(1);
});
