# Google Sheets eşitleme ve erişim yetkileri

Bu klasördeki `Code.gs`, Firebase Authentication ile alınan kimlik jetonunu
sunucuda doğrular. Fatura verisi anonim `GET` isteklerine açılmaz; okuma ve
yazma işlemleri kimlik jetonunu `POST` gövdesinde gönderir.

İki rol vardır:

- `admin`: Verileri görüntüler; fatura ve manuel ödeme kayıtlarını ekler, düzenler ve siler.
- `viewer`: Verileri görüntüler ve filtreler; hiçbir kayıt değişikliği yapamaz.

Manuel ödeme girişleri aynı çalışma kitabında otomatik oluşturulan `Ödemeler`
sayfasında ayrı satırlar olarak saklanır. Her satır ödeme kimliği, bağlı fatura,
tarih, tutar, yöntem, referans ve açıklama içerir. `Faturalar` sayfasındaki
ödeme durumu bu kayıtların toplamından otomatik hesaplanır; kısmi ödemeler
faturayı kapatmaz. Eski `Ödendi` kayıtları ilk geçişte `Eski kayıt` yöntemli
geriye uyumlu bir ödeme hareketine dönüştürülür.

Web uygulamasını dağıtan Google hesabı otomatik olarak `admin` kabul edilir.
Ek hesaplar Apps Script içindeki **Proje Ayarları > Komut Dosyası Özellikleri**
alanından tanımlanır:

- `ADMIN_EMAILS`: Virgülle ayrılmış ek yönetici e-posta adresleri.
- `VIEWER_EMAILS`: Virgülle ayrılmış salt görüntüleyici e-posta adresleri.

Örnek değer: `muhasebe@example.com,yonetim@example.com`

Yetki kuralları:

- `ADMIN_EMAILS` içindeki hesaplar tüm işlemleri yapabilir.
- `VIEWER_EMAILS` içindeki hesaplar yalnızca görüntüleyebilir.
- İki listede de olmayan hesapların uygulamaya erişimi reddedilir.
- Bir hesabın rolünü değiştirmek için adresi eski listeden çıkarıp yeni listeye
  ekleyin; aynı adresi iki listede birden tutmayın.

Firebase doğrulaması ilk kez eklendiğinde proje sahibi Apps Script
düzenleyicisindeki işlev listesinden `firebaseBaglantisiniYetkilendir` işlevini
seçip **Çalıştır** düğmesine bir kez basmalıdır. Google izin ekranında dış
hizmetlere bağlanma izni onaylandıktan sonra canlı uygulamadaki Google girişi
çalışır. Bu işlem yalnızca ilk kurulumda veya Google izinleri kaldırıldığında
tekrarlanır.

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
