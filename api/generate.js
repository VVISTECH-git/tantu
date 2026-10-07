// Vercel serverless function: renders one pose per call.
// The browser loops over poses and sends the first result back as the anchor,
// which keeps every call short and under Vercel's 4.5 MB body limit.
const { generate } = require('../lib/prompt');

const ALLOWED_MODELS = (process.env.MODELS || 'gemini-3.1-flash-image-preview,gemini-3.1-flash-lite-image-preview')
  .split(',').map(s => s.trim()).filter(Boolean);
const PRICE_IN = Number(process.env.PRICE_IN_PER_M || 0.30);
const PRICE_OUT = Number(process.env.PRICE_OUT_PER_M || 30);
const USD_INR = Number(process.env.USD_INR || 85);

const isImg = x => x && typeof x.data === 'string' && /^image\/(jpeg|png|webp)$/.test(x.mimeType || '');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ models: ALLOWED_MODELS, passwordRequired: !!process.env.ACCESS_PASSWORD });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });
  if (process.env.ACCESS_PASSWORD && req.headers['x-access-password'] !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({ error: 'Wrong or missing access password' });
  }

  const { model, pose, garment, blouse, anchor, skin, region } = req.body || {};
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: 'Unknown model' });
  if (!['front', 'three-quarter', 'back', 'side'].includes(pose)) return res.status(400).json({ error: 'Unknown pose' });
  if (!isImg(garment) || (blouse && !isImg(blouse)) || (anchor && !isImg(anchor))) return res.status(400).json({ error: 'Bad image payload' });

  const t0 = Date.now();
  try {
    const r = await generate({
      apiKey: process.env.GEMINI_API_KEY, model, pose,
      images: { garment, blouse, anchor },
      skin: String(skin || 'medium-wheatish').slice(0, 40),
      region: String(region || 'South Indian').slice(0, 40),
    });
    const inTok = r.usage.promptTokenCount || 0, outTok = r.usage.candidatesTokenCount || 0;
    const usd = inTok / 1e6 * PRICE_IN + outTok / 1e6 * PRICE_OUT;
    res.status(200).json({
      image: r.image, text: r.text, finish: r.finish,
      secs: ((Date.now() - t0) / 1000).toFixed(1), inTok, outTok,
      usd: usd.toFixed(4), inr: (usd * USD_INR).toFixed(2),
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
