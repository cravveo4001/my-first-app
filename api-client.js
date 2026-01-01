// api-client.js - Shared AI Logic

const MAX_FREE_USES_SHARED = 3;

// API Keys Management
function getSavedApiKeys() {
    return {
        gemini: localStorage.getItem('youtube_recommender_gemini_key') || '',
        chatgpt: localStorage.getItem('youtube_recommender_chatgpt_key') || '',
        claude: localStorage.getItem('youtube_recommender_claude_key') || ''
    };
}

function isUsingFreeQuota() {
    const usage = parseInt(localStorage.getItem('ai_usage_count') || '0');
    return usage < MAX_FREE_USES_SHARED;
}

function incrementUsageCount() {
    const current = parseInt(localStorage.getItem('ai_usage_count') || '0');
    localStorage.setItem('ai_usage_count', current + 1);
}

// Unified API Caller
// userApiKey: Optional (if provided, overrides saved keys)
// useServerKey: Boolean (for free tier via proxy)
async function callAPI(aiType, prompt, useServerKey = false, userApiKey = null) {
    const keys = getSavedApiKeys();
    const apiKey = userApiKey || keys[aiType];

    // 1. Direct Client-side Call (if User Key exists)
    if (apiKey) {
        try {
            if (aiType === 'gemini') {
                // gemini-2.0-flash (Matches working Main Page)
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');
                return data.candidates[0].content.parts[0].text;
            }

            else if (aiType === 'chatgpt') {
                const url = 'https://api.openai.com/v1/chat/completions';
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'ChatGPT API Error');
                return data.choices[0].message.content;
            }

            else if (aiType === 'claude') {
                // Client-side Anthropic calls often blocked by CORS, but implementing for completeness/proxy
                throw new Error('Claude API는 브라우저 직접 호출을 지원하지 않습니다 (CORS). 서버를 통해서만 가능합니다.');
            }
        } catch (error) {
            console.error(`${aiType} execution failed:`, error);
            throw error;
        }
    }

    // 2. Server Proxy Call (Free Tier or CORS handling)
    if (useServerKey) {
        try {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aiType: aiType,
                    prompt: prompt,
                    userApiKey: null,
                    useServerKey: true
                })
            });

            const data = await response.json();
            if (!data.success) {
                // If local file:// execution, mimic server failure
                if (window.location.protocol === 'file:') throw new Error('Local file access restricted');
                throw new Error(data.error || `${aiType} API Proxy Error`);
            }
            return data.data;

        } catch (error) {
            if (window.location.protocol === 'file:' || error.message.includes('Failed to fetch')) {
                throw new Error('서버 연결 실패. (로컬 실행 중이라면 API 키를 직접 설정해주세요)');
            }
            throw error;
        }
    }

    throw new Error('API 키가 없거나 무료 사용 횟수를 초과했습니다.');
}

// Export functions to global scope (simple module pattern)
window.APIClient = {
    getSavedApiKeys,
    isUsingFreeQuota,
    incrementUsageCount,
    callAPI
};
