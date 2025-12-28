// Vercel Serverless Function for AI recommendations
module.exports = async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { aiType, prompt, userApiKey, useServerKey } = req.body;

        // API 키 결정: 사용자 키 우선, 없으면 서버 환경변수 키
        let apiKey = userApiKey;
        if (!apiKey && useServerKey) {
            if (aiType === 'gemini') {
                apiKey = process.env.GEMINI_API_KEY;
            } else if (aiType === 'chatgpt') {
                apiKey = process.env.CHATGPT_API_KEY;
            } else if (aiType === 'claude') {
                apiKey = process.env.CLAUDE_API_KEY;
            }
        }

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API 키가 필요합니다. API 키 설정에서 키를 입력해주세요.'
            });
        }

        let result;

        if (aiType === 'gemini') {
            result = await callGeminiAPI(prompt, apiKey);
        } else if (aiType === 'chatgpt') {
            result = await callChatGPTAPI(prompt, apiKey);
        } else if (aiType === 'claude') {
            result = await callClaudeAPI(prompt, apiKey);
        } else {
            return res.status(400).json({ success: false, error: '알 수 없는 AI 타입' });
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Gemini API 호출
async function callGeminiAPI(prompt, apiKey) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        }
    );

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Gemini API 오류');
    }

    return data.candidates[0].content.parts[0].text;
}

// ChatGPT API 호출
async function callChatGPTAPI(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'ChatGPT API 오류');
    }

    return data.choices[0].message.content;
}

// Claude API 호출
async function callClaudeAPI(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Claude API 오류');
    }

    return data.content[0].text;
}
