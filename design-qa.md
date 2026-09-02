# Design QA — Sıkı Döviz Kuru Yerleşimi

## Görsel kaynak ve hedef

- Kaynak görünüm: `qa/artifacts/exchange-rate-before-stacked.png`
- Kullanıcı hedefi: USD ve EUR gruplarını birbirine yaklaştırmak; alış ve satış değerlerini para simgesinin yanında, alış üstte ve satış altta göstermek.
- Uygulanan masaüstü görünümü: `qa/artifacts/exchange-rate-desktop.png`
- Uygulanan telefon görünümü: `qa/artifacts/exchange-rate-mobile.png`
- Odaklı karşılaştırma: `qa/artifacts/exchange-rate-stacked-comparison.png`

## Viewport ve durum

- Masaüstü: 1920 × 1080 CSS viewport; uygulama içeriği 1920 × 1080 px; yoğunluk 1.
- Telefon: 390 × 844 CSS viewport; yakalanan içerik 375 × 812 px; yoğunluk 1.
- Durum: yerel yönetici önizlemesi, TCMB kuru yüklenmiş, bir örnek fatura gösteriliyor.

## Tam görünüm karşılaştırması

- Döviz şeridinin üst konumu, yüksekliği, renkleri ve mevcut işlevleri korunuyor.
- USD ve EUR bölümleri 240 px genişliğinde bitişik iki grup olarak ortalandı; önceki geniş yayılım kaldırıldı.
- Masaüstünde ve telefonda yatay taşma bulunmuyor.

## Odaklı bölge karşılaştırması

- Her para biriminde simge ile kur bilgilerinin yatay mesafesi 10 px.
- Para birimi adı üstte; alış değeri ikinci satırda, satış değeri üçüncü satırda.
- “ALIŞ” ve “SATIŞ” etiketleri kendi değerleriyle aynı satırda ve sola hizalı.
- Telefon görünümünde USD ve EUR grupları alt alta geçiyor; aynı dikey alış/satış sırası korunuyor.

## Gerekli uygunluk yüzeyleri

- Yazı ve tipografi: Mevcut Segoe UI/Georgia hiyerarşisi, ağırlıklar ve sayı okunabilirliği korundu.
- Boşluk ve yerleşim: Kur grupları sıkılaştırıldı; 10 px simge aralığı ve 0 px grup aralığı hedefi karşılıyor.
- Renkler: Mevcut lacivert, altın, yeşil ve mavi durum renkleri değişmedi.
- Görsel ve ikon kalitesi: Var olan Font Awesome dolar/euro ikonları korundu; yeni raster veya yaklaşık ikon üretilmedi.
- Metin ve içerik: TCMB tarihi, Dolar/TL, Euro/TL, USD/TRY, EUR/TRY, ALIŞ ve SATIŞ metinleri korundu.

## Bulgular

- P0: Yok.
- P1: Yok.
- P2: Yok.

## Karşılaştırma geçmişi

1. İlk uygulamada alış/satış iki satıra alındı ancak para simgesiyle arasında yaklaşık 100 px mesafe kaldı.
2. Kur kartı iki sütunlu yapıya çevrildi; para adı ve iki kur satırı simgenin hemen yanına taşındı.
3. Son kanıtta simge-kur aralığı 10 px, alış satırı satış satırının üstünde ve iki kur grubu bitişik ölçüldü.
4. Mobil görünümde `scrollWidth` ve `clientWidth` 375 px olarak eşit; tarayıcı konsol hatası yok.

## Uygulama kontrol listesi

- [x] USD ve EUR gruplarını yakınlaştır.
- [x] Alış değerini üst satıra yerleştir.
- [x] Satış değerini alt satıra yerleştir.
- [x] Kur bilgilerini para simgesinin yanına taşı.
- [x] Masaüstü ve telefon taşmasını kontrol et.

final result: passed
