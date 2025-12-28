document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('recommendation-form');
    const resultSection = document.getElementById('result-section');
    const geminiResult = document.getElementById('gemini-result');
    const chatgptResult = document.getElementById('chatgpt-result');
    const claudeResult = document.getElementById('claude-result');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    // API 설정 관련 요소
    const usageBadge = document.getElementById('usage-badge');
    const usageText = document.getElementById('usage-text');
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    const apiSettingsPanel = document.getElementById('api-settings-panel');
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const clearApiKeysBtn = document.getElementById('clear-api-keys');

    // API 키 입력 필드
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const chatgptApiKeyInput = document.getElementById('chatgpt-api-key');
    const claudeApiKeyInput = document.getElementById('claude-api-key');

    // 상수
    const MAX_FREE_USES = 3;
    const STORAGE_KEYS = {
        usageCount: 'youtube_recommender_usage_count',
        geminiKey: 'youtube_recommender_gemini_key',
        chatgptKey: 'youtube_recommender_chatgpt_key',
        claudeKey: 'youtube_recommender_claude_key',
        language: 'youtube_recommender_language'
    };

    // 언어 설정
    const LANGUAGES = {
        ko: { flag: '🇰🇷', name: '한국어' },
        en: { flag: '🇺🇸', name: 'English' },
        ja: { flag: '🇯🇵', name: '日本語' },
        zh: { flag: '🇨🇳', name: '中文' }
    };

    let currentLang = localStorage.getItem(STORAGE_KEYS.language) || 'ko';
    let translations = {};

    // 번역 파일 로드
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`/lang/${lang}.json`);
            translations = await response.json();
            applyTranslations();
        } catch (error) {
            console.error('번역 파일 로드 실패:', error);
        }
    }

    // 번역 적용
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });

        // placeholder 번역
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[key]) {
                el.placeholder = translations[key];
            }
        });

        // 페이지 제목 업데이트
        if (translations.title) {
            document.title = translations.title.replace('🎬 ', '');
        }
    }

    // 언어 선택기 초기화
    function initLanguageSelector() {
        const langBtn = document.getElementById('lang-btn');
        const langDropdown = document.getElementById('lang-dropdown');
        const currentLangFlag = document.getElementById('current-lang-flag');
        const currentLangText = document.getElementById('current-lang-text');

        // 현재 언어 표시
        if (LANGUAGES[currentLang]) {
            currentLangFlag.textContent = LANGUAGES[currentLang].flag;
            currentLangText.textContent = LANGUAGES[currentLang].name;
        }

        // 드롭다운 토글
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('hidden');
            langBtn.classList.toggle('active');
        });

        // 언어 선택
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                const lang = e.target.getAttribute('data-lang');
                currentLang = lang;
                localStorage.setItem(STORAGE_KEYS.language, lang);

                currentLangFlag.textContent = LANGUAGES[lang].flag;
                currentLangText.textContent = LANGUAGES[lang].name;

                await loadTranslations(lang);
                langDropdown.classList.add('hidden');
                langBtn.classList.remove('active');
            });
        });

        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', () => {
            langDropdown.classList.add('hidden');
            langBtn.classList.remove('active');
        });

        // 초기 번역 로드
        loadTranslations(currentLang);
    }

    initLanguageSelector();

    // 사용 횟수 및 API 키 관리
    function getUsageCount() {
        return parseInt(localStorage.getItem(STORAGE_KEYS.usageCount) || '0', 10);
    }

    function incrementUsageCount() {
        const count = getUsageCount() + 1;
        localStorage.setItem(STORAGE_KEYS.usageCount, count.toString());
        updateUsageDisplay();
        return count;
    }

    function getSavedApiKeys() {
        return {
            gemini: localStorage.getItem(STORAGE_KEYS.geminiKey) || '',
            chatgpt: localStorage.getItem(STORAGE_KEYS.chatgptKey) || '',
            claude: localStorage.getItem(STORAGE_KEYS.claudeKey) || ''
        };
    }

    function saveApiKeys(keys) {
        if (keys.gemini) localStorage.setItem(STORAGE_KEYS.geminiKey, keys.gemini);
        if (keys.chatgpt) localStorage.setItem(STORAGE_KEYS.chatgptKey, keys.chatgpt);
        if (keys.claude) localStorage.setItem(STORAGE_KEYS.claudeKey, keys.claude);
    }

    function clearSavedApiKeys() {
        localStorage.removeItem(STORAGE_KEYS.geminiKey);
        localStorage.removeItem(STORAGE_KEYS.chatgptKey);
        localStorage.removeItem(STORAGE_KEYS.claudeKey);
    }

    function hasUserApiKeys() {
        const keys = getSavedApiKeys();
        return !!(keys.gemini || keys.chatgpt || keys.claude);
    }

    function canUseService() {
        const usageCount = getUsageCount();
        return usageCount < MAX_FREE_USES || hasUserApiKeys();
    }

    function isUsingFreeQuota() {
        return getUsageCount() < MAX_FREE_USES;
    }

    function updateUsageDisplay() {
        const usageCount = getUsageCount();
        const remaining = Math.max(0, MAX_FREE_USES - usageCount);
        const keys = getSavedApiKeys();
        const hasKeys = hasUserApiKeys();

        if (hasKeys) {
            usageText.textContent = '🔑 나만의 API 키 사용 중';
            usageBadge.classList.remove('exhausted');
        } else if (remaining > 0) {
            usageText.textContent = `무료 사용 가능: ${remaining}회 남음`;
            usageBadge.classList.remove('exhausted');
        } else {
            usageText.textContent = '⚠️ 무료 사용 횟수 소진됨';
            usageBadge.classList.add('exhausted');
        }

        // API 키 입력 필드에 기존 값 표시 (마스킹)
        if (keys.gemini) {
            geminiApiKeyInput.placeholder = '•••••••••• (저장됨)';
            geminiApiKeyInput.classList.add('has-key');
        } else {
            geminiApiKeyInput.placeholder = 'AIza로 시작하는 키';
            geminiApiKeyInput.classList.remove('has-key');
        }

        if (keys.chatgpt) {
            chatgptApiKeyInput.placeholder = '•••••••••• (저장됨)';
            chatgptApiKeyInput.classList.add('has-key');
        } else {
            chatgptApiKeyInput.placeholder = 'sk-로 시작하는 키';
            chatgptApiKeyInput.classList.remove('has-key');
        }

        if (keys.claude) {
            claudeApiKeyInput.placeholder = '•••••••••• (저장됨)';
            claudeApiKeyInput.classList.add('has-key');
        } else {
            claudeApiKeyInput.placeholder = 'sk-ant-로 시작하는 키';
            claudeApiKeyInput.classList.remove('has-key');
        }
    }

    // API 설정 패널 토글
    apiSettingsBtn.addEventListener('click', function () {
        apiSettingsPanel.classList.toggle('hidden');
    });

    // API 키 저장
    saveApiKeysBtn.addEventListener('click', function () {
        const newKeys = {
            gemini: geminiApiKeyInput.value.trim(),
            chatgpt: chatgptApiKeyInput.value.trim(),
            claude: claudeApiKeyInput.value.trim()
        };

        // 빈 값은 기존 키 유지
        const existingKeys = getSavedApiKeys();
        const keysToSave = {
            gemini: newKeys.gemini || existingKeys.gemini,
            chatgpt: newKeys.chatgpt || existingKeys.chatgpt,
            claude: newKeys.claude || existingKeys.claude
        };

        saveApiKeys(keysToSave);

        // 입력 필드 클리어
        geminiApiKeyInput.value = '';
        chatgptApiKeyInput.value = '';
        claudeApiKeyInput.value = '';

        updateUsageDisplay();
        alert('✅ API 키가 저장되었습니다!');
    });

    // API 키 초기화
    clearApiKeysBtn.addEventListener('click', function () {
        if (confirm('정말 모든 API 키를 삭제하시겠습니까?')) {
            clearSavedApiKeys();
            geminiApiKeyInput.value = '';
            chatgptApiKeyInput.value = '';
            claudeApiKeyInput.value = '';
            updateUsageDisplay();
            alert('🗑️ API 키가 삭제되었습니다.');
        }
    });

    // 프롬프트 생성
    function createPrompt(userInfo) {
        const parts = [];

        if (userInfo.ageGroup) parts.push(`- 연령대: ${userInfo.ageGroup}`);
        if (userInfo.gender) parts.push(`- 성별: ${userInfo.gender}`);
        if (userInfo.region) parts.push(`- 지역: ${userInfo.region}`);
        if (userInfo.category) parts.push(`- 관심 카테고리: ${userInfo.category}`);
        if (userInfo.style) parts.push(`- 선호 콘텐츠 스타일: ${userInfo.style}`);
        if (userInfo.duration) parts.push(`- 선호 영상 길이: ${userInfo.duration}`);
        if (userInfo.interest) parts.push(`- 추가 관심사: ${userInfo.interest}`);

        const userInfoText = parts.length > 0
            ? parts.join('\n')
            : '- 특별한 조건 없음 (일반적인 인기 채널 추천)';

        return `당신은 유튜브 채널 추천 전문가입니다. 다음 사용자 정보를 바탕으로 맞춤형 유튜브 채널 주제 3개를 추천해주세요.

사용자 정보:
${userInfoText}

다음 형식으로 정확히 3개의 채널 주제를 추천해주세요. 각 추천은 사용자의 특성에 맞게 개인화되어야 합니다:

1. [채널 주제]
추천 이유: [한 줄 설명]

2. [채널 주제]
추천 이유: [한 줄 설명]

3. [채널 주제]
추천 이유: [한 줄 설명]`;
    }

    // AI API 호출 (사용자 키 또는 서버 키 사용)
    async function callAPI(aiType, prompt, useServerKey = false) {
        const keys = getSavedApiKeys();
        const apiKey = keys[aiType];

        // 서버 키 사용 (무료 사용자) - 서버 프록시를 통해 호출
        if (useServerKey && !apiKey) {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aiType: aiType,
                    prompt: prompt,
                    userApiKey: null,
                    useServerKey: true
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || `${aiType} API 오류`);
            }

            return data.data;
        }

        // 사용자 키가 없고 서버 키도 사용 안하면 에러
        if (!apiKey) {
            throw new Error('API 키가 필요합니다. API 키 설정에서 키를 입력해주세요.');
        }

        // 브라우저에서 직접 AI API 호출 (사용자 키 사용)
        if (aiType === 'gemini') {
            return await callGeminiDirect(prompt, apiKey);
        } else if (aiType === 'chatgpt') {
            return await callChatGPTDirect(prompt, apiKey);
        } else if (aiType === 'claude') {
            return await callClaudeDirect(prompt, apiKey);
        } else {
            throw new Error('알 수 없는 AI 타입');
        }
    }

    // Gemini API 직접 호출
    async function callGeminiDirect(prompt, apiKey) {
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

    // ChatGPT API 직접 호출
    async function callChatGPTDirect(prompt, apiKey) {
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

    // Claude API 호출 (서버 프록시 사용 - CORS 우회)
    async function callClaudeDirect(prompt, apiKey) {
        // Claude API는 CORS 문제로 서버를 통해 호출
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                aiType: 'claude',
                prompt: prompt,
                userApiKey: apiKey,
                useServerKey: false
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Claude API 오류');
        }

        return data.data;
    }

    // AI 응답 파싱
    function parseAIResponse(text) {
        const recommendations = [];
        const lines = text.split('\n').filter(line => line.trim());

        let currentRec = null;

        for (const line of lines) {
            // 번호로 시작하는 줄 찾기 (1. 2. 3. 또는 1) 2) 3))
            const topicMatch = line.match(/^[1-3][\.\\)]\s*(.+)/);
            if (topicMatch) {
                if (currentRec) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    topic: topicMatch[1].replace(/[\[\]]/g, '').trim(),
                    reason: ''
                };
            }
            // 추천 이유 찾기
            else if (currentRec && (line.includes('추천 이유') || line.includes('이유:'))) {
                const reasonMatch = line.match(/(?:추천 이유|이유)[:\s]*(.+)/);
                if (reasonMatch) {
                    currentRec.reason = reasonMatch[1].trim();
                }
            }
            // 이유가 다음 줄에 있는 경우
            else if (currentRec && !currentRec.reason && line.startsWith('-')) {
                currentRec.reason = line.replace(/^-\s*/, '').trim();
            }
        }

        if (currentRec) {
            recommendations.push(currentRec);
        }

        // 파싱 실패 시 전체 텍스트를 하나의 결과로 반환
        if (recommendations.length === 0) {
            return [{
                topic: 'AI 추천 결과',
                reason: text.substring(0, 200) + '...'
            }];
        }

        return recommendations.slice(0, 3);
    }

    // 로딩 상태 토글
    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        btnLoading.classList.toggle('hidden', !isLoading);
    }

    // 개별 AI 결과 HTML 생성
    function createResultHTML(recommendations) {
        let resultHTML = '';

        recommendations.forEach((item, index) => {
            resultHTML += `
                <div class="result-item">
                    <h3>추천 채널 주제 ${index + 1}: ${item.topic}</h3>
                    <p><span class="reason-label">추천 이유:</span> ${item.reason || '맞춤형 콘텐츠를 제공합니다.'}</p>
                </div>
            `;
        });

        return resultHTML;
    }

    // 에러 HTML 생성
    function createErrorHTML(message) {
        return `
            <div class="error-message">
                <p>❌ 오류가 발생했습니다</p>
                <p>${message}</p>
            </div>
        `;
    }

    // 로딩 HTML 생성
    function createLoadingHTML() {
        return `
            <div class="loading-indicator">
                <span class="spinner"></span>
                <p>AI가 추천을 생성 중입니다...</p>
            </div>
        `;
    }

    // API 키 없음 HTML 생성
    function createNoKeyHTML(aiName) {
        return `
            <div class="no-key-message">
                <p>🔑 ${aiName} API 키가 필요합니다</p>
                <p>위의 API 키 설정에서 키를 입력해주세요.</p>
            </div>
        `;
    }

    // 폼 제출 이벤트
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const keys = getSavedApiKeys();
        const usingFreeQuota = isUsingFreeQuota();

        // 무료 사용 불가 + API 키 하나도 없으면 경고
        if (!usingFreeQuota && !keys.gemini && !keys.chatgpt && !keys.claude) {
            alert('⚠️ 무료 사용 횟수가 소진되었습니다.\n\nAPI 키 설정에서 최소 1개의 API 키를 입력해주세요.');
            apiSettingsPanel.classList.remove('hidden');
            return;
        }

        const userInfo = {
            ageGroup: document.getElementById('age-group').value,
            gender: document.getElementById('gender').value,
            region: document.getElementById('region').value,
            category: document.getElementById('category').value,
            style: document.getElementById('style').value,
            duration: document.getElementById('duration').value,
            interest: document.getElementById('interest').value
        };

        const prompt = createPrompt(userInfo);

        setLoading(true);
        resultSection.classList.remove('hidden');

        // 무료 사용: Gemini만 제공 / ChatGPT, Claude는 사용자 API 키 필요
        const canUseGemini = usingFreeQuota || keys.gemini;
        const canUseChatGPT = keys.chatgpt;  // 사용자 API 키 필수
        const canUseClaude = keys.claude;    // 사용자 API 키 필수

        // 각 결과 영역 초기화
        geminiResult.innerHTML = canUseGemini ? createLoadingHTML() : createNoKeyHTML('Gemini');
        chatgptResult.innerHTML = canUseChatGPT ? createLoadingHTML() : createNoKeyHTML('ChatGPT');
        claudeResult.innerHTML = canUseClaude ? createLoadingHTML() : createNoKeyHTML('Claude');

        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 무료 사용 횟수 증가 (서버 기본 키 사용 시에만)
        if (usingFreeQuota && !hasUserApiKeys()) {
            incrementUsageCount();
        }

        const promises = [];

        // Gemini 호출
        if (canUseGemini) {
            promises.push(
                callAPI('gemini', prompt, usingFreeQuota && !keys.gemini)
                    .then(response => {
                        const recommendations = parseAIResponse(response);
                        geminiResult.innerHTML = createResultHTML(recommendations);
                    })
                    .catch(error => {
                        console.error('Gemini API Error:', error);
                        geminiResult.innerHTML = createErrorHTML(error.message);
                    })
            );
        }

        // ChatGPT 호출
        if (canUseChatGPT) {
            promises.push(
                callAPI('chatgpt', prompt, false)
                    .then(response => {
                        const recommendations = parseAIResponse(response);
                        chatgptResult.innerHTML = createResultHTML(recommendations);
                    })
                    .catch(error => {
                        console.error('ChatGPT API Error:', error);
                        chatgptResult.innerHTML = createErrorHTML(error.message);
                    })
            );
        }

        // Claude 호출
        if (canUseClaude) {
            promises.push(
                callAPI('claude', prompt, false)
                    .then(response => {
                        const recommendations = parseAIResponse(response);
                        claudeResult.innerHTML = createResultHTML(recommendations);
                    })
                    .catch(error => {
                        console.error('Claude API Error:', error);
                        claudeResult.innerHTML = createErrorHTML(error.message);
                    })
            );
        }

        // 호출한 API들이 모두 완료되면 로딩 해제
        await Promise.all(promises);
        setLoading(false);
    });

    // 초기화
    updateUsageDisplay();

    // 방문자 카운터 로드 (외부 서비스 사용)
    async function loadVisitorCount() {
        const visitorCountEl = document.getElementById('visitor-count');
        if (!visitorCountEl) return;

        try {
            // CountAPI 사용 (무료 외부 서비스)
            const namespace = 'craveo-youtube-recommender';
            const key = 'visits';
            const response = await fetch(`https://api.countapi.xyz/hit/${namespace}/${key}`);
            const result = await response.json();

            if (result && result.value) {
                visitorCountEl.textContent = `총 방문자: ${result.value.toLocaleString()}명`;
            } else {
                visitorCountEl.textContent = '총 방문자: -';
            }
        } catch (error) {
            console.error('방문자 카운터 로드 실패:', error);
            // 실패 시 로컬 API 시도 (로컬 개발용)
            try {
                const localResponse = await fetch('/api/visitor');
                const localResult = await localResponse.json();
                if (localResult.success) {
                    visitorCountEl.textContent = `총 방문자: ${localResult.count.toLocaleString()}명`;
                }
            } catch {
                visitorCountEl.textContent = '총 방문자: -';
            }
        }
    }

    loadVisitorCount();

    // FAQ 아코디언 토글
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            faqItem.classList.toggle('active');
        });
    });
});
