const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function cakismaYedegiKisaKimligi");
const bitis = index.indexOf("function cakismaYedeginiSil", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Doğrudan eşitleme kopyası karşılaştırma işlevi bulunmalı");

const hedefDurum = { items:[{ id:"F-2" }], cariHareketler:[], cekler:[], cariler:[] };
const mevcutDurum = { items:[{ id:"F-1" }], cariHareketler:[], cekler:[], cariler:[] };
const yedek = {
  id:"a1b2c3d4-e5f6-7890",
  kayitZamani:"2026-09-04T09:30:00.000Z",
  cihazSurumu:7,
  yerelDurum:hedefDurum
};
let onay = false;
let bulutSonucu = true;
let uygulananlar = [];
let sonDenetimMetni = "";
const olaylar = [];
const context = {
  Number, String, Array,
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
  yedekFarklariniHesapla:() => [{ eklenecek:1, guncellenecek:2, kaldirilacak:1 }],
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
  bulutKaydiniGonder:async (durum, secenekler) => {
    olaylar.push("buluta-gönder");
    sonDenetimMetni = secenekler.auditAction;
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
  assert.match(sonDenetimMetni, /04\.09\.2026 12:30 · ID A1B2C3D4 · 4 kayıt/, "İşlem geçmişi kopya tarihi, kısa kimliği ve etkilenen kayıt sayısını içermeli");

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
  assert.match(index, /Bu tarayıcıda korunuyor · ID/, "Kopya kimliği kurtarma panelinde gösterilmeli");
  assert.match(index, /auditAction:denetimMetni/, "Ayrıntılı kaynak bilgisi merkezi işlem geçmişine gönderilmeli");
  assert.doesNotMatch(index.slice(baslangic, bitis), /removeItem\(BULUT_CAKISMA_ANAHTAR\)/, "Geri yüklenen güvenlik kopyası sessizce silinmemeli");

  console.log("Eşitleme kopyasını doğrudan karşılaştırma, onay ve geri alma testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exit(1);
});
