/* ?demo verisi: gercek Firestore belgelerinin butun alanlariyla, uydurma
 * kisilerle. Panelin her sayfasi bununla eksiksiz cizilmeli (giris olmadan
 * dogrulama). Sabit tohumlu rastgele: her acilista ayni veri. */

function tohum(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const ADLAR = ["Emre Kaya", "Can Demir", "Mert Yıldız", "Burak Şahin", "Ali Çelik", "Kerem Aydın", "Onur Arslan", "Deniz Koç",
  "Tolga Kurt", "Serkan Öztürk", "Umut Polat", "Barış Erdem", "Sinan Aksoy", "Cem Yalçın", "Eren Güneş", "Hakan Taş",
  "Oğuz Bulut", "Arda Keskin", "Volkan Uçar", "Kaan Tekin", "Selim Ateş", "Yusuf Kılıç", "Murat Özkan", "Ozan Çakır", "Efe Doğan"];
const MISAFIR = ["Rıza", "Fatih", "Gökhan", "İlker", "Halil", "Taner", "Bora", "Ferhat", "Levent", "Doruk", "Engin", "Koray", "Nail", "Sami", "Tarık"];
const POZ = ["GK", "DEF", "MID", "FWD"];
const EKRANLAR = ["home", "matches", "explore", "profile", "match_details", "match_players", "match_videos", "notifications",
  "profile_other", "editor_new", "lineup", "score", "rate", "share", "invite", "follows", "player_editor", "editor_repeat"];
const CIHAZ = { ios: ["iPhone17,1", "iPhone16,2", "iPhone18,3", "iPhone15,4"], android: ["SM-S938U", "Pixel 9 Pro XL", "SM-A155F", "motorola edge 2025", "23078PND5G", "OnePlus8Pro"] };

export function demoVeri(simdi = Date.now()) {
  const r = tohum(42);
  const sec = l => l[Math.floor(r() * l.length)];
  const gun = 864e5;
  const iso = t => new Date(t).toISOString();
  const uid = n => "demoU" + String(n).padStart(2, "0") + "x7Qk";

  // Hesaplar
  const users = ADLAR.map((ad, n) => {
    const t = simdi - (2 + n * 3.4 + r() * 2) * gun;
    const u = {
      id: uid(n), name: ad, nameLower: ad.toLocaleLowerCase("tr"), handle: ad.split(" ")[0].toLowerCase()
        .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u") + (n + 7),
      positions: [sec(POZ), ...(r() > 0.6 ? [sec(POZ)] : [])].filter((v, i, a) => a.indexOf(v) === i),
      createdAt: iso(t), lang: n % 3 ? "tr" : "en", bio: n % 4 === 0 ? "Hafta içi akşamları oynarım." : "",
    };
    if (n % 6 === 1) u.photoAt = iso(t + gun);
    if (n === 3) u.blocked = [uid(9)];
    if (n % 5 === 0) u.rating = { overall: 6 + r() * 3, count: 4 + n % 5, publishedAt: iso(simdi - 3 * gun), categories: { pace: 6.5, technique: 7.1, teamwork: 7.8, defense: 6.2, finishing: 6.9, fairplay: 8.4 } };
    return u;
  });

  // Hesapsiz oyuncular (organizatorlerin listeleri)
  const players = MISAFIR.map((ad, n) => {
    const p = { id: "demoP" + n, name: ad, nameLower: ad.toLocaleLowerCase("tr"), positions: [sec(POZ)], ownerUid: uid(n % 4), createdAt: iso(simdi - (20 + n) * gun) };
    if (n % 5 === 2) p.notes = "Sol ayak, kanatta iyi";
    if (n === 4) p.linkedUid = uid(14);
    return p;
  });

  // Maclar
  const matches = [];
  for (let n = 0; n < 16; n++) {
    const bas = simdi + (n < 4 ? (n + 1) * 1.7 : -(n - 3) * 4.2) * gun;
    const startsAt = Math.floor(bas / 36e5) * 36e5 + 18 * 36e5 % gun;
    const admin = uid(n % 5);
    const uyeler = [admin, ...Array.from({ length: 6 + (n % 5) }, (_, k) => uid((n + k * 3 + 1) % 25))].filter((v, i, a) => a.indexOf(v) === i);
    const misafir = players.filter((_, k) => (k + n) % 4 === 0).slice(0, 4);
    const hepsi = [...uyeler, ...misafir.map(p => p.id)];
    const ev = hepsi.filter((_, k) => k % 2 === 0), dep = hepsi.filter((_, k) => k % 2 === 1);
    const durum = n < 4 ? "upcoming" : n === 9 ? "cancelled" : "played";
    const m = {
      id: "demoM" + n, title: n % 3 ? `Salı halısaha ${n + 1}` : "", venue: sec(["Arena Spor", "Yeşil Vadi Saha", "Kuzey Park", "Gol Center"]),
      address: "Örnek Mah. 12. Sok.", city: sec(["İstanbul", "Ankara", "İzmir", "London"]), sport: "football",
      visibility: n % 4 === 3 ? "private" : "public", status: durum, startsAt: iso(startsAt), durationMin: sec([60, 60, 90]),
      maxPlayers: sec([12, 14, 16, 22]), adminUid: admin, memberUids: uyeler, invitedUids: [uid((n + 11) % 25)], requestedUids: n % 3 === 0 ? [uid((n + 13) % 25)] : [],
      guests: misafir.map(p => ({ id: p.id, name: p.name, positions: p.positions })), guestIds: misafir.map(p => p.id),
      home: { name: "Siyah", uids: ev }, away: { name: "Beyaz", uids: dep },
      createdAt: iso(startsAt - (3 + n % 4) * gun), updatedAt: iso(startsAt - gun),
      rsvp: Object.fromEntries(uyeler.slice(0, 5).map((u, k) => [u, k % 4 === 3 ? "out" : "in"])), confirmed: uyeler.slice(0, 4),
      matchPositions: Object.fromEntries(hepsi.slice(0, 4).map((u, k) => [u, POZ[k % 4]])),
    };
    if (n % 3 === 1) m.captainUid = uyeler[1];
    if (n % 2 === 0) m.mapsURL = "https://maps.apple.com/?q=Arena";
    if (durum === "played") {
      m.homeScore = Math.floor(r() * 9); m.awayScore = Math.floor(r() * 9);
      m.stats = Object.fromEntries(hepsi.slice(0, 6).map(u => [u, { goals: Math.floor(r() * 3), assists: Math.floor(r() * 2) }]));
      if (n % 3 === 0) { m.moments = [{ uid: uyeler[0], t: 512, label: "goal", cam: 1 }, { uid: uyeler[1], t: 1290, label: "save", cam: 2 }]; m.socialLink = "https://example.com/mac"; }
      if (n === 5) m.videoLinks = ["https://example.com/video"];
    }
    matches.push(m);
  }

  // Oylar
  const ratings = [];
  const KAT = ["overall", "pace", "technique", "teamwork", "defense", "finishing", "fairplay"];
  for (const m of matches.filter(x => x.status === "played")) {
    const kim = [...m.memberUids, ...m.guestIds];
    for (const rater of m.memberUids.slice(0, 5)) for (const rated of kim.filter(x => x !== rater).slice(0, 4)) {
      if (r() < 0.35) continue;
      const t = Date.parse(m.startsAt) + (2 + r() * 30) * 36e5;
      ratings.push({ id: `${m.id}_${rater}_${rated}`, matchId: m.id, raterUid: rater, ratedUid: rated, createdAt: iso(t), updatedAt: iso(t),
        scores: Object.fromEntries(KAT.map(k => [k, Math.max(1, Math.min(10, Math.round(5 + r() * 5 - (rater.endsWith("03x7Qk") ? 2 : 0))))])) });
    }
  }

  const follows = [];
  for (let n = 0; n < 34; n++) {
    const a = uid(Math.floor(r() * 25)), b = uid(Math.floor(r() * 25));
    if (a !== b && !follows.some(f => f.id === `${a}_${b}`)) follows.push({ id: `${a}_${b}`, followerUid: a, followedUid: b, createdAt: iso(simdi - r() * 40 * gun) });
  }
  const TUR = ["follow", "follow", "invite", "invite", "request", "accepted", "declined", "approved", "played", "result"];
  const notifications = Array.from({ length: 70 }, (_, n) => {
    const m = sec(matches);
    return { id: "demoN" + n, type: sec(TUR), fromUid: uid(n % 25), toUid: uid((n + 5) % 25), read: r() > 0.35, createdAt: iso(simdi - r() * 35 * gun), matchId: m.id, matchTitle: m.title || m.venue };
  });
  const reports = [
    { id: "demoR1", fromUid: uid(2), targetUid: uid(9), reason: "abuse", createdAt: iso(simdi - 2 * gun) },
    { id: "demoR2", fromUid: uid(6), targetUid: uid(9), reason: "spam", createdAt: iso(simdi - 6 * gun) },
    { id: "demoR3", fromUid: uid(11), targetUid: "demoP3", reason: "other", createdAt: iso(simdi - 12 * gun) },
  ];
  const claims = [{ id: "demoC1", uid: uid(18), ownerUid: uid(0), matchId: "demoM5", guestId: "demoP2", createdAt: iso(simdi - 4 * gun) }];

  // Kurulumlar: hesaplarin cogu bir kurulumla, birkac girissiz kurulum
  const installs = [], events = [], tokens = [];
  for (let n = 0; n < 34; n++) {
    const platform = n % 4 === 0 ? "ios" : "android";
    const hesap = n < 22 ? uid(n) : null;
    const ilk = simdi - (1 + n * 2.6 + r() * 3) * gun;
    const son = n < 3 ? simdi - (n * 40e3) : n < 8 ? simdi - (n * 2.5 * 36e5) : Math.min(simdi, ilk + r() * (simdi - ilk));
    const surum = platform === "ios" ? (n % 8 === 0 ? ["1.0", "13"] : ["1.1", "16"]) : (n % 6 === 5 ? ["1.0", "6"] : ["1.1", "8"]);
    const i = {
      id: "demo-" + String(n).padStart(2, "0") + "a1b2c3d4e5f6", platform, appVersion: surum[0], build: surum[1],
      language: hesap ? users[n].lang : n % 2 ? "en" : "tr", region: sec(["TR", "TR", "TR", "US", "GB", "DE", "IN", "NL", "RU"]), tz: "Europe/Istanbul",
      device: sec(CIHAZ[platform]), os: platform === "ios" ? sec(["26.0", "26.6.1", "18.6"]) : sec(["14", "15", "16", "17"]),
      firstSeen: iso(ilk), lastSeen: iso(son), signedIn: !!hesap && n % 9 !== 8, onboarded: n % 7 !== 6, notif: n % 3 !== 2,
      appearance: sec(["dark", "dark", "light", "system"]), watch: platform === "ios" && n % 5 === 0,
      screen: n < 3 ? sec(["home", "match_details", "explore"]) : "closed", lastScreen: sec(EKRANLAR.slice(0, 8)),
      n_matches: hesap ? n % 7 : 0, n_upcoming: hesap ? n % 3 : 0, n_played: hesap ? n % 5 : 0, n_following: hesap ? n % 6 : 0,
      n_players: n % 4 === 0 ? 5 + n % 5 : 0, n_organised: n % 5 === 0 ? 2 : 0,
      sessions: 0, installs_new: 1, onboarding_done: n % 7 !== 6 ? 1 : 0, sign_ins: hesap ? 1 + n % 2 : 0,
      matches_created: n % 5 === 0 ? 2 : 0, results_saved: n % 10 === 0 ? 1 : 0, ratings_sent: n % 3 === 0 ? 4 : 0, invites_sent: n % 4 === 0 ? 3 : 0, ev: {},
    };
    if (hesap) i.uid = hesap;
    if (n === 0) i.uid = "demoAdmin";
    // Olaylar: her aktif gun birkac oturum
    for (let t = ilk; t < son; t += gun * (0.6 + r() * 2.2)) {
      const sa = Math.floor(t / gun) * gun + (7 + Math.floor(r() * 15)) * 36e5 - 3 * 36e5;
      if (sa > simdi) break;
      let z = sa;
      const ekr = [sec(["home", "home", "matches"]), sec(EKRANLAR), sec(EKRANLAR)];
      for (const e of ekr) {
        const sn = 5 + Math.floor(r() * 140);
        events.push({ i: i.id, t: z, e: "screen", p: e });
        events.push({ i: i.id, t: z + sn * 1000, e: "screen_time", p: e, s: sn });
        z += sn * 1000;
        if (r() < 0.25) events.push({ i: i.id, t: z, e: sec(["rsvp", "follow", "share_image", "match_create", "result_save", "rate_submit", "invite_send", "sign_in", "teams_build", "tick", "watch_result", "language", "theme"]), p: sec(["in", "out", "positions", "new", "manual", "google", "profile", null, "on", "tr", "dark"]) || undefined });
      }
      events.push({ i: i.id, t: z, e: "session", s: Math.round((z - sa) / 1000) });
      i.sessions++;
    }
    // ev haritasi kurulum belgesinde de var
    for (const e of events.filter(x => x.i === i.id)) {
      const ad = e.e === "screen_time" ? `screen_${e.p}_sec` : e.p ? `${e.e}_${e.p}` : e.e;
      i.ev[ad] = (i.ev[ad] || 0) + (e.e === "screen_time" ? e.s : 1);
      if (e.e === "session") i.ev.session_sec = (i.ev.session_sec || 0) + e.s;
    }
    if (i.uid && n % 3 !== 2 && i.signedIn) tokens.push({ uid: i.uid, id: "tok" + n + "AbCdEfGhIjKlMnOp", platform, updatedAt: iso(son) });
    installs.push(i);
  }

  // stats/{gun}: olaylardan gunluk sayaclar (UTC gun)
  const days = {};
  for (const i of installs) { const d = i.firstSeen.slice(0, 10); (days[d] ||= { id: d, ev: {} }).installs_new = (days[d].installs_new || 0) + 1; }
  for (const e of events) {
    const d = new Date(e.t).toISOString().slice(0, 10), g = (days[d] ||= { id: d, ev: {} });
    if (e.e === "session") g.sessions = (g.sessions || 0) + 1;
    if (e.e === "match_create") g.matches_created = (g.matches_created || 0) + 1;
    if (e.e === "result_save") g.results_saved = (g.results_saved || 0) + 1;
    if (e.e === "rate_submit") g.ratings_sent = (g.ratings_sent || 0) + 3;
    if (e.e === "invite_send") g.invites_sent = (g.invites_sent || 0) + 2;
    if (e.e === "sign_in") g.sign_ins = (g.sign_ins || 0) + 1;
    const ad = e.e === "screen_time" ? `screen_${e.p}_sec` : e.p ? `${e.e}_${e.p}` : e.e;
    g.ev[ad] = (g.ev[ad] || 0) + (e.e === "screen_time" ? e.s : 1);
  }
  for (const g of Object.values(days)) g.onboarding_done = Math.max(0, (g.installs_new || 0) - 1);

  const pushes = [
    { id: "dp1", pid: "dp1", mode: "devices", status: "sent", test: false, texts: { en: { title: "Match night", body: "Your weekly game is set. Tap to see who is in." }, tr: { title: "Maç günü", body: "Bu haftanın maçı hazır. Kim geliyor, bak." } },
      filter: { langs: [], activeWithinDays: 28 }, summary: "Kitle · son 28 günde açan", at: iso(simdi - 5 * gun), sentAt: iso(simdi - 5 * gun), sent: 11, counts: { targeted: 12, sent: 11, failed: 1, removedTokens: 1 } },
    { id: "dp2", pid: "dp2", mode: "devices", status: "sent", test: true, texts: { en: { title: "Test", body: "Panel test" } }, summary: "Test cihazları (yönetici hesapları)", at: iso(simdi - 6 * gun), sentAt: iso(simdi - 6 * gun), sent: 1, counts: { targeted: 1, sent: 1, failed: 0, removedTokens: 0 } },
  ];

  return {
    installs, events, days: Object.values(days).sort((a, b) => a.id.localeCompare(b.id)), users, players, matches, ratings,
    follows, notifications, reports, claims, tokens, pushes, config: { ratings: "self", joinURL: "", iosURL: "", androidURL: "" },
    sales: { uretim: iso(simdi - 5 * 36e5), gun: 14, indirme: 61, guncelleme: 23, iap: 0, gelir: {}, ulkeler: { TR: 38, US: 9, GB: 5, DE: 4, IN: 5 },
      gunluk: Array.from({ length: 14 }, (_, n) => ({ tarih: new Date(simdi - (14 - n) * gun).toISOString().slice(0, 10), indirme: 2 + (n % 6), guncelleme: n % 4, iap: 0, gelir: {} })) },
    adminUid: "demoAdmin", hatalar: [],
  };
}
