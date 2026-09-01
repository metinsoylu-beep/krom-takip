const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const index = fs.readFileSync("index.html", "utf8");

let values = [
  ["TOPLAM", "ÖDENEN", "KALAN", "GÜNCELLEME", "", "", "", "", ""],
  ["100 ₺", "0 ₺", "100 ₺", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["id", "Fatura No", "Tarih", "Vade Günü", "Vade Tarihi", "Tutar", "Ödeme Durumu", "Ödeme Tarihi", "Durum"],
  [1, "F-1", "2026-09-01", "30 gün", "01.10.2026", 100, "Ödenmedi", "", ""]
];

const propertyData = { VIEWER_EMAILS: "viewer@example.com" };
const properties = {
  getProperty(key) { return propertyData[key] ?? null; },
  setProperties(next) { Object.assign(propertyData, next); }
};

function range(row, column, rowCount, columnCount) {
  return {
    setValues(next) {
      for (let r = 0; r < rowCount; r++) {
        if (!values[row - 1 + r]) values[row - 1 + r] = [];
        for (let c = 0; c < columnCount; c++) {
          values[row - 1 + r][column - 1 + c] = next[r][c];
        }
      }
      return this;
    },
    setBackground() { return this; },
    setFontColor() { return this; },
    setFontWeight() { return this; }
  };
}

const sheet = {
  getDataRange() { return { getValues: () => values.map(row => row.slice()) }; },
  clearContents() { values = []; return this; },
  getRange: range
};

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
      getSheetByName: () => sheet,
      insertSheet: () => sheet
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

const read = output => JSON.parse(output.text);
const post = (payload, idToken = "admin-token") => read(context.doPost({
  parameter: { payload: JSON.stringify({ ...payload, idToken }) }
}));
const item1 = { id: 1, no: "F-1", tarih: "2026-09-01", vadeGun: 30, tutar: 100, odendi: false, odemeTarihi: "" };
const item2 = { id: 2, no: "F-2", tarih: "2026-09-02", vadeGun: 45, tutar: 250, odendi: false, odemeTarihi: "" };

const anonymousRead = read(context.doGet());
assert.equal(anonymousRead.code, "AUTH_REQUIRED");

const firstRead = post({ action: "read" });
assert.equal(firstRead.role, "admin");
assert.equal(firstRead.revision, 0);
assert.equal(firstRead.items.length, 1);

const viewerRead = post({ action: "read" }, "viewer-token");
assert.equal(viewerRead.role, "viewer");
assert.equal(viewerRead.items.length, 1);

const viewerSave = post({ action: "save", baseRevision: 0, requestId: "viewer-save", items: [item1] }, "viewer-token");
assert.equal(viewerSave.code, "FORBIDDEN");

const unknownRead = post({ action: "read" }, "unknown-token");
assert.equal(unknownRead.code, "ACCESS_DENIED");

const saved = post({ action: "save", baseRevision: 0, requestId: "request-1", items: [item1, item2] });
assert.deepEqual({ ok: saved.ok, revision: saved.revision, count: saved.count }, { ok: true, revision: 1, count: 2 });

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

assert.match(index, /firebase-auth-compat/);
assert.match(index, /action:\s*"read"/);
assert.match(index, /idToken/);
assert.match(index, /giris-overlay/);
assert.match(index, /data-role="viewer"/);
assert.match(index, /baseRevision/);
assert.match(index, /requestId/);
assert.match(index, /BULUT_CAKISMA_ANAHTAR/);

console.log("Apps Script sürümleme ve çakışma testleri başarılı.");
