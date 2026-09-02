const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = index.indexOf("function tutarSayiyaCevir");
const bitis = index.indexOf("function faturaYukle", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Fatura veri modeli işlevleri bulunamadı");

const context = { console, Date, JSON, Math, Number, String, Map, Array, isFinite, parseInt };
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const ortak = { tarih:"2026-09-02", vadeGun:30, tutar:"100", odendi:false, odemeTarihi:"" };
const sonuc = context.faturalariTekillestir([
  { id:1, cari:"Firma A", no:"F-001", ...ortak },
  { id:2, cari:"Firma B", no:"F-001", ...ortak }
]);
assert.equal(sonuc.liste.length, 2, "Aynı numaralı farklı firmaların faturaları korunmalı");
assert.deepEqual(Array.from(sonuc.liste, inv => inv.cari), ["Firma A", "Firma B"]);

const eski = context.faturalariTekillestir([{ id:3, no:"ESKİ-1", ...ortak }]);
assert.equal(eski.liste[0].cari, "", "Eski faturalar boş cariyle geriye uyumlu kalmalı");

assert.match(index, /id="inp-cari"/);
assert.match(index, /id="d-cari"/);
assert.match(index, /CARİ \/ FİRMA/);
assert.match(index, /Cari veya fatura no ara/);
assert.match(index, /const aramaMetni = `\$\{inv\.cari/);
assert.match(index, /\["Cari\/Firma","Fatura No"/);
assert.match(code, /"Cari\/Firma"/);
assert.match(code, /cari: String\(ham\.cari/);

console.log("Cari/firma veri modeli ve arayüz testleri başarılı.");
