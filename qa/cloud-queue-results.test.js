const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("async function bulutKaydiniGonder");
const bitis = index.indexOf("async function bulutKayitKuyrugunuCalistir", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Bulut gönderim işlevi bulunamadı");

let apiHatasi = null;
let uzakSurum = 4;
let cakismaKopyasi = 0;
let cakismaYedegiBasarili = true;
const context = {
  String,
  Number,
  Array,
  YEREL_GELISTIRME:false,
  bulutSurumu:4,
  bulutSonKuyrukHatasi:null,
  sonGirisHatasi:"",
  firebaseAuth:null,
  yoneticiGerekli:() => true,
  syncGoster() {},
  alert() {},
  depolamaSagligiYenile() {},
  bulutKilidiyleCalistir:islem => islem(),
  bulutDurumunuGetir:async () => ({ revision:uzakSurum, items:[], cariHareketler:[], cekler:[], cariler:[] }),
  listeSurumImzasi:durum => JSON.stringify(durum?.items || []),
  bulutSurumunuKaydet(surum) { this.bulutSurumu = surum; },
  bulutCakismasiniKaydet() {
    if (!cakismaYedegiBasarili) throw new Error("Tarayıcı deposu dolu");
    cakismaKopyasi += 1;
  },
  istekKimligiOlustur:() => "kuyruk-istegi",
  apiIstegi:async () => {
    if (apiHatasi) throw apiHatasi;
    return { revision:5 };
  },
  faturalariTekillestir:liste => ({ liste }),
  cariHareketleriNormallestir:liste => liste,
  cekleriNormallestir:liste => liste,
  cariKartlariniNormallestir:liste => liste,
  finansHesaplariniNormallestir:liste => Array.isArray(liste) ? liste : [],
  isletmeHareketleriniNormallestir:liste => Array.isArray(liste) ? liste : [],
  hesapTransferleriniNormallestir:liste => Array.isArray(liste) ? liste : []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const durum = { items:[{ id:"fatura-1" }], cariHareketler:[], cekler:[], cariler:[], hesaplar:[], isletmeHareketler:[] };
const kuyrukSecenekleri = { requestId:"kuyruk-istegi", baseRevision:4, kuyrukKaydi:true };

(async () => {
  apiHatasi = Object.assign(new Error("Alan kritik"), { code:"STORAGE_CRITICAL" });
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "durdur", "Kritik depolama engeli bekleyen kaydı korumalı");
  assert.equal(context.bulutSonKuyrukHatasi.kod, "STORAGE_CRITICAL", "Kalıcı engelin hata kodu kuyruk kaydına aktarılabilmeli");
  assert.equal(await context.bulutKaydiniGonder(durum, { ...kuyrukSecenekleri, kuyrukKaydi:false }), false, "Doğrudan kayıt çağrısının mevcut boolean sözleşmesi korunmalı");

  apiHatasi = Object.assign(new Error("Eksik çek bilgisi"), { code:"INVALID_CHECK_DETAILS" });
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "durdur", "Doğrulama engeli otomatik tekrar döngüsünü durdurmalı");

  apiHatasi = Object.assign(new Error("Aynı çek"), { code:"DUPLICATE_CHECK_NUMBER" });
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "cakisma", "Güvenlik kopyasına alınan mükerrer kayıt kuyrukta tamamlanmış sayılmalı");
  assert.ok(cakismaKopyasi > 0, "Mükerrer kayıt silinmeden önce güvenlik kopyasına alınmalı");

  cakismaYedegiBasarili = false;
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "durdur", "Çakışma kopyası saklanamazsa asıl bekleyen kayıt kuyrukta kalmalı");
  cakismaYedegiBasarili = true;

  apiHatasi = new Error("Geçici ağ hatası");
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "tekrar", "Geçici bağlantı hatası otomatik yeniden denenmeli");

  apiHatasi = null;
  uzakSurum = 6;
  assert.equal(await context.bulutKaydiniGonder(durum, kuyrukSecenekleri), "cakisma", "Sürüm çakışması güvenlik kopyası sonucuyla ayrıştırılmalı");

  console.log("Bulut kuyruğu hata sınıflandırması testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exitCode = 1;
});
