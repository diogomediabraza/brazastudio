export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
  if (!UNSPLASH_KEY) {
    return res.status(200).json({ results: [], error: 'UNSPLASH_ACCESS_KEY not configured' });
  }

  try {
    const q = req.query.q || 'nature';
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json({ results: data.results || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message, results: [] });
  }
}
