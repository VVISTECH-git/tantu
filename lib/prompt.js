// Condensed Drapify-style "DIGITAL TECH PACK" prompt, shared by the CLI and the API.
const GESTURES = ['one hand resting lightly on the pallu', 'hands relaxed at sides',
  'one hand on hip, other holding pleats', 'hands loosely clasped at waist'];

function techPack({ pose, hasBlouse, hasAnchor, skin = 'medium-wheatish', region = 'South Indian' }) {
  const gesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
  return `DIGITAL TECH PACK — E-COMMERCE SAREE CATALOG RENDER

[1. OBJECTIVE] Produce one photorealistic studio catalog photograph of an adult female model wearing the EXACT saree shown in the GARMENT REFERENCE image. This is a product photo: garment fidelity outranks everything else.

[2. GARMENT FIDELITY — CRITICAL]
- Reproduce the body colour, border, pallu and motifs exactly. Do not invent, simplify, recolour or re-scale prints.
- Preserve border width, zari/metallic sheen, weave texture and fabric weight (drape must match the fabric's stiffness).
- Motif scale must stay consistent across body, pleats and pallu.
- If any area is not visible in the reference, continue the visible pattern logically; never introduce new motifs.

[3. DRAPE] Classic Nivi drape. 6–8 crisp front pleats tucked at the navel line, pallu over the left shoulder falling to mid-thigh with the pallu design fully displayed.

[4. BLOUSE] ${hasBlouse ? 'Use the EXACT blouse from the BLOUSE REFERENCE image (colour, neckline, sleeve length, embellishment).' : 'Plain blouse in a solid colour taken from the saree border, elbow-length sleeves, modest round neckline.'}

[5. MODEL] Adult Indian woman, ${region}, ${skin} skin tone, natural skin texture with visible pores, realistic proportions (about 7.5 head-heights), minimal jewellery (small studs, thin bangle) that does not cover the garment.
${hasAnchor ? '\n[5a. CONSISTENCY ANCHOR] The ANCHOR image shows the same model and saree from a previous shot. Keep the identical face, hairstyle, body, blouse, jewellery and saree. Only the pose and camera angle change.\n' : ''}
[6. POSE] ${pose} view, full body head to toe, standing naturally, ${gesture}.${pose === 'back' ? ' Show the back of the blouse and the pallu falling down the back; face turned slightly over the shoulder.' : ''}

[7. CAMERA] 85mm equivalent, f/8, eye-level, full body centred with 5% headroom, vertical 3:4 framing.

[8. LIGHT & SET] Soft even studio light, large key softbox at 45°, gentle fill, seamless light warm-grey background, soft floor shadow.

[9. NEGATIVE] No text, logos, watermarks, extra limbs, distorted hands, cropped feet, props, busy backgrounds, or changes to the garment design.

[10. RESTATEMENT] Garment fidelity to the reference is the single most important requirement. Same colours. Same border. Same pallu. Same motifs.`;
}

// images: { garment: {mimeType,data}, blouse?: {...}, anchor?: {...} }
async function generate({ apiKey, model, pose, images, skin, region }) {
  const parts = [{ text: 'GARMENT REFERENCE:' }, { inline_data: { mime_type: images.garment.mimeType, data: images.garment.data } }];
  if (images.blouse) parts.push({ text: 'BLOUSE REFERENCE:' }, { inline_data: { mime_type: images.blouse.mimeType, data: images.blouse.data } });
  if (images.anchor) parts.push({ text: 'CONSISTENCY ANCHOR:' }, { inline_data: { mime_type: images.anchor.mimeType, data: images.anchor.data } });
  parts.push({ text: techPack({ pose, hasBlouse: !!images.blouse, hasAnchor: !!images.anchor, skin, region }) });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '3:4' } },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(json.error && json.error.message) || 'request failed'}`);
  const out = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
  const img = out.map(p => p.inlineData || p.inline_data).find(Boolean);
  return {
    image: img ? { mimeType: img.mimeType || img.mime_type || 'image/png', data: img.data } : null,
    text: out.filter(p => p.text).map(p => p.text).join(' '),
    usage: json.usageMetadata || {},
    finish: json.candidates && json.candidates[0] && json.candidates[0].finishReason,
  };
}

module.exports = { techPack, generate };
