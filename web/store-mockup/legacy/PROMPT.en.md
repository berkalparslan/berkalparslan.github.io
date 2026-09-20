# AI prompt for store screenshots

Copy the text below, fill in `{{APP}}`, and hand it to an AI that knows your app. Paste the
JSON it returns into the **✨ AI copy** dialog in the tool — all slides get their copy and
design in one click.

> The same prompt is built into the tool: **✨ AI copy → Copy prompt to clipboard**. It fills
> the screen list from your slide file names; you fix those lines up ("home screen",
> "stats page") so each headline lands on the right screen.
>
> **The AI does not create screenshots — you do.** You can also attach the screenshots to that
> chat; then the AI writes from what is actually on screen. If you can't, one-line screen
> descriptions are enough.

---

## PROMPT (copy from here)

You are a senior ASO specialist and art director. You are preparing the copy and the design
template for an App Store / Google Play screenshot set.

APP:
{{APP}}

SCREENS (the screenshots I have, in order):
{{SCREENS}}

YOUR TASK: write a headline + subtitle for {{COUNT}} store images and propose 3 different
design variants. I will capture and place the screenshots myself; I need copy and a template
from you, not images.

COPY RULES
- Headline: 30 characters max. Short, benefit-first, a promise or an imperative. No full stop
  at the end. If you want two lines, break in the middle with `\n`.
- Subtitle: 55 characters max. It makes the headline concrete; it describes the outcome the
  user gets, not the feature.
- Write in the app's language (English unless stated otherwise).
- No clichés or hype: avoid "revolutionary", "the best", "number one", "everything in one tap".
  Never claim prices or discounts (store policy).
- Do not repeat the same key word across two headlines.
- The `slides` array must follow the SCREENS list **in the exact same order**: copy 1 describes
  screen 1. Each line must talk about something actually visible on that screen; do not invent
  features. If no screen list is given, invent a typical flow and note which screen each slide
  belongs to in a `"screen"` field.
- Narrative order (scale it to {{COUNT}} slides):
  1. The core promise — the one-sentence reason the app exists
  2. Core feature 1
  3. Core feature 2
  4. The differentiator (what competitors don't have)
  5. Trust: privacy, offline use, community, speed — whichever is true
  6. Closing + call to action
- The first 2 images matter most: most people never scroll past them, so put the strongest
  promises there.

DESIGN RULES
- Produce 3 variants; each one uses a **different font + different palette + different layout
  rhythm** (e.g. A: dark mesh + system font, B: light/cream + serif, C: vivid gradient with wide
  letter spacing).
- Keep each variant internally consistent: same font, same text sizes, same device frame.
  Backgrounds may shift between slides but stay in one colour family; use at most 2 layouts
  (e.g. slide 1 "bleed", the rest "text-top").
- Text colour `#ffffff` on dark backgrounds, `#111214` on light ones.
- `titleSize` between 5 and 7, `subSize` between 3 and 3.8. Shrink the size for long headlines.
- HIGHLIGHT: wrap at most one word/phrase per headline in `[square brackets]`; it is drawn in the
  `accent` colour (e.g. "[See] your money"). The 2026 top-chart pattern: one highlight, the benefit word.
- SOCIAL PROOF: put one `rating` element on slide 1 (if you don't know the score, write a placeholder
  like "4.9 · 2K ratings", I'll fix it). Add one `pill` (feature chip) or `note` (notification card)
  where it helps; at most 2 elements per slide.
- Make one of the variants `panorama: true` (the background flows across all frames).

OUTPUT FORMAT
Return a single JSON object matching the schema below. No commentary, no preamble.

```json
{
  "variants": [
    {
      "name": "A — Dark mesh",
      "template": {
        "font": "system",
        "frame": "iphone-pro",
        "deviceColor": "graphite",
        "layout": "text-top",
        "background": "cyber-mesh",
        "titleSize": 6.2,
        "subSize": 3.4,
        "weight": 700,
        "letterSpacing": 0,
        "textColor": "#ffffff",
        "subColor": "#ffffff",
        "shadow": false,
        "accent": "#ffd60a",
        "hlStyle": "color",
        "box": "none",
        "panorama": false
      },
      "slides": [
        { "title": "[See] your money", "subtitle": "Subtitle", "layout": "bleed", "background": "indigo",
          "stickers": [ { "type": "rating", "text": "4.9 · 2K ratings", "x": 0, "y": 24, "size": 2.6, "bg": "#ffffff" } ] },
        { "title": "Headline", "subtitle": "Subtitle",
          "stickers": [ { "type": "pill", "emoji": "🔥", "text": "7-day streak", "x": 28, "y": 46, "size": 3.2, "rot": -6, "bg": "#ffffff" } ] }
      ]
    }
  ]
}
```

- `slides` must contain exactly {{COUNT}} items. `title` and `subtitle` are required on each.
- Per-slide `layout`, `background`, `frame` and `deviceColor` are optional; when omitted the
  variant's `template` value is used.

ALLOWED VALUES
- `font`: system | inter | manrope | plus-jakarta | outfit | sora | space-grotesk | bricolage |
  nunito (rounded, playful) | unbounded (wide, gen-z) | bebas (condensed caps, sport) |
  playfair | fraunces | dm-serif | instrument-serif (serifs) | helvetica-neue | avenir | futura |
  georgia | times | courier | impact
- `frame`: iphone-pro | iphone-notch | iphone-classic | android | tablet | watch | browser | none
- `deviceColor`: graphite | black | silver | gold | blue | white
- `layout`: text-top | text-bottom | bleed (device bleeds off the bottom) | tilt | right (device
  right, copy left-aligned) | left | small | full (no frame, full bleed) | hero (giant tilted
  device) | span-left / span-right (device spans two frames; use on consecutive slides with
  panorama) | text-only (no device)
- `background`: a preset key → indigo | sunset | purple-night | mint | ocean | fire | rose |
  night | dark | light | white | paper | black | deep-violet | lime | coral | cyber-mesh |
  warm-mesh | ice-mesh | aurora | peach-mesh | forest | cream | graphite-bg
  **or** your own definition:
  `{ "type": "linear", "c1": "#6366f1", "c2": "#22d3ee", "angle": 135 }`
  (`type`: solid | linear | radial | mesh — mesh also needs `c3`; optional `pattern`:
  none|dots|grid|diagonal|rings, `noise`: 0-40, `vignette`: 0-80)
- `weight`: 300 | 400 | 500 | 600 | 700 | 800 | 900
- `letterSpacing`: -4 to 20 (letter spacing as a percentage of the font size)
- `accent`: highlight colour (hex). `hlStyle`: color | marker (highlighter) | underline
- `box`: none | solid | glass | outline (a box behind the copy; give `boxColor` for solid)
- `stickers` (optional array per slide): each `{ type, text, sub, emoji, x, y, size, rot, bg, color }`
  - `type`: rating (stars + `text`) | pill (`emoji` + `text` chip) | laurel (`sub` small top label,
    `text` two-line award name with `\n`) | note (notification card: `text` title, `sub` body,
    `time`) | icon (app icon + name) | text | arrow | ring
  - `x`: -60..60 (0 = centre), `y`: 0..100 (percent from top), `size`: 2..5, `rot`: -20..20
  - On dark backgrounds use a white `bg`, on light ones a dark `bg` (#111214).

---

## Note

Paste the JSON into the tool and the 3 variants show up as buttons; click one and that design is
applied to every slide. Don't like it? Click another — your screenshots stay in place, only the
copy and styling change.
