# Google Sheets eşitleme kodu

Bu klasördeki `Code.gs`, aynı anda gelen kayıtların faturaları çoğaltmasını
önlemek için `LockService` kullanır. Gelen listede aynı kimliğe veya aynı
fatura no + tarih + vade + tutar birleşimine sahip kayıtları da tekilleştirir.

Değişikliğin canlı Google Sheets hizmetinde çalışması için:

1. Apps Script düzenleyicisindeki mevcut kodun tamamını `Code.gs` içeriğiyle değiştirin.
2. **Dağıt > Dağıtımları yönet > Düzenle > Yeni sürüm > Dağıt** adımlarını uygulayın.
3. Web uygulamasının URL'si değişirse `index.html` içindeki `API_URL` değerini güncelleyin.

Ön yüzdeki korumalar tek tarayıcıdaki hızlı/çift tıklamaları ve sekmeler arası
yarışları önler. Bu Apps Script kilidi ise farklı cihazlardan aynı anda gelen
istekleri güvenli biçimde sıraya koyar.
