const SHEET_NAME = "Faturalar";
const SURUM_ANAHTAR = "FATURA_DATA_REVISION";
const SON_ISTEK_ANAHTAR = "FATURA_LAST_REQUEST_ID";
const VERI_BASLIK = [
  "id",
  "Fatura No",
  "Tarih",
  "Vade Günü",
  "Vade Tarihi",
  "Tutar",
  "Ödeme Durumu",
  "Ödeme Tarihi",
  "Durum"
];

function jsonCevabi(deger) {
  return ContentService.createTextOutput(JSON.stringify(deger))
    .setMimeType(ContentService.MimeType.JSON);
}

function bulutSurumuOku(properties) {
  const surum = parseInt(properties.getProperty(SURUM_ANAHTAR) || "0", 10);
  return isFinite(surum) && surum >= 0 ? surum : 0;
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

function faturaImzasi(item) {
  return [
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
    const item = {
      id: isFinite(idSayi) && idSayi > 0 ? idSayi : Date.now() + sira,
      no: String(ham.no || "").trim(),
      tarih: tarihMetni(ham.tarih),
      vadeGun: parseInt(ham.vadeGun, 10) || 90,
      tutar: tutarSayisi(ham.tutar),
      odendi: odendiMi(ham.odendi),
      odemeTarihi: tarihMetni(ham.odemeTarihi)
    };
    if (!item.no || !item.tarih || item.tutar <= 0) return;
    if (!item.odendi) item.odemeTarihi = "";

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

function doGet(e) {
  const kilit = LockService.getScriptLock();
  try {
    kilit.waitLock(30000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    let items = [];

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const baslikSatiri = data.findIndex(function(row) {
        return String(row[0]).trim() === "id";
      });

      if (baslikSatiri >= 0) {
        const rows = data.slice(baslikSatiri + 1)
          .filter(function(row) {
            return row[0] && String(row[0]).trim() !== "id";
          })
          .map(function(row) {
            return {
              id: String(row[0]),
              no: String(row[1] || ""),
              tarih: tarihMetni(row[2]),
              vadeGun: parseInt(String(row[3]).replace(/[^0-9]/g, ""), 10) || 90,
              tutar: String(row[5] || "0"),
              odendi: String(row[6]).trim() === "Ödendi",
              odemeTarihi: tarihMetni(row[7])
            };
          });
        items = faturalariTekillestir(rows);
      }
    }

    // Eski ön yüzler dizi almaya devam eder. Yeni ön yüz sürüm bilgisini
    // yalnızca format=v2 istediğinde alır; böylece dağıtım sırası güvenlidir.
    const v2 = e && e.parameter && String(e.parameter.format) === "v2";
    if (v2) {
      const properties = PropertiesService.getScriptProperties();
      return jsonCevabi({
        ok: true,
        revision: bulutSurumuOku(properties),
        lastRequestId: properties.getProperty(SON_ISTEK_ANAHTAR) || "",
        items: items
      });
    }

    return jsonCevabi(items);
  } catch (err) {
    return jsonCevabi({
      error: String(err)
    });
  } finally {
    if (kilit.hasLock()) kilit.releaseLock();
  }
}

function doPost(e) {
  const kilit = LockService.getScriptLock();
  try {
    const hamPayload = e && e.parameter ? e.parameter.payload : "";
    const payload = JSON.parse(hamPayload || "{}");
    if (payload.action !== "save") {
      return ContentService.createTextOutput("ok");
    }

    const items = faturalariTekillestir(payload.items);
    const requestId = String(payload.requestId || "").trim().slice(0, 120);
    const baseRevisionHam = payload.baseRevision;
    const baseRevision = baseRevisionHam === null || baseRevisionHam === undefined || baseRevisionHam === ""
      ? null
      : parseInt(baseRevisionHam, 10);
    kilit.waitLock(30000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
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

    let toplam = 0;
    let odenen = 0;
    items.forEach(function(item) {
      toplam += item.tutar;
      if (item.odendi) odenen += item.tutar;
    });

    const satirlar = [
      ["💰 TOPLAM TUTAR", "✅ ÖDENEN", "🔴 KALAN", "🕐 Son Güncelleme", "", "", "", "", ""],
      [
        toplam.toLocaleString("tr-TR") + " ₺",
        odenen.toLocaleString("tr-TR") + " ₺",
        (toplam - odenen).toLocaleString("tr-TR") + " ₺",
        new Date().toLocaleString("tr-TR"),
        "", "", "", "", ""
      ],
      ["", "", "", "", "", "", "", "", ""],
      VERI_BASLIK
    ];

    items.forEach(function(item) {
      satirlar.push([
        item.id,
        item.no,
        item.tarih,
        item.vadeGun + " gün",
        Utilities.formatDate(vadeTarihi(item.tarih, item.vadeGun), Session.getScriptTimeZone() || "Europe/Istanbul", "dd.MM.yyyy"),
        item.tutar,
        item.odendi ? "Ödendi" : "Ödenmedi",
        item.odemeTarihi,
        durumHesapla(item.tarih, item.vadeGun, item.odendi)
      ]);
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

    const yeniSurum = mevcutSurum + 1;
    const yeniProperties = {};
    yeniProperties[SURUM_ANAHTAR] = String(yeniSurum);
    if (requestId) yeniProperties[SON_ISTEK_ANAHTAR] = requestId;
    properties.setProperties(yeniProperties, false);

    return jsonCevabi({
      ok: true,
      revision: yeniSurum,
      requestId: requestId,
      count: items.length
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
