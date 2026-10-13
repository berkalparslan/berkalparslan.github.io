/* Daily Whisper paneli, ?demo verisi. Gerçek verinin bütün alanları burada da
   var (installs, stats, events, pushes, panel/sales, panel/ai, panel/ga4,
   config/app, content, zodiac, users) ki her sayfa girişsiz eksiksiz çizilsin.
   Sayılar uydurma; tohumlu rastgele, her açılışta aynı. */

const GUN = 864e5;

export const ADIMLAR = ["welcome", "introA", "introB", "introC", "name", "city", "birth", "gender", "work", "workFeel", "lifeFeel",
  "relationship", "people", "change", "reflectChange", "why", "reflectWhy", "obstacle", "reflectObstacle", "priorities",
  "selfDescription", "dreamA", "dreamGate", "dreamB", "dreamPlace", "dreamHome", "dreamPerson", "dream", "reminder", "notifications", "building"];

export function sahteVeri() {
  let tohum = 20261013;
  const r = () => (tohum = (tohum * 48271) % 2147483647) / 2147483647;
  const sec = a => a[Math.floor(r() * a.length)];
  const tam = (a, b) => a + Math.floor(r() * (b - a + 1));
  const now = Date.now();
  const iso = t => new Date(t).toISOString();
  const gunStr = t => new Date(t).toISOString().slice(0, 10);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "_");
  const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const v = Math.floor(r() * 16); return (c === "x" ? v : (v & 3) | 8).toString(16); }).toUpperCase();
  const hex = n => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join("");

  const DILLER = ["en", "en", "en", "en", "tr", "tr", "de", "es", "fr", "it", "ja", "zh", "pt", "ru"];
  const ULKE = { en: ["US", "US", "GB", "AU", "CA", "IN", "NZ", "ZA"], tr: ["TR"], de: ["DE", "AT"], es: ["ES", "MX"], fr: ["FR", "BE"], it: ["IT"], ja: ["JP"], zh: ["CN", "TW", "SG"], pt: ["BR", "PT"], ru: ["RU"] };
  const IOS_CIHAZ = ["iPhone17,1", "iPhone16,2", "iPhone15,3", "iPhone14,5", "iPhone18,2", "iPad14,3"];
  const AND_CIHAZ = ["SM-S928B", "SM-S911B", "Pixel 9 Pro", "2312DRA50G", "CPH2581", "TECNO KJ7", "V2309"];
  const EKRANLAR = ["today", "stories", "affirmations", "board", "me", "player", "read", "zodiac", "new_story", "gratitude", "manifest", "profile_edit", "settings", "widgets", "share", "paywall"];
  const KAYNAK = ["onboarding", "onboarding", "onboarding", "launch", "teaser", "new_story", "voice", "hz", "me", "board_share"];
  const PLANLAR = ["$rc_weekly", "$rc_weekly", "$rc_annual", "$rc_monthly"];
  const SESLER = ["aoede", "charon", "voice_xgg4ihi7assy"];
  const AMBIENT = ["rain", "ocean", "night", "hz528", "hz432"];
  const PIDLER = ["a1b2c3d4e5", "f6e5d4c3b2"];

  const installs = [];
  for (let n = 0; n < 84; n++) {
    const platform = r() < 0.52 ? "ios" : "android";
    const yas = n < 6 ? r() * 2 * GUN : Math.pow(r(), 1.4) * 115 * GUN;
    const firstSeen = now - yas;
    const dil = sec(DILLER);
    const surum = firstSeen > now - 9 * GUN ? (platform === "ios" ? "2.1.1" : "2.1") : firstSeen > now - 25 * GUN ? "2.1" : "2.0";
    const build = surum === "2.0" ? String(tam(11, 18)) : surum === "2.1" ? String(platform === "ios" ? tam(3, 6) : tam(8, 11)) : "7";
    const kalici = r();
    const lastSeen = n < 5 ? now - n * 45e3 : Math.min(now - 60e3, firstSeen + (kalici < 0.35 ? r() * 20 * 60e3 : r() * Math.max(1, now - firstSeen)));
    const onbBitti = r() < 0.55;
    const adimSon = onbBitti ? ADIMLAR.length - 1 : tam(0, ADIMLAR.length - 1);
    const premium = onbBitti && r() < 0.24;
    const plan = premium || (onbBitti && r() < 0.05) ? sec(PLANLAR) : null;
    const purchasedAt = plan ? Math.min(lastSeen, firstSeen + r() * 3 * GUN) : null;
    const girisli = r() < 0.18;
    const notif = n < 5 || r() < 0.5 ? "on" : sec(["unasked", "unasked", "off", "quiet"]);
    const online = n < 5;
    const ev = {};
    const ekle = (k, v = 1) => { ev[k] = (ev[k] || 0) + v; };
    const oturum = tam(1, kalici < 0.35 ? 2 : 24);
    ekle("session", oturum); ekle("session_sec", oturum * tam(40, 420));
    for (let s = 0; s <= adimSon; s++) {
      const a = slug(ADIMLAR[s]);
      ekle("onb_step"); ekle("onb_step_" + a);
      ekle("screen_onb_" + a, tam(1, 2)); ekle("screen_onb_" + a + "_sec", tam(3, 60));
      if (r() < 0.12) { ekle("onb_skip"); ekle("onb_skip_" + a); }
      if (r() < 0.03) { ekle("onb_back"); ekle("onb_back_" + a); }
    }
    if (onbBitti) ekle("onb_done");
    if (onbBitti) for (const e of EKRANLAR) if (r() < 0.6) { const k = tam(1, oturum + 2); ekle("screen_" + e, k); ekle("screen_" + e + "_sec", k * tam(5, 140)); }
    let pv = 0;
    if (onbBitti) {
      pv = tam(1, 4);
      for (let k = 0; k < pv; k++) { const src = k ? sec(KAYNAK) : "onboarding"; ekle("pw_view"); ekle("pw_view_" + src); if (!(plan && k === pv - 1)) { ekle("pw_close"); ekle("pw_close_" + src); } }
      if (plan || r() < 0.2) { const p = slug(plan || sec(PLANLAR)); ekle("pw_tap"); ekle("pw_tap_" + p); if (!plan && r() < 0.5) { ekle("pw_cancel"); ekle("pw_cancel_" + p); } }
      const ls = tam(0, 8);
      if (ls) { ekle("listen_start", ls); ekle("listen_start_moment", ls); ekle("listen_end", ls); const c = tam(0, ls); ekle("listen_end_complete", c); ekle("listen_end_partial", ls - c); ekle("listen_end_sec", ls * tam(40, 300)); }
      ekle("story_new", tam(1, 6)); ekle("story_new_moment", tam(1, 5)); if (r() < 0.2) ekle("story_new_custom");
      if (r() < 0.3) ekle("grat_add", tam(1, 9)); if (r() < 0.2) ekle("aff_fav", tam(1, 5)); if (r() < 0.15) { ekle("aff_share"); ekle("aff_share_to"); ekle("aff_share_to_" + sec(["instagram", "save", "copy", "more"])); }
      if (r() < 0.2) { ekle("board_add", tam(1, 6)); ekle("board_add_photo", tam(1, 5)); }
      if (r() < 0.25) { ekle("ambient"); ekle("ambient_" + sec(AMBIENT)); }
      if (r() < 0.15) { ekle("voice"); ekle("voice_" + sec(SESLER)); }
      if (r() < 0.1) { ekle("speed"); ekle("speed_1_25"); }
      ekle("notif_perm"); ekle("notif_perm_" + (notif === "on" ? "on" : sec(["later", "later", "off"])));
      if (notif === "on") for (const k of ["story", "back", "zodiac", "grat"]) if (r() < 0.6) { const g = tam(1, 9); ekle("notif_sent", g); ekle("notif_sent_" + k, g); const o = tam(0, Math.ceil(g / 3)); if (o) { ekle("notif_open", o); ekle("notif_open_" + k, o); } }
      if (notif === "on" && r() < 0.3) { const p = sec(PIDLER); ekle("notif_open"); ekle("notif_open_push"); ekle("push_open"); ekle("push_open_" + p); }
      if (girisli) { ekle("sign_in"); ekle("sign_in_" + (platform === "ios" ? "apple_com" : "google_com")); }
    }
    if (plan) { const src = sec(KAYNAK); ekle("pw_buy"); ekle("pw_buy_" + src); }
    const hikaye = onbBitti ? tam(1, 9) : 0;
    const ekran = online ? sec(["today", "player", "stories", "paywall", "onb_" + ADIMLAR[tam(4, 12)]]) : "closed";
    const kayit = {
      id: uuid(), platform, appVersion: surum, build, language: dil, region: sec(ULKE[dil] || ["US"]),
      onboarded: onbBitti && r() < 0.8, premium, firstSeen: iso(firstSeen), lastSeen: iso(lastSeen),
      tz: dil === "tr" ? "Europe/Istanbul" : sec(["America/New_York", "Europe/London", "Australia/Sydney", "Asia/Tokyo", "America/Los_Angeles"]),
      reminder: `${String(tam(6, 22)).padStart(2, "0")}:${sec(["00", "15", "30", "45"])}`,
      device: platform === "ios" ? sec(IOS_CIHAZ) : sec(AND_CIHAZ), os: platform === "ios" ? sec(["18.6", "26.0", "26.1"]) : sec(["13", "14", "15", "16"]),
      screen: ekran, lastScreen: online ? undefined : (onbBitti ? sec(EKRANLAR) : "onb_" + ADIMLAR[adimSon]),
      onbStep: ADIMLAR[adimSon], notif, widgets: r() < 0.2 ? tam(1, 3) : 0, watch: platform === "ios" && r() < 0.15,
      sessions: oturum, installs_new: 1, onboarding_done: onbBitti ? 1 : 0,
      stories_moment: hikaye, stories_custom: hikaye && r() < 0.2 ? 1 : 0, stories_failed: r() < 0.08 ? 1 : 0,
      listens: ev.listen_start || 0, paywall_views: pv, purchases: plan ? 1 : 0, sign_ins: girisli ? 1 : 0,
      ai_text_requests: hikaye + (onbBitti ? 3 : 0), ai_reflect_requests: onbBitti ? 3 : 0,
      ai_text_tokens_in: (hikaye + 3) * tam(900, 1600), ai_text_tokens_out: (hikaye + 3) * tam(400, 900),
      ai_tts_requests: hikaye, ai_tts_seconds: hikaye * tam(120, 260), ai_tts_failed: r() < 0.05 ? 1 : 0,
      model_gemini_3_5_flash: hikaye, model_gemini_3_5_flash_lite: onbBitti ? 3 : 0, model_gemini_3_8_flash_tts: hikaye,
      ev,
    };
    if (plan) { kayit.plan = plan; kayit.buySource = Object.keys(ev).find(k => k.startsWith("pw_buy_"))?.slice(7) || "onboarding"; kayit.purchasedAt = iso(purchasedAt); }
    if (girisli) { kayit.uid = hex(28); kayit.email = `ornek${n}@example.com`; kayit.provider = platform === "ios" ? "apple.com" : "google.com"; }
    if (notif === "on" && r() < 0.85) { if (platform === "ios") { kayit.apns = hex(64); kayit.apnsEnv = "production"; } else kayit.fcm = hex(40) + ":APA91b" + hex(100); }
    if (!kayit.lastScreen) delete kayit.lastScreen;
    installs.push(kayit);
  }

  // Günlük sayaçlar (UTC günü): 120 gün, yavaş büyüyen.
  const stats = [];
  for (let g = 119; g >= 0; g--) {
    const t = now - g * GUN, b = 1 + (119 - g) / 60;
    const s = { id: gunStr(t) };
    const k = (a, z) => Math.round(tam(a, z) * b);
    s.installs_new = k(0, 4); s.sessions = k(6, 30); s.onboarding_done = Math.round(s.installs_new * 0.55);
    s.paywall_views = k(2, 12); s.purchases = r() < 0.3 ? tam(1, 2) : 0; s.sign_ins = r() < 0.2 ? 1 : 0;
    s.stories_moment = k(2, 12); s.stories_custom = r() < 0.4 ? tam(1, 3) : 0; s.stories_failed = r() < 0.15 ? 1 : 0;
    s.ai_text_requests = s.stories_moment + s.stories_custom + s.onboarding_done * 3; s.ai_reflect_requests = s.onboarding_done * 3;
    s.ai_text_tokens_in = s.ai_text_requests * tam(900, 1500); s.ai_text_tokens_out = s.ai_text_requests * tam(400, 800);
    s.ai_tts_requests = s.stories_moment + s.stories_custom; s.ai_tts_seconds = s.ai_tts_requests * tam(120, 240); s.ai_tts_failed = r() < 0.08 ? 1 : 0;
    s.listens = k(1, 9);
    s.model_gemini_3_5_flash = s.stories_moment; s.model_gemini_3_5_flash_lite = s.ai_reflect_requests; s.model_gemini_3_1_flash_lite = r() < 0.3 ? 1 : 0;
    s.model_gemini_3_8_flash_tts = s.ai_tts_requests; s.model_gemini_3_8_flash_lite_tts = r() < 0.2 ? 1 : 0;
    const ev = {}; const e = (key, v) => { if (v) ev[key] = (ev[key] || 0) + v; };
    e("session", s.sessions); e("session_sec", s.sessions * tam(60, 300));
    for (const sc of EKRANLAR) { const n = k(0, 8); e("screen_" + sc, n); e("screen_" + sc + "_sec", n * tam(8, 120)); }
    for (let a = 0; a < ADIMLAR.length; a++) { const n = Math.max(0, Math.round(s.installs_new * (1 - a / 60))); const x = slug(ADIMLAR[a]); e("onb_step_" + x, n); e("screen_onb_" + x, n); e("screen_onb_" + x + "_sec", n * tam(4, 50)); if (r() < 0.15) e("onb_skip_" + x, 1); }
    e("onb_done", s.onboarding_done);
    let pv = 0; for (const src of KAYNAK.slice(2)) { const n = r() < 0.6 ? tam(0, 3) : 0; e("pw_view_" + src, n); e("pw_close_" + src, Math.max(0, n - (r() < 0.15 ? 1 : 0))); pv += n; }
    e("pw_view", pv); e("pw_close", Math.round(pv * 0.85));
    const tap = tam(0, 3); e("pw_tap", tap); e("pw_tap__rc_weekly", tap); e("pw_cancel", r() < 0.3 ? 1 : 0); e("pw_fail", r() < 0.05 ? 1 : 0);
    if (s.purchases) { e("pw_buy", s.purchases); e("pw_buy_" + sec(KAYNAK), s.purchases); }
    e("pw_code", r() < 0.05 ? 1 : 0); e("pw_restore_ok", r() < 0.04 ? 1 : 0); e("pw_restore_none", r() < 0.05 ? 1 : 0);
    const ls = s.listens; e("listen_start", ls); e("listen_end", ls); const c = tam(0, ls); e("listen_end_complete", c); e("listen_end_partial", ls - c); e("listen_end_sec", ls * tam(60, 280));
    e("read_open", tam(0, 3)); e("story_new", s.stories_moment + s.stories_custom); e("story_new_moment", s.stories_moment); e("story_new_custom", s.stories_custom); e("story_fail", s.stories_failed);
    e("grat_add", tam(0, 6)); e("aff_fav", tam(0, 4)); e("aff_share", tam(0, 2)); e("aff_share_to_instagram", tam(0, 1)); e("board_add", tam(0, 3)); e("board_add_photo", tam(0, 3)); e("board_wallpaper", r() < 0.1 ? 1 : 0); e("story_fav", tam(0, 2)); e("story_share", r() < 0.1 ? 1 : 0); e("avatar_set", r() < 0.05 ? 1 : 0);
    e("ambient_" + sec(AMBIENT), tam(0, 2)); e("voice_" + sec(SESLER), r() < 0.2 ? 1 : 0); e("speed_1_25", r() < 0.1 ? 1 : 0); e("language_" + sec(["tr", "de", "es"]), r() < 0.1 ? 1 : 0);
    e("sign_in_" + sec(["apple_com", "google_com"]), s.sign_ins); e("open_link_" + sec(["zodiac", "affirmations"]), tam(0, 2));
    const perm = s.onboarding_done; e("notif_perm", perm); e("notif_perm_on", Math.round(perm * 0.45)); e("notif_perm_later", Math.round(perm * 0.4)); e("notif_perm_off", perm - Math.round(perm * 0.45) - Math.round(perm * 0.4));
    for (const nk of ["story", "back", "gift", "zodiac", "grat"]) { const n = k(0, 7); e("notif_sent_" + nk, n); e("notif_sent", n); const o = tam(0, Math.ceil(n / 3)); e("notif_open_" + nk, o); e("notif_open", o); }
    e("notif_status_off", r() < 0.05 ? 1 : 0);
    if (g === 5) { e("push_open_" + PIDLER[0], 6); e("notif_open_push", 6); }
    if (g === 2) { e("push_open_" + PIDLER[1], 3); e("notif_open_push", 3); }
    s.ev = ev;
    stats.push(s);
  }

  const pushes = [
    { id: "cb9xwcycys", note: "Dolunay duyurusu", title: { tr: "Bu gece dolunay 🌕", en: "Full Moon tonight 🌕" }, body: { tr: "Ağır geleni bırakma zamanı.", en: "Time to release what feels heavy." },
      target: { platform: "all", premium: "any", onboarded: "any", languages: [] }, status: "sent", ios: 3, android: 9, failed: 1, audience: 13,
      createdAt: iso(now - 18 * GUN), sentAt: iso(now - 18 * GUN + 5e3), createdBy: "demo" },
    { pid: PIDLER[0], id: PIDLER[0], mode: "devices", texts: { tr: { title: "Yeni hikayen hazır ✨", body: "Bugünün anı sadece senin için yazıldı." }, en: { title: "Your story is ready ✨", body: "Today's moment was written just for you." } },
      tab: null, test: false, filter: { langs: [], pro: "free", activeWithinDays: 14 }, summary: "Kitle · ücretsiz · son 14 günde açan", at: iso(now - 5 * GUN), sentAt: iso(now - 5 * GUN + 9e3),
      status: "sent", sent: 38, counts: { targeted: 40, sent: 38, failed: 2, removedTokens: 1 }, byLang: { en: { sent: 29, failed: 2 }, tr: { sent: 9, failed: 0 } }, by: "demo" },
    { pid: PIDLER[1], id: PIDLER[1], mode: "devices", texts: { en: { title: "The stars have a word for you", body: "Love, money and what to do today. Tap to read." } }, tab: "zodiac", test: false,
      filter: { langs: ["en"], pro: "any" }, summary: "Kitle · dil en", at: iso(now - 2 * GUN), sentAt: iso(now - 2 * GUN + 4e3), status: "sent", sent: 21, counts: { targeted: 21, sent: 21, failed: 0, removedTokens: 0 }, by: "demo" },
    { pid: "0c9d8e7f6a", id: "0c9d8e7f6a", mode: "devices", texts: { tr: { title: "Hafta sonu ritüeli 🤍", body: "Beş dakika, bir nefes, bir hikaye." }, en: { title: "A weekend ritual 🤍", body: "Five minutes, one breath, one story." } },
      tab: "affirmations", test: false, filter: { langs: [], pro: "any" }, summary: "Kitle", at: iso(now - 3600e3), sendAt: iso(now + 2 * GUN), status: "scheduled", by: "demo" },
    { pid: "9b8a7c6d5e", id: "9b8a7c6d5e", mode: "devices", test: true, texts: { en: { title: "Test", body: "Test message." } }, summary: "Test cihazları", at: iso(now - 7 * GUN), sentAt: iso(now - 7 * GUN), status: "sent", sent: 2, counts: { targeted: 2, sent: 2, failed: 0, removedTokens: 0 }, by: "demo" },
  ];

  const gelirGun = [];
  for (let g = 30; g >= 0; g -= 1) {
    const t = gunStr(now - g * GUN), iap = r() < 0.25 ? tam(1, 2) : 0;
    gelirGun.push({ tarih: t, indirme: tam(0, 6), guncelleme: tam(0, 9), iap, gelir: iap ? { USD: +(iap * 4.89).toFixed(2) } : {} });
  }
  const sales = { uretim: iso(now - 15 * 3600e3), gun: gelirGun.length, indirme: gelirGun.reduce((a, x) => a + x.indirme, 0), guncelleme: gelirGun.reduce((a, x) => a + x.guncelleme, 0),
    iap: gelirGun.reduce((a, x) => a + x.iap, 0), gelir: { USD: +gelirGun.reduce((a, x) => a + (x.gelir.USD || 0), 0).toFixed(2), TRY: 104.99 },
    ulkeler: { US: 31, TR: 12, GB: 6, DE: 4, AU: 3, CA: 2 }, gunluk: gelirGun };

  const proxyGun = [], geminiSatir = [];
  for (let g = 20; g >= 0; g--) {
    const t = gunStr(now - g * GUN);
    const cagri = g > 1 ? 0 : tam(20, 60);
    if (cagri) proxyGun.push({ t, cagri, cihaz: tam(3, 9), enCok: tam(6, 23), genel: cagri + tam(2, 9), sinirda: 0 });
    const ok = tam(8, 40);
    geminiSatir.push({ t, kod: "200", anahtar: g > 1 ? "Gemini API Key" : "Bam AI proxy", yontem: "GenerateContent", n: ok });
    if (r() < 0.4) geminiSatir.push({ t, kod: "429", anahtar: "Gemini API Key", yontem: "GenerateContent", n: tam(1, 4) });
    if (r() < 0.2) geminiSatir.push({ t, kod: "403", anahtar: "Browser key (auto created by Firebase)", yontem: "ListModels", n: tam(1, 3) });
    if (r() < 0.15) geminiSatir.push({ t, kod: "500", anahtar: "Gemini API Key", yontem: "StreamGenerateContent", n: 1 });
  }
  const ai = { uretim: iso(now - 14 * 3600e3), gun: 90, proxy: { gunluk: proxyGun, sinirlar: { app: 6000, cihaz: 80, genel: 20000 } }, gemini: { satir: geminiSatir } };

  const gaGun = [];
  for (let g = 27; g >= 0; g--) for (const p of ["android", "ios"]) gaGun.push({ t: gunStr(now - g * GUN), p, au: tam(3, 25), nu: tam(0, 5), os: tam(5, 40), sure: tam(300, 4000), ekran: tam(20, 200) });
  const ga4 = { uretim: iso(now - 14 * 3600e3), gun: 90, toplam: { totalUsers: 212, newUsers: 160, activeUsers: 190, sessions: 1240, userEngagementDuration: 91000, engagedSessions: 810 }, aktif: { dau: 21, wau: 64, mau: 150 },
    gunluk: gaGun,
    olaylar: ["session_start", "screen_view", "first_open", "notification_open", "app_update"].flatMap(o => [{ t: gunStr(now), o, p: "android", n: tam(4, 90), k: tam(2, 30) }]),
    ekranlar: ["MainActivity", "PaywallActivity"].map(ad => ({ ad, p: "android", g: tam(40, 300), sure: tam(200, 9000), k: tam(10, 80) })),
    surumler: [{ platform: "Android", appVersion: "2.1", activeUsers: 44, newUsers: 30 }, { platform: "Android", appVersion: "2.0", activeUsers: 12, newUsers: 2 }],
    ulkeler: [{ country: "United States", countryId: "US", totalUsers: 80, newUsers: 60 }, { country: "Türkiye", countryId: "TR", totalUsers: 40, newUsers: 30 }, { country: "United Kingdom", countryId: "GB", totalUsers: 15, newUsers: 11 }],
    diller: [{ language: "English", totalUsers: 140 }, { language: "Turkish", totalUsers: 40 }],
    cihazlar: [{ platform: "Android", mobileDeviceModel: "Galaxy S24 Ultra", totalUsers: 12 }, { platform: "Android", mobileDeviceModel: "Pixel 9", totalUsers: 7 }],
    isletim: [{ platform: "Android", operatingSystemVersion: "Android 15", totalUsers: 40 }, { platform: "Android", operatingSystemVersion: "Android 14", totalUsers: 22 }],
    saatler: Array.from({ length: 7 * 24 }, (_, i) => ({ dayOfWeek: String(i % 7), hour: String(Math.floor(i / 7)).padStart(2, "0"), activeUsers: tam(0, 9), sessions: tam(0, 12) })),
    kaynaklar: [{ platform: "Android", firstUserSource: "google-play", firstUserMedium: "organic", totalUsers: 120 }, { platform: "Android", firstUserSource: "(direct)", firstUserMedium: "(none)", totalUsers: 20 }] };

  const config = { strings: { "pw.title": { tr: "Gelecekteki seninle bugün tanış" }, "onb.q.dream": { en: "Describe that life in your own words." } }, flags: { hardPaywall: false },
    voices: [{ name: "Elif", id: "voice_xgg4ihi7assy" }], version: 9, updatedAt: iso(now - 4 * GUN) };
  const photos = { slots: { story: ["/assets/lab-icons/daily-whisper-180.png", "/assets/lab-icons/daily-whisper-180.png"] }, version: 3 };
  const zodiac = { aries: "Bugün cesur bir adım at, kalbin seni doğru yere götürüyor.", taurus: "Yavaşla; bedenin sana bir şey söylüyor.", gemini: "Bir sohbet yeni bir kapı açabilir.",
    cancer: "Evine ve sevdiklerine zaman ayır.", leo: "Işığını saklama, bugün görünür ol.", virgo: "Küçük bir düzen büyük bir huzur getirir.", libra: "Dengeyi kendi içinde ara.",
    scorpio: "Bırakman gereken şeyi biliyorsun.", sagittarius: "Merakın seni yeni bir yere çağırıyor.", capricorn: "Sabrın bu hafta karşılığını veriyor.", aquarius: "Farklı düşünmen bugün işe yarar.", pisces: "Rüyalarına kulak ver." };

  /** Bir kurulumun zaman çizelgesi (en yeni önce), installs/{id}/events gibi. */
  function olaylar(i) {
    const out = [], bas = Date.parse(i.firstSeen), son = Date.parse(i.lastSeen);
    const ekle = (t, e, p, s) => out.push({ t: iso(t), e, ...(p != null ? { p } : {}), ...(s != null ? { s } : {}) });
    let t = bas;
    const adim = Math.max(1, Math.min(ADIMLAR.length, (i.ev?.onb_step || 1)));
    for (let a = 0; a < adim; a++) { ekle(t, "screen", "onb_" + ADIMLAR[a]); ekle(t + 500, "onb_step", ADIMLAR[a]); t += tam(4, 40) * 1e3; if (r() < 0.12) ekle(t - 2e3, "onb_skip", ADIMLAR[a]); }
    if (i.ev?.onb_done) { ekle(t, "onb_done"); ekle(t + 2e3, "notif_perm", i.notif === "on" ? "on" : "later"); t += 4e3; ekle(t, "screen", "paywall"); ekle(t + 1e3, "pw_view", "onboarding"); t += tam(8, 40) * 1e3;
      if (i.plan) { ekle(t, "pw_tap", i.plan); ekle(t + 9e3, "pw_buy", i.buySource || "onboarding"); t += 12e3; } else { ekle(t, "pw_close", "onboarding"); t += 2e3; }
      ekle(t, "story_new", "moment"); ekle(t + 3e3, "screen", "player"); ekle(t + 4e3, "listen_start", "moment"); ekle(t + 160e3, "listen_end", "complete", 156); t += 170e3; }
    ekle(Math.max(t, Math.min(son, t + 60e3)), "session", null, Math.round((Math.max(t, son) - bas) / 1e3) % 900 + 30);
    if (i.ev?.push_open) ekle(son - 5e3, "push_open", PIDLER[0]);
    return out.sort((a, b) => Date.parse(b.t) - Date.parse(a.t));
  }

  const profil = { name: "Deniz", city: "İzmir", work: "Tasarımcı", challenge: "Kendime daha çok zaman ayırmak", dream: "Denize bakan bir evde sabah yürüyüşleri, sakin bir iş ve sevdiklerim yanımda.", priorities: ["peace", "health", "love"] };
  const hikayeler = [{ title: "Denize açılan pencere", kind: "moment", day: gunStr(now - GUN), createdAt: iso(now - GUN), body: "Sabah ışığı perdeden süzülüyor, kahvenin kokusu odayı dolduruyor. Bugün kendine söz verdiğin o yürüyüşe çıkıyorsun..." },
    { title: "Yeni işin ilk günü", kind: "custom", day: gunStr(now - 3 * GUN), createdAt: iso(now - 3 * GUN), body: "Kapıdan girdiğinde herkes seni gülümseyerek karşılıyor..." }];

  return { installs, stats, pushes, sales, ai, ga4, testers: [installs[0].id, installs[2].id], config, photos, zodiac, olaylar, profil, hikayeler };
}
