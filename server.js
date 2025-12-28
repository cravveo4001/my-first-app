const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// API 키 설정 (환경 변수에서 읽기)
const API_KEYS = {
    gemini: process.env.GEMINI_API_KEY || '',
    chatgpt: process.env.CHATGPT_API_KEY || '',
    claude: process.env.ANTHROPIC_API_KEY || ''
};

const PORT = 3000;

// 방문자 카운터 파일 경로
const VISITORS_FILE = path.join(__dirname, 'visitors.json');

// 방문자 수 읽기
function getVisitorCount() {
    try {
        if (fs.existsSync(VISITORS_FILE)) {
            const data = fs.readFileSync(VISITORS_FILE, 'utf8');
            return JSON.parse(data).count || 0;
        }
    } catch (e) {
        console.error('방문자 파일 읽기 오류:', e);
    }
    return 0;
}

// 방문자 수 저장
function saveVisitorCount(count) {
    try {
        fs.writeFileSync(VISITORS_FILE, JSON.stringify({ count }), 'utf8');
    } catch (e) {
        console.error('방문자 파일 저장 오류:', e);
    }
}

// 방문자 수 증가 및 반환
function incrementVisitor() {
    const count = getVisitorCount() + 1;
    saveVisitorCount(count);
    return count;
}

// MIME 타입
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json'
};

// Gemini API 호출
function callGeminiAPI(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEYS.gemini}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message));
                    } else {
                        resolve(json.candidates[0].content.parts[0].text);
                    }
                } catch (e) {
                    reject(new Error('Gemini API 응답 파싱 실패'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ChatGPT API 호출
function callChatGPTAPI(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.chatgpt}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message));
                    } else {
                        resolve(json.choices[0].message.content);
                    }
                } catch (e) {
                    reject(new Error('ChatGPT API 응답 파싱 실패'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Claude API 호출
function callClaudeAPI(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEYS.claude,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message));
                    } else {
                        resolve(json.content[0].text);
                    }
                } catch (e) {
                    reject(new Error('Claude API 응답 파싱 실패'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 정적 파일 제공
function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

// HTTP 서버
const server = http.createServer(async (req, res) => {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API 엔드포인트: 방문자 카운터
    if (req.method === 'GET' && req.url === '/api/visitor') {
        const count = incrementVisitor();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count }));
        return;
    }

    // API 엔드포인트
    if (req.method === 'POST' && req.url === '/api/recommend') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { aiType, prompt } = JSON.parse(body);
                let result;

                if (aiType === 'gemini') {
                    result = await callGeminiAPI(prompt);
                } else if (aiType === 'chatgpt') {
                    result = await callChatGPTAPI(prompt);
                } else if (aiType === 'claude') {
                    result = await callClaudeAPI(prompt);
                } else {
                    throw new Error('알 수 없는 AI 타입');
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: result }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // 정적 파일 제공
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
    console.log('브라우저에서 위 주소로 접속하세요!');
});
