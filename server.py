import http.server
import socketserver
import json
import urllib.request
import urllib.error
import os
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

PORT = 3000

# 서버 기본 API 키 설정 (환경 변수에서 읽기)
SERVER_API_KEYS = {
    'gemini': os.getenv('GEMINI_API_KEY', ''),
    'chatgpt': os.getenv('CHATGPT_API_KEY', ''),
    'claude': os.getenv('CLAUDE_API_KEY', '')
}

# 방문자 카운터 파일 경로
VISITORS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'visitors.json')

def get_visitor_count():
    try:
        if os.path.exists(VISITORS_FILE):
            with open(VISITORS_FILE, 'r') as f:
                data = json.load(f)
                return data.get('count', 0)
    except:
        pass
    return 0

def save_visitor_count(count):
    try:
        with open(VISITORS_FILE, 'w') as f:
            json.dump({'count': count}, f)
    except:
        pass

def increment_visitor():
    count = get_visitor_count() + 1
    save_visitor_count(count)
    return count

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/visitor':
            count = increment_visitor()
            response = {'success': True, 'count': count}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            # 정적 파일 제공
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/recommend':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            ai_type = data.get('aiType')
            prompt = data.get('prompt')
            user_api_key = data.get('userApiKey')  # 사용자 제공 API 키
            use_server_key = data.get('useServerKey', False)  # 서버 기본 키 사용 여부
            
            # API 키 결정
            if user_api_key:
                api_key = user_api_key
            elif use_server_key:
                api_key = SERVER_API_KEYS.get(ai_type)
            else:
                # 사용자 키도 없고 서버 키 사용 권한도 없는 경우
                response = {'success': False, 'error': '무료 사용 횟수가 소진되었습니다. API 키를 입력해주세요.'}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                return
            
            try:
                if ai_type == 'gemini':
                    result = self.call_gemini(prompt, api_key)
                elif ai_type == 'chatgpt':
                    result = self.call_chatgpt(prompt, api_key)
                elif ai_type == 'claude':
                    result = self.call_claude(prompt, api_key)
                else:
                    raise Exception('알 수 없는 AI 타입')
                
                response = {'success': True, 'data': result}
            except Exception as e:
                response = {'success': False, 'error': str(e)}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_error(404)

    def call_gemini(self, prompt, api_key):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }]
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data['candidates'][0]['content']['parts'][0]['text']
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            error_data = json.loads(error_body)
            raise Exception(error_data.get('error', {}).get('message', 'Gemini API 오류'))

    def call_chatgpt(self, prompt, api_key):
        url = 'https://api.openai.com/v1/chat/completions'
        
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 1000,
            'temperature': 0.7
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {api_key}"
            }
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data['choices'][0]['message']['content']
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            error_data = json.loads(error_body)
            raise Exception(error_data.get('error', {}).get('message', 'ChatGPT API 오류'))

    def call_claude(self, prompt, api_key):
        url = 'https://api.anthropic.com/v1/messages'
        
        payload = {
            'model': 'claude-3-haiku-20240307',
            'max_tokens': 1024,
            'messages': [{'role': 'user', 'content': prompt}]
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            }
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data['content'][0]['text']
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            error_data = json.loads(error_body)
            raise Exception(error_data.get('error', {}).get('message', 'Claude API 오류'))

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(('', PORT), APIHandler) as httpd:
        print(f'🚀 서버가 http://localhost:{PORT} 에서 실행 중입니다')
        print('브라우저에서 위 주소로 접속하세요!')
        httpd.serve_forever()
