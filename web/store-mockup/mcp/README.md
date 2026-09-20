# store-mockup-mcp

App Store / Google Play ekran görüntüsü setlerini **AI'dan (Claude Code, Cursor, herhangi bir MCP istemcisi)**
doğrudan üretir. Web aracıyla (https://berkalparslan.github.io/ss) aynı render motoru, aynı 38 şablon;
Node'da `@napi-rs/canvas` ile çizer, PNG yazar.

## Kurulum

```bash
cd web/store-mockup/mcp
npm install
npm run fonts        # şablon fontlarını (Google Fonts, OFL) fonts/ altına indirir — bir kez
```

Claude Code'a ekle:

```bash
claude mcp add store-mockup -- node /Users/aberk/dev/web-githubpages/berkalparslan.github.io/web/store-mockup/mcp/server.mjs
```

Cursor / diğer istemciler: `command: node`, `args: ["<yol>/server.mjs"]`.

## Araçlar

| araç | ne yapar |
|---|---|
| `list_templates` | 38 şablon: key, ad, açıklama, etiketler (kategori + acik/koyu/renkli) |
| `render_screenshots` | şablon + `lines` ("Başlık [vurgu] \| Alt") + `shots` (dosya yolları) + ad/ikon/renk/puan → PNG'ler; `sizes` ile çoklu boyut |
| `build_package` | aynı girdiden `.paket.json` — web aracına sürükleyip görsel ince ayar için |

AI'ya söylenecek tipik cümle: *"Simülatörden 6 ekran al, `store/screenshots/src/` altına koy, metinleri yaz ve
`render_screenshots` ile `indie` şablonunda 1290x2796 + 1080x1920 üret."*

## CLI (MCP olmadan)

```bash
node cli.mjs templates
node cli.mjs render  --template indie --name "Wallet Coach" --lines lines.txt --shots ./ss \
                     --icon icon.png --accent "#16a34a" --rating "4.8 · 1.2K" --sizes 1290x2796,1080x1920 --out ./out
node cli.mjs package --template indie --name "Wallet Coach" --lines lines.txt --shots ./ss --out wallet.paket.json
```

`lines.txt`: her satır bir slayt, `Başlık [vurgu] | Alt başlık`; `\n` iki satırlı başlık.

## Notlar

- Fontlar yoksa sistem fontlarına düşer (macOS'ta SF/Helvetica); şablonların doğru görünmesi için `npm run fonts`.
- Motor dosyaları `../js` altından okunur (paket olarak yayınlanırken kopyalanacak).
- Web aracının editörü (`../`) aynı gövde biçimini kullanır; PNG yerine `.paket.json` üretip tarayıcıda düzenlemek de mümkün.
