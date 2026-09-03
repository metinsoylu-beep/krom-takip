const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");

assert.match(index, /id="bulut-kurtarma-durumu"/, "Bulut yedeklerinde kurtarma durumu gösterilmeli");
assert.match(index, /function onerilenBulutYedeginiSec\(liste\)/, "En yeni sağlam yedek otomatik seçilmeli");
assert.match(index, /Kurtarma noktası eski/, "Yedi günden eski yedekler açıkça uyarılmalı");
assert.match(index, /ÖNERİLEN NOKTA/, "Önerilen geri yükleme noktası listede işaretlenmeli");
assert.match(index, /class="bulut-yedegi-satir \$\{onerilen \? "onerilen" : ""\}"/, "Önerilen yedek görsel olarak ayrılmalı");

const baslangic = index.indexOf("function bulutYedegiYasBilgisi");
const bitis = index.indexOf("function bulutKurtarmaDurumunuGoster", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Kurtarma uygunluk işlevleri test için bulunmalı");

const context = {};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const simdi = new Date("2026-09-03T12:00:00.000Z");
assert.equal(context.bulutYedegiYasBilgisi({ kayitZamani:"2026-09-03T11:30:00.000Z" }, simdi).seviye, "guncel", "Son 24 saatteki yedek güncel olmalı");
assert.equal(context.bulutYedegiYasBilgisi({ kayitZamani:"2026-08-30T12:00:00.000Z" }, simdi).seviye, "yakin", "Son yedi gündeki yedek yakın olmalı");
assert.equal(context.bulutYedegiYasBilgisi({ kayitZamani:"2026-08-20T12:00:00.000Z" }, simdi).seviye, "eski", "Yedi günden eski yedek uyarılmalı");

const onerilen = context.onerilenBulutYedeginiSec([
  { id:"bozuk-yeni", kayitZamani:"2026-09-03T11:50:00.000Z", saglam:false },
  { id:"saglam-eski", kayitZamani:"2026-09-01T10:00:00.000Z", saglam:true },
  { id:"saglam-yeni", kayitZamani:"2026-09-03T10:00:00.000Z", saglam:true }
]);
assert.equal(onerilen.id, "saglam-yeni", "Bozuk yedek atlanıp en yeni sağlam yedek önerilmeli");

console.log("Yedek kurtarma uygunluğu ve önerilen nokta testleri başarılı.");
