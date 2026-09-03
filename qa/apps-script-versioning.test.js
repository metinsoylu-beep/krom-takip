const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const index = fs.readFileSync("index.html", "utf8");

let invoiceValues = [
  ["TOPLAM", "ÖDENEN", "KALAN", "GÜNCELLEME", "", "", "", "", ""],
  ["100 ₺", "40 ₺", "60 ₺", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["id", "Fatura No", "Tarih", "Vade Günü", "Vade Tarihi", "Tutar", "Ödeme Durumu", "Ödeme Tarihi", "Durum"],
  [1, "F-1", "2026-09-01", "30 gün", "01.10.2026", 100, "Kısmi Ödendi", "", ""]
];
let paymentValues = [
  ["Ödeme ID", "Fatura ID", "Ödeme Tarihi", "Tutar", "Yöntem", "Referans", "Açıklama", "Kayıt Zamanı"],
  ["odm-eski", 1, "2026-09-02", 40, "Havale / EFT", "REF-ESKI", "Eski ödeme", ""]
];
let movementValues = [];
let checkValues = [];
let customerValues = [];
let auditValues = [];
let backupValues = [];
let movementExists = false;
let checkExists = false;
let customerExists = false;
let auditExists = false;
let backupExists = false;

const propertyData = { VIEWER_EMAILS: "viewer@example.com" };
const properties = {
  getProperty(key) { return propertyData[key] ?? null; },
  setProperties(next) { Object.assign(propertyData, next); }
};

function range(degerleriGetir, degerleriAyarla, row, column, rowCount, columnCount) {
  return {
    getValue() {
      return degerleriGetir()[row - 1]?.[column - 1] ?? "";
    },
    setValue(next) {
      const values = degerleriGetir();
      if (!values[row - 1]) values[row - 1] = [];
      values[row - 1][column - 1] = next;
      degerleriAyarla(values);
      return this;
    },
    setValues(next) {
      const values = degerleriGetir();
      for (let r = 0; r < rowCount; r++) {
        if (!values[row - 1 + r]) values[row - 1 + r] = [];
        for (let c = 0; c < columnCount; c++) values[row - 1 + r][column - 1 + c] = next[r][c];
      }
      degerleriAyarla(values);
      return this;
    },
    setBackground() { return this; },
    setFontColor() { return this; },
    setFontWeight() { return this; }
  };
}

function sheetOlustur(degerleriGetir, degerleriAyarla, ad) {
  return {
    getName() { return ad; },
    getDataRange() { return { getValues: () => degerleriGetir().map(row => row.slice()) }; },
    getLastRow() { return degerleriGetir().length; },
    getLastColumn() { return degerleriGetir().reduce((enBuyuk, row) => Math.max(enBuyuk, row.length), 0); },
    getMaxRows() { return Math.max(degerleriGetir().length, 2); },
    getMaxColumns() { return Math.max(degerleriGetir().reduce((enBuyuk, row) => Math.max(enBuyuk, row.length), 0), 10); },
    clearContents() { degerleriAyarla([]); return this; },
    appendRow(row) { const values = degerleriGetir(); values.push(row.slice()); degerleriAyarla(values); return this; },
    deleteRows(row, count) { const values = degerleriGetir(); values.splice(row - 1, count); degerleriAyarla(values); return this; },
    deleteColumns(column, count) {
      const values = degerleriGetir();
      values.forEach(row => row.splice(column - 1, count));
      degerleriAyarla(values);
      return this;
    },
    insertColumnsAfter() { return this; },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return range(degerleriGetir, degerleriAyarla, row, column, rowCount, columnCount);
    }
  };
}

const invoiceSheet = sheetOlustur(() => invoiceValues, next => { invoiceValues = next; }, "Faturalar");
const paymentSheet = sheetOlustur(() => paymentValues, next => { paymentValues = next; }, "Ödemeler");
const movementSheet = sheetOlustur(() => movementValues, next => { movementValues = next; }, "Cari Hareketler");
const checkSheet = sheetOlustur(() => checkValues, next => { checkValues = next; }, "Çekler");
const customerSheet = sheetOlustur(() => customerValues, next => { customerValues = next; }, "Cariler");
const auditSheet = sheetOlustur(() => auditValues, next => { auditValues = next; }, "İşlem Geçmişi");
const backupSheet = sheetOlustur(() => backupValues, next => { backupValues = next; }, "Bulut Yedekleri");

let locked = false;
const context = {
  console, Date, JSON, Math, Number, String, Object, Array, isFinite, parseInt,
  PropertiesService: { getScriptProperties: () => properties },
  LockService: { getScriptLock: () => ({
    waitLock() { locked = true; }, hasLock() { return locked; }, releaseLock() { locked = false; }
  }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({
    getSheets() {
      return [invoiceSheet, paymentSheet]
        .concat(movementExists ? [movementSheet] : [])
        .concat(checkExists ? [checkSheet] : [])
        .concat(customerExists ? [customerSheet] : [])
        .concat(auditExists ? [auditSheet] : [])
        .concat(backupExists ? [backupSheet] : []);
    },
    getSheetByName(name) {
      if (name === "Faturalar") return invoiceSheet;
      if (name === "Ödemeler") return paymentSheet;
      if (name === "Cari Hareketler") return movementExists ? movementSheet : null;
      if (name === "Çekler") return checkExists ? checkSheet : null;
      if (name === "Cariler") return customerExists ? customerSheet : null;
      if (name === "İşlem Geçmişi") return auditExists ? auditSheet : null;
      if (name === "Bulut Yedekleri") return backupExists ? backupSheet : null;
      return null;
    },
    insertSheet(name) {
      if (name === "Cari Hareketler") { movementExists = true; return movementSheet; }
      if (name === "Çekler") { checkExists = true; return checkSheet; }
      if (name === "Cariler") { customerExists = true; return customerSheet; }
      if (name === "İşlem Geçmişi") { auditExists = true; return auditSheet; }
      if (name === "Bulut Yedekleri") { backupExists = true; return backupSheet; }
      return invoiceSheet;
    }
  }) },
  UrlFetchApp: { fetch(url, options) {
    const token = JSON.parse(options.payload).idToken;
    const users = {
      "admin-token": { localId:"admin-1", email:"admin@example.com", emailVerified:true },
      "viewer-token": { localId:"viewer-1", email:"viewer@example.com", emailVerified:true },
      "unknown-token": { localId:"unknown-1", email:"unknown@example.com", emailVerified:true }
    };
    const user = users[token];
    return { getResponseCode: () => user ? 200 : 401, getContentText: () => JSON.stringify(user ? { users:[user] } : { error:{} }) };
  } },
  Utilities: { getUuid: () => "12345678-1234-1234-1234-123456789abc", formatDate(date, zone, pattern) {
    const pad = value => String(value).padStart(2,"0");
    return pattern === "yyyy-MM-dd"
      ? `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
      : `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()}`;
  } },
  Session: {
    getScriptTimeZone: () => "Europe/Istanbul",
    getEffectiveUser: () => ({ getEmail: () => "admin@example.com" })
  },
  ContentService: {
    MimeType:{ JSON:"application/json" },
    createTextOutput(text) { return { text, setMimeType() { return this; } }; }
  }
};

vm.createContext(context);
vm.runInContext(code, context);

assert.equal(context.firebaseBaglantisiniYetkilendir(), 401);
const cariHazirligi = context.cariSutununuHazirla();
assert.deepEqual({ ok:cariHazirligi.ok, changed:cariHazirligi.changed, column:cariHazirligi.column }, { ok:true, changed:true, column:10 });
assert.equal(invoiceValues[3][9], "Cari/Firma");
assert.equal(context.cariSutununuHazirla().changed, false);

const read = output => JSON.parse(output.text);
const post = (payload, idToken="admin-token") => read(context.doPost({ parameter:{ payload:JSON.stringify({ ...payload, idToken }) } }));
const item1 = { id:1, cari:"Örnek Metal", no:"F-1", tarih:"2026-09-01", vadeGun:30, tutar:100 };
const item2 = { id:2, cari:"Başarı Çelik", no:"F-2", tarih:"2026-09-01", vadeGun:30, tutar:200 };
const hareketler = [
  { id:"h-1", cari:"Örnek Metal", tarih:"2026-09-02", tutar:140, yontem:"Havale / EFT", referans:"REF-1" },
  { id:"h-2", cari:"Başarı Çelik", tarih:"2026-09-03", tutar:50, yontem:"Nakit" }
];
const cekler = [{ id:"c-1", cari:"Başarı Çelik", tarih:"2026-09-03", vadeTarihi:"2026-10-03", tutar:75, cekNo:"CHK-1", banka:"Test Bank", durum:"Verildi" }];
const cariler = [
  { id:"cari-1", cari:"Örnek Metal", vergiNo:"1234567890", acilisTarihi:"2026-01-01", acilisBorc:25, acilisAlacak:0 },
  { id:"cari-2", cari:"Başarı Çelik", vergiNo:"", acilisTarihi:"", acilisBorc:0, acilisAlacak:10 }
];

assert.equal(read(context.doGet()).code, "AUTH_REQUIRED");
const firstRead = post({ action:"read" });
assert.equal(firstRead.role, "admin");
assert.equal(firstRead.revision, 0);
assert.equal(firstRead.items.length, 1);
assert.equal(firstRead.cariHareketler.length, 1, "Eski Ödemeler sayfası ilk okumada cari harekete dönüştürülmeli");
assert.equal(firstRead.cariHareketler[0].id, "legacy-odm-eski");

assert.equal(post({ action:"read" }, "viewer-token").role, "viewer");
assert.equal(post({ action:"save", baseRevision:0, requestId:"viewer-save", items:[item1] }, "viewer-token").code, "FORBIDDEN");
assert.equal(post({ action:"users.list" }, "viewer-token").code, "FORBIDDEN", "İzleyici kullanıcı yönetimine erişememeli");
assert.equal(post({ action:"audit.list" }, "viewer-token").code, "FORBIDDEN", "İzleyici işlem geçmişini görüntüleyememeli");
assert.equal(post({ action:"backups.list" }, "viewer-token").code, "FORBIDDEN", "İzleyici bulut yedeklerini görüntüleyememeli");
assert.equal(post({ action:"backups.create" }, "viewer-token").code, "FORBIDDEN", "İzleyici manuel bulut yedeği oluşturamamalı");
assert.equal(post({ action:"storage.status" }, "viewer-token").code, "FORBIDDEN", "İzleyici depolama sağlığını görüntüleyememeli");
assert.equal(post({ action:"read" }, "unknown-token").code, "ACCESS_DENIED");

const depolamaDurumu = post({ action:"storage.status" });
assert.equal(depolamaDurumu.storage.hucreSiniri, 10000000);
assert.equal(depolamaDurumu.storage.seviye, "healthy");
assert.ok(depolamaDurumu.storage.ayrilmisHucre > 0);

const ilkKullanicilar = post({ action:"users.list" });
assert.equal(ilkKullanicilar.users.length, 2, "Proje sahibi ve izleyici listelenmeli");
assert.equal(ilkKullanicilar.users[0].email, "admin@example.com");
assert.equal(ilkKullanicilar.users[0].protected, true, "Proje sahibi korunmalı");
assert.equal(post({ action:"users.save", email:"gecersiz", role:"viewer" }).code, "INVALID_EMAIL");

const izleyiciEklendi = post({ action:"users.save", email:"yeni@example.com", role:"viewer" });
assert.equal(izleyiciEklendi.users.find(item => item.email === "yeni@example.com").role, "viewer");
assert.match(propertyData.VIEWER_EMAILS, /yeni@example\.com/);

const yoneticiYapildi = post({ action:"users.save", email:"yeni@example.com", role:"admin" });
assert.equal(yoneticiYapildi.users.find(item => item.email === "yeni@example.com").role, "admin");
assert.doesNotMatch(propertyData.VIEWER_EMAILS, /yeni@example\.com/);
assert.match(propertyData.ADMIN_EMAILS, /yeni@example\.com/);

assert.equal(post({ action:"users.delete", email:"admin@example.com" }).code, "OWNER_PROTECTED", "Proje sahibi kaldırılamamalı");
const kullaniciKaldirildi = post({ action:"users.delete", email:"yeni@example.com" });
assert.equal(kullaniciKaldirildi.users.some(item => item.email === "yeni@example.com"), false);
assert.doesNotMatch(propertyData.ADMIN_EMAILS, /yeni@example\.com/);
const yetkiGecmisi = post({ action:"audit.list" });
assert.equal(yetkiGecmisi.logs.length, 3, "Başarılı yetki ekleme, değiştirme ve kaldırma işlemleri kaydedilmeli");
assert.equal(yetkiGecmisi.logs[0].islem, "Kullanıcı erişimi kaldırıldı");

const saved = post({ action:"save", baseRevision:0, requestId:"request-1", items:[item1,item2], cariHareketler:hareketler, cekler, cariler });
assert.deepEqual({ ok:saved.ok, revision:saved.revision, count:saved.count, movementCount:saved.movementCount, checkCount:saved.checkCount, customerCount:saved.customerCount },
  { ok:true, revision:1, count:2, movementCount:2, checkCount:1, customerCount:2 });
assert.equal(movementValues[0][0], "Hareket ID");
assert.equal(movementValues.length, 3);
assert.equal(checkValues[0][0], "Çek ID");
assert.equal(checkValues.length, 2);
assert.equal(customerValues[0][0], "Cari ID");
assert.equal(customerValues.length, 3);
assert.equal(paymentValues.length, 2, "Eski Ödemeler sayfası geçiş arşivi olarak korunmalı");
const veriGecmisi = post({ action:"audit.list" });
assert.equal(veriGecmisi.logs[0].islem, "Veri değişikliği", "Muhasebe veri değişikliği işlem geçmişine yazılmalı");
assert.match(veriGecmisi.logs[0].aciklama, /Fatura:/, "Değişiklik özeti etkilenen kayıt türünü açıklamalı");
const yedekler = post({ action:"backups.list" });
assert.equal(yedekler.backups.length, 1, "Başarılı kayıt öncesinde merkezi bulut yedeği alınmalı");
assert.equal(yedekler.backups[0].revision, 0, "Yedek değişiklikten önceki veri sürümünü taşımalı");
const yedekDetayi = post({ action:"backups.get", backupId:yedekler.backups[0].id });
assert.equal(yedekDetayi.backup.durum.items.length, 1, "Bulut yedeği önceki fatura durumunu geri verebilmeli");
assert.equal(yedekDetayi.backup.durum.cariHareketler.length, 1, "Bulut yedeği önceki cari hareketleri içermeli");
const manuelYedek = post({ action:"backups.create" });
assert.equal(manuelYedek.ok, true, "Yönetici manuel merkezi yedek oluşturabilmeli");
assert.equal(manuelYedek.backups.length, 2, "Manuel yedek mevcut otomatik yedekleri silmemeli");
assert.equal(manuelYedek.storage.yedekSayisi, 2, "Depolama durumu yeni manuel yedeği hemen yansıtmalı");
const manuelYedekDetayi = post({ action:"backups.get", backupId:manuelYedek.backupId });
assert.equal(manuelYedekDetayi.backup.durum.items.length, 2, "Manuel yedek güncel muhasebe durumunu içermeli");

const kayitSonrasi = post({ action:"read" });
assert.equal(kayitSonrasi.items[0].cari, "Örnek Metal");
assert.equal(kayitSonrasi.cariHareketler[0].tutar, 140);
assert.equal(kayitSonrasi.cekler[0].durum, "Verildi");
assert.equal(kayitSonrasi.cariler.find(cari => cari.cari === "Örnek Metal").acilisBorc, 25);
assert.equal(invoiceValues[3][7], "Vade Durumu", "Fatura sayfasında ödeme durumu yerine vade durumu bulunmalı");

const replayed = post({ action:"save", baseRevision:0, requestId:"request-1", items:[item1,item2], cariHareketler:hareketler, cekler });
assert.equal(replayed.replayed, true);
assert.equal(replayed.revision, 1);
const conflict = post({ action:"save", baseRevision:0, requestId:"request-2", items:[item1] });
assert.equal(conflict.conflict, true);
assert.equal(conflict.revision, 1);

const eskiOnYuzSonucu = post({ action:"save", baseRevision:1, requestId:"request-3", items:[item1] });
assert.equal(eskiOnYuzSonucu.revision, 2);
const eskiOnYuzOkumasi = post({ action:"read" });
assert.equal(eskiOnYuzOkumasi.cariHareketler.length, 2, "Eski ön yüz cari hareket alanını göndermese de kayıtlar korunmalı");
assert.equal(eskiOnYuzOkumasi.cekler.length, 1, "Eski ön yüz çek alanını göndermese de çekler korunmalı");
assert.equal(eskiOnYuzOkumasi.cariler.length, 2, "Eski ön yüz cari kart alanını göndermese de kartlar korunmalı");

assert.match(index, /firebase-auth-compat/);
assert.match(index, /cariHareketler/);
assert.match(index, /cekler/);
assert.match(index, /baseRevision/);
assert.match(index, /requestId/);
assert.match(index, /BULUT_CAKISMA_ANAHTAR/);
assert.match(index, /action:"users\.save"/);
assert.match(index, /action:"users\.delete"/);

console.log("Apps Script kullanıcı yetkisi, cari hareket, çek, sürümleme ve çakışma testleri başarılı.");
