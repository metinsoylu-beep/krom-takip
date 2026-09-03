const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const baslangic = code.indexOf("function listeDegisiklikSayilari");
const bitis = code.indexOf("function bulutSurumuOku", baslangic);
assert.ok(baslangic >= 0 && bitis > baslangic, "İşlem geçmişi karşılaştırma işlevleri bulunmalı");

const context = { Array, Object, JSON, String };
vm.createContext(context);
vm.runInContext(code.slice(baslangic, bitis), context);

const eskiDurum = {
  items:[{ id:"f-1", no:"A" }, { id:"f-2", no:"B" }],
  cariHareketler:[{ id:"h-1", tutar:100 }],
  cekler:[{ id:"c-1", durum:"Verildi" }],
  cariler:[{ id:"k-1", cari:"Örnek" }]
};
const yeniDurum = {
  items:[{ id:"f-1", no:"A-1" }, { id:"f-3", no:"C" }],
  cariHareketler:[{ id:"h-1", tutar:100 }, { id:"h-2", tutar:250 }],
  cekler:[],
  cariler:[{ id:"k-1", cari:"Örnek" }]
};

assert.deepEqual(
  { ...context.listeDegisiklikSayilari(eskiDurum.items, yeniDurum.items) },
  { eklenen:1, guncellenen:1, silinen:1 },
  "Eklenen, güncellenen ve silinen kayıtlar ayrı sayılmalı"
);
assert.equal(
  context.veriDegisiklikOzetiniOlustur(eskiDurum, yeniDurum),
  "Fatura: 1 eklendi, 1 güncellendi, 1 silindi · Cari hareket: 1 eklendi · Çek: 1 silindi",
  "Merkezi işlem geçmişi anlaşılır bir değişiklik özeti üretmeli"
);
assert.equal(context.veriDegisiklikOzetiniOlustur(eskiDurum, eskiDurum), "", "Değişmeyen veri için gereksiz günlük kaydı üretilmemeli");

assert.match(code, /const AUDIT_SHEET_NAME = "İşlem Geçmişi"/, "İşlem geçmişi ayrı Google Sheet sayfasında tutulmalı");
assert.match(code, /payload\.action === "audit\.list"/, "Yönetici işlem geçmişi API işlemi bulunmalı");
assert.match(code, /İşlem geçmişini yalnızca yöneticiler görüntüleyebilir/, "Salt görüntüleyici işlem geçmişine erişememeli");
assert.match(code, /AUDIT_MAX_RECORDS = 500/, "İşlem geçmişi sınırsız büyümemeli");
assert.match(index, /id="islem-gecmisi-btn"[^>]*class="yalnizca-yonetici"/, "İşlem geçmişi düğmesi yalnızca yöneticilere gösterilmeli");
assert.match(index, /id="islem-gecmisi-overlay"/, "İşlem geçmişi paneli arayüzde bulunmalı");
assert.match(index, /action:"audit\.list", limit:100/, "Ön yüz son 100 işlemi istemeli");

console.log("Merkezi işlem geçmişi ve yönetici görünürlüğü testleri başarılı.");
