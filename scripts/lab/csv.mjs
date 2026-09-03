/* Play'in toplu rapor CSV'leri için küçük bir ayrıştırıcı.
   Yorum metinleri virgül, tırnak ve satır sonu içeriyor — satırı `split(",")`
   ile bölmek burada işe yaramıyor, tırnak durumunu takip etmek gerekiyor. */

export function csvAyristir(metin) {
  const satirlar = [];
  let alan = "", satir = [], tirnak = false;

  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; }   // kaçırılmış tırnak
        else tirnak = false;
      } else alan += c;
      continue;
    }
    if (c === '"') { tirnak = true; continue; }
    if (c === ",") { satir.push(alan); alan = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { satir.push(alan); satirlar.push(satir); satir = []; alan = ""; continue; }
    alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar.filter(s => s.some(x => x !== ""));
}

/** İlk satırı başlık kabul edip nesne listesi döndürür. */
export function csvNesneler(metin) {
  const s = csvAyristir(metin);
  if (!s.length) return [];
  const bas = s[0].map(x => x.trim());
  return s.slice(1).map(r => Object.fromEntries(bas.map((k, i) => [k, r[i] ?? ""])));
}
