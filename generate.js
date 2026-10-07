#!/usr/bin/env node
// Command-line version of the pipeline. The web app on Vercel uses the same lib/prompt.js.
// Usage: node generate.js input/saree.jpg [input/blouse.jpg]
const fs = require('fs');
const path = require('path');
const { techPack, generate } = require('./lib/prompt');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('Set GEMINI_API_KEY in drapify-test/.env'); process.exit(1); }

const MODELS = (process.env.MODELS || 'gemini-3.1-flash-image-preview,gemini-3.1-flash-lite-image-preview').split(',').map(s => s.trim()).filter(Boolean);
const POSES = (process.env.POSES || 'front,three-quarter,back').split(',').map(s => s.trim());
const skin = process.env.MODEL_SKIN_TONE || 'medium-wheatish';
const region = process.env.MODEL_REGION || 'South Indian';
const PRICE_IN = Number(process.env.PRICE_IN_PER_M || 0.30);
const PRICE_OUT = Number(process.env.PRICE_OUT_PER_M || 30);
const USD_INR = Number(process.env.USD_INR || 85);

const [garmentPath, blousePath] = process.argv.slice(2);
if (!garmentPath) { console.error('Usage: node generate.js <saree.jpg> [blouse.jpg]'); process.exit(1); }
const load = p => ({ mimeType: { '.png': 'image/png', '.webp': 'image/webp' }[path.extname(p).toLowerCase()] || 'image/jpeg', data: fs.readFileSync(p).toString('base64') });

(async () => {
  const outDir = path.join(__dirname, 'output', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(outDir, { recursive: true });
  const garment = load(garmentPath), blouse = blousePath ? load(blousePath) : undefined;
  const rows = [];
  for (const model of MODELS) {
    let anchor;
    for (const pose of POSES) {
      const t0 = Date.now();
      try {
        const r = await generate({ apiKey: KEY, model, pose, images: { garment, blouse, anchor }, skin, region });
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        const inTok = r.usage.promptTokenCount || 0, outTok = r.usage.candidatesTokenCount || 0;
        const usd = inTok / 1e6 * PRICE_IN + outTok / 1e6 * PRICE_OUT;
        let file = '(no image)';
        if (r.image) {
          file = `${model}_${pose}.${r.image.mimeType.split('/')[1]}`;
          fs.writeFileSync(path.join(outDir, file), Buffer.from(r.image.data, 'base64'));
          if (!anchor) anchor = r.image;
        }
        rows.push({ model, pose, file, secs, inTok, outTok, usd: usd.toFixed(4), inr: (usd * USD_INR).toFixed(2), finish: r.finish });
        console.log(`${model} ${pose}: ${file} ${secs}s in=${inTok} out=${outTok}${r.text ? ' | ' + r.text.slice(0, 120) : ''}`);
      } catch (e) {
        rows.push({ model, pose, file: 'ERROR', error: e.message });
        console.error(`${model} ${pose}: ERROR ${e.message}`);
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'prompt-sample.txt'), techPack({ pose: 'front', hasBlouse: !!blouse, hasAnchor: false, skin, region }));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(rows, null, 2));
  console.table(rows);
  console.log(`\nOutputs in ${outDir}`);
})();
