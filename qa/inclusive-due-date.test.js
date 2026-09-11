const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fonksiyonuAl(kaynak, ad) {
  const baslangic = kaynak.indexOf(`function ${ad}(`);
  assert.notEqual(baslangic, -1, `${ad} bulunmalı`);
  const govdeBaslangici = kaynak.indexOf("{", baslangic);
  let derinlik = 0;
  for (let i = govdeBaslangici; i < kaynak.length; i++) {
    if (kaynak[i] === "{") derinlik++;
    if (kaynak[i] === "}" && --derinlik === 0) return kaynak.slice(baslangic, i + 1);
  }
  throw new Error(`${ad} gövdesi okunamadı`);
}

function tarihMetni(tarih) {
  return `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, "0")}-${String(tarih.getDate()).padStart(2, "0")}`;
}

const index = fs.readFileSync("index.html", "utf8");
const appsScript = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const context = {
  Date, Math, parseInt,
  tarihOlusturYerel(tarih) {
    const [yil, ay, gun] = String(tarih).split("-").map(Number);
    return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
  },
  tarihOlustur(tarih) {
    const [yil, ay, gun] = String(tarih).split("-").map(Number);
    return new Date(yil, ay - 1, gun, 12, 0, 0, 0);
  }
};
vm.createContext(context);
vm.runInContext(fonksiyonuAl(index, "vadeTarihi"), context);

assert.equal(tarihMetni(context.vadeTarihi("2026-06-11", 90)), "2026-09-08", "Fatura tarihi 90 günlük sürenin ilk günü sayılmalı");
assert.equal(tarihMetni(context.vadeTarihi("2026-09-11", 1)), "2026-09-11", "Bir günlük vade fatura tarihinde bitmeli");
assert.equal(tarihMetni(context.vadeTarihi("2024-02-01", 29)), "2024-02-29", "Artık yılın 29 Şubat günü doğru hesaplanmalı");
assert.equal(tarihMetni(context.vadeTarihi("2026-02-01", 28)), "2026-02-28", "28 günlük Şubat ayı doğru hesaplanmalı");

vm.runInContext(`this.appsScriptVadeTarihi = ${fonksiyonuAl(appsScript, "vadeTarihi")}`, context);
assert.equal(tarihMetni(context.appsScriptVadeTarihi("2026-06-11", 90)), "2026-09-08", "Google Sheets ve ön yüz aynı vade gününü üretmeli");
assert.match(index, /VADE GÜNÜ[\s\S]*?fatura günü dahil/, "Yeni fatura formu kapsayıcı gün hesabını açıklamalı");

console.log("Fatura günü dahil vade tarihi testleri başarılı.");
