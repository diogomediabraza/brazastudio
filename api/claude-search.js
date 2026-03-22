export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { handle } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Pesquisa informações sobre o perfil Instagram @${handle}. Procura: número de seguidores, bio, tipo de conteúdo, frequência de posts, nicho, nível de engajamento. Responde com um resumo estruturado em português de Portugal. Se não encontrares, diz o que foi possível encontrar.`
        }]
      })
    });

    const data = await response.json();
    const textContent = data.content
      ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : '';

    return res.status(200).json({ result: textContent || 'Perfil não encontrado publicamente.' });
  } catch (error) {
    return res.status(500).json({ error: error.message, result: 'Erro na pesquisa.' });
  }
}
