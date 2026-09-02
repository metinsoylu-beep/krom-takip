# Design QA — Üst Döviz Kuru Şeridi

## Visual source

- Onaylanan seçenek: `C:\Users\Ryzen\.codex\generated_images\01a022f5-d85b-7ab1-b359-9d4906202cc1\exec-0544b77a-9344-4e41-967f-acb58989d7b0.png`
- Kaynak boyutu: 1485 × 1059 px
- Uygulanan masaüstü görüntüsü: `qa/artifacts/exchange-rate-reference-size.png`
- Uygulanan telefon görüntüsü: `qa/artifacts/exchange-rate-mobile.png`
- Yan yana karşılaştırma: `qa/artifacts/exchange-rate-comparison.png`

## Viewport and state

- Masaüstü: 1536 × 1024 CSS viewport, yerel yönetici önizlemesi, bir örnek fatura.
- Telefon: 390 × 844 CSS viewport, yerel yönetici önizlemesi, aynı örnek veri.
- Karşılaştırılan durum: sayfa ilk açılışı; döviz kuru yüklü ve filtreler kapalı.

## Full-view comparison

- Döviz kuru şeridi başlığın hemen altına ve filtrelerin üstüne taşındı.
- Şerit mevcut Arlinoks lacivert/altın görsel sistemiyle uyumlu tutuldu.
- USD ve EUR alış/satış değerleri tek bakışta okunabilecek iki eşit gruba ayrıldı.
- Yenile ve TCMB kaynak işlemleri sağ uçta, onaylanan görseldeki konumla eşleşiyor.
- 1536 px masaüstünde yatay taşma giderildi; “Yeni Fatura” düğmesi tamamen görünür.

## Focused-region comparison

- Şerit yüksekliği 62 px; filtrelerle arasındaki boşluk 14 px.
- Başlık, veri tarihi, para birimi ikonları ve alış/satış değerlerinde hiyerarşi korunuyor.
- Mobil görünümde başlık ve işlemler üst satırda, USD/EUR değerleri alt alta akıyor.
- 390 px mobil testinde yatay taşma yok.

## Findings

- P0: Yok.
- P1: Yok.
- P2: Yok.
- Kabul edilen ürün kısıtı: Onay yalnızca döviz alanını kapsadığı için mevcut Arlinoks üst menüsü ve canlı veri yapısı değiştirilmedi.

## Comparison history

1. İlk karşılaştırmada 1536 px görünümde filtre işlemlerinin 17 px taştığı görüldü.
2. İşlem düğmeleri ve filtre aralıkları sıkılaştırıldı.
3. İkinci karşılaştırmada `scrollWidth` ve `clientWidth` 1536 px olarak eşitlendi.
4. Masaüstü ve mobil tarayıcı konsolunda hata bulunmadı.

final result: passed
