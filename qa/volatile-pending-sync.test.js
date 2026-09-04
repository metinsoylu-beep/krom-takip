const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");

const cikisBaslangici = index.indexOf("function bekleyenBulutKaydiCikisUyarisi");
const cikisBitisi = index.indexOf('window.addEventListener("online"', cikisBaslangici);
assert.ok(cikisBaslangici >= 0 && cikisBitisi > cikisBaslangici, "Kalıcı olmayan kayıt için çıkış koruması bulunmalı");

let cikisDinleyicisi = null;
const cikisContext = {
  bekleyenBulutKaydi:null,
  bekleyenBulutKaydiKalici:true,
  window:{ addEventListener:(tur,islem) => { if (tur === "beforeunload") cikisDinleyicisi = islem; } }
};
vm.createContext(cikisContext);
vm.runInContext(index.slice(cikisBaslangici, cikisBitisi), cikisContext);
assert.equal(typeof cikisDinleyicisi, "function", "Sekme kapatma koruması tarayıcıya bağlanmalı");

function cikisOlayi() {
  return { engellendi:false, returnValue:null, preventDefault() { this.engellendi = true; } };
}

let olay = cikisOlayi();
cikisDinleyicisi(olay);
assert.equal(olay.engellendi, false, "Bekleyen kayıt yokken çıkış engellenmemeli");

cikisContext.bekleyenBulutKaydi = { id:"kuyruk-1", durum:{ items:[] } };
olay = cikisOlayi();
cikisDinleyicisi(olay);
assert.equal(olay.engellendi, false, "Kalıcı depoda korunan kayıt normal çıkışı engellememeli");

cikisContext.bekleyenBulutKaydiKalici = false;
olay = cikisOlayi();
cikisDinleyicisi(olay);
assert.equal(olay.engellendi, true, "Yalnız bellekteki kayıt varken sekme kapatma uyarısı istenmeli");
assert.equal(olay.returnValue, "", "Tarayıcının standart veri kaybı onayı etkinleştirilmeli");

const saklamaBaslangici = index.indexOf("function bekleyenBulutKaydiniSakla");
const saklamaBitisi = index.indexOf("function bekleyenBulutKaydiniEngelle", saklamaBaslangici);
assert.ok(saklamaBaslangici >= 0 && saklamaBitisi > saklamaBaslangici, "Bekleyen kayıt saklama işlevi bulunmalı");

let yazmaBasarisiz = false;
let kontrolYenileme = 0;
const kayit = { id:"kuyruk-1", durum:{ items:[] } };
const saklamaContext = {
  JSON,
  bekleyenBulutKaydi:kayit,
  bekleyenBulutKaydiKalici:true,
  bekleyenBulutKaydiniDogrula:ham => ham,
  bekleyenBulutKontrolunuGuncelle:() => { kontrolYenileme += 1; },
  BULUT_BEKLEYEN_ANAHTAR:"bekleyen",
  localStorage:{ setItem() { if (yazmaBasarisiz) throw new Error("Kota dolu"); } }
};
vm.createContext(saklamaContext);
vm.runInContext(index.slice(saklamaBaslangici, saklamaBitisi), saklamaContext);

assert.equal(saklamaContext.bekleyenBulutKaydiniSakla(kayit), true, "Başarılı tarayıcı yazımı kalıcı kabul edilmeli");
assert.equal(saklamaContext.bekleyenBulutKaydiKalici, true);
yazmaBasarisiz = true;
assert.equal(saklamaContext.bekleyenBulutKaydiniSakla(kayit), false, "Başarısız tarayıcı yazımı çağırana bildirilmeli");
assert.equal(saklamaContext.bekleyenBulutKaydiKalici, false, "Yazılamayan kayıt yalnız bellek riski olarak işaretlenmeli");
assert.equal(kontrolYenileme, 2, "Saklama sonucu Veri Kontrol Merkezi'ne hemen yansıtılmalı");

assert.match(index, /yalnızca bu açık sayfada tutuluyor/, "Kullanıcıya kalıcı olmayan kaydın riski açıklanmalı");
assert.match(index, /bellek-riski/, "Kalıcı olmayan kayıt belirgin bir görsel durum kullanmalı");

console.log("Kalıcı olmayan bekleyen kayıt ve güvenli çıkış testleri başarılı.");
