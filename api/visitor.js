// Vercel Serverless Function for visitor counter
// Note: Vercel 서버리스 환경에서는 파일 시스템에 쓸 수 없으므로
// 간단한 카운터만 반환합니다. 실제 카운팅이 필요하면 데이터베이스를 사용해야 합니다.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // 서버리스 환경에서는 영구 저장이 불가능하므로 
    // countapi.xyz 같은 외부 서비스 사용을 권장
    return res.status(200).json({
        success: true,
        count: 0,
        message: '방문자 카운팅은 외부 서비스를 사용해주세요.'
    });
}
