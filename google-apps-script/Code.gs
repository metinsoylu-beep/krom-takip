const SHEET_NAME = "Faturalar";
const PAYMENT_SHEET_NAME = "Ödemeler";
const SURUM_ANAHTAR = "FATURA_DATA_REVISION";
const SON_ISTEK_ANAHTAR = "FATURA_LAST_REQUEST_ID";
const IZLEYICI_EPOSTALARI_ANAHTAR = "VIEWER_EMAILS";
const YONETICI_EPOSTALARI_ANAHTAR = "ADMIN_EMAILS";
const FIREBASE_API_KEY = "AIzaSyAqIdRVFUIrreeyyj57PcM9fO_Iwv10idk";
const VERI_BASLIK = [
  "id",
  "Fatura No",
  "Cari/Firma",
  "Tarih",
  "Vade Günü",
  "Vade Tarihi",
  "Tutar",
  "Ödeme Durumu",
  "Ödeme Tarihi",
  "Durum"
];
const ODEME_BASLIK = [
  "Ödeme ID",
  "Fatura ID",
  "Ödeme Tarihi",
  "Tutar",
  "Yöntem",
  "Referans",
  "Açıklama",
  "Kayıt Zamanı"
];

function jsonCevabi(deger) {
  return ContentService.createTextOutput(JSON.stringify(deger))
    .setMimeType(ContentService.MimeType.JSON);
}

function bulutSurumuOku(properties) {
  const surum = parseInt(properties.getProperty(SURUM_ANAHTAR) || "0", 10);
  return isFinite(surum) && surum >= 0 ? surum : 0;
}

function epostaListesi() {
  const sonuc = {};
  Array.prototype.slice.call(arguments).forEach(function(deger) {
    String(deger || "").split(/[;,\n]/).forEach(function(eposta) {
      const temiz = eposta.trim().toLowerCase();
      if (temiz) sonuc[temiz] = true;
    });
  });
  return sonuc;
}

function kullaniciYetkisiniBul(eposta) {
  const properties = PropertiesService.getScriptProperties();
  let sahipEpostasi = "";
  try {
    sahipEpostasi = Session.getEffectiveUser().getEmail();
  } catch (err) {}

  const yoneticiler = epostaListesi(
    sahipEpostasi,
    properties.getProperty(YONETICI_EPOSTALARI_ANAHTAR)
  );
  const izleyiciler = epostaListesi(
    properties.getProperty(IZLEYICI_EPOSTALARI_ANAHTAR)
  );
  const temizEposta = String(eposta || "").trim().toLowerCase();

  if (yoneticiler[temizEposta]) return "admin";
  if (izleyiciler[temizEposta]) return "viewer";
  return "";
}

function firebaseKullanicisiniDogrula(idToken) {
  const token = String(idToken || "").trim();
  if (!token) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Google hesabıyla giriş yapın." };
  }

  try {
    const yanit = UrlFetchApp.fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(FIREBASE_API_KEY),
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ idToken: token }),
        muteHttpExceptions: true
      }
    );
    if (yanit.getResponseCode() !== 200) {
      return { ok: false, code: "AUTH_INVALID", message: "Oturum doğrulanamadı. Yeniden giriş yapın." };
    }

    const veri = JSON.parse(yanit.getContentText() || "{}");
    const kullanici = veri.users && veri.users[0];
    const eposta = String(kullanici && kullanici.email || "").trim().toLowerCase();
    if (!kullanici || !eposta || kullanici.emailVerified !== true) {
      return { ok: false, code: "AUTH_INVALID", message: "Doğrulanmış bir Google hesabı gerekli." };
    }

    const role = kullaniciYetkisiniBul(eposta);
    if (!role) {
      return { ok: false, code: "ACCESS_DENIED", message: "Bu hesabın uygulamaya erişim yetkisi yok." };
    }
    return {
      ok: true,
      role: role,
      email: eposta,
      uid: String(kullanici.localId || "")
    };
  } catch (err) {
    console.error("Firebase kimlik doğrulama hatası: " + (err && err.stack ? err.stack : err));
    return { ok: false, code: "AUTH_ERROR", message: "Kimlik doğrulama servisine ulaşılamadı." };
  }
}

/**
 * Proje sahibi bu işlevi Apps Script düzenleyicisinden yalnızca bir kez
 * çalıştırır. Google'ın dış bağlantı iznini istemesini ve Firebase doğrulama
 * servisine erişimin etkinleşmesini sağlar. Geçersiz deneme jetonu nedeniyle
 * 200 dışındaki bir HTTP sonucu beklenir; önemli olan isteğin yapılabilmesidir.
 */
function firebaseBaglantisiniYetkilendir() {
  const yanit = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(FIREBASE_API_KEY),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: "yetkilendirme-kontrolu" }),
      muteHttpExceptions: true
    }
  );
  const kod = yanit.getResponseCode();
  console.log("Firebase dış bağlantı izni etkin. Kontrol HTTP kodu: " + kod);
  return kod;
}

function tarihMetni(deger) {
  if (!deger) return "";
  if (deger instanceof Date && !isNaN(deger.getTime())) {
    return Utilities.formatDate(
      deger,
      Session.getScriptTimeZone() || "Europe/Istanbul",
      "yyyy-MM-dd"
    );
  }
  return String(deger).split("T")[0].trim();
}

function tarihOlustur(tarih) {
  const parcalar = tarihMetni(tarih).split("-").map(Number);
  if (parcalar.length === 3 && parcalar.every(Number.isFinite)) {
    return new Date(parcalar[0], parcalar[1] - 1, parcalar[2], 12, 0, 0, 0);
  }
  return new Date(tarih);
}

function tutarSayisi(deger) {
  if (typeof deger === "number") return isFinite(deger) ? deger : 0;
  let metin = String(deger || "").replace(/\s|₺/g, "");
  if (metin.indexOf(",") >= 0 && metin.indexOf(".") >= 0) {
    metin = metin.lastIndexOf(",") > metin.lastIndexOf(".")
      ? metin.replace(/\./g, "").replace(",", ".")
      : metin.replace(/,/g, "");
  } else if (metin.indexOf(",") >= 0) {
    metin = metin.replace(",", ".");
  }
  const sayi = Number(metin);
  return isFinite(sayi) ? sayi : 0;
}

function odendiMi(deger) {
  return deger === true ||
    deger === "true" ||
    deger === "TRUE" ||
    String(deger || "").trim() === "Ödendi";
}

function odemeKaydiniNormallestir(ham, faturaId, sira) {
  if (!ham || typeof ham !== "object") return null;
  const tutar = tutarSayisi(ham.tutar);
  const tarih = tarihMetni(ham.tarih || ham.odemeTarihi);
  if (!(tutar > 0) || !tarih) return null;
  const id = String(ham.id || ham.odemeId || "").trim() ||
    ("odm-" + String(faturaId) + "-" + String(Date.now() + (sira || 0)));
  return {
    id: id.slice(0, 160),
    faturaId: Number(faturaId),
    tarih: tarih,
    tutar: tutar,
    yontem: String(ham.yontem || ham.yontemAdi || "Belirtilmedi").trim().slice(0, 80),
    referans: String(ham.referans || "").trim().slice(0, 160),
    aciklama: String(ham.aciklama || "").trim().slice(0, 500),
    kayitZamani: String(ham.kayitZamani || "").trim().slice(0, 80)
  };
}

function odemeleriNormallestir(hamOdemeler, faturaId) {
  const gorulen = {};
  const sonuc = [];
  (Array.isArray(hamOdemeler) ? hamOdemeler : []).forEach(function(ham, sira) {
    const odeme = odemeKaydiniNormallestir(ham, faturaId, sira);
    if (!odeme || gorulen[odeme.id]) return;
    gorulen[odeme.id] = true;
    sonuc.push(odeme);
  });
  return sonuc.sort(function(a, b) {
    return a.tarih.localeCompare(b.tarih) ||
      a.kayitZamani.localeCompare(b.kayitZamani) ||
      a.id.localeCompare(b.id);
  });
}

function faturaOdemeOzetiniUygula(item, eskiOdendi) {
  if (!item.odemeler.length && eskiOdendi) {
    item.odemeler.push({
      id: "legacy-" + String(item.id),
      faturaId: item.id,
      tarih: item.odemeTarihi || item.tarih,
      tutar: item.tutar,
      yontem: "Eski kayıt",
      referans: "",
      aciklama: "Ödeme geçmişi özelliğinden önce ödendi olarak işaretlendi.",
      kayitZamani: ""
    });
  }
  const odenenTutar = item.odemeler.reduce(function(toplam, odeme) {
    return toplam + tutarSayisi(odeme.tutar);
  }, 0);
  item.odendi = odenenTutar + 0.005 >= item.tutar;
  item.odemeTarihi = item.odendi && item.odemeler.length
    ? item.odemeler.reduce(function(son, odeme) { return odeme.tarih > son ? odeme.tarih : son; }, "")
    : "";
  return item;
}

function faturaImzasi(item) {
  return [
    String(item.cari || "").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " "),
    String(item.no || "").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " "),
    tarihMetni(item.tarih),
    parseInt(item.vadeGun, 10) || 90,
    tutarSayisi(item.tutar).toFixed(2)
  ].join("|");
}

function faturalariTekillestir(items) {
  const sonuc = [];
  const idKonumlari = {};
  const imzaKonumlari = {};

  (Array.isArray(items) ? items : []).forEach(function(ham, sira) {
    if (!ham || typeof ham !== "object") return;
    const idSayi = Number(ham.id);
    const eskiOdendi = odendiMi(ham.odendi);
    const item = {
      id: isFinite(idSayi) && idSayi > 0 ? idSayi : Date.now() + sira,
      no: String(ham.no || "").trim(),
      cari: String(ham.cari || "").trim(),
      tarih: tarihMetni(ham.tarih),
      vadeGun: parseInt(ham.vadeGun, 10) || 90,
      tutar: tutarSayisi(ham.tutar),
      odendi: eskiOdendi,
      odemeTarihi: tarihMetni(ham.odemeTarihi),
      odemeler: []
    };
    if (!item.no || !item.tarih || item.tutar <= 0) return;
    item.odemeler = odemeleriNormallestir(ham.odemeler, item.id);
    faturaOdemeOzetiniUygula(item, eskiOdendi);

    const idAnahtari = String(item.id);
    const imza = faturaImzasi(item);
    let konum = Object.prototype.hasOwnProperty.call(idKonumlari, idAnahtari)
      ? idKonumlari[idAnahtari]
      : imzaKonumlari[imza];

    if (konum !== undefined) {
      delete idKonumlari[String(sonuc[konum].id)];
      sonuc[konum] = item;
    } else {
      konum = sonuc.length;
      sonuc.push(item);
    }
    idKonumlari[idAnahtari] = konum;
    imzaKonumlari[imza] = konum;
  });
  return sonuc;
}

function odemeVerileriniOku() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PAYMENT_SHEET_NAME);
  const gruplar = {};
  if (!sheet) return gruplar;
  const data = sheet.getDataRange().getValues();
  const baslikSatiri = data.findIndex(function(row) {
    return String(row[0] || "").trim() === "Ödeme ID";
  });
  if (baslikSatiri < 0) return gruplar;
  const basliklar = data[baslikSatiri].map(function(hucre) { return String(hucre || "").trim(); });
  const konum = function(ad) { return basliklar.indexOf(ad); };
  data.slice(baslikSatiri + 1).forEach(function(row, sira) {
    const faturaId = Number(row[konum("Fatura ID")]);
    const odeme = odemeKaydiniNormallestir({
      id: row[konum("Ödeme ID")],
      tarih: row[konum("Ödeme Tarihi")],
      tutar: row[konum("Tutar")],
      yontem: row[konum("Yöntem")],
      referans: row[konum("Referans")],
      aciklama: row[konum("Açıklama")],
      kayitZamani: row[konum("Kayıt Zamanı")]
    }, faturaId, sira);
    if (!isFinite(faturaId) || !(faturaId > 0) || !odeme) return;
    if (!gruplar[String(faturaId)]) gruplar[String(faturaId)] = [];
    gruplar[String(faturaId)].push(odeme);
  });
  return gruplar;
}

function vadeTarihi(tarih, vadeGun) {
  const d = tarihOlustur(tarih);
  d.setDate(d.getDate() + (parseInt(vadeGun, 10) || 90));
  return d;
}

function durumHesapla(tarih, vadeGun, odendi) {
  if (odendiMi(odendi)) return "✅ Ödendi";
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const vade = vadeTarihi(tarih, vadeGun);
  vade.setHours(0, 0, 0, 0);
  const gun = Math.round((vade - bugun) / 86400000);
  if (gun < 0) return "🔴 " + Math.abs(gun) + " gün gecikti";
  if (gun === 0) return "🟠 Bugün öde!";
  if (gun <= 7) return "🟡 " + gun + " gün kaldı";
  if (gun <= 30) return "🔵 " + gun + " gün kaldı";
  return "⚪ " + gun + " gün kaldı";
}

function faturaVerileriniOku() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const odemeGruplari = odemeVerileriniOku();
  let items = [];

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    const baslikSatiri = data.findIndex(function(row) {
      return String(row[0]).trim() === "id";
    });

    if (baslikSatiri >= 0) {
      const basliklar = data[baslikSatiri].map(function(hucre) {
        return String(hucre || "").trim();
      });
      const hucreOku = function(row, adlar, eskiKonum) {
        for (let i = 0; i < adlar.length; i++) {
          const konum = basliklar.indexOf(adlar[i]);
          if (konum >= 0) return row[konum];
        }
        return eskiKonum >= 0 ? row[eskiKonum] : "";
      };
      const rows = data.slice(baslikSatiri + 1)
        .filter(function(row) {
          return row[0] && String(row[0]).trim() !== "id";
        })
        .map(function(row) {
          const id = String(hucreOku(row, ["id"], 0));
          return {
            id: id,
            no: String(hucreOku(row, ["Fatura No", "no"], 1) || ""),
            cari: String(hucreOku(row, ["Cari/Firma", "Cari", "cari"], -1) || ""),
            tarih: tarihMetni(hucreOku(row, ["Tarih", "tarih"], 2)),
            vadeGun: parseInt(String(hucreOku(row, ["Vade Günü", "vadeGun"], 3)).replace(/[^0-9]/g, ""), 10) || 90,
            tutar: String(hucreOku(row, ["Tutar", "tutar"], 5) || "0"),
            odendi: String(hucreOku(row, ["Ödeme Durumu", "odendi"], 6)).trim() === "Ödendi",
            odemeTarihi: tarihMetni(hucreOku(row, ["Ödeme Tarihi", "odemeTarihi"], 7)),
            odemeler: odemeGruplari[id] || []
          };
        });
      items = faturalariTekillestir(rows);
    }
  }

  const properties = PropertiesService.getScriptProperties();
  return {
    revision: bulutSurumuOku(properties),
    lastRequestId: properties.getProperty(SON_ISTEK_ANAHTAR) || "",
    items: items
  };
}

// Mevcut tabloya yalnızca boş Cari/Firma sütun başlığını ekler. Fatura
// satırlarını ve özet hücrelerini değiştirmez; tekrar çalıştırılması güvenlidir.
function cariSutununuHazirla() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return { ok: false, message: "Faturalar sayfası bulunamadı." };

  const data = sheet.getDataRange().getValues();
  const baslikSatiri = data.findIndex(function(row) {
    return String(row[0]).trim() === "id";
  });
  if (baslikSatiri < 0) return { ok: false, message: "Fatura başlık satırı bulunamadı." };

  const basliklar = data[baslikSatiri].map(function(hucre) {
    return String(hucre || "").trim();
  });
  if (basliklar.indexOf("Cari/Firma") >= 0) {
    return { ok: true, changed: false, message: "Cari/Firma sütunu zaten hazır." };
  }

  const hedefSutun = basliklar.length + 1;
  sheet.getRange(baslikSatiri + 1, hedefSutun).setValue("Cari/Firma");
  return { ok: true, changed: true, column: hedefSutun, message: "Cari/Firma sütunu eklendi." };
}

function doGet() {
  // Fatura verisi URL parametreleriyle veya anonim GET isteğiyle verilmez.
  // Kimlik jetonu yalnızca POST gövdesinde kabul edilir.
  return jsonCevabi({
    ok: false,
    code: "AUTH_REQUIRED",
    message: "Google hesabıyla giriş yapın."
  });
}

function doPost(e) {
  const kilit = LockService.getScriptLock();
  try {
    const hamPayload = e && e.parameter ? e.parameter.payload : "";
    const payload = JSON.parse(hamPayload || "{}");
    const yetki = firebaseKullanicisiniDogrula(payload.idToken);
    if (!yetki.ok) return jsonCevabi(yetki);

    if (payload.action === "read") {
      kilit.waitLock(30000);
      const durum = faturaVerileriniOku();
      return jsonCevabi({
        ok: true,
        role: yetki.role,
        revision: durum.revision,
        lastRequestId: durum.lastRequestId,
        items: durum.items
      });
    }

    if (payload.action !== "save") {
      return jsonCevabi({ ok: false, code: "INVALID_ACTION", message: "Geçersiz işlem." });
    }
    if (yetki.role !== "admin") {
      return jsonCevabi({ ok: false, code: "FORBIDDEN", message: "Salt görüntüleme hesabı değişiklik yapamaz." });
    }

    const requestId = String(payload.requestId || "").trim().slice(0, 120);
    const baseRevisionHam = payload.baseRevision;
    const baseRevision = baseRevisionHam === null || baseRevisionHam === undefined || baseRevisionHam === ""
      ? null
      : parseInt(baseRevisionHam, 10);
    kilit.waitLock(30000);

    // Eski bir ön yüz odemeler alanını hiç göndermiyorsa var olan ödeme
    // hareketlerini koru. Yeni ön yüz [] gönderdiğinde ise bilinçli silme
    // kabul edilir. Böylece dağıtım geçişinde ödeme geçmişi kaybolmaz.
    const mevcutOdemeGruplari = odemeVerileriniOku();
    const guvenliGelenItems = (Array.isArray(payload.items) ? payload.items : []).map(function(ham) {
      if (!ham || typeof ham !== "object" || Object.prototype.hasOwnProperty.call(ham, "odemeler")) return ham;
      const kopya = {};
      Object.keys(ham).forEach(function(anahtar) { kopya[anahtar] = ham[anahtar]; });
      kopya.odemeler = mevcutOdemeGruplari[String(ham.id)] || [];
      return kopya;
    });
    const items = faturalariTekillestir(guvenliGelenItems);
    const properties = PropertiesService.getScriptProperties();
    const mevcutSurum = bulutSurumuOku(properties);
    const sonRequestId = properties.getProperty(SON_ISTEK_ANAHTAR) || "";

    // Ağ tekrarları aynı isteği ikinci kez uygulamasın.
    if (requestId && requestId === sonRequestId) {
      return jsonCevabi({
        ok: true,
        replayed: true,
        revision: mevcutSurum,
        requestId: requestId,
        count: items.length
      });
    }

    // Eski bir cihaz, daha yeni bulut verisini sessizce ezemez. baseRevision
    // göndermeyen eski ön yüzler geçiş dönemi boyunca çalışmaya devam eder.
    if (baseRevision !== null && (!isFinite(baseRevision) || baseRevision !== mevcutSurum)) {
      return jsonCevabi({
        ok: false,
        conflict: true,
        revision: mevcutSurum,
        requestId: requestId,
        message: "Bulut verisi başka bir cihazda değiştirildi."
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const paymentSheet = ss.getSheetByName(PAYMENT_SHEET_NAME) || ss.insertSheet(PAYMENT_SHEET_NAME);

    let toplam = 0;
    let odenen = 0;
    items.forEach(function(item) {
      toplam += item.tutar;
      const faturaOdemesi = item.odemeler.reduce(function(araToplam, odeme) {
        return araToplam + tutarSayisi(odeme.tutar);
      }, 0);
      odenen += Math.min(item.tutar, faturaOdemesi);
    });

    const satirlar = [
      ["💰 TOPLAM TUTAR", "✅ ÖDENEN", "🔴 KALAN", "🕐 Son Güncelleme", "", "", "", "", "", ""],
      [
        toplam.toLocaleString("tr-TR") + " ₺",
        odenen.toLocaleString("tr-TR") + " ₺",
        (toplam - odenen).toLocaleString("tr-TR") + " ₺",
        new Date().toLocaleString("tr-TR"),
        "", "", "", "", "", ""
      ],
      ["", "", "", "", "", "", "", "", "", ""],
      VERI_BASLIK
    ];

    items.forEach(function(item) {
      satirlar.push([
        item.id,
        item.no,
        item.cari,
        item.tarih,
        item.vadeGun + " gün",
        Utilities.formatDate(vadeTarihi(item.tarih, item.vadeGun), Session.getScriptTimeZone() || "Europe/Istanbul", "dd.MM.yyyy"),
        item.tutar,
        item.odendi ? "Ödendi" : (item.odemeler.length ? "Kısmi Ödendi" : "Ödenmedi"),
        item.odemeTarihi,
        item.odemeler.length && !item.odendi
          ? "🟡 Kısmi ödendi · " + Math.max(0, item.tutar - item.odemeler.reduce(function(araToplam, odeme) { return araToplam + tutarSayisi(odeme.tutar); }, 0)).toLocaleString("tr-TR") + " ₺ kaldı"
          : durumHesapla(item.tarih, item.vadeGun, item.odendi)
      ]);
    });

    const odemeSatirlari = [ODEME_BASLIK];
    items.forEach(function(item) {
      item.odemeler.forEach(function(odeme) {
        odemeSatirlari.push([
          odeme.id,
          item.id,
          odeme.tarih,
          odeme.tutar,
          odeme.yontem,
          odeme.referans,
          odeme.aciklama,
          odeme.kayitZamani
        ]);
      });
    });

    // Kilit altında tek seferde yazılır; eşzamanlı istekler satırları iç içe geçiremez.
    sheet.clearContents();
    sheet.getRange(1, 1, satirlar.length, VERI_BASLIK.length).setValues(satirlar);

    sheet.getRange(1, 1, 1, 4)
      .setBackground("#1e3a5f")
      .setFontColor("#c9a84c")
      .setFontWeight("bold");
    sheet.getRange(2, 1).setFontColor("#f1f5f9").setFontWeight("bold");
    sheet.getRange(2, 2).setFontColor("#4ade80").setFontWeight("bold");
    sheet.getRange(2, 3).setFontColor("#ef4444").setFontWeight("bold");
    sheet.getRange(4, 1, 1, VERI_BASLIK.length)
      .setBackground("#1e3a5f")
      .setFontColor("#c9a84c")
      .setFontWeight("bold");

    // Her ödeme ayrı satırda tutulur. Böylece kısmi ve çoklu ödemelerin
    // tarihçesi fatura tablosundan bağımsız olarak denetlenebilir.
    paymentSheet.clearContents();
    paymentSheet.getRange(1, 1, odemeSatirlari.length, ODEME_BASLIK.length).setValues(odemeSatirlari);
    paymentSheet.getRange(1, 1, 1, ODEME_BASLIK.length)
      .setBackground("#1e3a5f")
      .setFontColor("#c9a84c")
      .setFontWeight("bold");

    const yeniSurum = mevcutSurum + 1;
    const yeniProperties = {};
    yeniProperties[SURUM_ANAHTAR] = String(yeniSurum);
    if (requestId) yeniProperties[SON_ISTEK_ANAHTAR] = requestId;
    properties.setProperties(yeniProperties, false);

    return jsonCevabi({
      ok: true,
      role: yetki.role,
      revision: yeniSurum,
      requestId: requestId,
      count: items.length,
      paymentCount: odemeSatirlari.length - 1
    });
  } catch (err) {
    return jsonCevabi({
      ok: false,
      error: String(err)
    });
  } finally {
    if (kilit.hasLock()) kilit.releaseLock();
  }
}
