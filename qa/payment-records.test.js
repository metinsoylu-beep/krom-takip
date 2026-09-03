const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = index.indexOf("function tutarSayiyaCevir");
const bitis = index.indexOf("function odemeKaydiniNormallestir", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "Cari hesap veri modeli işlevleri bulunamadı");

const depo = new Map();
const context = {
  console, Date, Math, Number, String, Array, Set, Map, JSON,
  CARI_HAREKET_ANAHTAR:"hareketler",
  CEK_ANAHTAR:"cekler",
  ESKI_ODEME_GECIS_ANAHTAR:"eski-gecis",
  localStorage: {
    getItem: anahtar => depo.get(anahtar) || null,
    setItem: (anahtar,deger) => depo.set(anahtar,String(deger))
  },
  tutarSayiyaCevir: deger => Number(deger) || 0,
  tarihGecerliMi: deger => /^\d{4}-\d{2}-\d{2}$/.test(String(deger || "")),
  faturaYukle: () => []
};
vm.createContext(context);
vm.runInContext(index.slice(baslangic, bitis), context);

const faturalar = [{ id:1, cari:"Firma A", no:"A-1", tarih:"2026-09-01", vadeGun:30, tutar:100 }];
const hareketler = [{ id:"h-1", cari:"Firma A", tarih:"2026-09-02", tutar:150, yontem:"Havale / EFT" }];
const iptalEdilenHareket = { id:"h-2", cari:"Firma A", tarih:"2026-09-03", tutar:80, yontem:"Nakit", durum:"İptal", iptalZamani:"2026-09-04T10:00:00.000Z", iptalNedeni:"Mükerrer kayıt" };
const verildi = [{ id:"c-1", cari:"Firma A", tarih:"2026-09-03", vadeTarihi:"2026-10-03", tutar:25, cekNo:"001", banka:"Test Bank", durum:"Verildi" }];

let hesap = context.cariOzetleriniHesapla(faturalar, hareketler, [])[0];
assert.equal(hesap.bakiye, -50, "Faturadan fazla ödeme alacak bakiyesi oluşturmalı");
assert.deepEqual({ ...context.bakiyeBilgisi(hesap.bakiye) }, { etiket:"Alacak Bakiyesi", sinif:"bakiye-alacak", tutar:50 });
hesap = context.cariOzetleriniHesapla(faturalar, [...hareketler,iptalEdilenHareket], [])[0];
assert.equal(hesap.bakiye, -50, "İptal edilen ödeme bakiyeyi değiştirmemeli");
assert.equal(context.cariHareketiniNormallestir(iptalEdilenHareket).iptalNedeni, "Mükerrer kayıt", "İptal nedeni korunmalı");

hesap = context.cariOzetleriniHesapla(faturalar, [], verildi)[0];
assert.equal(hesap.bakiye, 75, "Verilen çek cari borçtan bir kez düşmeli");
assert.equal(context.cariOzetleriniHesapla(faturalar, [], [{ ...verildi[0], durum:"Ödendi" }])[0].bakiye, 75, "Çekin ödendi yapılması ikinci kez düşmemeli");
assert.equal(context.cariOzetleriniHesapla(faturalar, [], [{ ...verildi[0], durum:"İptal" }])[0].bakiye, 100, "İptal edilen çek bakiyeyi etkilememeli");
assert.equal(context.cekiNormallestir({ ...verildi[0], durum:"Ödendi", odemeTarihi:"2026-10-04" }).odemeTarihi, "2026-10-04", "Ödenen çekin ödeme tarihi korunmalı");
assert.equal(context.cekiNormallestir({ ...verildi[0], odemeTarihi:"2026-10-04" }).odemeTarihi, "", "Bekleyen çekte geçersiz ödeme tarihi taşınmamalı");
assert.equal(context.cekiNormallestir({ ...verildi[0], durum:"İptal", iptalNedeni:"Hatalı çek", iptalZamani:"2026-09-04T10:00:00.000Z" }).iptalNedeni, "Hatalı çek", "Çek iptal nedeni korunmalı");
const iptalEdilenCek = context.cekiNormallestir({ ...verildi[0], durum:"İptal", iptalOncesiDurum:"Ödendi", odemeTarihi:"2026-10-04", iptalNedeni:"Yanlış işlem" });
assert.equal(iptalEdilenCek.iptalOncesiDurum, "Ödendi", "Çek iptal edilmeden önceki durum korunmalı");
assert.equal(context.iptalEdilenCariKaydiniGeriAl("cek", iptalEdilenCek).durum, "Ödendi", "İptal edilen çek önceki durumuna dönmeli");
assert.equal(context.iptalEdilenCariKaydiniGeriAl("cek", iptalEdilenCek).odemeTarihi, "2026-10-04", "Ödenmiş çek geri alındığında ödeme tarihi korunmalı");
assert.equal(context.iptalEdilenCariKaydiniGeriAl("hareket", iptalEdilenHareket).durum, "Aktif", "İptal edilen ödeme yeniden aktif olmalı");
assert.equal(context.iptalEdilenCariKaydiniGeriAl("hareket", iptalEdilenHareket).iptalNedeni, "", "Geri alınan ödemenin iptal alanları temizlenmeli");

const ayniOdeme = { id:"h-3", cari:" firma a ", tarih:"2026-09-02", tutar:"150,00", yontem:"havale / eft", referans:"" };
assert.equal(context.benzerCariHareketiBul("hareket",ayniOdeme,hareketler,[])?.id,"h-1","Aynı aktif ödeme tespit edilmeli");
assert.equal(context.benzerCariHareketiBul("hareket",{ ...ayniOdeme, referans:"REF-2" },hareketler,[]),null,"Farklı referanslı ödeme ayrı kabul edilmeli");
assert.equal(context.benzerCariHareketiBul("hareket",iptalEdilenHareket,[iptalEdilenHareket],[]),null,"İptal edilmiş ödeme benzer kayıt uyarısı oluşturmamalı");
const ayniCek = { ...verildi[0], id:"c-2", cari:"FİRMA A", cekNo:" 001 ", banka:"test bank" };
assert.equal(context.benzerCariHareketiBul("cek",ayniCek,[],verildi)?.id,"c-1","Aynı aktif çek tespit edilmeli");
assert.equal(context.benzerCariHareketiBul("cek",ayniCek,[],[{ ...verildi[0], durum:"İptal" }]),null,"İptal edilmiş çek benzer kayıt uyarısı oluşturmamalı");

const eskiFatura = [{ id:9, cari:"Eski Firma", no:"E-1", tarih:"2026-08-01", tutar:250, odemeTarihi:"2026-08-20", odemeler:[{ id:"odm-9", tarih:"2026-08-20", tutar:250, yontem:"Eski kayıt" }] }];
assert.equal(context.eskiFaturaOdemeleriniAktar(eskiFatura), true, "Eski fatura ödemesi cari harekete aktarılmalı");
assert.equal(JSON.parse(depo.get("hareketler"))[0].id, "legacy-odm-9");
depo.set("hareketler", "[]");
assert.equal(context.eskiFaturaOdemeleriniAktar(eskiFatura), false, "Tamamlanan eski ödeme geçişi tekrar çalışmamalı");
assert.deepEqual(JSON.parse(depo.get("hareketler")), [], "Silinen eski ödeme yeniden oluşturulmamalı");

assert.match(index, /id="cari-hesaplar-overlay"/, "Cari hesaplar ekranı bulunmalı");
assert.match(index, /id="odeme-tur"/, "Ödeme ve çek işlem türü seçilebilmeli");
assert.match(index, /id="cek-no"/, "Çek numarası alanı bulunmalı");
assert.match(index, /id="cek-odeme-tarihi"/, "Ödenen çek için ödeme tarihi alanı bulunmalı");
assert.match(index, /function cekOdemeTarihiDogrulamaMesaji\(/, "Çek ödeme tarihi sınırları doğrulanmalı");
assert.match(index, /Ödeme tarihi çekin veriliş tarihinden önce olamaz/, "Veriliş öncesi ödeme tarihi engellenmeli");
assert.match(index, /Ödeme tarihi bugünden ileri olamaz/, "Gelecek ödeme tarihi engellenmeli");
assert.match(index, /function cekDurumunuDegistir\(/, "Çek durumu güncellenebilmeli");
assert.match(index, /id="cari-hareket-iptal-overlay"/, "Silme yerine nedenli iptal penceresi bulunmalı");
assert.match(index, /function cariHareketIptaliniOnayla\(/, "Cari hareket iptali desteklenmeli");
assert.match(index, /function cariHareketIptaliniGeriAl\(/, "İptal edilen cari hareket yeniden etkinleştirilebilmeli");
assert.match(index, /class="odeme-kaydi-geri-al"/, "İptal edilen kayıtta geri alma düğmesi bulunmalı");
assert.match(index, /function cariHareketDuzenlemeyiBaslat\(/, "Aktif ödeme ve çek kayıtları düzenlenebilmeli");
assert.match(index, /class="odeme-kaydi-duzenle"/, "Aktif cari harekette düzenleme düğmesi bulunmalı");
assert.match(index, /Kaydın türü değiştirilemez/, "Düzenleme sırasında ödeme ve çek türü korunmalı");
assert.match(index, /Değişiklikten önce otomatik yedek alınacaktır/, "Finansal kayıt düzenlemesi açık onay ve yedek uyarısı içermeli");
assert.match(index, /"Çek kaydı düzenlendi" : "Ödeme kaydı düzenlendi"/, "Düzenleme işlem geçmişinde ayırt edilebilmeli");
assert.match(index, /let cariHareketKayitKilidi = false;/, "Hızlı çift tıklama için cari hareket kayıt kilidi bulunmalı");
assert.match(index, /Aynı bilgilerle aktif bir ödeme kaydı zaten var/, "Benzer ödeme için açık kullanıcı uyarısı bulunmalı");
assert.match(index, /Aynı bilgilerle aktif bir çek kaydı zaten var/, "Benzer çek için açık kullanıcı uyarısı bulunmalı");
assert.match(index, /code === "DUPLICATE_MOVEMENT"/, "Sunucunun mükerrer kayıt reddi güvenli biçimde ele alınmalı");
assert.match(code, /function yeniBenzerCariHareketleriniBul\(/, "Apps Script yeni benzer cari hareketlerini denetlemeli");
assert.match(code, /code:"DUPLICATE_MOVEMENT"/, "Apps Script yeni mükerrer ödemeyi veya çeki reddetmeli");
assert.match(index, /auditAction:mesaj \|\| "Cari hesap değiştirildi"/, "Cari hesap işlemi merkezi işlem geçmişinde adıyla saklanmalı");
assert.doesNotMatch(index, /function cariHareketSil\(/, "Cari hareket fiziksel olarak silinmemeli");
assert.doesNotMatch(index, />Ödeme Gir</, "Fatura satırında ödeme düğmesi bulunmamalı");
assert.match(code, /const MOVEMENT_SHEET_NAME = "Cari Hareketler"/);
assert.match(code, /const CHECK_SHEET_NAME = "Çekler"/);
assert.match(code, /movementSheet\.getRange/);
assert.match(code, /checkSheet\.getRange/);
assert.match(code, /"İptal Öncesi Durum"/, "Çeklerin iptal öncesi durumu Google Sheets'te saklanmalı");
assert.match(code, /"Ödeme Tarihi"/, "Çek ödeme tarihi Google Sheets'te saklanmalı");
assert.match(code, /code:"INVALID_CHECK_SETTLEMENT_DATE"/, "Geçersiz yeni çek ödeme tarihi sunucuda reddedilmeli");

console.log("Cari ödeme, alacak bakiyesi ve çek hareketi testleri başarılı.");
