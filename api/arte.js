export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, size, provider: requestedProvider } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const HF_TOKEN   = process.env.HF_TOKEN;

  const sizeMap = {
    '1080x1080': { width: 1080, height: 1080, aspect: '1:1' },
    '1080x1350': { width: 1080, height: 1350, aspect: '4:5' },
    '1080x1920': { width: 1080, height: 1920, aspect: '9:16' },
    '1200x628':  { width: 1200, height: 628,  aspect: '16:9' },
  };
  const dims = sizeMap[size] || sizeMap['1080x1080'];

  // Auto-select providers in priority order; Pollinations is always available
  const autoProviders = [
    GEMINI_KEY && 'gemini',
    HF_TOKEN   && 'huggingface',
    'pollinations',
  ].filter(Boolean);

  const providers = requestedProvider ? [requestedProvider] : autoProviders;

  for (const provider of providers) {
    try {
      if (provider === 'gemini' && GEMINI_KEY) {
        const result = await geminiGenerate(prompt, dims, GEMINI_KEY);
        if (result) return res.status(200).json({ url: result.url, prompt, provider: 'gemini' });
      }

      if (provider === 'huggingface' && HF_TOKEN) {
        const result = await huggingFaceGenerate(prompt, dims, HF_TOKEN);
        if (result) return res.status(200).json({ url: result.url, prompt, provider: 'huggingface' });
      }

      if (provider === 'pollinations') {
        // Returns external URL directly — image loads in browser, no timeout risk
        const url = buildPollinationsUrl(prompt, dims);
        return res.status(200).json({ url, prompt, provider: 'pollinations' });
      }
    } catch (err) {
      console.error(`[arte] provider ${provider} failed:`, err.message);
      // Continue to next provider
    }
  }

  return res.status(200).json({ url: null, error: 'All providers failed.' });
}

// ─── Pollinations.ai — free, no API key ────────────────────────────────────
function buildPollinationsUrl(prompt, dims) {
  const encoded = encodeURIComponent(prompt);
  const seed    = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${dims.width}&height=${dims.height}&nologo=true&model=flux&seed=${seed}`;
}

// ─── Google Gemini — Imagen 4 (paid) ───────────────────────────────────────
async function geminiGenerate(prompt, dims, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: dims.aspect,
          safetyFilterLevel: 'block_few',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const b64      = data.predictions?.[0]?.bytesBase64Encoded;
  const mimeType = data.predictions?.[0]?.mimeType || 'image/png';
  if (!b64) return null;
  return { url: `data:${mimeType};base64,${b64}` };
}

// ─── Hugging Face — FLUX.1-schnell (free tier with HF_TOKEN) ───────────────
async function huggingFaceGenerate(prompt, dims, token) {
  const res = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width: dims.width, height: dims.height },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HuggingFace error ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  const b64    = Buffer.from(buffer).toString('base64');
  return { url: `data:image/jpeg;base64,${b64}` };
}
