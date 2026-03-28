export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(200).json({ url: null, error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { prompt, size } = req.body;

    const aspectMap = {
      '1080x1080': '1:1',
      '1080x1350': '4:5',
      '1080x1920': '9:16',
      '1200x628':  '16:9'
    };
    const aspectRatio = aspectMap[size] || '1:1';

    const negativePrompt = [
      'amateur photography',
      'blurry or out of focus',
      'distorted faces',
      'warped or malformed hands',
      'visible AI generation artifacts',
      'low resolution',
      'stock photo cliches',
      'bad composition',
      'lens geometric distortion',
      'text rendering errors',
      'watermark',
      'overexposed or underexposed',
      'noise and grain',
      'unrealistic skin tones',
      'plastic or waxy textures',
      'generic corporate look',
      'busy clutered background',
      'wrong perspective'
    ].join(', ');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
            negativePrompt,
            safetyFilterLevel: 'block_few',
            personGeneration: 'allow_adult'
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ url: null, error: data.error.message });
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    const mimeType = data.predictions?.[0]?.mimeType || 'image/png';

    if (!b64) {
      return res.status(200).json({ url: null, error: 'No image returned' });
    }

    return res.status(200).json({ url: `data:${mimeType};base64,${b64}`, prompt });

  } catch (error) {
    return res.status(500).json({ error: error.message, url: null });
  }
}
