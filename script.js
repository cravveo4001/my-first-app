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
    const youtubeApiKeyInput = document.getElementById('youtube-api-key');

    // 상수
    const MAX_FREE_USES = 3;
    const STORAGE_KEYS = {
        usageCount: 'youtube_recommender_usage_count',
        geminiKey: 'youtube_recommender_gemini_key',
        chatgptKey: 'youtube_recommender_chatgpt_key',
        claudeKey: 'youtube_recommender_claude_key',
        youtubeKey: 'youtube_recommender_youtube_key',
        language: 'youtube_recommender_language'
    };


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
            claude: localStorage.getItem(STORAGE_KEYS.claudeKey) || '',
            youtube: localStorage.getItem(STORAGE_KEYS.youtubeKey) || ''
        };
    }

    function saveApiKeys(keys) {
        if (keys.gemini) localStorage.setItem(STORAGE_KEYS.geminiKey, keys.gemini);
        if (keys.chatgpt) localStorage.setItem(STORAGE_KEYS.chatgptKey, keys.chatgpt);
        if (keys.claude) localStorage.setItem(STORAGE_KEYS.claudeKey, keys.claude);
        if (keys.youtube) localStorage.setItem(STORAGE_KEYS.youtubeKey, keys.youtube);
    }

    function clearSavedApiKeys() {
        localStorage.removeItem(STORAGE_KEYS.geminiKey);
        localStorage.removeItem(STORAGE_KEYS.chatgptKey);
        localStorage.removeItem(STORAGE_KEYS.claudeKey);
        localStorage.removeItem(STORAGE_KEYS.youtubeKey);
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

        if (keys.youtube && youtubeApiKeyInput) {
            youtubeApiKeyInput.placeholder = '•••••••••• (저장됨)';
            youtubeApiKeyInput.classList.add('has-key');
        } else if (youtubeApiKeyInput) {
            youtubeApiKeyInput.placeholder = 'AIza로 시작하는 키';
            youtubeApiKeyInput.classList.remove('has-key');
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
            claude: claudeApiKeyInput.value.trim(),
            youtube: youtubeApiKeyInput ? youtubeApiKeyInput.value.trim() : ''
        };

        // 빈 값은 기존 키 유지
        const existingKeys = getSavedApiKeys();
        const keysToSave = {
            gemini: newKeys.gemini || existingKeys.gemini,
            chatgpt: newKeys.chatgpt || existingKeys.chatgpt,
            claude: newKeys.claude || existingKeys.claude,
            youtube: newKeys.youtube || existingKeys.youtube
        };

        saveApiKeys(keysToSave);

        // 입력 필드 클리어
        geminiApiKeyInput.value = '';
        chatgptApiKeyInput.value = '';
        claudeApiKeyInput.value = '';
        if (youtubeApiKeyInput) youtubeApiKeyInput.value = '';

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
        const allResults = { gemini: null, chatgpt: null, claude: null };

        // Gemini 호출
        if (canUseGemini) {
            promises.push(
                callAPI('gemini', prompt, usingFreeQuota && !keys.gemini)
                    .then(response => {
                        const recommendations = parseAIResponse(response);
                        geminiResult.innerHTML = createResultHTML(recommendations);
                        allResults.gemini = recommendations.map(r => r.topic).join(', ');
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
                        allResults.chatgpt = recommendations.map(r => r.topic).join(', ');
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
                        allResults.claude = recommendations.map(r => r.topic).join(', ');
                    })
                    .catch(error => {
                        console.error('Claude API Error:', error);
                        claudeResult.innerHTML = createErrorHTML(error.message);
                    })
            );
        }

        // 호출한 API들이 모두 완료되면 로딩 해제 및 결과 저장
        await Promise.all(promises);
        setLoading(false);

        // 결과 저장 (히스토리/즐겨찾기용)
        const resultTexts = [];
        if (allResults.gemini) resultTexts.push(allResults.gemini);
        if (allResults.chatgpt) resultTexts.push(allResults.chatgpt);
        if (allResults.claude) resultTexts.push(allResults.claude);

        if (resultTexts.length > 0) {
            window.currentRecommendations = {
                title: `${userInfo.category || '일반'} 추천`,
                content: resultTexts.join(' | ').substring(0, 200) + (resultTexts.join(' | ').length > 200 ? '...' : '')
            };
            // 히스토리에 자동 저장
            window.saveToHistoryAuto && window.saveToHistoryAuto(window.currentRecommendations);

            // YouTube API로 실제 채널 검색 (Gemini 결과에 추가)
            const keys = getSavedApiKeys();
            if (keys.youtube && geminiResult) {
                setTimeout(() => {
                    addYouTubeChannelsToCards(geminiResult, userInfo.category);
                }, 500);
            }
        }
    });

    // 추천 카드에 YouTube 채널 추가
    async function addYouTubeChannelsToCards(container, category) {
        console.log('addYouTubeChannelsToCards called');
        const keys = getSavedApiKeys();
        if (!keys.youtube) {
            console.log('No YouTube API key found');
            return;
        }

        // 선택자 수정: .recommendation-card -> .result-item
        const cards = container.querySelectorAll('.result-item');
        console.log(`Found ${cards.length} cards (.result-item)`);

        for (let i = 0; i < Math.min(cards.length, 3); i++) {
            const card = cards[i];
            if (card.querySelector('.youtube-channels')) continue;

            // 선택자 수정: strong -> h3
            const titleEl = card.querySelector('h3');
            if (!titleEl) {
                console.log(`Card ${i} has no title element (h3)`);
                continue;
            }

            // 검색어 추출 개선
            let searchQuery = titleEl.textContent
                .replace(/추천 채널 주제 \d+:/g, '')
                .replace(/\*\*/g, '')
                .replace(/"/g, '')
                .replace(/'/g, '')
                .trim();

            // 콜론(:)이 있으면 앞부분만 사용 (제목: 부제목 형식일 경우 핵심만 검색)
            if (searchQuery.includes(':')) {
                searchQuery = searchQuery.split(':')[0].trim();
            }
            // 하이픈(-)이 있으면 앞부분만 사용
            if (searchQuery.includes('-')) {
                searchQuery = searchQuery.split('-')[0].trim();
            }

            console.log(`Searching YouTube for: ${searchQuery} (Category: ${category})`);

            if (category) searchQuery = category + ' ' + searchQuery;

            try {
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&maxResults=2&key=${keys.youtube}`;
                const response = await fetch(url);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('YouTube API Error:', response.status, errorText);
                    continue;
                }

                const data = await response.json();
                const channels = data.items || [];
                console.log(`Found ${channels.length} channels for ${searchQuery}`);

                if (channels.length > 0) {
                    const channelDiv = document.createElement('div');
                    channelDiv.className = 'youtube-channels';
                    channelDiv.innerHTML = `
                        <p class="youtube-channels-title">📺 관련 실제 채널:</p>
                        <div class="channel-list">
                            ${channels.map(ch => `
                                <a href="https://youtube.com/channel/${ch.snippet.channelId}" target="_blank" class="channel-item">
                                    <img src="${ch.snippet.thumbnails.default.url}" alt="${ch.snippet.channelTitle}" class="channel-thumb">
                                    <span class="channel-name">${ch.snippet.channelTitle}</span>
                                </a>
                            `).join('')}
                        </div>
                    `;
                    card.appendChild(channelDiv);
                }
            } catch (error) {
                console.error('YouTube search error:', error);
            }
        }
    }

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

    // ========================================
    // 새로운 기능 구현
    // ========================================

    // 추가 Storage 키
    STORAGE_KEYS.favorites = 'youtube_recommender_favorites';
    STORAGE_KEYS.history = 'youtube_recommender_history';

    // 현재 추천 결과 저장용
    let currentRecommendations = null;

    // 토스트 알림
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // 즐겨찾기 관리
    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]');
        } catch {
            return [];
        }
    }

    function saveFavorite(data) {
        const favorites = getFavorites();
        const newFavorite = {
            id: Date.now(),
            date: new Date().toLocaleString('ko-KR'),
            ...data
        };
        favorites.unshift(newFavorite);
        // 최대 50개 유지
        if (favorites.length > 50) favorites.pop();
        localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
        showToast('⭐ 즐겨찾기에 저장되었습니다!');
    }

    function deleteFavorite(id) {
        const favorites = getFavorites().filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
        renderFavorites();
        showToast('삭제되었습니다.');
    }

    function clearAllFavorites() {
        if (confirm('모든 즐겨찾기를 삭제하시겠습니까?')) {
            localStorage.removeItem(STORAGE_KEYS.favorites);
            renderFavorites();
            showToast('모든 즐겨찾기가 삭제되었습니다.');
        }
    }

    function renderFavorites() {
        const container = document.getElementById('favorites-list');
        if (!container) return;

        const favorites = getFavorites();

        if (favorites.length === 0) {
            container.innerHTML = '<p class="empty-message">저장된 즐겨찾기가 없습니다.</p>';
            return;
        }

        container.innerHTML = favorites.map(item => `
            <div class="saved-item" data-id="${item.id}">
                <div class="saved-item-header">
                    <span class="saved-item-title">${item.title || 'AI 추천 결과'}</span>
                    <span class="saved-item-date">${item.date}</span>
                </div>
                <div class="saved-item-content">${item.content || ''}</div>
                <div class="saved-item-actions">
                    <button class="saved-item-btn delete" onclick="window.deleteFavorite(${item.id})">🗑️ 삭제</button>
                </div>
            </div>
        `).join('');
    }

    // 히스토리 관리
    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
        } catch {
            return [];
        }
    }

    function saveToHistory(data) {
        const history = getHistory();
        const newEntry = {
            id: Date.now(),
            date: new Date().toLocaleString('ko-KR'),
            ...data
        };
        history.unshift(newEntry);
        // 최대 20개 유지
        if (history.length > 20) history.pop();
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    }

    function deleteHistoryItem(id) {
        const history = getHistory().filter(h => h.id !== id);
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
        renderHistory();
        showToast('삭제되었습니다.');
    }

    function clearAllHistory() {
        if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
            localStorage.removeItem(STORAGE_KEYS.history);
            renderHistory();
            showToast('모든 히스토리가 삭제되었습니다.');
        }
    }

    function renderHistory() {
        const container = document.getElementById('history-list');
        if (!container) return;

        const history = getHistory();

        if (history.length === 0) {
            container.innerHTML = '<p class="empty-message">추천 히스토리가 없습니다.</p>';
            return;
        }

        container.innerHTML = history.map(item => `
            <div class="saved-item" data-id="${item.id}">
                <div class="saved-item-header">
                    <span class="saved-item-title">${item.title || 'AI 추천 결과'}</span>
                    <span class="saved-item-date">${item.date}</span>
                </div>
                <div class="saved-item-content">${item.content || ''}</div>
                <div class="saved-item-actions">
                    <button class="saved-item-btn delete" onclick="window.deleteHistoryItem(${item.id})">🗑️ 삭제</button>
                </div>
            </div>
        `).join('');
    }

    // 전역 함수 등록 (onclick에서 사용)
    window.deleteFavorite = deleteFavorite;
    window.deleteHistoryItem = deleteHistoryItem;
    window.saveToHistoryAuto = saveToHistory;
    window.currentRecommendations = null;

    // 모달 관리
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // 모달 닫기 버튼
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    // 모달 배경 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    });

    // 즐겨찾기 버튼
    const favoritesBtn = document.getElementById('favorites-btn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            renderFavorites();
            openModal('favorites-modal');
        });
    }

    // 히스토리 버튼
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            renderHistory();
            openModal('history-modal');
        });
    }

    // 전체 삭제 버튼
    const clearFavoritesBtn = document.getElementById('clear-favorites');
    if (clearFavoritesBtn) {
        clearFavoritesBtn.addEventListener('click', clearAllFavorites);
    }

    const clearHistoryBtn = document.getElementById('clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }

    // 결과 저장 버튼
    const saveResultBtn = document.getElementById('save-result-btn');
    if (saveResultBtn) {
        saveResultBtn.addEventListener('click', () => {
            if (window.currentRecommendations) {
                saveFavorite(window.currentRecommendations);
            } else {
                showToast('저장할 추천 결과가 없습니다.', 'error');
            }
        });
    }

    // 공유 버튼
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            openModal('share-modal');
        });
    }

    // 공유 옵션들
    const shareUrl = window.location.href;
    const shareTitle = 'AI 유튜브 채널 추천 결과';
    const shareText = '3개 AI가 추천한 맞춤 유튜브 채널을 확인해보세요!';

    document.getElementById('share-twitter')?.addEventListener('click', () => {
        const resultText = getResultsText();
        const tweetText = resultText ? `AI 유튜브 채널 추천 결과:\n${resultText.substring(0, 200)}...` : shareText;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        closeModal('share-modal');
    });

    document.getElementById('share-facebook')?.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        closeModal('share-modal');
    });

    document.getElementById('share-kakao')?.addEventListener('click', () => {
        const resultText = getResultsText();
        const shareContent = resultText
            ? `🎬 AI 유튜브 채널 추천 결과\n\n${resultText}\n\n${shareUrl}`
            : `${shareText}\n${shareUrl}`;
        navigator.clipboard.writeText(shareContent).then(() => {
            showToast('📋 추천 결과가 복사되었습니다! 카카오톡에 붙여넣기하세요.');
            closeModal('share-modal');
        });
    });

    // 텍스트 복사 (결과 포함)
    document.getElementById('share-copy')?.addEventListener('click', () => {
        const resultText = getResultsText();
        if (resultText) {
            const fullText = `🎬 AI 유튜브 채널 추천 결과\n\n${resultText}\n\n🔗 ${shareUrl}`;
            navigator.clipboard.writeText(fullText).then(() => {
                showToast('📋 추천 결과가 복사되었습니다!');
                closeModal('share-modal');
            }).catch(() => {
                showToast('복사에 실패했습니다.', 'error');
            });
        } else {
            showToast('복사할 결과가 없습니다.', 'error');
        }
    });

    // 결과 텍스트 추출 함수
    function getResultsText() {
        const resultSection = document.getElementById('result-section');
        if (!resultSection || resultSection.classList.contains('hidden')) return null;

        let text = '';
        const geminiResult = document.getElementById('gemini-result');
        const chatgptResult = document.getElementById('chatgpt-result');
        const claudeResult = document.getElementById('claude-result');

        if (geminiResult && geminiResult.textContent.trim() && !geminiResult.textContent.includes('API 키가 필요')) {
            text += '🤖 Gemini 추천:\n' + geminiResult.textContent.trim() + '\n\n';
        }
        if (chatgptResult && chatgptResult.textContent.trim() && !chatgptResult.textContent.includes('API 키가 필요')) {
            text += '💬 ChatGPT 추천:\n' + chatgptResult.textContent.trim() + '\n\n';
        }
        if (claudeResult && claudeResult.textContent.trim() && !claudeResult.textContent.includes('API 키가 필요')) {
            text += '🧠 Claude 추천:\n' + claudeResult.textContent.trim() + '\n\n';
        }

        return text.trim() || null;
    }

    // 이미지 다운로드
    document.getElementById('download-image')?.addEventListener('click', async () => {
        const resultSection = document.getElementById('result-section');
        if (!resultSection || resultSection.classList.contains('hidden')) {
            showToast('다운로드할 결과가 없습니다.', 'error');
            return;
        }

        showToast('🖼️ 이미지 생성 중...');
        closeModal('share-modal');

        try {
            const canvas = await html2canvas(resultSection, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true
            });

            const link = document.createElement('a');
            link.download = `AI_유튜브_추천_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            showToast('✅ 이미지가 다운로드되었습니다!');
        } catch (error) {
            console.error('이미지 생성 오류:', error);
            showToast('이미지 생성에 실패했습니다.', 'error');
        }
    });

    // PDF 다운로드
    document.getElementById('download-pdf')?.addEventListener('click', async () => {
        const resultSection = document.getElementById('result-section');
        if (!resultSection || resultSection.classList.contains('hidden')) {
            showToast('다운로드할 결과가 없습니다.', 'error');
            return;
        }

        showToast('📄 PDF 생성 중...');
        closeModal('share-modal');

        try {
            const opt = {
                margin: 10,
                filename: `AI_유튜브_추천_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(resultSection).save();
            showToast('✅ PDF가 다운로드되었습니다!');
        } catch (error) {
            console.error('PDF 생성 오류:', error);
            showToast('PDF 생성에 실패했습니다.', 'error');
        }
    });

    // 랜덤 추천 버튼
    const randomBtn = document.getElementById('random-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            // 랜덤 값 설정
            const categories = ['게임', '음악', '영화/드라마', '스포츠', '먹방/요리', '뷰티/패션', '여행', '교육/학습', '기술/IT', '경제/재테크', '일상/브이로그', '반려동물', '자동차', '운동/헬스'];
            const styles = ['재미/유머', '정보/지식', '힐링/감성', '리뷰/비교', '튜토리얼', '토크/대화', '뉴스/시사'];
            const durations = ['쇼츠 (1분 이하)', '짧은 영상 (5분 이하)', '중간 길이 (10-20분)', '긴 영상 (30분 이상)'];

            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            const randomDuration = durations[Math.floor(Math.random() * durations.length)];

            // 폼에 값 설정
            document.getElementById('category').value = randomCategory;
            document.getElementById('style').value = randomStyle;
            document.getElementById('duration').value = randomDuration;

            // 다른 필드 초기화
            document.getElementById('age-group').value = '';
            document.getElementById('gender').value = '';
            document.getElementById('region').value = '';
            document.getElementById('interest').value = '';

            // 폼 제출
            form.dispatchEvent(new Event('submit'));

            showToast(`🎲 랜덤: ${randomCategory} + ${randomStyle}`);
        });
    }

    // 추천 결과를 currentRecommendations에 저장하도록 기존 코드 수정
    // 결과 생성 시 호출되는 함수
    function storeRecommendations(gemini, chatgpt, claude) {
        const results = [];
        if (gemini) results.push(`Gemini: ${gemini}`);
        if (chatgpt) results.push(`ChatGPT: ${chatgpt}`);
        if (claude) results.push(`Claude: ${claude}`);

        currentRecommendations = {
            title: `${document.getElementById('category').value || '일반'} 추천`,
            content: results.join(' | ').substring(0, 200) + '...'
        };

        // 히스토리에 자동 저장
        saveToHistory(currentRecommendations);
    }

    // 기존 결과 생성 함수 래핑
    const originalCreateResultHTML = createResultHTML;
    window.createResultHTMLWithStore = function (recommendations, aiType) {
        const html = originalCreateResultHTML(recommendations);
        // 추천 결과 텍스트 추출
        const textContent = recommendations.map(r => r.topic).join(', ');
        return { html, textContent };
    };

    // ========================================
    // YouTube API 채널 검색 기능
    // ========================================

    // YouTube API로 채널 검색
    async function searchYouTubeChannels(query) {
        const keys = getSavedApiKeys();
        if (!keys.youtube) {
            return null;
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query + ' 유튜브 채널')}&maxResults=3&key=${keys.youtube}`
            );

            if (!response.ok) {
                console.error('YouTube API Error:', response.status);
                return null;
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('YouTube Search Error:', error);
            return null;
        }
    }

    // 추천 결과에 실제 채널 추가
    async function addYouTubeChannelsToResult(resultElement, topic) {
        const keys = getSavedApiKeys();
        if (!keys.youtube) return;

        const channels = await searchYouTubeChannels(topic);
        if (!channels || channels.length === 0) return;

        // 채널 HTML 생성
        const channelHtml = `
            <div class="youtube-channels">
                <p class="youtube-channels-title">📺 관련 실제 채널:</p>
                <div class="channel-list">
                    ${channels.map(ch => `
                        <a href="https://youtube.com/channel/${ch.snippet.channelId}" target="_blank" class="channel-item">
                            <img src="${ch.snippet.thumbnails.default.url}" alt="${ch.snippet.channelTitle}" class="channel-thumb">
                            <span class="channel-name">${ch.snippet.channelTitle}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;

        // 각 추천 카드에 채널 추가
        const cards = resultElement.querySelectorAll('.recommendation-card');
        cards.forEach(async (card, index) => {
            const topicEl = card.querySelector('.topic-title, strong');
            if (topicEl && !card.querySelector('.youtube-channels')) {
                const topicText = topicEl.textContent.replace(/\*\*/g, '').replace(/추천 채널 주제 \d+:/g, '').trim();
                const channels = await searchYouTubeChannels(topicText);
                if (channels && channels.length > 0) {
                    const channelDiv = document.createElement('div');
                    channelDiv.className = 'youtube-channels';
                    channelDiv.innerHTML = `
                        <p class="youtube-channels-title">📺 관련 채널:</p>
                        <div class="channel-list">
                            ${channels.slice(0, 2).map(ch => `
                                <a href="https://youtube.com/channel/${ch.snippet.channelId}" target="_blank" class="channel-item">
                                    <img src="${ch.snippet.thumbnails.default.url}" alt="${ch.snippet.channelTitle}" class="channel-thumb">
                                    <span class="channel-name">${ch.snippet.channelTitle}</span>
                                </a>
                            `).join('')}
                        </div>
                    `;
                    card.appendChild(channelDiv);
                }
            }
        });
    }

    // 전역 함수로 등록
    window.searchYouTubeChannels = searchYouTubeChannels;
    window.addYouTubeChannelsToResult = addYouTubeChannelsToResult;

});
