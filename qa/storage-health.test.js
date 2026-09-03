const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");

assert.match(code, /const SPREADSHEET_CELL_LIMIT = 10000000/, "Google Sheets hücre sınırı izlenmeli");
assert.match(code, /const STORAGE_WARNING_PERCENT = 70/, "%70 erken uyarı eşiği bulunmalı");
assert.match(code, /const STORAGE_CRITICAL_PERCENT = 85/, "%85 kritik eşiği bulunmalı");
assert.match(code, /const STORAGE_EMERGENCY_PERCENT = 95/, "%95 koruma eşiği bulunmalı");
assert.match(code, /const CLOUD_BACKUP_CRITICAL_RECORDS = 5/, "Kritik seviyede son 5 yedek korunmalı");
assert.match(code, /payload\.action === "storage\.status"/, "Depolama sağlığı API işlemi bulunmalı");
assert.match(code, /depolamaDurumunuHesapla\(SpreadsheetApp\.getActiveSpreadsheet\(\)\)/, "Durum tüm e-tablo üzerinden hesaplanmalı");
assert.match(code, /bulutYedekleriniSinirla\(sheet, CLOUD_BACKUP_CRITICAL_RECORDS\)/, "Kritik durumda eski yedekler azaltılmalı");
assert.match(code, /depolamaHatasi\.code = "STORAGE_CRITICAL"/, "Acil durumda veri yazımı ayırt edilebilir hatayla durmalı");

assert.match(index, /id="depolama-sagligi-panel"[^>]*aria-labelledby="depolama-sagligi-baslik"/, "Yönetici depolama paneli bulunmalı");
assert.match(index, /action:"storage\.status"/, "Ön yüz depolama bilgisini sunucudan istemeli");
assert.match(index, /%70 uyarı, %85 kritik, %95 koruma eşiği/, "Eşikler kullanıcıya açıklanmalı");
assert.match(index, /e\?\.code === "STORAGE_CRITICAL"/, "Kritik depolama hatası kullanıcıya gösterilmeli");
assert.match(index, /if \(yoneticiMi\(\)\) depolamaSagligiYenile\(false\)/, "Depolama sağlığı uygulama açılışında ölçülmeli");

console.log("Depolama sağlığı, erken uyarı ve koruma testleri başarılı.");
