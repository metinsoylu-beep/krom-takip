const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");

assert.match(code, /const CLOUD_BACKUP_SHEET_NAME = "Bulut Yedekleri"/, "Merkezi yedekler ayrı Google Sheet sayfasında tutulmalı");
assert.match(code, /const CLOUD_BACKUP_MAX_RECORDS = 20/, "Bulut yedekleri sınırsız büyümemeli");
assert.match(code, /const CLOUD_BACKUP_CHUNK_SIZE = 40000/, "Büyük yedekler hücre sınırına karşı parçalara ayrılmalı");
assert.match(code, /payload\.action === "backups\.list"/, "Bulut yedekleri listeleme API işlemi bulunmalı");
assert.match(code, /bulutYedeginiOku\(payload\.backupId\)/, "Seçilen bulut yedeği güvenli kimlikle okunmalı");
assert.match(code, /Güvenlik yedeği oluşturulamadığı için değişiklik kaydedilmedi/, "Yedeksiz toplu veri yazımı engellenmeli");
assert.match(code, /bulutYedegiKaydet\(oncekiDurum/, "Ana tablolar değişmeden önce mevcut durum yedeklenmeli");

assert.match(index, /id="bulut-yedekleri-btn"[^>]*class="yalnizca-yonetici"/, "Bulut yedeği düğmesi yalnızca yöneticiye gösterilmeli");
assert.match(index, /id="bulut-yedekleri-overlay"/, "Bulut yedekleri paneli bulunmalı");
assert.match(index, /action:"backups\.list", limit:20/, "Ön yüz son 20 merkezi yedeği istemeli");
assert.match(index, /action:"backups\.get", backupId:yedekId/, "Geri yükleme öncesi seçilen yedek sunucudan alınmalı");
assert.match(index, /Mevcut veriler önce yeni bir güvenlik yedeğine alınacaktır/, "Geri yükleme etkisi kullanıcıya açıkça bildirilmeli");
assert.match(index, /auditAction:"Bulut yedeği geri yüklendi"/, "Geri yükleme işlem geçmişinde ayırt edilebilmeli");
assert.match(index, /uygulamaDurumunuYereldeUygula\(mevcutDurum\)/, "Bulut yazımı başarısızsa mevcut yerel durum korunmalı");

console.log("Merkezi bulut yedeği ve güvenli geri yükleme testleri başarılı.");
