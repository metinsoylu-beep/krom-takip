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
  cariHareketleriYukle: () => JSON.parse(depo.get("hareketler") || "[]"),
  cekleriYukle: () => JSON.parse(depo.get("cekler") || "[]"),
  uygulamaDurumuOlustur: liste => ({
    items:Array.isArray(liste) ? liste : [],
    cariHareketler:JSON.parse(depo.get("hareketler") || "[]"),
    cekler:JSON.parse(depo.get("cekler") || "[]")
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

const yeniListe = [...ilkListe, { id: 2, no: "F-2", tarih: "2026-09-02", vadeGun: 30, tutar: "200", odendi: false }];
context.faturaKaydet(yeniListe, "Fatura eklendi");

let yedekler = JSON.parse(depo.get("yedekler"));
assert.equal(yedekler.length, 1, "Değişiklikten önce bir yedek oluşmalı");
assert.deepEqual(yedekler[0].liste, ilkListe, "Yedek eski listeyi içermeli");
assert.equal(yedekler[0].durum.cariHareketler.length, 1, "Cari hareketler aynı güvenlik yedeğinde tutulmalı");
assert.equal(yedekler[0].durum.cekler.length, 1, "Çekler aynı güvenlik yedeğinde tutulmalı");
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
