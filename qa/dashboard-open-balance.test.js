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

const context = { console, Number, Math, Array };
vm.createContext(context);
vm.runInContext(fonksiyonuAl(index, "acikBakiyeOzetiniHesapla"), context);

const ozet = context.acikBakiyeOzetiniHesapla([
  { cari:"Borçlu A", bakiye:646380.86 },
  { cari:"Borçlu B", bakiye:1 },
  { cari:"Alacaklı A", bakiye:-19197 },
  { cari:"Alacaklı B", bakiye:-24000 },
  { cari:"Kapalı", bakiye:0 }
]);

assert.equal(ozet.toplamBorc, 646381.86, "Pozitif cari bakiyeleri açık borçta toplamalı");
assert.equal(ozet.toplamAlacak, 43197, "Negatif cari bakiyeleri açık alacakta toplamalı");
assert.equal(ozet.netBakiye, 603184.86, "Net bakiye açık borç ile açık alacak farkı olmalı");
assert.match(index, /<span class="ozet-etiket">Açık Borç<\/span>/, "Ana kart Açık Borç adını taşımalı");
assert.match(index, /<span class="ozet-etiket">Açık Alacak<\/span>/, "Ana kart Açık Alacak adını taşımalı");
assert.match(index, /acikBakiyeOzetiniHesapla\(hesaplar\)/, "Ana özet açık cari bakiyelerinden hesaplanmalı");

console.log("dashboard-open-balance.test.js: açık borç, açık alacak ve net bakiye kontrolleri geçti");
