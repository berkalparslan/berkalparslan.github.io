/* GitHub API — vault (private) okuma, site deposuna şifreli dosya yazma.
   env: GITHUB_TOKEN (contents: read bamtech-vault, read+write site deposu) */

const API = "https://api.github.com";
const VAULT = "berkalparslan/bamtech-vault";
const SITE = "berkalparslan/berkalparslan.github.io";
const DOSYA = "lab/panel/data.enc.json";

export function githubIstemci(env) {
  const bas = (kabul = "application/vnd.github+json") => ({
    Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: kabul, "User-Agent": "bamtech-panel", "X-GitHub-Api-Version": "2022-11-28" });
  async function json(yol, secenek = {}) {
    const r = await fetch(API + yol, { ...secenek, headers: { ...bas(), ...(secenek.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`github ${r.status} ${j.message || ""} (${yol})`.trim());
    return j;
  }
  async function ham(repo, yol) {
    const r = await fetch(`${API}/repos/${repo}/contents/${yol}`, { headers: bas("application/vnd.github.raw+json") });
    if (!r.ok) throw new Error(`github ${r.status} (${repo}/${yol})`);
    return r.text();
  }
  async function dizin(repo, yol) {
    try { return await json(`/repos/${repo}/contents/${yol}`); } catch { return []; }
  }

  return {
    /** Vault notları — vaultAyristir girdisi. */
    async vaultOku(log = () => {}) {
      const md = async dir => {
        const l = (await dizin(VAULT, dir)).filter(f => f.type === "file" && f.name.endsWith(".md") && !f.name.startsWith("_"));
        const o = {};
        for (const f of l) o[f.name.replace(/\.md$/, "")] = await ham(VAULT, f.path);
        return o;
      };
      const uygulamalar = await md("uygulamalar");
      const konular = await md("konular");
      let kampanyalar = null;
      try { kampanyalar = await ham(VAULT, "pazarlama/kampanyalar.md"); } catch { }
      const gelenL = (await dizin(VAULT, "pazarlama/gelen")).filter(f => f.type === "file" && f.name.endsWith(".csv"));
      const gelen = [];
      for (const [i, f] of gelenL.entries()) gelen.push({ ad: f.name, metin: await ham(VAULT, f.path), t: i });
      log(`  vault ${Object.keys(uygulamalar).length} uygulama · ${Object.keys(konular).length} konu · ${gelen.length} reklam dosyası`);
      return { uygulamalar, konular, kampanyalar, gelen };
    },

    /** Mevcut şifreli paket + sha (yazarken gerekiyor). */
    async paketOku() {
      const j = await json(`/repos/${SITE}/contents/${DOSYA}`);
      const metin = atob(String(j.content || "").replace(/\n/g, ""));
      return { paket: JSON.parse(new TextDecoder().decode(Uint8Array.from(metin, c => c.charCodeAt(0)))), sha: j.sha };
    },

    /** Şifreli paketi commit'ler → GitHub Pages bir dakika içinde yayınlar. */
    async paketYaz(paket, sha, mesaj) {
      const govde = JSON.stringify(paket) + "\n";
      const u8 = new TextEncoder().encode(govde);
      let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return json(`/repos/${SITE}/contents/${DOSYA}`, { method: "PUT",
        body: JSON.stringify({ message: mesaj, content: btoa(s), sha, committer: { name: "panel-bot", email: "panel@bamtech.invalid" } }) });
    }
  };
}
