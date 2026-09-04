const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("async function bekleyenBulutKaydiniSimdiGonder");
const bitis = index.indexOf("function bekleyenBulutKaydiniSakla", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Bekleyen gönderimi elle başlatma işlevi bulunmalı");

const kayit = {
  id:"kuyruk-1",
  kayitZamani:"2026-09-04T10:00:00.000Z",
  baseRevision:4,
  durum:{ items:[{ id:"F-1" }], cariHareketler:[], cekler:[], cariler:[] }
};
let kuyrukCagrisi = 0;
let kontrolYenileme = 0;
const mesajlar = [];
const context = {
  bekleyenBulutKaydi:kayit,
  bulutKaydiCalisiyor:false,
  bulutTekrarDenemeZamanlayici:1,
  navigator:{ onLine:false },
  yoneticiGerekli:() => true,
  bekleyenBulutKaydiniOku:() => kayit,
  syncGoster:mesaj => mesajlar.push(mesaj),
  clearTimeout() {},
  bulutKayitKuyrugunuCalistir:async () => { kuyrukCagrisi += 1; },
  bekleyenBulutKontrolunuGuncelle:() => { kontrolYenileme += 1; }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

(async () => {
  assert.equal(await context.bekleyenBulutKaydiniSimdiGonder(), false, "Çevrimdışıyken elle gönderim başlatılmamalı");
  assert.equal(kuyrukCagrisi, 0, "Çevrimdışı durumda bulut kuyruğu çağrılmamalı");
  assert.match(mesajlar.at(-1), /İnternet bağlantısı yok/, "Çevrimdışı durum açıkça belirtilmeli");

  context.navigator.onLine = true;
  context.bulutKaydiCalisiyor = true;
  assert.equal(await context.bekleyenBulutKaydiniSimdiGonder(), false, "Devam eden gönderimin yanında ikinci gönderim başlatılmamalı");
  assert.equal(kuyrukCagrisi, 0, "Devam eden gönderim varken kuyruk yeniden çağrılmamalı");

  context.bulutKaydiCalisiyor = false;
  assert.equal(await context.bekleyenBulutKaydiniSimdiGonder(), true, "Çevrimiçiyken bekleyen gönderim elle başlatılabilmeli");
  assert.equal(kuyrukCagrisi, 1, "Elle gönderim mevcut güvenli kuyruk çalıştırıcısını kullanmalı");
  assert.equal(kontrolYenileme, 1, "Gönderim denemesinden sonra Veri Kontrol Merkezi yenilenmeli");

  assert.match(index, /Şimdi Gönder/, "Bekleyen gönderim satırında görünür elle gönderme düğmesi bulunmalı");
  assert.match(index, /gonder\.addEventListener\("click", bekleyenBulutKaydiniSimdiGonder\)/, "Düğme güvenli elle gönderim işlevine bağlı olmalı");
  assert.match(index, /\.veri-kontrol-islemler/, "Birden fazla kurtarma eylemi duyarlı bir düğme grubunda gösterilmeli");

  console.log("Bekleyen bulut gönderimini güvenli biçimde elle yeniden deneme testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exit(1);
});
