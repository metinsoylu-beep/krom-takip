# Google Sheets eşitleme ve erişim yetkileri

Bu klasördeki `Code.gs`, Firebase Authentication ile alınan kimlik jetonunu
sunucuda doğrular. Fatura verisi anonim `GET` isteklerine açılmaz; okuma ve
yazma işlemleri kimlik jetonunu `POST` gövdesinde gönderir.

İki rol vardır:

- `admin`: Verileri görüntüler; fatura ve manuel ödeme kayıtlarını ekler, düzenler ve siler.
- `viewer`: Verileri görüntüler ve filtreler; hiçbir kayıt değişikliği yapamaz.

Yeni manuel ödeme ve tahsilatlar faturadan bağımsız olarak `Cari Hareketler`
sayfasına, verilen çekler `Çekler`, cari kart bilgileri ise `Cariler` sayfasına
yazılır. Kasa ve banka kartları `Kasa Banka Hesapları` sayfasında tutulur;
`Cari Hareketler` ve `Çekler` sayfalarındaki `Hesap ID` sütunu hareketi ilgili
hesaba bağlar. `Faturalar` sayfasındaki `Fatura Türü` sütunu alış ve satış
faturalarını; `Cari Hareketler` sayfasındaki `İşlem Türü` sütunu ödeme ve
tahsilatları birbirinden ayırır.
Cari, fatura, ödeme/çek ve kullanıcı yetkisi değişiklikleri `İşlem Geçmişi`
sayfasına kullanıcı, tarih, işlem özeti ve veri sürümüyle kaydedilir. Bu kayıtları
uygulamadaki **İşlem Geçmişi** düğmesinden yalnızca yöneticiler görüntüleyebilir;
sayfanın sınırsız büyümemesi için son 500 kayıt korunur.
Her başarılı veri kaydından hemen önce fatura, cari kart, kasa/banka, ödeme ve çeklerin
tamamı `Bulut Yedekleri` sayfasına merkezi güvenlik kopyası olarak yazılır.
Yalnızca yöneticilerin erişebildiği **Bulut Yedekleri** panelinde son 20 kopya
listelenir ve seçilen sürüm güvenli biçimde geri yüklenebilir. Büyük veri
kümeleri Google Sheets hücre sınırına takılmaması için parçalara bölünür.
Cari kartta firma ve iletişim bilgileriyle birlikte devir borç veya devir alacak
bakiyesi tutulabilir. Cari hesapta alış faturası ve tahsilat borç tarafına;
satış faturası, ödeme ve iptal edilmemiş verilen çek alacak tarafına işlenir.
Net bakiye bu iki tarafın farkından hesaplanır. Ödeme veya tahsilat tutarı bir
faturaya otomatik dağıtılmaz.

Kasa/banka bakiyesinde tahsilatlar giriş, ödemeler çıkış sayılır. Verilen çek
beklerken banka bakiyesini etkilemez; yalnızca `Ödendi` durumuna geçtiğinde
bağlı banka hesabından düşer. Hesaba bağlı hareket bulunan bir hesap silinmez,
gerektiğinde `Pasif` duruma alınır. Eski hesap bilgisiz hareketler korunur ve
`Hesap belirtilmedi` olarak gösterilir; yeni kayıtlarda hesap seçimi zorunludur.

Eski kayıtlarla uyumluluk korunur. Tür alanı bulunmayan eski faturalar alış
faturası, tür alanı bulunmayan eski cari hareketler ödeme olarak kabul edilir;
mevcut kayıtlar silinmez veya yeniden oluşturulmaz.

`Cariler` sayfası ilk kayıt sırasında otomatik oluşturulur. Aynı firma adı veya
aynı dolu vergi numarasıyla ikinci bir cari kart oluşturulmaz. Eski fatura,
ödeme ve çeklerde bulunan firma adları sıfır devir bakiyeli cari kartlar olarak
otomatik tamamlanır; mevcut hareketler değiştirilmez.

`Faturalar` sayfasındaki `Takip Durumu` cari bakiyeden ayrıdır. Kapalı faturalar
vadesi geçen ve yaklaşan vade listelerine girmez; fatura düzenleme ekranından
yeniden açılabilir. Eski `Ödemeler` sayfası geçiş arşivi olarak korunur. Eski
ödeme kayıtları ilk geçişte bir kez cari harekete dönüştürülür ve ödendiği
bilinen faturaların vade takibi kapalı tutulur. Bu hareketler `Geçiş Kaydı`
olarak işaretlendiği için cari bakiyeyi düzeltir, fakat “Bu Ay Yapılan
Ödemeler” sayacını yapay olarak artırmaz.

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
