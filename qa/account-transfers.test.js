const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const appsScript = fs.readFileSync("google-apps-script/Code.gs", "utf8");

function fonksiyonuAl(kaynak, ad) {
  const baslangic = kaynak.indexOf(`function ${ad}(`);
  assert.notEqual(baslangic, -1, `${ad} bulunmalı`);
  const govdeBaslangici = kaynak.indexOf("{", baslangic);
  let derinlik = 0;
  let tek = false;
  let cift = false;
  let ters = false;
  let kacis = false;
  for (let i = govdeBaslangici; i < kaynak.length; i++) {
    const karakter = kaynak[i];
    if (kacis) { kacis = false; continue; }
    if (karakter === "\\") { kacis = true; continue; }
    if (!cift && !ters && karakter === "'") tek = !tek;
    else if (!tek && !ters && karakter === '"') cift = !cift;
    else if (!tek && !cift && karakter === "`") ters = !ters;
    if (tek || cift || ters) continue;
    if (karakter === "{") derinlik++;
    if (karakter === "}" && --derinlik === 0) return kaynak.slice(baslangic, i + 1);
  }
  throw new Error(`${ad} gövdesi okunamadı`);
}

const context = {
  console, Date, JSON, Math, Number, String, Array, Map, Set,
  finansHesaplariniYukle: () => [],
  cariHareketleriYukle: () => [],
  cekleriYukle: () => [],
  isletmeHareketleriniYukle: () => [],
  hesapTransferleriniYukle: () => []
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "tarihGecerliMi",
  "cariHareketTurunuNormallestir",
  "cariHareketAktifMi",
  "isletmeHareketTurunuNormallestir",
  "isletmeHareketiAktifMi",
  "hesapTransferiniNormallestir",
  "hesapTransferleriniNormallestir",
  "hesapTransferiAktifMi",
  "finansHesapTurunuNormallestir",
  "finansHesabiniNormallestir",
  "finansHesaplariniNormallestir",
  "finansHesapOzetleriniHesapla",
  "hesapHareketDokumuOlustur"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const hesaplar = [
  { id:"kasa-1", ad:"Merkez Kasa", tur:"kasa", acilisBakiyesi:1000, durum:"Aktif" },
  { id:"banka-1", ad:"Ana Banka", tur:"banka", bankaAdi:"Banka", acilisBakiyesi:5000, durum:"Aktif" }
];
const transferler = context.hesapTransferleriniNormallestir([
  { id:"tr-1", tarih:"2026-09-04", kaynakHesapId:"kasa-1", hedefHesapId:"banka-1", tutar:"250,50", referans:"TR-01", durum:"Aktif" },
  { id:"tr-2", tarih:"2026-09-03", kaynakHesapId:"banka-1", hedefHesapId:"kasa-1", tutar:100, durum:"İptal" },
  { id:"tr-gecersiz", tarih:"2026-09-03", kaynakHesapId:"kasa-1", hedefHesapId:"kasa-1", tutar:50 }
]);
assert.equal(transferler.length, 2, "Aynı kaynak ve hedef hesaba transfer kabul edilmemeli");
assert.equal(transferler[0].tutar, 250.5);

const ozetler = context.finansHesapOzetleriniHesapla(hesaplar, [], [], [], transferler);
const kasa = ozetler.find(hesap => hesap.id === "kasa-1");
const banka = ozetler.find(hesap => hesap.id === "banka-1");
assert.deepEqual({ giris:kasa.giris, cikis:kasa.cikis, bakiye:kasa.bakiye }, { giris:0, cikis:250.5, bakiye:749.5 });
assert.deepEqual({ giris:banka.giris, cikis:banka.cikis, bakiye:banka.bakiye }, { giris:250.5, cikis:0, bakiye:5250.5 });
assert.equal(kasa.bakiye + banka.bakiye, 6000, "İç transfer genel nakit toplamını değiştirmemeli");

const kasaDokumu = context.hesapHareketDokumuOlustur("kasa-1", hesaplar, [], [], [], transferler);
const bankaDokumu = context.hesapHareketDokumuOlustur("banka-1", hesaplar, [], [], [], transferler);
assert.equal(kasaDokumu.hareketler.length, 1, "İptal transfer hesap dökümüne katılmamalı");
assert.equal(kasaDokumu.hareketler[0].kaynak, "Transfer Çıkışı");
assert.equal(bankaDokumu.hareketler[0].kaynak, "Transfer Girişi");
assert.equal(kasaDokumu.toplamCikis, 250.5);
assert.equal(bankaDokumu.toplamGiris, 250.5);

assert.match(index, /id="hesap-transfer-overlay"/, "Transfer yönetim ekranı bulunmalı");
assert.match(index, /onclick="hesapTransferleriniAc\(\)"/, "Transfer merkezi kasa/banka ekranından açılabilmeli");
assert.match(index, /gelir veya gider toplamlarına dahil edilmez/, "İç transferin muhasebe etkisi kullanıcıya açıklanmalı");
assert.match(index, /HESAP_TRANSFER_ANAHTAR/, "Transferler tarayıcıda ayrı veri kümesinde saklanmalı");
assert.doesNotMatch(fonksiyonuAl(index, "aylikFinansOzetiniHesapla"), /hesapTransfer/, "Aylık faaliyet özeti iç transferi gelir/gider olarak almamalı");
assert.match(appsScript, /const ACCOUNT_TRANSFER_SHEET_NAME = "Hesap Transferleri"/);
assert.match(appsScript, /"Transfer ID",\s*"İşlem Tarihi",\s*"Kaynak Hesap ID",\s*"Hedef Hesap ID"/);
assert.match(appsScript, /hesapTransferleri: durum\.hesapTransferleri/, "Bulut okuması transferleri ön yüze döndürmeli");
assert.match(appsScript, /accountTransferSheet\.clearContents\(\)/, "Transfer sayfası kilit altında güncellenmeli");
assert.match(appsScript, /birbirinden farklı iki aktif kasa\/banka hesabı seçin/, "Sunucu transfer hesaplarını doğrulamalı");

console.log("account-transfers.test.js: tüm kontroller geçti");
