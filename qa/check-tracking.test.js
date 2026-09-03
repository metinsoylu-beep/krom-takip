const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function cekTakipDurumBilgisi");
const bitis = index.indexOf("function cekTakibiniAc", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Çek takip hesaplama işlevleri bulunamadı");

function tarihOlusturYerel(tarih) {
  const [yil, ay, gun] = String(tarih || "").split("T")[0].split("-").map(Number);
  return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
}

function bugununTarihi(referans) {
  return [
    referans.getFullYear(),
    String(referans.getMonth() + 1).padStart(2, "0"),
    String(referans.getDate()).padStart(2, "0")
  ].join("-");
}

const context = {
  console,
  Date,
  String,
  Array,
  Math,
  tarihOlusturYerel,
  bugununTarihi,
  csvHucre: deger => {
    let metin = String(deger ?? "");
    if (/^[=+\-@]/.test(metin)) metin = "'" + metin;
    return `"${metin.replace(/"/g, '""')}"`;
  },
  tutarSayiyaCevir: Number,
  cekleriYukle: () => []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const referans = new Date(2026, 8, 3, 12, 0, 0, 0);
const cekler = [
  { id:"1", cari:"Krom Mutfak", cekNo:"C-001", banka:"A Bank", vadeTarihi:"2026-09-01", tutar:100, durum:"Verildi" },
  { id:"2", cari:"Kütahya Askeriye", cekNo:"C-002", banka:"B Bank", vadeTarihi:"2026-09-03", tutar:200, durum:"Verildi" },
  { id:"3", cari:"Ortaklar", cekNo:"C-003", banka:"C Bank", vadeTarihi:"2026-09-20", tutar:300, durum:"Verildi" },
  { id:"4", cari:"TPAO", cekNo:"C-004", banka:"D Bank", vadeTarihi:"2026-09-02", tutar:400, durum:"Ödendi" },
  { id:"5", cari:"İptal Firma", cekNo:"C-005", banka:"E Bank", vadeTarihi:"2026-09-05", tutar:500, durum:"İptal" },
  { id:"6", cari:"Ekim Firma", cekNo:"C-006", banka:"F Bank", vadeTarihi:"2026-10-01", tutar:600, durum:"Verildi" }
];

assert.deepEqual(
  JSON.parse(JSON.stringify(context.cekTakipDurumBilgisi(cekler[0], referans))),
  { sinif:"gecikmis", etiket:"Vadesi 2 gün geçti", gun:-2 },
  "Geçmiş vade doğru belirtilmeli"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.cekTakipDurumBilgisi(cekler[1], referans))),
  { sinif:"bekliyor", etiket:"Vade bugün", gun:0 },
  "Bugünün vadesi ayrı gösterilmeli"
);

const ozet = context.cekTakipOzetiniHesapla(cekler, referans);
assert.deepEqual(JSON.parse(JSON.stringify(ozet.bekleyen)), { sayi:4, tutar:1200 }, "Yalnız aktif bekleyen çekler toplanmalı");
assert.deepEqual(JSON.parse(JSON.stringify(ozet.gecikmis)), { sayi:1, tutar:100 }, "Vadesi geçen aktif çekler doğru hesaplanmalı");
assert.deepEqual(JSON.parse(JSON.stringify(ozet.buAy)), { sayi:3, tutar:600 }, "Ayın gerçek başlangıç ve bitişi kullanılmalı");

assert.equal(context.cekTakipFiltresineUyar(cekler[0], "krom", "gecikmis", referans), true);
assert.equal(context.cekTakipFiltresineUyar(cekler[3], "", "bekleyen", referans), false);
assert.equal(context.cekTakipFiltresineUyar(cekler[4], "iptal", "iptal", referans), true);

assert.deepEqual(
  JSON.parse(JSON.stringify(context.cekTakipListesiniHazirla(cekler, "", "tumu", referans).map(cek => cek.id))),
  ["1","2","3","6","4","5"],
  "Çekler önce vade durumu, sonra yaklaşan vade tarihine göre sıralanmalı"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.cekTakipListesiniHazirla(cekler, "bank", "bekleyen", referans).map(cek => cek.id))),
  ["1","2","3","6"],
  "CSV ve tablo aynı arama/durum filtrelerini kullanmalı"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.cekVadeUyariListesi([
    ...cekler,
    { id:"7", cari:"Sınır Dahil", vadeTarihi:"2026-09-10", tutar:50, durum:"Verildi" },
    { id:"8", cari:"Sınır Dışı", vadeTarihi:"2026-09-11", tutar:50, durum:"Verildi" }
  ], referans).map(cek => cek.id))),
  ["1","2","7"],
  "Uyarı yalnız geciken ve yedi gün içinde vadeli aktif çekleri göstermeli"
);

const csv = context.cekTakipCsvIcerigiOlustur([
  { ...cekler[0], referans:"=HYPERLINK(\"risk\")", aciklama:"Kontrol" }
], referans);
assert.ok(csv.startsWith("\uFEFF"), "CSV Excel uyumluluğu için BOM ile başlamalı");
assert.match(csv, /"Cari\/Firma";"Çek No";"Banka"/, "CSV başlıkları bulunmalı");
assert.match(csv, /"Vadesi 2 gün geçti"/, "CSV vade durumunu içermeli");
assert.match(csv, /"'=HYPERLINK\(""risk""\)"/, "CSV formül enjeksiyonunu engellemeli");
assert.match(csv, /"Kayıt Durumu";"Ödeme Tarihi";"Vade Durumu"/, "CSV çek ödeme tarihini içermeli");

assert.match(index, /id="cek-takip-overlay"/, "Çek Takip Merkezi penceresi bulunmalı");
assert.match(index, /onclick="cekTakibiniAc\(\)"/, "Bekleyen çek kartı takip merkezini açmalı");
assert.match(index, /yoneticiMi\(\)[\s\S]*cek-takip-durum-sec/, "Durum değiştirme alanı yalnız yöneticiye sunulmalı");
assert.match(index, /cariHareketIptaliniGeriAl\('cek'/, "İptal edilmiş çek geri alınabilmeli");
assert.match(index, /class="cek-takip-csv yalnizca-yonetici"[\s\S]*onclick="cekTakipCsvIndir\(\)"/, "CSV indirme yalnız yöneticiye sunulmalı");
assert.match(index, /class="cek-takip-yeni yalnizca-yonetici"[\s\S]*onclick="cekTakibindenYeniCek\(\)"/, "Yeni çek düğmesi yalnız yöneticiye sunulmalı");
assert.match(index, /function cekTakibindenYeniCek\(\)[\s\S]*odemeYonetiminiAc\("", "cek"\)/, "Takip merkezinden açılan form çek türüyle başlamalı");
assert.match(index, /function odemeYonetiminiAc\(cari="", varsayilanTur="odeme"\)/, "Genel ödeme düğmesinin varsayılan davranışı korunmalı");
assert.match(index, /function cekOdemeTarihiAlaniniGuncelle\(/, "Çek ödeme tarihi alanı duruma göre yönetilmeli");
assert.match(index, /Ödeme tarihi .* olarak kaydedilecektir/, "Hızlı durum değişikliğinde ödeme tarihi kullanıcıya açıklanmalı");
assert.match(index, /onclick="odemeKapat\(\);cekTakibiniAc\(\)"/, "Vade uyarısından Çek Takip Merkezi açılabilmeli");

console.log("Çek Takip Merkezi hesaplama ve arayüz testleri başarılı.");
