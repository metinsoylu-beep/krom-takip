const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function bekleyenBulutKaydiniDogrula");
const bitis = index.indexOf("async function bulutKaydiniGonder", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Kalıcı bulut kuyruğu işlevleri bulunamadı");

const depo = new Map();
let sira = 0;
const context = {
  Date,
  JSON,
  Number,
  String,
  Set,
  BULUT_BEKLEYEN_ANAHTAR:"bekleyen-bulut-kaydi",
  bulutTekrarDenemeZamanlayici:null,
  bekleyenBulutKaydi:null,
  istekKimligiOlustur:() => `istek-${++sira}`,
  listeSurumImzasi:durum => JSON.stringify({
    items:durum?.items || [],
    cariHareketler:durum?.cariHareketler || [],
    cekler:durum?.cekler || [],
    cariler:durum?.cariler || []
  }),
  clearTimeout() {},
  localStorage:{
    getItem:anahtar => depo.has(anahtar) ? depo.get(anahtar) : null,
    setItem:(anahtar,deger) => depo.set(anahtar,String(deger)),
    removeItem:anahtar => depo.delete(anahtar)
  }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const yerelDurum = { items:[{ id:1, no:"F-1" }], cariHareketler:[], cekler:[], cariler:[] };
const bekleyen = { id:"kuyruk-1", kayitZamani:"2026-09-04T10:00:00.000Z", baseRevision:4, auditAction:"Fatura eklendi", allowDuplicateRecordIds:[], durum:yerelDurum };

assert.equal(context.bekleyenBulutKaydiniSakla(bekleyen), true, "Bekleyen kayıt tarayıcı deposuna yazılmalı");
assert.equal(context.bekleyenBulutKaydiniOku().baseRevision, 4, "Kaydın dayandığı bulut sürümü korunmalı");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { ...yerelDurum, revision:5 }), "tamamlandi", "Bulutta zaten bulunan değişiklik tekrar gönderilmemeli");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { items:[], cariHareketler:[], cekler:[], cariler:[], revision:4 }), "gonder", "Bulut değişmediyse bekleyen kayıt yeniden gönderilmeli");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { items:[], cariHareketler:[], cekler:[], cariler:[], revision:5 }), "cakisma", "Başka cihaz değişikliği varsa üzerine yazılmamalı");
assert.equal(context.bekleyenBulutKaydiniDogrula({ ...bekleyen, baseRevision:null }).baseRevision, null, "Bilinmeyen sürüm yanlışlıkla sıfırıncı sürüm sayılmamalı");
assert.equal(context.bekleyenBulutKaydiniTemizle("baska-kayit"), false, "Yeni kuyruğu eski gönderim temizlememeli");
assert.equal(context.bekleyenBulutKaydiniTemizle("kuyruk-1"), true, "Tamamlanan kuyruk güvenle temizlenmeli");
assert.equal(depo.has("bekleyen-bulut-kaydi"), false);

assert.match(index, /window\.addEventListener\("online"/, "Bağlantı geri geldiğinde otomatik yeniden deneme bulunmalı");
assert.match(index, /setTimeout\(bulutKayitKuyrugunuCalistir, 30000\)/, "Geçici sunucu hataları kontrollü aralıkla yeniden denenmeli");
assert.match(index, /bekleyenBulutKaydiniUzakDurumlaKontrolEt\(uzakDurum\)/, "Bulut verisi yereli ezmeden önce bekleyen kayıt kontrol edilmeli");
assert.match(index, /Değişiklik bu cihazda güvenle bekliyor/, "Kullanıcı bekleyen kayıt hakkında bilgilendirilmeli");

const kuyrukBaslangici = index.indexOf("async function bulutKayitKuyrugunuCalistir");
const kuyrukBitisi = index.indexOf("function buludaKaydet", kuyrukBaslangici);
assert.ok(kuyrukBaslangici >= 0 && kuyrukBitisi > kuyrukBaslangici, "Bulut kuyruğu çalıştırıcısı bulunamadı");
let tekrarGecikmesi = 0;
const kuyrukContext = {
  console,
  bekleyenBulutKaydi:bekleyen,
  bulutKaydiCalisiyor:false,
  bulutTekrarDenemeZamanlayici:null,
  bulutSurumu:4,
  navigator:{ onLine:true },
  yoneticiMi:() => true,
  bekleyenBulutKaydiniOku:() => null,
  bekleyenBulutKaydiniSakla:() => true,
  bulutKaydiniGonder:async () => "tekrar",
  bekleyenBulutKaydiniTemizle:() => { kuyrukContext.bekleyenBulutKaydi = null; return true; },
  syncGoster() {},
  clearTimeout() {},
  setTimeout:(islem, gecikme) => { tekrarGecikmesi = gecikme; return 1; }
};
vm.createContext(kuyrukContext);
vm.runInContext(index.slice(kuyrukBaslangici, kuyrukBitisi), kuyrukContext);

(async () => {
  await kuyrukContext.bulutKayitKuyrugunuCalistir();
  assert.equal(kuyrukContext.bekleyenBulutKaydi.id, "kuyruk-1", "Geçici bağlantı hatasında bekleyen kayıt silinmemeli");
  assert.equal(tekrarGecikmesi, 30000, "Geçici hata kontrollü aralıkla yeniden denenmeli");

  kuyrukContext.bulutKaydiniGonder = async () => true;
  tekrarGecikmesi = 0;
  await kuyrukContext.bulutKayitKuyrugunuCalistir();
  assert.equal(kuyrukContext.bekleyenBulutKaydi, null, "Başarılı gönderimden sonra bekleyen kayıt temizlenmeli");
  assert.equal(tekrarGecikmesi, 0, "Başarılı gönderim yeni deneme planlamamalı");
  console.log("Kalıcı bulut kuyruğu ve güvenli yeniden deneme testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exitCode = 1;
});
