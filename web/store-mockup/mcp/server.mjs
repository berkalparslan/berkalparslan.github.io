#!/usr/bin/env node
/* Store Mockup MCP sunucusu (stdio). Araçlar:
   - list_templates        : şablonlar + etiketler
   - render_screenshots    : şablon + metin + ss dosyaları → PNG'ler (App Store / Play boyutları)
   - build_package         : tarayıcı aracına sürüklenecek .paket.json
   Kurulum: claude mcp add store-mockup -- node /path/to/mcp/server.mjs */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { listTemplates, renderSet, buildPackage } from './render-node.mjs';

const server = new McpServer({ name: 'store-mockup', version: '0.1.0' });

const SpecShape = {
  template: z.string().describe('Template key from list_templates (e.g. indie, ledger, owl, calm, nysa, vela, innerglow, track, glass, strip, lux, paper, lime).'),
  name: z.string().describe('App name — drawn with the icon on slide 1.'),
  lang: z.string().default('tr').describe('Copy language code (tr, en, de, …). Only affects template placeholder copy; your `lines` are used verbatim.'),
  lines: z.array(z.string()).describe('One line per slide: "Headline [highlight] | Subtitle". Headline ≤30 chars, subtitle ≤55; wrap ONE benefit word in [brackets]; \\n for a line break. Order must match `shots`.'),
  shots: z.array(z.string()).default([]).describe('Screenshot file paths in slide order (PNG/JPG, portrait phone captures). Empty slots render a placeholder.'),
  icon: z.string().optional().describe('App icon file path (square PNG).'),
  accent: z.string().optional().describe('Brand accent hex (#16a34a). Omit to keep the template colour.'),
  rating: z.string().optional().describe('Rating badge text for slide 1, e.g. "4.8 · 1.2K ratings". Only if real.'),
  addIcon: z.boolean().default(true).describe('Draw icon + app name on slide 1.'),
  frame: z.string().optional().describe('Device frame override: iphone-pro | iphone-notch | android | tablet | none.'),
};

server.tool(
  'list_templates',
  'List the screenshot templates (key, name, description, tags, slide count). Pick by the app category and desired theme (acik=light, koyu=dark, renkli=colourful).',
  {},
  async () => ({ content: [{ type: 'text', text: JSON.stringify(listTemplates(), null, 1) }] })
);

server.tool(
  'render_screenshots',
  'Render a complete App Store / Google Play screenshot set as PNG files from a template, your copy lines and screenshot files. Returns the written file paths. Default size 1290x2796 (iPhone 6.9"); pass sizes for more (1284x2778, 1242x2688, 1080x1920, 1440x2560, 2048x2732).',
  {
    ...SpecShape,
    sizes: z.array(z.string()).default(['1290x2796']).describe('Output sizes "WxH". Each size goes to its own subfolder when more than one.'),
    outDir: z.string().default('./store-screenshots').describe('Output directory.'),
  },
  async (spec) => {
    for (const p of [...(spec.shots || []), spec.icon].filter(Boolean)) if (!fs.existsSync(p)) return { isError: true, content: [{ type: 'text', text: `file not found: ${p}` }] };
    const r = await renderSet(spec);
    return { content: [{ type: 'text', text: `${r.files.length} PNG written (${r.slides} slides, template ${r.template}) → ${r.outDir}\n` + r.files.map((f) => path.relative(process.cwd(), f)).join('\n') }] };
  }
);

server.tool(
  'build_package',
  'Write a .paket.json that can be dropped onto the Store Mockup Studio web app (berkalparslan.github.io/ss) for visual fine-tuning. Use when the user wants to edit in the browser instead of final PNGs.',
  { ...SpecShape, out: z.string().default('./store-mockup.paket.json').describe('Output .json path.') },
  async (spec) => {
    const pkg = buildPackage(spec);
    fs.writeFileSync(spec.out, JSON.stringify(pkg));
    return { content: [{ type: 'text', text: `package written: ${path.resolve(spec.out)} (${pkg.shots.length} shots, ${pkg.quick.lines.length} lines). Drop it onto https://berkalparslan.github.io/ss` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
