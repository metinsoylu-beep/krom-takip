const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");

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
  faturaYukle: () => [],
  cariHareketleriYukle: () => [],
  cekleriYukle: () => [],
  isletmeHareketleriniYukle: () => [],
  finansHesaplariniYukle: () => [],
  faturalariTekillestir: liste => ({ liste:Array.isArray(liste) ? liste : [] })
};
vm.createContext(context);
[
  "tutarSayiyaCevir",
  "tarihGecerliMi",
  "cariHareketTurunuNormallestir",
  "cariHareketAktifMi",
  "isletmeHareketTurunuNormallestir",
  "isletmeHareketiAktifMi",
  "finansHesapTurunuNormallestir",
  "finansHesabiniNormallestir",
  "finansHesaplariniNormallestir",
  "faturaTurunuNormallestir",
  "bugununTarihi",
  "aylikFinansOzetiniHesapla"
].forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

const hesaplar = [
  { id:"k1", ad:"Merkez Kasa", tur:"kasa", acilisBakiyesi:1000, durum:"Aktif" },
  { id:"b1", ad:"Ana Banka", tur:"banka", bankaAdi:"Banka", acilisBakiyesi:2000, durum:"Aktif" }
];
const hareketler = [
  { id:"h0", tarih:"2026-08-31", hesapId:"b1", islemTuru:"tahsilat", tutar:500, durum:"Aktif" },
  { id:"h1", tarih:"2026-09-02", hesapId:"b1", islemTuru:"tahsilat", tutar:300, durum:"Aktif" },
  { id:"h2", tarih:"2026-09-03", hesapId:"k1", islemTuru:"odeme", tutar:100, durum:"Aktif" },
  { id:"h3", tarih:"2026-09-04", hesapId:"k1", islemTuru:"odeme", tutar:999, durum:"İptal" },
  { id:"h4", tarih:"2026-10-01", hesapId:"b1", islemTuru:"tahsilat", tutar:999, durum:"Aktif" }
];
const cekler = [
  { id:"c1", odemeTarihi:"2026-09-05", hesapId:"b1", durum:"Ödendi", tutar:200 },
  { id:"c2", odemeTarihi:"2026-09-05", hesapId:"b1", durum:"Verildi", tutar:999 },
  { id:"c3", odemeTarihi:"2026-10-01", hesapId:"b1", durum:"Ödendi", tutar:999 }
];
const fisler = [
  { id:"f0", tarih:"2026-08-30", hesapId:"k1", tur:"gider", kategori:"Kira", tutar:50, durum:"Aktif" },
  { id:"f1", tarih:"2026-09-06", hesapId:"b1", tur:"gelir", kategori:"Faiz Geliri", tutar:250.5, durum:"Aktif" },
  { id:"f2", tarih:"2026-09-07", hesapId:"k1", tur:"gider", kategori:"Kira", tutar:75, durum:"Aktif" },
  { id:"f3", tarih:"2026-09-08", hesapId:"k1", tur:"gider", kategori:"Vergi", tutar:999, durum:"İptal" }
];
const faturalar = [
  { id:1, no:"S-1", cari:"Müşteri", tarih:"2026-09-01", faturaTuru:"satis", tutar:1000, vadeGun:30 },
  { id:2, no:"A-1", cari:"Tedarikçi", tarih:"2026-09-10", faturaTuru:"alis", tutar:400, vadeGun:30 },
  { id:3, no:"S-0", cari:"Müşteri", tarih:"2026-08-31", faturaTuru:"satis", tutar:999, vadeGun:30 },
  { id:4, no:"A-2", cari:"Tedarikçi", tarih:"2026-10-01", faturaTuru:"alis", tutar:999, vadeGun:30 }
];

const rapor = context.aylikFinansOzetiniHesapla("2026-09", faturalar, hareketler, cekler, fisler, hesaplar);
assert.equal(rapor.baslangic, "2026-09-01");
assert.equal(rapor.bitis, "2026-09-30");
assert.deepEqual(
  { ...rapor.nakit },
  { acilis:3450, giris:550.5, cikis:375, net:175.5, kapanis:3625.5 },
  "Dönem başı bakiye ile ay içindeki gerçek nakit hareketleri doğru ayrılmalı"
);
assert.deepEqual(
  { ...rapor.faaliyet },
  { gelir:1250.5, gider:475, sonuc:775.5 },
  "Faaliyet sonucu faturalar ve fişlerden oluşmalı; ödeme ve tahsilatlar sonucu değiştirmemeli"
);
assert.ok(rapor.kalemler.some(kalem=>kalem.grup === "Nakit" && kalem.kategori === "Ödenmiş Çek" && kalem.tutar === 200));
assert.ok(rapor.kalemler.some(kalem=>kalem.grup === "Faaliyet" && kalem.kategori === "Satış Faturaları" && kalem.tutar === 1000));
assert.ok(!rapor.kalemler.some(kalem=>kalem.grup === "Faaliyet" && kalem.kategori === "Cari Tahsilat"), "Tahsilat faaliyet geliri sayılmamalı");

const subat = context.aylikFinansOzetiniHesapla("2028-02", [], [], [], [], hesaplar);
assert.equal(subat.bitis, "2028-02-29", "Artık yılda ayın gerçek son günü kullanılmalı");

const kategoriAlanlari = {
  "gelir-gider-kategorileri":{ innerHTML:"" },
  "gelir-gider-kategori":{ placeholder:"" },
  "gelir-gider-tur":{ value:"gider" }
};
context.document = { getElementById:id => kategoriAlanlari[id] || null };
context.isletmeHareketleriniYukle = () => [
  { tur:"gider", kategori:"Yakıt" },
  { tur:"gider", kategori:"Kira" },
  { tur:"gelir", kategori:"Danışmanlık" }
];
context.htmlGuvenli = deger => String(deger ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
vm.runInContext(fonksiyonuAl(index, "gelirGiderKategoriSecenekleriniGuncelle"), context);
const giderKategorileri = context.gelirGiderKategoriSecenekleriniGuncelle();
assert.ok(giderKategorileri.includes("Yakıt"), "Kullanıcının önceki gider kategorisi hatırlanmalı");
assert.ok(!giderKategorileri.includes("Danışmanlık"), "Gelir kategorisi gider önerilerine karışmamalı");
kategoriAlanlari["gelir-gider-tur"].value = "gelir";
const gelirKategorileri = context.gelirGiderKategoriSecenekleriniGuncelle();
assert.ok(gelirKategorileri.includes("Danışmanlık"), "Kullanıcının önceki gelir kategorisi hatırlanmalı");
assert.ok(!gelirKategorileri.includes("Yakıt"), "Gider kategorisi gelir önerilerine karışmamalı");

assert.match(index, /id="aylik-ozet-overlay"/, "Aylık finans özeti penceresi bulunmalı");
assert.match(index, /onclick="aylikFinansOzetiniAc\(\)"/, "Aylık özet ana ekrandan açılabilmeli");
assert.match(index, /Nakit sonucu ile faaliyet sonucu farklı olabilir/, "Muhasebe ayrımı kullanıcıya açıklanmalı");
assert.match(index, /onchange="gelirGiderKategoriSecenekleriniGuncelle\(\)"/, "Fiş türüne göre kategori önerileri yenilenmeli");
assert.match(index, /isletmeHareketleriniYukle\(\).*\.filter\(hareket=>hareket\.tur === tur\)/s, "Daha önce kullanılan kategoriler hatırlanmalı");

console.log("monthly-finance-summary.test.js: tüm kontroller geçti");
