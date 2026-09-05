const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");

function fonksiyonuAl(kaynak, ad) {
  const baslangic = kaynak.indexOf(`function ${ad}(`);
  assert.notEqual(baslangic, -1, `${ad} bulunmalı`);
  const govdeBaslangici = kaynak.indexOf("{", baslangic);
  let derinlik = 0, tek = false, cift = false, ters = false, kacis = false;
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

assert.match(index, /data-modul="vade-analizi"/, "Vade analizi sol menüde bulunmalı");
assert.match(index, /id="vade-analiz-overlay"/, "Vade analizi penceresi bulunmalı");
assert.match(index, /id="vade-analiz-tarih" type="date"/, "Analiz için değiştirilebilir referans tarihi bulunmalı");
assert.match(index, /onclick="vadeAnaliziCsvIndir\(\)"/, "Vade analizi CSV olarak indirilebilmeli");
assert.match(index, /Cari ödeme ve tahsilatlar faturalara otomatik dağıtılmaz/, "Otomatik mahsuplaşma yapılmadığı kullanıcıya açıklanmalı");

const context = {
  console, Date, Math, Number, String, Array, Map, Set,
  tarihGecerliMi(deger) { return /^\d{4}-\d{2}-\d{2}$/.test(String(deger || "").split("T")[0]); },
  tarihOlusturYerel(deger) {
    const [yil, ay, gun] = String(deger || "").split("T")[0].split("-").map(Number);
    return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
  },
  bugununTarihi(deger = new Date()) {
    const tarih = new Date(deger);
    return `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, "0")}-${String(tarih.getDate()).padStart(2, "0")}`;
  },
  vadeTarihi(tarih, vadeGun) {
    const [yil, ay, gun] = String(tarih || "").split("T")[0].split("-").map(Number);
    const sonuc = new Date(yil, ay - 1, gun, 12, 0, 0, 0);
    sonuc.setDate(sonuc.getDate() + (parseInt(vadeGun, 10) || 90));
    return sonuc;
  },
  tutarSayiyaCevir(deger) { return Number(deger) || 0; },
  faturaTakibiKapali(fatura) { return fatura?.takipKapali === true; },
  faturaTurunuNormallestir(deger) { return String(deger || "").toLocaleLowerCase("tr-TR").includes("sat") ? "satis" : "alis"; },
  faturalariTekillestir(liste) { return { liste }; },
  faturaYukle() { return []; }
};
vm.createContext(context);
["vadeAnaliziniHesapla", "vadeAnaliziSatirlariniFiltrele"]
  .forEach(ad => vm.runInContext(fonksiyonuAl(index, ad), context));

function fatura(id, cari, tur, faturaTarihi, tutar, ek = {}) {
  return { id, no:`F-${id}`, cari, faturaTuru:tur, tarih:faturaTarihi, vadeGun:1, tutar, ...ek };
}

const faturalar = [
  fatura("1", "Alfa Metal", "alis", "2026-08-31", 100),   // 1 Eylül: gecikmiş borç
  fatura("2", "Beta Yapı", "satis", "2026-09-03", 200),  // 4 Eylül: gecikmiş alacak
  fatura("3", "Ceylan Gıda", "alis", "2026-09-04", 300), // bugün
  fatura("4", "Delta Tekstil", "satis", "2026-09-11", 400),
  fatura("5", "Eksen Makina", "alis", "2026-09-12", 500),
  fatura("6", "Fora Kimya", "satis", "2026-10-04", 600),
  fatura("7", "Güneş Metal", "alis", "2026-10-05", 700),
  fatura("8", "Hazar Lojistik", "satis", "2026-11-03", 800),
  fatura("9", "İnci Yapı", "alis", "2026-11-04", 900),
  fatura("10", "Kuzey Cam", "satis", "2027-01-01", 1000),
  fatura("kapali", "Kapalı Cari", "alis", "2026-09-04", 999, { takipKapali:true }),
  fatura("gecersiz", "Hatalı Cari", "alis", "bozuk-tarih", 999)
];

const rapor = context.vadeAnaliziniHesapla("2026-09-05", faturalar);

assert.equal(rapor.referans, "2026-09-05", "Referans tarihi korunmalı");
assert.equal(rapor.satirlar.length, 10, "Yalnızca geçerli ve takibi açık faturalar analiz edilmeli");
assert.equal(rapor.toplamBorc, 2500, "Alış faturaları açık borç toplamında yer almalı");
assert.equal(rapor.toplamAlacak, 3000, "Satış faturaları açık alacak toplamında yer almalı");
assert.equal(rapor.gecikenBorc, 100, "Gecikmiş borç ayrı hesaplanmalı");
assert.equal(rapor.gecikenAlacak, 200, "Gecikmiş alacak ayrı hesaplanmalı");
assert.deepEqual(Array.from(rapor.dilimler, dilim => dilim.toplamSayisi), [2, 2, 2, 2, 2], "Vade sınırları tüm dilimlerde kapsayıcı ve çakışmasız olmalı");
assert.equal(rapor.satirlar[0].id, "1", "Gecikmiş faturalar en eski vadeden başlamalı");
assert.equal(rapor.satirlar[1].id, "2", "Aynı dilimde daha yakın vade sonra gelmeli");

const alacaklar = context.vadeAnaliziSatirlariniFiltrele(rapor, "", "alacak", "tumu");
assert.equal(alacaklar.length, 5, "Borç/alacak yön filtresi çalışmalı");
assert.ok(alacaklar.every(satir => satir.yon === "alacak"), "Alacak filtresi alış faturalarını içermemeli");
assert.deepEqual(Array.from(context.vadeAnaliziSatirlariniFiltrele(rapor, "", "tumu", "sekiz30"), satir => satir.id), ["5", "6"], "8–30 günlük dilim sınırları doğru çalışmalı");
assert.deepEqual(Array.from(context.vadeAnaliziSatirlariniFiltrele(rapor, "güneş", "borc", "otuzbir60"), satir => satir.id), ["7"], "Arama, yön ve vade dilimi birlikte çalışmalı");

console.log("due-aging-report.test.js: borç/alacak vade analizi kontrolleri geçti");
