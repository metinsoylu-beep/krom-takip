const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
assert.match(index, /bekleyenBulutKontrolunuGuncelle\(\);[\s\S]*if \(yoneticiMi\(\)/, "Başka sekmedeki bekleyen gönderim Veri Kontrol Merkezi'ni yenilemeli");
const yardimciBaslangici = index.indexOf("function bekleyenBulutKaydiniDogrula");
const yardimciBitisi = index.indexOf("function bekleyenBulutKaydiKarari", yardimciBaslangici);
assert.ok(yardimciBaslangici >= 0 && yardimciBitisi > yardimciBaslangici, "Bekleyen kayıt yardımcıları bulunamadı");

const ortakDepo = new Map();
function sekmeOlustur() {
  let sira = 0;
  const context = {
    Date,
    JSON,
    Number,
    String,
    Set,
    BULUT_BEKLEYEN_ANAHTAR:"ortak-bekleyen-kayit",
    bekleyenBulutKaydi:null,
    bulutTekrarDenemeZamanlayici:null,
    istekKimligiOlustur:() => `uretilen-${++sira}`,
    clearTimeout() {},
    localStorage:{
      getItem:anahtar => ortakDepo.has(anahtar) ? ortakDepo.get(anahtar) : null,
      setItem:(anahtar,deger) => ortakDepo.set(anahtar,String(deger)),
      removeItem:anahtar => ortakDepo.delete(anahtar)
    }
  };
  vm.createContext(context);
  vm.runInContext(index.slice(yardimciBaslangici, yardimciBitisi), context);
  return context;
}

const sekmeA = sekmeOlustur();
const sekmeB = sekmeOlustur();
const durumA = { items:[{ id:"fatura-a" }], cariHareketler:[], cekler:[], cariler:[] };
const durumB = { items:[{ id:"fatura-b" }], cariHareketler:[], cekler:[], cariler:[] };
const kayitA = { id:"sekme-a", kayitZamani:"2026-09-04T10:00:00.000Z", baseRevision:7, durum:durumA };
const kayitB = { id:"sekme-b", kayitZamani:"2026-09-04T10:00:01.000Z", baseRevision:7, durum:durumB };

sekmeA.bekleyenBulutKaydi = kayitA;
assert.equal(sekmeA.bekleyenBulutKaydiniSakla(kayitA), true);
sekmeB.bekleyenBulutKaydi = kayitB;
assert.equal(sekmeB.bekleyenBulutKaydiniSakla(kayitB), true);

assert.equal(sekmeA.bekleyenBulutKaydiniTemizle("sekme-a"), true, "A sekmesi kendi tamamlanan belleğini temizleyebilmeli");
assert.equal(sekmeA.bekleyenBulutKaydi, null, "A sekmesinin tamamlanan bellek kaydı kaldırılmalı");
assert.equal(JSON.parse(ortakDepo.get("ortak-bekleyen-kayit")).id, "sekme-b", "A sekmesi B sekmesinin daha yeni kalıcı kaydını silmemeli");
assert.equal(sekmeB.bekleyenBulutKaydiniTemizle("sekme-b"), true);
assert.equal(ortakDepo.has("ortak-bekleyen-kayit"), false, "Yalnız eşleşen kayıt depodan kaldırılmalı");

assert.match(index, /window\.addEventListener\("storage"/, "Sekmeler arası depolama değişiklikleri dinlenmeli");
assert.match(index, /olay\.key === BULUT_BEKLEYEN_ANAHTAR/, "Diğer sekmenin bekleyen kaydı algılanmalı");
assert.match(index, /olay\.key !== BULUT_SURUM_ANAHTAR/, "Diğer sekmenin bulut sürümü algılanmalı");
assert.match(index, /function sekmelerArasiBulutYenilemesiniPlanla\(\)/, "Sekmeler arası güvenli yenileme planlayıcısı bulunmalı");
assert.match(index, /sekmelerArasiEsitlemeZamanlayici = setTimeout/, "Yeni bulut sürümünde yenileme kısa gecikmeyle planlanmalı");
assert.match(index, /bulutYuklemeDevamEdiyor \|\| bulutKaydiCalisiyor/, "Etkin bulut işlemi bitmeden ikinci yenileme başlatılmamalı");
assert.match(index, /requestId:sonKayit\.id/, "Kuyruk kaydı yeniden denenirken aynı istek kimliği kullanılmalı");
assert.match(index, /surum < bulutSurumu/, "Eski bir yanıt bulut sürümünü geriye düşürmemeli");

const dinleyiciBaslangici = index.indexOf('window.addEventListener("storage"');
const dinleyiciBitisi = index.indexOf("// ── SYNC", dinleyiciBaslangici);
let depolamaDinleyicisi = null;
const planlananGecikmeler = [];
let kontrolYenilemeSayisi = 0;
const dinleyiciContext = {
  window:{ addEventListener:(tur,islem) => { if (tur === "storage") depolamaDinleyicisi = islem; } },
  BULUT_BEKLEYEN_ANAHTAR:"bekleyen",
  BULUT_SURUM_ANAHTAR:"surum",
  bekleyenBulutKaydi:kayitA,
  bulutKaydiCalisiyor:false,
  bekleyenBulutKaydiKalici:true,
  bulutTekrarDenemeZamanlayici:null,
  sekmelerArasiEsitlemeZamanlayici:null,
  bulutSurumu:7,
  kullaniciRolu:"admin",
  YEREL_GELISTIRME:false,
  navigator:{ onLine:true },
  JSON,
  Number,
  bekleyenBulutKaydiniDogrula:kayit => Array.isArray(kayit?.durum?.items) ? kayit : null,
  bekleyenBulutKaydiEngelliMi:kayit => kayit?.kuyrukDurumu === "engelli",
  bekleyenBulutEngelMesaji:kayit => kayit?.sonHataMesaji || "Kontrol gerekli",
  bekleyenBulutKontrolunuGuncelle:() => { kontrolYenilemeSayisi += 1; },
  yoneticiMi:() => true,
  clearTimeout() {},
  setTimeout:(islem,gecikme) => { planlananGecikmeler.push(gecikme); return planlananGecikmeler.length; },
  syncGoster() {},
  bulutKayitKuyrugunuCalistir() {},
  sekmelerArasiBulutYenilemesiniPlanla:() => { planlananGecikmeler.push(500); },
  buludanYukle() {}
};
vm.createContext(dinleyiciContext);
vm.runInContext(index.slice(dinleyiciBaslangici, dinleyiciBitisi), dinleyiciContext);
assert.equal(typeof depolamaDinleyicisi, "function", "Depolama olayı dinleyicisi kurulmalı");

depolamaDinleyicisi({ key:"bekleyen", newValue:JSON.stringify(kayitB), oldValue:JSON.stringify(kayitA) });
assert.equal(dinleyiciContext.bekleyenBulutKaydi.id, "sekme-a", "Diğer sekmenin kaydı bellekteki gönderilmemiş kaydı ezmemeli");
assert.equal(dinleyiciContext.bekleyenBulutKaydiKalici, false, "Ortak depo başka sekmece değiştirilince bu sekmenin kaydı yalnız bellek riski olarak işaretlenmeli");
depolamaDinleyicisi({ key:"bekleyen", newValue:null, oldValue:JSON.stringify(kayitB) });
assert.equal(dinleyiciContext.bekleyenBulutKaydi.id, "sekme-a", "Diğer sekmenin temizliği farklı bellek kaydını silmemeli");
assert.equal(dinleyiciContext.bekleyenBulutKaydiKalici, false, "Diğer sekmenin temizliği bellekteki kaydı yanlışlıkla kalıcı saymamalı");

dinleyiciContext.bekleyenBulutKaydi = null;
depolamaDinleyicisi({ key:"bekleyen", newValue:JSON.stringify(kayitB), oldValue:null });
assert.equal(dinleyiciContext.bekleyenBulutKaydi.id, "sekme-b", "Boş sekme diğer sekmenin bekleyen kaydını devralmalı");
assert.equal(dinleyiciContext.bekleyenBulutKaydiKalici, true, "Ortak depodan devralınan kayıt kalıcı kabul edilmeli");
assert.ok(planlananGecikmeler.includes(500), "Devralınan kayıt kısa gecikmeyle gönderilmeli");
assert.ok(kontrolYenilemeSayisi >= 3, "Bekleyen kaydın eklenmesi ve temizlenmesi diğer sekmelerin kontrol merkezini yenilemeli");

const planSayisi = planlananGecikmeler.length;
dinleyiciContext.bekleyenBulutKaydi = null;
depolamaDinleyicisi({ key:"bekleyen", newValue:JSON.stringify({ ...kayitB, kuyrukDurumu:"engelli", sonHataMesaji:"Veri kontrolü gerekli" }), oldValue:null });
assert.equal(planlananGecikmeler.length, planSayisi, "Başka sekmeden gelen kalıcı engelli kayıt otomatik gönderim planlamamalı");

dinleyiciContext.bekleyenBulutKaydi = { ...kayitA, kuyrukDurumu:"bekliyor" };
dinleyiciContext.bekleyenBulutKaydiKalici = true;
const aktifKayitPlanSayisi = planlananGecikmeler.length;
depolamaDinleyicisi({ key:"bekleyen", newValue:JSON.stringify({ ...kayitB, kuyrukDurumu:"engelli", sonHataMesaji:"Diğer sekmede kontrol gerekli" }), oldValue:JSON.stringify(kayitA) });
assert.ok(planlananGecikmeler.length > aktifKayitPlanSayisi, "Gelen kayıt engelli olsa bile bu sekmedeki etkin ve gönderilebilir kayıt durdurulmamalı");
assert.equal(dinleyiciContext.bekleyenBulutKaydi.id, "sekme-a", "Gönderim kararı bu sekmenin etkin kaydına göre verilmeli");

depolamaDinleyicisi({ key:"surum", newValue:"8", oldValue:"7" });
assert.equal(dinleyiciContext.bulutSurumu, 8, "Diğer sekmenin yeni bulut sürümü belleğe alınmalı");
assert.ok(planlananGecikmeler.filter(gecikme => gecikme === 500).length >= 2, "Yeni sürüm algılandığında ekran yenilemesi planlanmalı");

const surumBaslangici = index.indexOf("function bulutSurumunuKaydet");
const surumBitisi = index.indexOf("function istekKimligiOlustur", surumBaslangici);
assert.ok(surumBaslangici >= 0 && surumBitisi > surumBaslangici, "Bulut sürümü yardımcı işlevi bulunamadı");
const yazilanSurumler = [];
const surumContext = {
  Number,
  String,
  bulutSurumu:8,
  BULUT_SURUM_ANAHTAR:"surum",
  localStorage:{ setItem:(anahtar,deger) => yazilanSurumler.push([anahtar,deger]) }
};
vm.createContext(surumContext);
vm.runInContext(index.slice(surumBaslangici, surumBitisi), surumContext);
surumContext.bulutSurumunuKaydet(7);
assert.equal(surumContext.bulutSurumu, 8, "Geç tamamlanan eski istek sürümü geriye düşürmemeli");
assert.equal(yazilanSurumler.length, 0, "Eski sürüm kalıcı depoya yazılmamalı");
surumContext.bulutSurumunuKaydet(9);
assert.equal(surumContext.bulutSurumu, 9, "Daha yeni sürüm kabul edilmeli");
assert.deepEqual(yazilanSurumler, [["surum", "9"]], "Yeni sürüm kalıcı depoya yazılmalı");

const gonderBaslangici = index.indexOf("async function bulutKaydiniGonder");
const gonderBitisi = index.indexOf("async function bulutKayitKuyrugunuCalistir", gonderBaslangici);
assert.ok(gonderBaslangici >= 0 && gonderBitisi > gonderBaslangici, "Bulut gönderim işlevi bulunamadı");
const gonderilenler = [];
const gonderContext = {
  String,
  Array,
  YEREL_GELISTIRME:false,
  BULUT_CAKISMA_ANAHTAR:"cakisma",
  bulutSurumu:7,
  sonGirisHatasi:"",
  firebaseAuth:null,
  yoneticiGerekli:() => true,
  syncGoster() {},
  bulutKilidiyleCalistir:islem => islem(),
  bulutDurumunuGetir:async () => ({ revision:7, items:[], cariHareketler:[], cekler:[], cariler:[] }),
  listeSurumImzasi:durum => JSON.stringify(durum?.items || []),
  bulutSurumunuKaydet(surum) { this.bulutSurumu = surum; },
  bulutCakismasiniKaydet() {},
  istekKimligiOlustur:() => "rastgele-istek",
  apiIstegi:async payload => { gonderilenler.push(payload); return { revision:8 }; },
  faturalariTekillestir:liste => ({ liste }),
  cariHareketleriNormallestir:liste => liste,
  cekleriNormallestir:liste => liste,
  cariKartlariniNormallestir:liste => liste,
  localStorage:{ removeItem() {} },
  depolamaSagligiYenile() {},
  alert() {}
};
vm.createContext(gonderContext);
vm.runInContext(index.slice(gonderBaslangici, gonderBitisi), gonderContext);

(async () => {
  const durum = { items:[{ id:"fatura-1" }], cariHareketler:[], cekler:[], cariler:[] };
  await gonderContext.bulutKaydiniGonder(durum, { requestId:"kalici-istek", baseRevision:7, kuyrukKaydi:true });
  gonderContext.bulutSurumu = 7;
  await gonderContext.bulutKaydiniGonder(durum, { requestId:"kalici-istek", baseRevision:7, kuyrukKaydi:true });
  assert.equal(gonderilenler.length, 2);
  assert.deepEqual(gonderilenler.map(item => item.requestId), ["kalici-istek", "kalici-istek"], "Ağ tekrarlarında istek kimliği değişmemeli");
  console.log("Çoklu sekme kuyruğu, otomatik yenileme ve idempotent yeniden deneme testleri başarılı.");
})().catch(hata => {
  console.error(hata);
  process.exitCode = 1;
});
