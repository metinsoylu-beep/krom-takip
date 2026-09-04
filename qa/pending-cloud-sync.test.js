const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function bekleyenBulutKaydiniDogrula");
const bitis = index.indexOf("async function bulutKaydiniGonder", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Kalıcı bulut kuyruğu işlevleri bulunamadı");

const depo = new Map();
let sira = 0;
let indirilenBlob = null;
let indirmeTiklandi = false;
class TestBlob {
  constructor(parcalar, secenekler={}) {
    this.parcalar = parcalar;
    this.type = secenekler.type || "";
    this.size = parcalar.map(parca => String(parca)).join("").length;
  }
}
const baglanti = { href:"", download:"", click:() => { indirmeTiklandi = true; }, remove() {} };
const context = {
  Date,
  JSON,
  Number,
  String,
  Set,
  Array,
  Blob:TestBlob,
  BULUT_BEKLEYEN_ANAHTAR:"bekleyen-bulut-kaydi",
  bulutTekrarDenemeZamanlayici:null,
  bekleyenBulutKaydi:null,
  istekKimligiOlustur:() => `istek-${++sira}`,
  yoneticiGerekli:() => true,
  jsonYedekKontrolKodu:() => "B1C2D3E4",
  oturumKullanici:{ email:"yonetici@example.com" },
  syncGoster() {},
  URL:{
    createObjectURL:blob => { indirilenBlob = blob; return "blob:test"; },
    revokeObjectURL() {}
  },
  document:{
    getElementById:() => null,
    createElement:etiket => { assert.equal(etiket, "a"); return baglanti; },
    body:{ appendChild() {} }
  },
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
assert.equal(context.bekleyenBulutKaydiniOku().kuyrukDurumu, "bekliyor", "Eski kuyruk kayıtları güvenli biçimde bekliyor durumuna yükseltilmeli");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { ...yerelDurum, revision:5 }), "tamamlandi", "Bulutta zaten bulunan değişiklik tekrar gönderilmemeli");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { items:[], cariHareketler:[], cekler:[], cariler:[], revision:4 }), "gonder", "Bulut değişmediyse bekleyen kayıt yeniden gönderilmeli");
assert.equal(context.bekleyenBulutKaydiKarari(bekleyen, { items:[], cariHareketler:[], cekler:[], cariler:[], revision:5 }), "cakisma", "Başka cihaz değişikliği varsa üzerine yazılmamalı");
assert.equal(context.bekleyenBulutKaydiniDogrula({ ...bekleyen, baseRevision:null }).baseRevision, null, "Bilinmeyen sürüm yanlışlıkla sıfırıncı sürüm sayılmamalı");
assert.equal(context.bekleyenBulutKaydiYasMetni(bekleyen, new Date("2026-09-04T12:15:00.000Z")), "2 saattir", "Bekleyen kaydın yaşı anlaşılır biçimde gösterilmeli");
assert.equal(context.bekleyenBulutKaydiniIndir(), true, "Bekleyen bulut gönderimi JSON olarak indirilebilmeli");
assert.equal(indirmeTiklandi, true, "Bekleyen gönderimin indirmesi başlatılmalı");
assert.match(baglanti.download, /^arlinoks-bekleyen-gonderim-.*\.json$/, "İndirilen dosya bekleyen gönderim olarak adlandırılmalı");
const indirilen = JSON.parse(indirilenBlob.parcalar.join(""));
assert.equal(indirilen.format, "arlinoks-merkezi-yedek-v1", "Bekleyen gönderim mevcut güvenli geri yükleme biçimini kullanmalı");
assert.equal(indirilen.durum.items[0].id, 1, "Bekleyen muhasebe durumu eksiksiz indirilmeli");
assert.equal(indirilen.kontrol.kod, "B1C2D3E4", "İndirilen kopyada bütünlük kontrol kodu bulunmalı");
assert.equal(context.bekleyenBulutKaydiniTemizle("baska-kayit"), false, "Yeni kuyruğu eski gönderim temizlememeli");
assert.equal(context.bekleyenBulutKaydiniTemizle("kuyruk-1"), true, "Tamamlanan kuyruk güvenle temizlenmeli");
assert.equal(depo.has("bekleyen-bulut-kaydi"), false);

assert.match(index, /window\.addEventListener\("online"/, "Bağlantı geri geldiğinde otomatik yeniden deneme bulunmalı");
assert.match(index, /setTimeout\(bulutKayitKuyrugunuCalistir, 30000\)/, "Geçici sunucu hataları kontrollü aralıkla yeniden denenmeli");
assert.match(index, /bekleyenBulutKaydiniUzakDurumlaKontrolEt\(uzakDurum\)/, "Bulut verisi yereli ezmeden önce bekleyen kayıt kontrol edilmeli");
assert.match(index, /Değişiklik bu cihazda güvenle bekliyor/, "Kullanıcı bekleyen kayıt hakkında bilgilendirilmeli");
assert.match(index, /id="kontrol-bekleyen"/, "Veri Kontrol Merkezi bekleyen gönderim sayacını göstermeli");
assert.match(index, /function bekleyenBulutKaydiniIndir\(\)/, "Bekleyen gönderim güvenlik kopyası olarak indirilebilmeli");
assert.match(index, /Kopyayı İndir/, "Bekleyen gönderim için görünür indirme eylemi bulunmalı");
assert.match(index, /Tarayıcı güvenli saklama alanına yazılamadı/, "Tarayıcı deposu yazılamazsa kullanıcı açıkça uyarılmalı");
assert.match(index, /\["oturum", "durdur"\]\.includes\(sonuc\)/, "Kalıcı engeller otomatik tekrar döngüsünü durdurmalı");
assert.match(index, /\[true, "cakisma", "yerel"\]\.includes\(sonuc\)/, "Yalnızca tamamlanan veya güvenlik kopyasına alınan kayıtlar kuyruktan çıkarılmalı");
assert.match(index, /kuyrukDurumu:"engelli"/, "Kalıcı engel durumu bekleyen kayda yazılmalı");
assert.match(index, /kullanıcı kontrolü bekliyor/, "Veri Kontrol Merkezi engel nedenini kullanıcıya göstermeli");
assert.match(index, /Tekrar Dene/, "Engellenen gönderim için açık bir elle yeniden deneme eylemi bulunmalı");

const kuyrukBaslangici = index.indexOf("async function bulutKayitKuyrugunuCalistir");
const kuyrukBitisi = index.indexOf("function buludaKaydet", kuyrukBaslangici);
assert.ok(kuyrukBaslangici >= 0 && kuyrukBitisi > kuyrukBaslangici, "Bulut kuyruğu çalıştırıcısı bulunamadı");
let tekrarGecikmesi = 0;
let gonderimCagrisi = 0;
const kuyrukContext = {
  console,
  bekleyenBulutKaydi:bekleyen,
  bulutKaydiCalisiyor:false,
  bulutTekrarDenemeZamanlayici:null,
  bulutSurumu:4,
  bulutSonKuyrukHatasi:{ kod:"STORAGE_CRITICAL", mesaj:"Google Sheets alanı kritik." },
  navigator:{ onLine:true },
  yoneticiMi:() => true,
  bekleyenBulutKaydiEngelliMi:kayit => kayit?.kuyrukDurumu === "engelli",
  bekleyenBulutEngelMesaji:kayit => kayit?.sonHataMesaji || "Kontrol gerekli",
  bekleyenBulutKontrolunuGuncelle() {},
  bekleyenBulutKaydiniOku:() => null,
  bekleyenBulutKaydiniSakla:() => true,
  bekleyenBulutKaydiniEngelle:(kayit,hata) => {
    kuyrukContext.bekleyenBulutKaydi = { ...kayit, kuyrukDurumu:"engelli", sonHataKodu:hata.kod, sonHataMesaji:hata.mesaj };
    return true;
  },
  bulutKaydiniGonder:async () => { gonderimCagrisi += 1; return "tekrar"; },
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

  kuyrukContext.bulutKaydiniGonder = async () => { gonderimCagrisi += 1; return "durdur"; };
  tekrarGecikmesi = 0;
  await kuyrukContext.bulutKayitKuyrugunuCalistir();
  assert.equal(kuyrukContext.bekleyenBulutKaydi.id, "kuyruk-1", "Depolama veya doğrulama engelinde bekleyen kayıt korunmalı");
  assert.equal(kuyrukContext.bekleyenBulutKaydi.kuyrukDurumu, "engelli", "Kalıcı engel sayfa yenilemesine dayanacak biçimde işaretlenmeli");
  assert.equal(kuyrukContext.bekleyenBulutKaydi.sonHataKodu, "STORAGE_CRITICAL", "Engel nedeni kayıtla birlikte korunmalı");
  assert.equal(tekrarGecikmesi, 0, "Kalıcı engel gereksiz otomatik tekrar döngüsü başlatmamalı");

  const engelOncesiCagri = gonderimCagrisi;
  kuyrukContext.bulutKaydiniGonder = async () => { gonderimCagrisi += 1; return true; };
  await kuyrukContext.bulutKayitKuyrugunuCalistir();
  assert.equal(gonderimCagrisi, engelOncesiCagri, "Sayfa veya bağlantı olayı engellenen kaydı kendiliğinden yeniden göndermemeli");
  assert.equal(kuyrukContext.bekleyenBulutKaydi.kuyrukDurumu, "engelli", "Otomatik kontrol engellenen kaydı korumalı");

  tekrarGecikmesi = 0;
  await kuyrukContext.bulutKayitKuyrugunuCalistir({ zorla:true });
  assert.equal(kuyrukContext.bekleyenBulutKaydi, null, "Başarılı gönderimden sonra bekleyen kayıt temizlenmeli");
  assert.equal(tekrarGecikmesi, 0, "Başarılı gönderim yeni deneme planlamamalı");
  console.log("Kalıcı bulut kuyruğu ve güvenli yeniden deneme testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exitCode = 1;
});
