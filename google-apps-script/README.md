# Google Sheets eşitleme ve erişim yetkileri

Bu klasördeki `Code.gs`, Firebase Authentication ile alınan kimlik jetonunu
sunucuda doğrular. Fatura verisi anonim `GET` isteklerine açılmaz; okuma ve
yazma işlemleri kimlik jetonunu `POST` gövdesinde gönderir.

İki rol vardır:

- `admin`: Verileri görüntüler; fatura ekler, düzenler, öder, geri alır ve siler.
- `viewer`: Verileri görüntüler ve filtreler; hiçbir kayıt değişikliği yapamaz.

Web uygulamasını dağıtan Google hesabı otomatik olarak `admin` kabul edilir.
Ek hesaplar Apps Script içindeki **Proje Ayarları > Komut Dosyası Özellikleri**
alanından tanımlanır:

- `ADMIN_EMAILS`: Virgülle ayrılmış ek yönetici e-posta adresleri.
- `VIEWER_EMAILS`: Virgülle ayrılmış salt görüntüleyici e-posta adresleri.

Örnek değer: `muhasebe@example.com,yonetim@example.com`

Kod ayrıca eşzamanlı kayıtların faturaları çoğaltmasını önlemek için
`LockService` kullanır. Veri kümesindeki `revision`, eski veriye sahip bir
cihazın daha yeni kayıtları sessizce ezmesini engeller. Her isteğin `requestId`
değeri ağ tekrarlarında aynı kaydın yeniden uygulanmasını önler.

Canlı Google Sheets hizmetini güncellemek için:

1. Apps Script düzenleyicisindeki mevcut kodun tamamını `Code.gs` ile değiştirin.
2. **Dağıt > Dağıtımları yönet > Düzenle > Yeni sürüm > Dağıt** adımlarını uygulayın.
3. Dağıtım **ben olarak çalıştır** ve erişim **herkes** olacak şekilde kalmalıdır.
   Veri güvenliği herkese açık URL'ye değil, Firebase jetonu ve sunucu rolüne dayanır.
4. Web uygulamasının URL'si değişirse `index.html` içindeki `API_URL` değerini güncelleyin.

Yeni bir kişiye görüntüleme yetkisi vermek için önce e-posta adresini
`VIEWER_EMAILS` özelliğine ekleyin. Kişi daha sonra uygulamada aynı Google
hesabıyla giriş yapar.
