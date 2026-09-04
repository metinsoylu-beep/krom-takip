const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const baslangic = index.indexOf("function syncDurumuBilgisi");
const bitis = index.indexOf("// ── TCMB DÖVİZ KURLARI", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Senkronizasyon durum işlevleri bulunamadı");

const elemanlar = {
  "sync-durum": { className:"", attributes:{}, setAttribute(ad,deger) { this.attributes[ad] = deger; } },
  "sync-durum-ikon": { className:"" },
  "sync-durum-rozet": { textContent:"" },
  "sync-durum-mesaj": { textContent:"", style:{} },
  "sync-son-basarili": { textContent:"" }
};
const depo = new Map();
const context = {
  Date,
  Number,
  String,
  SON_BULUT_ESITLEME_ANAHTAR:"son-esitleme",
  document:{ getElementById:id => elemanlar[id] || null },
  localStorage:{
    getItem:anahtar => depo.get(anahtar) || null,
    setItem:(anahtar,deger) => depo.set(anahtar,String(deger))
  }
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

assert.equal(context.syncDurumuBilgisi("Google Sheets'ten yükleniyor...", "#60a5fa").tur, "islem");
assert.equal(context.syncDurumuBilgisi("İnternet bağlantısı yok", "#f59e0b").tur, "cevrimdisi");
assert.equal(context.syncDurumuBilgisi("Değişiklik bu cihazda güvenle bekliyor", "#f59e0b").tur, "bekliyor");
assert.equal(context.syncDurumuBilgisi("Google Sheets'e kaydedildi", "#4ade80").tur, "guncel");
assert.equal(context.syncDurumuBilgisi("Bulut kaydı durduruldu", "#ef4444").tur, "hata");

context.syncGoster("Google Sheets'ten yükleniyor...", "#60a5fa");
assert.equal(elemanlar["sync-durum"].className, "sync-durum sync-islem", "İşlem durumu karta uygulanmalı");
assert.equal(elemanlar["sync-durum"].attributes["aria-busy"], "true", "Eşitleme sırasında erişilebilir meşgul durumu bulunmalı");
assert.equal(elemanlar["sync-durum-rozet"].textContent, "İŞLEM SÜRÜYOR");

context.syncGoster("Google Sheets'e kaydedildi", "#4ade80", { bulutBasarili:true });
assert.equal(elemanlar["sync-durum"].className, "sync-durum sync-guncel", "Başarılı eşitleme görünür olmalı");
assert.equal(elemanlar["sync-durum-rozet"].textContent, "GÜNCEL");
assert.ok(depo.has("son-esitleme"), "Son başarılı eşitleme zamanı cihazda saklanmalı");
assert.match(elemanlar["sync-son-basarili"].textContent, /^Son başarılı eşitleme:/);

assert.match(index, /id="sync-durum-rozet"/, "Görünür durum rozeti bulunmalı");
assert.match(index, /id="sync-son-basarili"/, "Son başarılı eşitleme alanı bulunmalı");
assert.match(index, /aria-live="polite"/, "Durum değişiklikleri ekran okuyucuya bildirilmeli");
assert.match(index, /\.sync-durum \{ width: 100%; max-width: none; flex-basis: 100%; \}/, "Mobil görünümde durum kartı tam genişlik olmalı");

console.log("Açık senkronizasyon durumu ve son eşitleme zamanı testleri başarılı.");
