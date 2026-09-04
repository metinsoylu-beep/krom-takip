const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function faturaYukle()");
const bitis = index.indexOf("function vadeTarihi", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Yedekleme işlevleri bulunamadı");

const depo = new Map();
const dugme = { hidden: true, title: "" };
let bulutaGonderilen = null;
const context = {
  console,
  Date,
  JSON,
  ANAHTAR: "faturalar",
  CARI_HAREKET_ANAHTAR: "hareketler",
  CEK_ANAHTAR: "cekler",
  CARI_KART_ANAHTAR: "cariler",
  FINANS_HESAP_ANAHTAR: "hesaplar",
  ISLETME_HAREKET_ANAHTAR: "fisler",
  HESAP_TRANSFER_ANAHTAR: "transferler",
  URUN_KART_ANAHTAR: "urunler",
  STOK_HAREKET_ANAHTAR: "stoklar",
  YEDEK_ANAHTAR: "yedekler",
  YEDEK_SINIR: 10,
  kullaniciRolu: "admin",
  localStorage: {
    getItem: anahtar => depo.has(anahtar) ? depo.get(anahtar) : null,
    setItem: (anahtar, deger) => depo.set(anahtar, String(deger)),
    removeItem: anahtar => depo.delete(anahtar)
  },
  document: { getElementById: id => id === "son-islem-geri-al" ? dugme : null },
  faturalariTekillestir: liste => ({ liste: Array.isArray(liste) ? liste : [], kaldirilan: 0 }),
  eskiFaturaOdemeleriniAktar() {},
  cariHareketleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cekleriNormallestir: liste => Array.isArray(liste) ? liste : [],
  cariKartlariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  finansHesaplariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  isletmeHareketleriniNormallestir: liste => Array.isArray(liste) ? liste : [],
  hesapTransferleriniNormallestir: liste => Array.isArray(liste) ? liste : [],
  urunKartlariniNormallestir: liste => Array.isArray(liste) ? liste : [],
  stokHareketleriniNormallestir: liste => Array.isArray(liste) ? liste : [],
  cariHareketleriYukle: () => JSON.parse(depo.get("hareketler") || "[]"),
  cekleriYukle: () => JSON.parse(depo.get("cekler") || "[]"),
  cariKartlariniYukle: () => JSON.parse(depo.get("cariler") || "[]"),
  finansHesaplariniYukle: () => JSON.parse(depo.get("hesaplar") || "[]"),
  isletmeHareketleriniYukle: () => JSON.parse(depo.get("fisler") || "[]"),
  hesapTransferleriniYukle: () => JSON.parse(depo.get("transferler") || "[]"),
  urunKartlariniYukle: () => JSON.parse(depo.get("urunler") || "[]"),
  stokHareketleriniYukle: () => JSON.parse(depo.get("stoklar") || "[]"),
  finansHesabiSecenekleriniGuncelle() {},
  gelirGiderHesapSecenekleriniGuncelle() {},
  finansHesaplariniGoster() {},
  gelirGiderHareketleriniGoster() {},
  hesapTransferleriniGoster() {},
  hesapHareketDokumunuGoster() {},
  urunStokMerkeziniGoster() {},
  cariSecenekleriniGuncelle() {},
  uygulamaDurumuOlustur: liste => ({
    items:Array.isArray(liste) ? liste : [],
    cariHareketler:JSON.parse(depo.get("hareketler") || "[]"),
    cekler:JSON.parse(depo.get("cekler") || "[]"),
    cariler:JSON.parse(depo.get("cariler") || "[]"),
    hesaplar:JSON.parse(depo.get("hesaplar") || "[]"),
    isletmeHareketler:JSON.parse(depo.get("fisler") || "[]"),
    hesapTransferleri:JSON.parse(depo.get("transferler") || "[]"),
    urunler:JSON.parse(depo.get("urunler") || "[]"),
    stokHareketler:JSON.parse(depo.get("stoklar") || "[]")
  }),
  listeSurumImzasi: durum => JSON.stringify(durum),
  buludaKaydet: liste => { bulutaGonderilen = liste; },
  listeyiGoster() {},
  rozetGuncelle() {},
  ozetGuncelle() {},
  syncGoster() {}
};

vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const ilkListe = [{ id: 1, no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: "100", odendi: false }];
depo.set("faturalar", JSON.stringify(ilkListe));
depo.set("hareketler", JSON.stringify([{ id:"h-1", cari:"Firma A", tarih:"2026-09-01", tutar:40 }]));
depo.set("cekler", JSON.stringify([{ id:"c-1", cari:"Firma A", tarih:"2026-09-01", vadeTarihi:"2026-10-01", tutar:20, durum:"Verildi" }]));
depo.set("cariler", JSON.stringify([{ id:"cari-1", cari:"Firma A", acilisBorc:10, acilisAlacak:0 }]));
depo.set("hesaplar", JSON.stringify([{ id:"hesap-1", ad:"Merkez Kasa", tur:"kasa", acilisBakiyesi:500 }]));
depo.set("fisler", JSON.stringify([{ id:"fis-1", tarih:"2026-09-01", tur:"gider", hesapId:"hesap-1", kategori:"Kira", tutar:50 }]));

const yeniListe = [...ilkListe, { id: 2, no: "F-2", tarih: "2026-09-02", vadeGun: 30, tutar: "200", odendi: false }];
context.faturaKaydet(yeniListe, "Fatura eklendi");

let yedekler = JSON.parse(depo.get("yedekler"));
assert.equal(yedekler.length, 1, "Değişiklikten önce bir yedek oluşmalı");
assert.deepEqual(yedekler[0].liste, ilkListe, "Yedek eski listeyi içermeli");
assert.equal(yedekler[0].durum.cariHareketler.length, 1, "Cari hareketler aynı güvenlik yedeğinde tutulmalı");
assert.equal(yedekler[0].durum.cekler.length, 1, "Çekler aynı güvenlik yedeğinde tutulmalı");
assert.equal(yedekler[0].durum.cariler.length, 1, "Cari kartlar aynı güvenlik yedeğinde tutulmalı");
assert.equal(yedekler[0].durum.hesaplar.length, 1, "Kasa/banka hesapları aynı güvenlik yedeğinde tutulmalı");
assert.equal(yedekler[0].durum.isletmeHareketler.length, 1, "Gelir/gider fişleri aynı güvenlik yedeğinde tutulmalı");
assert.equal(dugme.hidden, false, "Geri alma düğmesi görünür olmalı");

context.sonIslemiGeriAl();
assert.deepEqual(JSON.parse(depo.get("faturalar")), ilkListe, "Geri alma eski listeyi yüklemeli");
assert.deepEqual(bulutaGonderilen, ilkListe, "Geri alınan liste buluta gönderilmeli");
assert.equal(depo.has("yedekler"), false, "Kullanılan yedek kuyruktan çıkarılmalı");

for (let i = 0; i < 12; i++) {
  context.otomatikYedekOlustur([{ id: i, no: `F-${i}` }], `İşlem ${i}`);
}
yedekler = JSON.parse(depo.get("yedekler"));
assert.equal(yedekler.length, 10, "En fazla 10 otomatik yedek tutulmalı");

console.log("Otomatik yerel yedekleme ve geri alma testleri başarılı.");
