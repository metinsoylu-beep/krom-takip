# Design QA — Döviz Kurlarını Sola Taşıma

## Görsel kaynak ve hedef

- Kaynak görünüm: `qa/artifacts/exchange-rate-desktop.png`
- Kullanıcı hedefi: Üst şeritte merkezde duran USD ve EUR kur grubunu sola almak; mevcut alış/satış sırasını ve genel tasarım dilini korumak.
- Uygulanan görünüm: `qa/artifacts/exchange-rate-left-desktop.png`
- Tam görünüm karşılaştırması: `qa/artifacts/exchange-rate-left-comparison.png`
- Odaklı karşılaştırma: `qa/artifacts/exchange-rate-left-focused-comparison.png`

## Viewport ve durum

- Kaynak: 1920 × 1080 px, 1920 × 1080 CSS viewport, yoğunluk 1.
- Uygulama: 1920 × 1080 px, 1920 × 1080 CSS viewport, yoğunluk 1.
- Durum: yerel yönetici önizlemesi, üst döviz şeridi açık, TCMB kur verileri görünür.

## Tam görünüm karşılaştırması

- Döviz panelinin üst konumu, 1500 px genişliği, yüksekliği, renkleri ve sayfadaki diğer bölümler korunuyor.
- Önceki görünümde kur alanı panelin 642 px noktasından başlıyordu; yeni görünümde 434 px noktasından başlıyor ve 208 px sola taşınıyor.
- Başlık 223 px, kur grubu 480 px ve kalan sağ alan işlem düğmeleri için esnek olarak ayrılıyor.
- 1920 px masaüstü görünümünde yatay taşma bulunmuyor.

## Odaklı bölge karşılaştırması

- Başlık, Dolar ve Euro blokları arada geniş boşluk olmadan soldan sağa tek bir kompakt grup oluşturuyor.
- Alış değeri üstte, satış değeri altta ve para simgelerinin yanında kalıyor.
- Yenileme ve TCMB kaynak düğmeleri sağ uçta korunuyor.

## Gerekli uygunluk yüzeyleri

- Yazı ve tipografi: Mevcut yazı ailesi, ağırlıklar, boyutlar ve sayı hiyerarşisi değişmedi.
- Boşluk ve yerleşim: Kur grubunun merkez hizası kaldırıldı; başlığın hemen yanında soldan başlatıldı. Panelin yüksekliği ve iç ritmi korundu.
- Renkler ve tasarım değişkenleri: Lacivert, altın, yeşil ve mavi renkler ile sınır/gölge değerleri değiştirilmedi.
- Görsel ve ikon kalitesi: Mevcut Font Awesome grafik, dolar, euro, yenileme ve harici bağlantı ikonları korundu; yeni yaklaşık çizim veya yer tutucu eklenmedi.
- Metin ve içerik: TCMB başlığı, tarih, para birimi adları, ALIŞ ve SATIŞ metinleri değişmedi.

## Etkileşim ve teknik kontroller

- Döviz yenileme düğmesi etkin.
- TCMB kaynak bağlantısı görünür.
- Tarayıcı konsolunda hata yok.
- Otomatik testler: 15/15 başarılı.

## Bulgular

- P0: Yok.
- P1: Yok.
- P2: Yok.

## Karşılaştırma geçmişi

1. Kaynak görünümde USD ve EUR grupları üst panelin merkezinde kalıyordu.
2. Masaüstü grid yapısı `max-content max-content minmax(0, 1fr)` olarak değiştirildi; başlık ve kur grubu sola toplandı.
3. Son ölçümde başlık sağ kenarı ile kur grubunun sol kenarı 434 px noktasında birleşti; kur grubu 208 px sola taşındı.
4. Odaklı karşılaştırmada alış/satış sırası, değerlerin ikon yanındaki yerleşimi ve sağ işlem düğmeleri korundu.

## Uygulama kontrol listesi

- [x] Döviz kur grubunu sola taşı.
- [x] Başlık ile kur grubu arasındaki geniş boşluğu kaldır.
- [x] Alış üstte, satış altta düzenini koru.
- [x] İşlem düğmelerini sağ uçta tut.
- [x] Yatay taşmayı ve konsol hatalarını kontrol et.

final result: passed
