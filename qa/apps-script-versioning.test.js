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
let movementExists = false;
let checkExists = false;

const propertyData = { VIEWER_EMAILS: "viewer@example.com" };
const properties = {
  getProperty(key) { return propertyData[key] ?? null; },
  setProperties(next) { Object.assign(propertyData, next); }
};

function range(degerleriGetir, degerleriAyarla, row, column, rowCount, columnCount) {
  return {
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

function sheetOlustur(degerleriGetir, degerleriAyarla) {
  return {
    getDataRange() { return { getValues: () => degerleriGetir().map(row => row.slice()) }; },
    clearContents() { degerleriAyarla([]); return this; },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return range(degerleriGetir, degerleriAyarla, row, column, rowCount, columnCount);
    }
  };
}

const invoiceSheet = sheetOlustur(() => invoiceValues, next => { invoiceValues = next; });
const paymentSheet = sheetOlustur(() => paymentValues, next => { paymentValues = next; });
const movementSheet = sheetOlustur(() => movementValues, next => { movementValues = next; });
const checkSheet = sheetOlustur(() => checkValues, next => { checkValues = next; });

let locked = false;
const context = {
  console, Date, JSON, Math, Number, String, Object, Array, isFinite, parseInt,
  PropertiesService: { getScriptProperties: () => properties },
  LockService: { getScriptLock: () => ({
    waitLock() { locked = true; }, hasLock() { return locked; }, releaseLock() { locked = false; }
  }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({
    getSheetByName(name) {
      if (name === "Faturalar") return invoiceSheet;
      if (name === "Ödemeler") return paymentSheet;
      if (name === "Cari Hareketler") return movementExists ? movementSheet : null;
      if (name === "Çekler") return checkExists ? checkSheet : null;
      return null;
    },
    insertSheet(name) {
      if (name === "Cari Hareketler") { movementExists = true; return movementSheet; }
      if (name === "Çekler") { checkExists = true; return checkSheet; }
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
  Utilities: { formatDate(date, zone, pattern) {
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

assert.equal(read(context.doGet()).code, "AUTH_REQUIRED");
const firstRead = post({ action:"read" });
assert.equal(firstRead.role, "admin");
assert.equal(firstRead.revision, 0);
assert.equal(firstRead.items.length, 1);
assert.equal(firstRead.cariHareketler.length, 1, "Eski Ödemeler sayfası ilk okumada cari harekete dönüştürülmeli");
assert.equal(firstRead.cariHareketler[0].id, "legacy-odm-eski");

assert.equal(post({ action:"read" }, "viewer-token").role, "viewer");
assert.equal(post({ action:"save", baseRevision:0, requestId:"viewer-save", items:[item1] }, "viewer-token").code, "FORBIDDEN");
assert.equal(post({ action:"read" }, "unknown-token").code, "ACCESS_DENIED");

const saved = post({ action:"save", baseRevision:0, requestId:"request-1", items:[item1,item2], cariHareketler:hareketler, cekler });
assert.deepEqual({ ok:saved.ok, revision:saved.revision, count:saved.count, movementCount:saved.movementCount, checkCount:saved.checkCount },
  { ok:true, revision:1, count:2, movementCount:2, checkCount:1 });
assert.equal(movementValues[0][0], "Hareket ID");
assert.equal(movementValues.length, 3);
assert.equal(checkValues[0][0], "Çek ID");
assert.equal(checkValues.length, 2);
assert.equal(paymentValues.length, 2, "Eski Ödemeler sayfası geçiş arşivi olarak korunmalı");

const kayitSonrasi = post({ action:"read" });
assert.equal(kayitSonrasi.items[0].cari, "Örnek Metal");
assert.equal(kayitSonrasi.cariHareketler[0].tutar, 140);
assert.equal(kayitSonrasi.cekler[0].durum, "Verildi");
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

assert.match(index, /firebase-auth-compat/);
assert.match(index, /cariHareketler/);
assert.match(index, /cekler/);
assert.match(index, /baseRevision/);
assert.match(index, /requestId/);
assert.match(index, /BULUT_CAKISMA_ANAHTAR/);

console.log("Apps Script cari hareket, çek, sürümleme ve çakışma testleri başarılı.");
