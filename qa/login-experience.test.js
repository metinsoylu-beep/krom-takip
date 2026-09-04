const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");

assert.match(index, /aria-label="Giriş adımları"/, "Giriş ekranında kısa kullanım adımları bulunmalı");
assert.match(index, /Başka bir hesap kullan/, "Google ekranındaki alternatif hesap seçeneği anlatılmalı");
assert.match(index, /E-posta ve şifreniz bu uygulamaya değil/, "Kimlik bilgilerinin Google ekranına girileceği açıklanmalı");
assert.match(index, /Tarayıcıda aç/, "Uygulama içi tarayıcılar için yönlendirme bulunmalı");
assert.match(index, /function girisHatasiMesaji\(/, "Giriş hataları anlaşılır mesajlara çevrilmeli");
assert.match(index, /auth\/unauthorized-domain/, "Yetkisiz alan adı hatası açıklanmalı");
assert.match(index, /auth\/popup-blocked/, "Engellenen açılır pencere hatası açıklanmalı");
assert.match(index, /auth\/network-request-failed/, "Ağ hatası açıklanmalı");
assert.match(index, /auth\/operation-not-supported-in-this-environment/, "Desteklenmeyen tarayıcı hatası açıklanmalı");

console.log("Google giriş açıklamaları ve hata yönlendirmeleri testleri başarılı.");
