/* Cloudflare Worker girişi. Asıl iş scripts/lab/uzak/calistir.mjs'te —
   GitHub Actions ve yerel deneme ile aynı kod. */
import { calistir } from "../../scripts/lab/uzak/calistir.mjs";
import { githubIstemci } from "../../scripts/lab/uzak/github.mjs";

async function cekVeYayinla(env) {
  const log = [];
  const { paket, sha, ozet } = await calistir(env, m => log.push(m));
  const r = await githubIstemci(env).paketYaz(paket, sha, `panel: ${new Date().toISOString().slice(0, 10)} verisi (worker)\n\n${ozet.join("\n")}`);
  log.push(`yayınlandı: ${r.commit?.sha?.slice(0, 7)}`);
  return log;
}

export default {
  async scheduled(_olay, env, ctx) { ctx.waitUntil(cekVeYayinla(env).then(l => console.log(l.join("\n")), e => console.error(e))); },

  async fetch(istek, env) {
    const u = new URL(istek.url);
    if (u.pathname === "/saglik") return new Response("ok");
    if (u.pathname === "/cek" && istek.method === "POST") {
      if (u.searchParams.get("anahtar") !== env.CEK_ANAHTARI) return new Response("yok", { status: 401 });
      try { return new Response((await cekVeYayinla(env)).join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
      catch (e) { return new Response(`hata: ${e.message}`, { status: 500 }); }
    }
    return new Response("bamtech-panel", { status: 404 });
  }
};
