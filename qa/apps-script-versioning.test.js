const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const index = fs.readFileSync("index.html", "utf8");

let invoiceValues = [
  ["TOPLAM", "ÖDENEN", "KALAN", "GÜNCELLEME", "", "", "", "", ""],
  ["100 ₺", "0 ₺", "100 ₺", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["id", "Fatura No", "Tarih", "Vade Günü", "Vade Tarihi", "Tutar", "Ödeme Durumu", "Ödeme Tarihi", "Durum"],
  [1, "F-1", "2026-09-01", "30 gün", "01.10.2026", 100, "Ödenmedi", "", ""]
];
let paymentValues = [];

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
        for (let c = 0; c < columnCount; c++) {
          values[row - 1 + r][column - 1 + c] = next[r][c];
        }
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

let locked = false;
const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  isFinite,
  parseInt,
  PropertiesService: { getScriptProperties: () => properties },
  LockService: {
    getScriptLock: () => ({
      waitLock() { locked = true; },
      hasLock() { return locked; },
      releaseLock() { locked = false; }
    })
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: name => name === "Faturalar" ? invoiceSheet : name === "Ödemeler" ? paymentSheet : null,
      insertSheet: name => name === "Ödemeler" ? paymentSheet : invoiceSheet
    })
  },
  UrlFetchApp: {
    fetch(url, options) {
      const token = JSON.parse(options.payload).idToken;
      const users = {
        "admin-token": { localId: "admin-1", email: "admin@example.com", emailVerified: true },
        "viewer-token": { localId: "viewer-1", email: "viewer@example.com", emailVerified: true },
        "unknown-token": { localId: "unknown-1", email: "unknown@example.com", emailVerified: true }
      };
      const user = users[token];
      return {
        getResponseCode: () => user ? 200 : 401,
        getContentText: () => JSON.stringify(user ? { users: [user] } : { error: {} })
      };
    }
  },
  Utilities: {
    formatDate(date, zone, pattern) {
      const pad = value => String(value).padStart(2, "0");
      if (pattern === "yyyy-MM-dd") {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      }
      return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
    }
  },
  Session: {
    getScriptTimeZone: () => "Europe/Istanbul",
    getEffectiveUser: () => ({ getEmail: () => "admin@example.com" })
  },
  ContentService: {
    MimeType: { JSON: "application/json" },
    createTextOutput(text) {
      return { text, setMimeType() { return this; } };
    }
  }
};

vm.createContext(context);
vm.runInContext(code, context);

assert.equal(context.firebaseBaglantisiniYetkilendir(), 401);
const cariHazirligi = context.cariSutununuHazirla();
assert.deepEqual(
  { ok:cariHazirligi.ok, changed:cariHazirligi.changed, column:cariHazirligi.column },
  { ok:true, changed:true, column:10 },
  "Cari/Firma sütunu eski tabloya veri satırlarını kaydırmadan eklenmeli"
);
assert.equal(invoiceValues[3][9], "Cari/Firma");
assert.equal(context.cariSutununuHazirla().changed, false, "Sütun hazırlığı tekrar çalıştırıldığında yeni sütun eklememeli");

const read = output => JSON.parse(output.text);
const post = (payload, idToken = "admin-token") => read(context.doPost({
  parameter: { payload: JSON.stringify({ ...payload, idToken }) }
}));
const item1 = { id: 1, cari: "Örnek Metal", no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: 100, odendi: false, odemeTarihi: "", odemeler:[{ id:"odm-1", tarih:"2026-09-02", tutar:40, yontem:"Havale / EFT", referans:"REF-1", aciklama:"İlk ödeme" }] };
const item2 = { id: 2, cari: "Başarı Çelik", no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: 100, odendi: true, odemeTarihi: "2026-09-03", odemeler:[{ id:"odm-2", tarih:"2026-09-03", tutar:100, yontem:"Çek", referans:"ÇEK-1", aciklama:"Tam ödeme" }] };

const anonymousRead = read(context.doGet());
assert.equal(anonymousRead.code, "AUTH_REQUIRED");

const firstRead = post({ action: "read" });
assert.equal(firstRead.role, "admin");
assert.equal(firstRead.revision, 0);
assert.equal(firstRead.items.length, 1);
assert.equal(firstRead.items[0].cari, "", "Eski sütun düzenindeki faturalar veri kaybı olmadan okunmalı");

const viewerRead = post({ action: "read" }, "viewer-token");
assert.equal(viewerRead.role, "viewer");
assert.equal(viewerRead.items.length, 1);

const viewerSave = post({ action: "save", baseRevision: 0, requestId: "viewer-save", items: [item1] }, "viewer-token");
assert.equal(viewerSave.code, "FORBIDDEN");

const unknownRead = post({ action: "read" }, "unknown-token");
assert.equal(unknownRead.code, "ACCESS_DENIED");

const saved = post({ action: "save", baseRevision: 0, requestId: "request-1", items: [item1, item2] });
assert.deepEqual({ ok: saved.ok, revision: saved.revision, count: saved.count }, { ok: true, revision: 1, count: 2 });
assert.equal(saved.paymentCount, 2, "İki ödeme ayrı Ödemeler satırı olarak yazılmalı");
const kayitSonrasi = post({ action: "read" }).items;
assert.equal(kayitSonrasi[0].cari, "Örnek Metal", "Cari bilgisi Sheets yazma-okuma döngüsünde korunmalı");
assert.equal(kayitSonrasi[0].odemeler.length, 1, "Kısmi ödeme Sheets yazma-okuma döngüsünde korunmalı");
assert.equal(kayitSonrasi[0].odendi, false, "Kısmi ödeme faturayı tamamen kapatmamalı");
assert.equal(kayitSonrasi[1].odendi, true, "Toplam ödeme fatura tutarına ulaşınca fatura kapanmalı");
assert.equal(paymentValues[0][0], "Ödeme ID", "Ödemeler sayfası başlıkla oluşturulmalı");
assert.equal(paymentValues.length, 3, "Başlık ve iki ödeme satırı yazılmalı");

const legacy = context.faturalariTekillestir([{ id:9, cari:"Eski Firma", no:"E-1", tarih:"2026-08-01", vadeGun:30, tutar:50, odendi:true, odemeTarihi:"2026-08-15" }])[0];
assert.equal(legacy.odemeler[0].id, "legacy-9", "Eski ödenmiş faturaya geriye uyumlu ödeme geçmişi eklenmeli");

const replayed = post({ action: "save", baseRevision: 0, requestId: "request-1", items: [item1, item2] });
assert.equal(replayed.replayed, true);
assert.equal(replayed.revision, 1);

const conflict = post({ action: "save", baseRevision: 0, requestId: "request-2", items: [item1] });
assert.equal(conflict.conflict, true);
assert.equal(conflict.revision, 1);
assert.equal(post({ action: "read" }).items.length, 2);

const secondSave = post({ action: "save", baseRevision: 1, requestId: "request-3", items: [item1] });
assert.equal(secondSave.revision, 2);
assert.equal(post({ action: "read" }).items.length, 1);

const eskiOnYuzKaydi = { id:1, cari:"Örnek Metal", no:"F-1", tarih:"2026-09-01", vadeGun:30, tutar:100, odendi:false, odemeTarihi:"" };
const eskiOnYuzSonucu = post({ action:"save", baseRevision:2, requestId:"request-4", items:[eskiOnYuzKaydi] });
assert.equal(eskiOnYuzSonucu.revision, 3);
assert.equal(post({ action:"read" }).items[0].odemeler.length, 1, "Eski ön yüz odemeler alanını göndermese de ödeme geçmişi korunmalı");

assert.match(index, /firebase-auth-compat/);
assert.match(index, /action:\s*"read"/);
assert.match(index, /idToken/);
assert.match(index, /giris-overlay/);
assert.match(index, /data-role="viewer"/);
assert.match(index, /baseRevision/);
assert.match(index, /requestId/);
assert.match(index, /BULUT_CAKISMA_ANAHTAR/);

console.log("Apps Script sürümleme ve çakışma testleri başarılı.");
