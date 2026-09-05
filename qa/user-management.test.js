const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");

assert.match(index, /id="kullanici-yonetim-overlay"/, "Kullanıcı yönetim paneli bulunmalı");
assert.match(index, /id="kullanici-eposta"[^>]+type="email"/, "E-posta alanı bulunmalı");
assert.match(index, /id="kullanici-rol"/, "Yetki türü seçimi bulunmalı");
assert.match(index, /value="viewer">Sadece Görüntüleme/, "İzleyici yetkisi seçilebilmeli");
assert.match(index, /value="admin">Yönetici/, "Yönetici yetkisi seçilebilmeli");
assert.match(index, /function kullaniciPaneliniAc\(/, "Panel açma işlemi bulunmalı");
assert.match(index, /function kullaniciYetkisiKaydet\(/, "Yetki kaydetme işlemi bulunmalı");
assert.match(index, /function kullaniciYetkisiniKaldir\(/, "Yetki kaldırma işlemi bulunmalı");
assert.match(index, /class="kullanici-davet"/, "Her kullanıcı için davet mesajı düğmesi bulunmalı");
assert.match(index, /function kullaniciDavetMetniOlustur\(/, "Hazır davet mesajı oluşturulmalı");
assert.match(index, /function kullaniciDavetiniKopyala\(/, "Davet mesajı panoya kopyalanabilmeli");
assert.match(index, /https:\/\/metinsoylu-beep\.github\.io\/krom-takip\//, "Davet mesajı GitHub Pages canlı adresini kullanmalı");
assert.doesNotMatch(index, /metinsoylu-finans\.netlify\.app/, "Kullanıcı davetinde artık kullanılmayan Netlify adresi bulunmamalı");
assert.match(index, /Başka bir hesap kullan/, "Davet mesajı alternatif Google hesabını açıklamalı");
assert.match(index, /Tarayıcıda aç/, "Davet mesajı uygulama içi tarayıcı çözümünü açıklamalı");
assert.match(index, /btn-cari-islem kullanicilar yalnizca-yonetici/, "Panel yalnızca yöneticilere gösterilmeli");

assert.match(code, /function kullaniciYonetimVerisiniOku\(/, "Backend kullanıcı listesini döndürmeli");
assert.match(code, /function kullaniciYetkisiniKaydet\(/, "Backend yetki kaydetmeli");
assert.match(code, /function kullaniciYetkisiniKaldir\(/, "Backend yetki kaldırmalı");
assert.match(code, /\["users\.list", "users\.save", "users\.delete"\]/, "Kullanıcı yönetim API işlemleri tanımlı olmalı");
assert.match(code, /yetki\.role !== "admin"/, "Kullanıcı yönetimi backend tarafında yöneticiyle sınırlandırılmalı");
assert.match(code, /OWNER_PROTECTED/, "Proje sahibinin yetkisi korunmalı");

console.log("Dinamik kullanıcı ve yetki yönetim paneli testleri başarılı.");
