/* /lab/ yapılandırması — GERÇEK DOSYA ADI: config.js
   ────────────────────────────────────────────────────
   Bu dosyayı `config.js` olarak kopyalayıp doldur.

   Buradaki iki değer PUBLIC'tir, gizli değildir:
     • Supabase projesinin URL'i
     • "anon" (publishable) anahtar

   Anon anahtar tarayıcıya verilmek üzere tasarlanmıştır; tek başına
   hiçbir veriye erişim vermez. Erişimi RLS (Row Level Security)
   politikaları belirler — yani "giriş yapmış kullanıcı" olmadan
   sorgu boş döner. Kurulum adımları için repo kökündeki README.md.

   ⚠️ service_role anahtarını BURAYA ASLA KOYMA. O anahtar RLS'i
   tamamen bypass eder ve bu dosya herkese açıktır. Onun yeri
   GitHub Actions secret'ı. */

window.LAB_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY",

  /* Metriklerin yazıldığı tablo. README'deki şemayla aynı olmalı. */
  table: "app_metrics",

  /* Para birimi gösterimi. */
  currency: "USD"
};
