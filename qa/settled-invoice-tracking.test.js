const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = index.indexOf("function secilenGecmisOdemeleriDuzelt");
const bitis = index.indexOf("function csvHucre", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Geçmiş ödeme düzeltme işlevi bulunamadı");

const depo = new Map();
let bulutListe = null;
let yedekAlindi = false;
const faturalar = [{
  id: 7,
  cari: "Örnek Metal",
  no: "F-7",
  tarih: "2026-01-01",
  vadeGun: 30,
  tutar: "1250",
  takipKapali: true
}];
const context = {
  console, Date, String, Set, JSON,
  ANAHTAR: "faturalar",
  CARI_HAREKET_ANAHTAR: "hareketler",
  seciliFaturaKimlikleri: new Set(["7"]),
  yoneticiGerekli: () => true,
  faturaYukle: () => faturalar,
  seciliFaturalariGetir: (liste, secimler) => liste.filter(inv => secimler.has(String(inv.id))),
  faturaTakibiKapali: inv => inv.takipKapali === true,
  vadeTarihi: () => new Date(2026, 0, 31),
  kalanGun: () => -10,
  tutarSayiyaCevir: Number,
  formatPara: deger => `${deger} ₺`,
  confirm: () => true,
  bugununTarihi: () => "2026-09-02",
  cariHareketleriYukle: () => [],
  cariHareketiniNormallestir: hareket => hareket,
  cariHareketleriNormallestir: hareketler => hareketler,
  faturalariTekillestir: liste => ({ liste }),
  otomatikYedekOlustur: () => { yedekAlindi = true; },
  localStorage: { setItem: (anahtar, deger) => depo.set(anahtar, deger) },
  buludaKaydet: liste => { bulutListe = liste; },
  listeyiGoster() {}, rozetGuncelle() {}, ozetGuncelle() {}, cariHesaplariniGoster() {}, syncGoster() {}
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);
context.secilenGecmisOdemeleriDuzelt();

const kayitliFaturalar = JSON.parse(depo.get("faturalar"));
const kayitliHareketler = JSON.parse(depo.get("hareketler"));
assert.equal(yedekAlindi, true, "Düzeltmeden önce otomatik yedek alınmalı");
assert.equal(kayitliFaturalar[0].takipKapali, true, "Ödenmiş geçmiş faturanın vade takibi kapanmalı");
assert.equal(kayitliFaturalar[0].kapanisTarihi, "2026-09-02");
assert.deepEqual(
  { id:kayitliHareketler[0].id, tutar:kayitliHareketler[0].tutar, kaynakFaturaId:kayitliHareketler[0].kaynakFaturaId, gecisKaydi:kayitliHareketler[0].gecisKaydi },
  { id:"gecmis-odeme-7", tutar:1250, kaynakFaturaId:7, gecisKaydi:true },
  "Geçmiş ödeme bir kez ve izlenebilir kaynak kimliğiyle cari hesaba yazılmalı"
);
assert.equal(bulutListe[0].takipKapali, true, "Kapalı takip durumu buluta gönderilmeli");
assert.equal(kayitliHareketler.length, 1, "Takibi önceden kapalı eski fatura da cari harekete bir kez aktarılmalı");

assert.match(index, /filtre==='geciken'\) return !takipKapali && gun<0/, "Kapalı fatura geciken filtresine girmemeli");
assert.match(index, /durumBilgi\(g, takipKapali\)/, "Tablo kapalı takip durumunu göstermeli");
assert.match(code, /"Takip Durumu",\s*"Kapanış Tarihi"/, "Takip durumu Google Sheets'te kalıcı olmalı");
assert.match(code, /"Geçiş Kaydı"/, "Geçmiş düzeltmeler aylık ödeme istatistiğinden ayrılmalı");
assert.match(code, /durumHesapla\(item\.tarih, item\.vadeGun, item\.takipKapali\)/, "Apps Script kapalı faturayı gecikmiş göstermemeli");

console.log("Ödenmiş fatura vade takibi ve geçmiş ödeme düzeltme testleri başarılı.");
