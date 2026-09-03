/* Uygulama eşleme tablosu — iOS bundle ID ↔ Android paket adı ↔ vault slug'ı.
   ascelerate ve gplay farklı kimlikler kullanıyor, satış raporu ise üçüncü bir
   şey (SKU) kullanıyor. Panelde tek satırda görünsünler diye burada elle
   eşleştiriliyor. Yeni uygulama çıkarsa tek eklenecek yer burası.

   ios.sku alanı Sales & Trends raporundaki SKU sütunu — `ascelerate apps list`
   çıktısından geliyor ve bundle ID ile aynı olmak zorunda değil. */

export const APPS = [
  { slug: "walletcoach",        ad: "Wallet Coach",        ios: { bundle: "com.aberk.walletcoach",             sku: "walletcoach" },                       android: "com.aberk.walletcoach" },
  { slug: "bosyeryok",          ad: "No Spaces: Tycoon",   ios: { bundle: "com.aberk.bosyeryok",               sku: "bosyeryok" },                         android: "com.aberk.bosyeryok" },
  { slug: "bodybook",           ad: "BodyBook",            ios: { bundle: "com.aberk.bodybook",                sku: "bodybook-ios-001" },                  android: "com.aberk.bodybook" },
  { slug: "tasbih-tally",       ad: "Tasbih Tally",        ios: { bundle: "com.aberk.Tasbih-Tally",            sku: "tasbih_tally_001" },                  android: "com.aberk.tasbihTally" },
  { slug: "orbix-roulette",     ad: "Orbix Roulette",      ios: { bundle: "com.aberk.Orbix-Roulette",          sku: "orbix_v1" },                          android: "com.aberk.orbixroulette" },
  { slug: "tennis-padel",       ad: "Tennis Padel",        ios: { bundle: "com.aberk.TennisPadelScoreKeeper",  sku: "tennis_padel_001" },                  android: "com.aberk.wear" },
  { slug: "o-mu-bu-mu",         ad: "O mu Bu mu?",         ios: { bundle: "com.berkalparslan.thisOne",         sku: "com.aberk.thisone" },                 android: "com.berkalparslan.thisOne" },

  /* Daily Whisper iOS'ta eşinin geliştirici hesabında — bu hesaptan ölçülemiyor.
     Android tarafı burada. */
  { slug: "daily-whisper",      ad: "Daily Whisper",       ios: null,                                                                                      android: "com.aberk.dailywhisper" },

  /* Yalnız iOS */
  { slug: "rally-badminton",    ad: "Rally: Badminton",    ios: { bundle: "com.aberk.BadmintonScoreKeeper",    sku: "com.aberk.BadmintonScoreKeeper" },    android: null },
  { slug: "rally-table-tennis", ad: "Rally: Table Tennis", ios: { bundle: "com.aberk.TableTennisScoreKeeper",  sku: "com.aberk.TableTennisScoreKeeper" },  android: null },
  { slug: "pickleball",         ad: "Pickleball",          ios: { bundle: "com.aberk.Pickleball-Score-Keeper", sku: "pickleball-v1" },                     android: null },
  { slug: "volleyball",         ad: "Volleyball",          ios: { bundle: "com.aberk.Volleyball-Score-Keeper", sku: "com.aberk.Volleyball-Score-Keeper" }, android: null },
  { slug: "yonca",              ad: "Yonca",               ios: { bundle: "com.aberk.Yonca",                   sku: "com.aberk.Yonca" },                   android: null },
  { slug: "kit-qr",             ad: "Kit: QR",             ios: { bundle: "com.aberk.kit",                     sku: "Kit" },                               android: null },
  { slug: "loomi",              ad: "Loomi",               ios: { bundle: "com.aberk.Loomi",                   sku: "com.aberk.Loomi" },                   android: null },
  { slug: "kirk-hafta",         ad: "Bumpline",            ios: { bundle: "com.aberk.KirkHafta",               sku: "FORTYWEEKS001" },                     android: null },
  { slug: "viral-sounds",       ad: "Viral Sounds",        ios: { bundle: "com.techbam.viralsound",            sku: "viralSoundsWithAi" },                 android: null }
];

export const SKU_SLUG  = new Map(APPS.filter(a => a.ios).map(a => [a.ios.sku, a.slug]));
export const PKG_SLUG  = new Map(APPS.filter(a => a.android).map(a => [a.android, a.slug]));
export const SLUG_APP  = new Map(APPS.map(a => [a.slug, a]));
