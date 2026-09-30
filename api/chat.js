module.exports = async (req, res) => {
    // CORS対策などが必要な場合に対応
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { theme, history, step } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key is not configured on server environment variables.' });
    }

    const systemPrompt = `
あなたはソクラテス式AIと壁打ちアプリ『イグニットインク』の思想を宿した対話型一次情報ライティングエンジン『Socratic Writer』です。
目的は、ユーザーの頭の中にある曖昧なテーマから、独自の「熱量、体験、生々しい本音、失敗からの教訓」を引き出すことです。
頭ごなしに答えを教えるのではなく、鋭く温かみのある「問い（質問）」を投げかけてユーザーの思考を深掘りさせてください。

現在の進行ステップ: ${step}（全3往復の対話）
ユーザーの書きたいテーマ: "${theme}"

これまでの対話履歴を考慮し、ユーザーの直前の発言に対して、さらに本音や具体的なエピソードを引き出すための「短い問い（1〜2文）」を返答してください。余計な挨拶や解説は省き、問いかけの言葉のみを返してください。
`;

    try {
        // fetchの代わりにNode.js標準のグローバルfetchを使用
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...(history || [])
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API error');
        }

        const aiReply = data.choices[0].message.content;
        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error('AI API Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to communicate with AI engine.' });
    }
};
