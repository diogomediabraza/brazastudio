export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY;
  if (!IDEOGRAM_KEY) {
    return res.status(200).json({ url: null, error: 'IDEOGRAM_API_KEY not configured' });
  }

  try {
    const { prompt, size, style } = req.body;

    // Map size to Ideogram aspect ratio
    const aspectMap = {
      '1080x1080': 'ASPECT_1_1',
      '1080x1350': 'ASPECT_4_5',
      '1080x1920': 'ASPECT_9_16',
      '1200x628':  'ASPECT_16_9'
    };
    const aspectRatio = aspectMap[size] || 'ASPECT_1_1';

    // Map style to Ideogram style type
    const styleMap = {
      'minimalista': 'DESIGN',
      'bold': 'DESIGN',
      'elegante': 'GENERAL',
      'colorido': 'VIBRANT',
      'dark': 'DESIGN',
      'moderno': 'DESIGN'
    };
    const styleType = styleMap[style] || 'DESIGN';

    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': IDEOGRAM_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_request: {
          prompt: prompt,
          aspect_ratio: aspectRatio,
          model: 'V_2',
          style_type: styleType,
          magic_prompt_option: 'OFF'
        }
      })
    });

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url || null;

    return res.status(200).json({ url: imageUrl, prompt });
  } catch (error) {
    return res.status(500).json({ error: error.message, url: null });
  }
}
