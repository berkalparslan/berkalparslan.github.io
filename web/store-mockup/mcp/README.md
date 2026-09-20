# store-mockup-mcp

App Store / Google Play ekran görüntüsü setlerini **AI'dan (Claude Code, Cursor, herhangi bir MCP istemcisi)**
doğrudan üretir. Web ürünüyle (https://berkalparslan.github.io/ss) aynı render motoru (`../engine`) ve aynı şablonlar;
Node'da `@napi-rs/canvas` ile çizer, PNG ya da tarayıcıya içe aktarılacak `.sms.json` projesi yazar.

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
| `list_templates` | şablonlar: key, ad, açıklama, etiket, kategori, tema, ekran sayısı |
| `render_screenshots` | şablon + `lines`/`captions{dil:[…]}` ("Başlık [vurgu] \| Alt") + `shots` (dizi ya da `{iphone:[…],ipad:[…]}`) + ad/ikon/renk/puan → PNG'ler; `sizes` çıktı kimlikleri (`iphone-6.9`, `ipad-13`, `android-phone`, … ya da `WxH`); çıktı `dil/boyut/NN-slug.png` |
| `build_project` | aynı girdiden `.sms.json` — web uygulamasına (Projeler → İçe aktar) yükleyip editörde ince ayar |

AI'ya söylenecek tipik cümle: *"Simülatörden 6 ekran al, `store/screenshots/src/` altına koy, metinleri TR+EN yaz ve
`render_screenshots` ile `pluto` şablonunda iphone-6.9 + android-phone üret."*

## CLI (MCP olmadan)

```bash
node cli.mjs templates
node cli.mjs render  --template pluto --name "Wallet Coach" --lang tr --lines lines.txt --captions-en lines.en.txt \
                     --shots ./ss --icon icon.png --accent "#16a34a" --rating "4.8 · 1.2K" \
                     --sizes iphone-6.9,ipad-13,android-phone --out ./out
node cli.mjs project --template pluto --name "Wallet Coach" --lines lines.txt --shots ./ss --out wallet.sms.json
```

`lines.txt`: her satır bir slayt, `Başlık [vurgu] | Alt başlık`; `\n` iki satırlı başlık. `--captions-<dil>` ek diller.

## Notlar

- Fontlar yoksa sistem fontlarına düşer; şablonların doğru görünmesi için `npm run fonts`.
- Motor `../engine` altından okunur (i18n, frames, devices, render, model, tpl-dsl + `templates/index.js` listesi).
- `fonts/` ve `node_modules/` git'te yok.
