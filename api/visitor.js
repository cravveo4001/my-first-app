// Vercel Serverless Function for visitor counter using Upstash Redis
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Upstash가 설정되지 않은 경우
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        return res.status(200).json({
            success: true,
            count: 0,
            message: 'Upstash Redis가 설정되지 않았습니다.'
        });
    }

    try {
        // INCR 명령으로 방문자 수 증가 및 반환
        const response = await fetch(`${UPSTASH_URL}/incr/visitor_count`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_TOKEN}`
            }
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return res.status(200).json({
            success: true,
            count: data.result || 0
        });
    } catch (error) {
        console.error('Visitor counter error:', error);
        return res.status(200).json({
            success: true,
            count: 0,
            error: error.message
        });
    }
};
