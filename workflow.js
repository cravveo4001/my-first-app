document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & State ---
    const nodes = [];
    const connections = [];
    let nextNodeId = 1;
    let selectedNodeId = null;
    let scale = 0.8; // Start zoomed out slightly for the big factory
    let panX = 50;
    let panY = 50;
    let isDraggingNode = false;
    let isPanning = false;
    let dragStartX = 0;
    let dragStartY = 0;
    // Wiring State
    let isWiring = false;
    let wiringStartNode = null;
    let tempLine = null;
    // Mode State (NEW)
    let currentMode = 'channel'; // 'channel' or 'video'

    // Expose switchMode to global scope for HTML onclick
    window.switchMode = function (mode) {
        if (mode === currentMode) return;

        // 1. 현재 모드 상태 저장 (데이터 유실 방지)
        saveWorkflowState();

        // 2. 채널 -> 영상 전환 시 컨텍스트 별도 저장
        if (currentMode === 'channel' && mode === 'video') {
            saveChannelContext();
        }

        // 3. 캔버스 및 데이터 초기화 (모드 변경 전에 수행)
        nodes.length = 0;
        connections.length = 0;
        nodesLayer.innerHTML = '';
        connectionsLayer.innerHTML = '';
        sidebarContent.innerHTML = '<div class="empty-state"><p>노드를 선택하면<br>설정이 표시됩니다.</p></div>'; // 사이드바 초기화 추가
        selectedNodeId = null; // 선택된 노드 ID 초기화
        nextNodeId = 1; // ID는 저장된 데이터 로드 시 재조정되므로 1로 리셋해도 무방하나, 로드 로직에서 max값 찾음.

        // 4. 모드 변경
        currentMode = mode;

        // 5. 탭 UI 업데이트
        document.getElementById('tab-channel').classList.toggle('active', mode === 'channel');
        document.getElementById('tab-video').classList.toggle('active', mode === 'video');

        // 6. 새 모드 초기화 (로드)
        if (mode === 'channel') {
            initChannelMode();
        } else {
            initVideoMode();
        }
    };

    function saveChannelContext() {
        const context = {};
        nodes.forEach(n => {
            if (n.type === 'channel-name' && n.output) context.channelName = n.output.substring(0, 100);
            if (n.type === 'target-audience' && n.output) context.targetAudience = n.output.substring(0, 200);
            if (n.data.topic) context.topic = n.data.topic;
        });
        localStorage.setItem('tubekit_channel_context', JSON.stringify(context));
        console.log('Channel context saved:', context);
    }

    function saveWorkflowState() {
        const key = currentMode === 'video' ? 'tubekit_workflow_video' : 'tubekit_workflow_channel';
        const state = {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.type,
                x: n.x,
                y: n.y,
                data: n.data,
                output: n.output,
                status: n.status
            })),
            connections: connections.map(c => ({ from: c.from.id, to: c.to.id }))
        };
        localStorage.setItem(key, JSON.stringify(state));
    }

    function initVideoMode() {
        // 1. Try to restore from LocalStorage
        const savedState = JSON.parse(localStorage.getItem('tubekit_workflow_video') || 'null');

        if (savedState && savedState.nodes) {
            // Restore nodes
            savedState.nodes.forEach(nData => {
                const n = new Node(nData.type, nData.x, nData.y);
                n.id = nData.id;
                n.data = nData.data;
                n.output = nData.output;
                n.status = nData.status || 'idle';
                nodes.push(n);
                nodesLayer.appendChild(n.element);
                n.updateSummary();
            });
            // Restore connections
            if (savedState.connections) {
                savedState.connections.forEach(c => {
                    const fromNode = nodes.find(n => n.id === c.from);
                    const toNode = nodes.find(n => n.id === c.to);
                    if (fromNode && toNode) connectNodes(fromNode, toNode);
                });
            }
            nextNodeId = Math.max(...nodes.map(n => n.id)) + 1;
            updateCanvasTransform();
            return;
        }

        // 2. Default Init (Original Logic)
        let context = JSON.parse(localStorage.getItem('tubekit_channel_context') || '{}');
        let topic = context.topic || '';
        let channelName = context.channelName || '';
        let targetAudience = context.targetAudience || '';

        // 모달 요소 확인
        const modal = document.getElementById('video-input-modal');

        // 저장된 채널 정보가 있으면 바로 시작 (모달 표시 안함)
        if (topic && topic !== '(주제 미설정)' && topic !== '') {
            if (modal) modal.style.display = 'none';
            startVideoStudio(topic, channelName, targetAudience);
            return;
        }

        // 모달이 없으면 기본값으로 시작
        if (!modal) {
            startVideoStudio('일반 채널', '', '');
            return;
        }

        const topicInput = document.getElementById('video-channel-topic');
        const audienceInput = document.getElementById('video-target-audience');
        const startBtn = document.getElementById('video-modal-start');
        const skipBtn = document.getElementById('video-modal-skip');

        // 모달 표시
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (topicInput) topicInput.focus();

        // 시작하기 버튼 - addEventListener 사용
        if (startBtn) {
            startBtn.addEventListener('click', function handleStart() {
                const userTopic = topicInput ? topicInput.value.trim() : '';
                const userAudience = audienceInput ? audienceInput.value.trim() : '';
                const finalTopic = userTopic || '일반 채널';

                // 컨텍스트 저장
                const newContext = {
                    topic: finalTopic,
                    channelName: finalTopic,
                    targetAudience: userAudience
                };
                localStorage.setItem('tubekit_channel_context', JSON.stringify(newContext));

                // 모달 숨기기
                modal.style.display = 'none';
                modal.classList.add('hidden');

                // 스튜디오 시작
                startVideoStudio(finalTopic, finalTopic, userAudience);

                // 이벤트 리스너 제거 (중복 방지)
                startBtn.removeEventListener('click', handleStart);
            });
        }

        // 건너뛰기 버튼
        if (skipBtn) {
            skipBtn.addEventListener('click', function handleSkip() {
                modal.style.display = 'none';
                modal.classList.add('hidden');
                startVideoStudio('일반 채널', '', '');
                skipBtn.removeEventListener('click', handleSkip);
            });
        }

        // Enter 키 지원
        if (topicInput) {
            topicInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && startBtn) startBtn.click();
            });
        }
    }

    function startVideoStudio(topic, channelName, targetAudience) {
        const c1x = 350, c2x = 750;
        const startY = 100, gapY = 250;

        // Video Nodes
        const v1 = new Node('topic-research', c1x, startY);
        v1.data.topic = topic;
        v1.data.channelName = channelName;
        v1.data.targetAudience = targetAudience;

        const v2 = new Node('video-metadata', c1x, startY + gapY);
        const v3 = new Node('script-gen', c1x, startY + gapY * 2);

        const v4 = new Node('translator', c2x, startY);

        [v1, v2, v3, v4].forEach(n => { nodes.push(n); nodesLayer.appendChild(n.element); n.updateSummary(); });

        connectNodes(v1, v2);
        connectNodes(v2, v3);
        connectNodes(v3, v4);

        selectNode(v1);
        updateCanvasTransform();
    }

    function initChannelMode() {
        const c1x = 350, c2x = 750, c3x = 1150;
        const startY = 100, gapY = 250;

        // 1. Try to restore from LocalStorage
        const savedState = JSON.parse(localStorage.getItem('tubekit_workflow_channel') || 'null');

        if (savedState && savedState.nodes) {
            // Restore nodes
            savedState.nodes.forEach(nData => {
                const n = new Node(nData.type, nData.x, nData.y);
                n.id = nData.id; // Restore ID to keep connections valid
                n.data = nData.data;
                n.output = nData.output;
                n.status = nData.status || 'idle';
                nodes.push(n);
                nodesLayer.appendChild(n.element);
                n.updateSummary();
                n.updatePosition();
            });

            // Restore connections
            if (savedState.connections) {
                savedState.connections.forEach(c => {
                    const fromNode = nodes.find(n => n.id === c.from);
                    const toNode = nodes.find(n => n.id === c.to);
                    if (fromNode && toNode) connectNodes(fromNode, toNode);
                });
            }

            // Update nextNodeId to avoid collision
            nextNodeId = Math.max(...nodes.map(n => n.id)) + 1;

        } else {
            // 2. Initialize New Default Workflow (Original Logic)
            const urlParams = new URLSearchParams(window.location.search);
            const initialTopic = urlParams.get('topic');

            const n1 = new Node('channel-name', c1x, startY);
            if (initialTopic) n1.data.topic = initialTopic;
            // Also update topic-research if needed? No, standard flow.

            const n2 = new Node('channel-handle', c1x, startY + gapY);
            const n3 = new Node('target-audience', c1x, startY + gapY * 2);
            if (initialTopic) n3.data.topic = initialTopic;

            const n4 = new Node('profile-pic', c2x, startY);
            const n5 = new Node('banner-image', c2x, startY + gapY);

            const nSet1 = new Node('settings-general', c3x, startY);
            const nSet2 = new Node('settings-channel', c3x, startY + gapY);
            const nSet3 = new Node('settings-upload', c3x, startY + gapY * 2);

            [n1, n2, n3, n4, n5, nSet1, nSet2, nSet3].forEach(n => { nodes.push(n); nodesLayer.appendChild(n.element); n.updateSummary(); });

            connectNodes(n1, n2);
            connectNodes(n1, n3);
            connectNodes(n1, n4);
            connectNodes(n1, n5);
            connectNodes(n3, nSet2);
            connectNodes(nSet2, nSet3);
            connectNodes(nSet1, nSet2);
        }

        updateCanvasTransform();
    }

    // New Function: Save Workflow State


    // --- DOM Elements ---
    const canvasContainer = document.getElementById('canvas-container');
    const nodesLayer = document.getElementById('nodes-layer');
    const connectionsLayer = document.getElementById('connections-layer');
    const sidebarContent = document.getElementById('properties-content');
    const toolbarItems = document.querySelectorAll('.toolbar-item');

    // --- Reset Workflow Feature (Moved to top for safety) ---
    // --- Reset Workflow Feature (Moved to top for safety) ---
    const resetBtn = document.getElementById('reset-workflow-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // 모드별 분기 처리
            const isVideo = currentMode === 'video';
            const modeName = isVideo ? '영상 스튜디오' : '채널 스튜디오';

            if (confirm(`⚠️ 경고: [${modeName}]의 작업 내용을 모두 삭제하고 초기 상태로 되돌립니다.\n(다른 스튜디오의 데이터는 안전하게 유지됩니다)\n\n정말 초기화하시겠습니까?`)) {
                if (isVideo) {
                    localStorage.removeItem('tubekit_workflow_video');
                    window.location.reload();
                } else {
                    localStorage.removeItem('tubekit_workflow_channel');
                    localStorage.removeItem('tubekit_channel_context');
                    window.location.href = window.location.pathname;
                }
            }
        });
    }

    // --- 10 Specialized Node Types (The Factory Agents) ---
    const NODE_TYPES = {
        // Identity Group
        'channel-name': {
            name: '1. 채널명 생성', icon: 'fa-signature', color: '#FF6B6B',
            props: [{ id: 'topic', label: '주제/키워드', type: 'text' }]
        },
        'channel-handle': {
            name: '2. 핸들(@) 생성', icon: 'fa-at', color: '#FF8787',
            props: []
        },
        'target-audience': {
            name: '3. 타겟 분석', icon: 'fa-users', color: '#FFA5A5',
            props: [{ id: 'age', label: '주 타겟 연령', type: 'text' }]
        },

        // Visuals Group
        'profile-pic': {
            name: '4. 프로필 프롬프트', icon: 'fa-user-circle', color: '#4ECDC4',
            props: [{ id: 'vibe', label: '분위기', type: 'select', options: ['모던', '귀여운', '전문적'] }]
        },
        'banner-image': {
            name: '5. 배너 기획', icon: 'fa-image', color: '#45B7AF',
            props: []
        },

        // Content Group
        'topic-research': {
            name: '6. 주제 연구', icon: 'fa-search', color: '#FFE66D',
            props: [{ id: 'count', label: '아이디어 수', type: 'select', options: ['3개', '5개', '10개'] }]
        },
        'video-metadata': {
            name: '7. 영상 메타데이터', icon: 'fa-video', color: '#FFD93D',
            props: [{ id: 'type', label: '형식', type: 'select', options: ['쇼츠', '롱폼'] }]
        },
        'script-gen': {
            name: '8. 대본 생성', icon: 'fa-file-alt', color: '#F7C948',
            props: [{ id: 'duration', label: '길이', type: 'select', options: ['1분', '3분', '5분+'] }]
        },

        // Global Group
        'translator': {
            name: '9. 번역기 (Global)', icon: 'fa-language', color: '#A06CD5',
            props: [{ id: 'lang', label: '타겟 언어', type: 'select', options: ['영어', '일본어', '스페인어'] }]
        },

        // Settings Group
        'settings-general': {
            name: '⚙️ 일반 설정', icon: 'fa-cog', color: '#95A5A6',
            props: [{ id: 'currency', label: '기준 통화', type: 'select', options: ['KRW - 대한민국 원', 'USD - 미국 달러'] }]
        },
        'settings-channel': {
            name: 'ℹ️ 채널 정보', icon: 'fa-info-circle', color: '#BDC3C7',
            props: [{ id: 'country', label: '거주 국가', type: 'select', options: ['대한민국', '미국', '일본'] }]
        },
        'settings-upload': {
            name: '📤 업로드 기본값', icon: 'fa-upload', color: '#7F8C8D',
            props: [{ id: 'visibility', label: '공개 상태', type: 'select', options: ['공개', '비공개', '일부 공개'] }]
        }
    };

    // --- Core Classes ---
    class Node {
        constructor(type, x, y) {
            this.id = nextNodeId++;
            this.type = type;
            this.x = x;
            this.y = y;
            this.data = { model: 'gemini' }; // Default model
            this.output = '';
            this.status = 'idle';

            // Init props
            if (NODE_TYPES[type].props) {
                NODE_TYPES[type].props.forEach(p => this.data[p.id] = '');
            }

            this.element = this.createHTMLElement();
            this.updatePosition();
        }

        createHTMLElement() {
            const def = NODE_TYPES[this.type];
            const el = document.createElement('div');
            el.className = 'node';
            el.dataset.id = this.id;
            el.innerHTML = `
                <div class="node-header" style="border-left: 4px solid ${def.color}; border-top: 2px solid ${def.color}">
                    <i class="fas ${def.icon}" style="color: ${def.color}"></i>
                    <span>${def.name}</span>
                </div>
                <div class="node-body">
                    ${this.type === 'channel-name' ? (this.data.topic ? "주제: " + this.data.topic : '주제 입력 대기...') :
                    this.type === 'topic-research' ? (this.data.topic ? "채널: " + this.data.topic : '채널 정보 대기...') : '입력 대기 중...'}
                </div>
                <div class="node-status ${this.status}"></div>
                <div class="socket input"></div>
                <div class="socket output"></div>
            `;
            // Bind Events
            el.addEventListener('mousedown', (e) => startDragNode(e, this));
            el.addEventListener('click', (e) => { e.stopPropagation(); selectNode(this); });

            // Socket Events
            const outSocket = el.querySelector('.socket.output');
            outSocket.addEventListener('mousedown', (e) => startWiring(e, this));

            const inSocket = el.querySelector('.socket.input');
            inSocket.addEventListener('mouseup', (e) => finishWiring(e, this));

            return el;
        }

        updatePosition() { this.element.style.transform = `translate(${this.x}px, ${this.y}px)`; }
        updateSummary() {
            const body = this.element.querySelector('.node-body');
            const statusEl = this.element.querySelector('.node-status');

            if (this.status === 'running') statusEl?.classList.add('running');
            else statusEl?.classList.remove('running');
            if (this.status === 'completed') statusEl?.classList.add('completed');

            if (this.output) body.textContent = this.output.substring(0, 50) + (this.output.length > 50 ? '...' : '');
            else if (this.type === 'channel-name' && this.data.topic) body.textContent = "주제: " + this.data.topic;
            else if (this.type === 'topic-research' && this.data.topic) body.textContent = "채널: " + this.data.topic;
        }
    }

    // --- Interaction Logic (Drag/Pan/Zoom) ---
    // (Same standard logic as before, minimized for brevity)
    function startDragNode(e, node) {
        if (e.target.classList.contains('socket')) return;
        isDraggingNode = true; selectNode(node);
        const startX = e.clientX; const startY = e.clientY;
        const initialX = node.x; const initialY = node.y;
        function onMouseMove(e) {
            node.x = initialX + (e.clientX - startX) / scale;
            node.y = initialY + (e.clientY - startY) / scale;
            node.updatePosition(); updateConnections();
        }
        function onMouseUp() { document.removeEventListener('mousemove', onMouseMove); isDraggingNode = false; saveWorkflowState(); }
        document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    }

    // Canvas Pan/Zoom
    canvasContainer.addEventListener('mousedown', (e) => {
        // Allow panning if clicking on container, background, or empty layer space
        if (e.target === canvasContainer ||
            e.target.classList.contains('grid-background') ||
            e.target.id === 'nodes-layer' ||
            e.target.id === 'connections-layer') {
            isPanning = true;
            dragStartX = e.clientX - panX;
            dragStartY = e.clientY - panY;
            canvasContainer.style.cursor = 'grabbing';
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - dragStartX;
            panY = e.clientY - dragStartY;
            updateCanvasTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        canvasContainer.style.cursor = 'grab';
    });

    canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(Math.max(0.4, scale + e.deltaY * -0.001), 2);
        updateCanvasTransform();
    });

    function updateCanvasTransform() {
        nodesLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        connectionsLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    // --- Connection Logic ---
    function connectNodes(nodeA, nodeB) { connections.push({ from: nodeA, to: nodeB }); updateConnections(); }
    function updateConnections() {
        connectionsLayer.innerHTML = '';
        connections.forEach(conn => {
            const startX = conn.from.x + 260; const startY = conn.from.y + 40;
            const endX = conn.to.x; const endY = conn.to.y + 40;
            const d = `M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', '#666'); // Ensure visibility
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            connectionsLayer.appendChild(path);
        });
    }

    // --- Sidebar & Execution ---
    function selectNode(node) {
        if (!node) return;
        nodes.forEach(n => n.element.classList.remove('selected'));
        node.element.classList.add('selected'); selectedNodeId = node.id;
        renderProperties(node);
    }

    function renderProperties(node) {
        const def = NODE_TYPES[node.type];
        let html = `
            <div class="prop-group"><label>노드 타입</label><input type="text" value="${def.name}" disabled></div>
            <div class="prop-group"><label>AI 모델</label>
                <select id="prop-model">
                    <option value="gemini" ${node.data.model === 'gemini' ? 'selected' : ''}>Gemini (권장)</option>
                    <option value="chatgpt" ${node.data.model === 'chatgpt' ? 'selected' : ''}>ChatGPT</option>
                    <option value="claude" ${node.data.model === 'claude' ? 'selected' : ''}>Claude (Server)</option>
                </select>
            </div>
            <div class="prop-actions" style="display:flex; gap:10px;">
                <button class="run-node-btn" id="btn-run-${node.id}" style="flex:1;">실행 (Run)</button>
                <button class="run-node-btn" id="btn-delete-${node.id}" style="flex:0.4; background:#E74C3C;">삭제</button>
            </div>
            <hr style="border-top:1px solid #444; margin:15px 0;">
        `;

        // Dynamic Props
        if (def.props) {
            def.props.forEach(p => {
                if (p.type === 'text') html += `<div class="prop-group"><label>${p.label}</label><input type="text" id="prop-${p.id}" value="${node.data[p.id] || ''}"></div>`;
                else if (p.type === 'select') {
                    const opts = p.options.map(o => `<option ${node.data[p.id] === o ? 'selected' : ''}>${o}</option>`).join('');
                    html += `<div class="prop-group"><label>${p.label}</label><select id="prop-${p.id}">${opts}</select></div>`;
                }
            });
        }

        html += `<div class="prop-group"><label>결과 (Output)</label><textarea id="prop-output">${node.output || ''}</textarea></div>`;
        sidebarContent.innerHTML = html;

        // Bind Events
        document.getElementById('prop-model').addEventListener('change', (e) => { node.data.model = e.target.value; saveWorkflowState(); });
        document.getElementById('prop-output').addEventListener('input', (e) => { node.output = e.target.value; node.updateSummary(); saveWorkflowState(); });
        document.getElementById(`btn-run-${node.id}`).addEventListener('click', () => executeNode(node));
        document.getElementById(`btn-delete-${node.id}`).addEventListener('click', () => deleteNode(node));
        if (def.props) def.props.forEach(p => document.getElementById(`prop-${p.id}`).addEventListener('input', (e) => { node.data[p.id] = e.target.value; node.updateSummary(); saveWorkflowState(); }));
    }

    function deleteNode(node) {
        if (!confirm('정말 이 노드를 삭제하시겠습니까?')) return;

        // 1. Remove connections
        // Find all connections involving this node
        const relatedConnections = connections.filter(c => c.from === node || c.to === node);
        relatedConnections.forEach(c => {
            // We need to remove from 'connections' array. 
            // Ideally we filter properly or splice.
            const idx = connections.indexOf(c);
            if (idx > -1) connections.splice(idx, 1);
        });

        // 2. Remove node from array
        const nodeIdx = nodes.indexOf(node);
        if (nodeIdx > -1) nodes.splice(nodeIdx, 1);

        // 3. Remove from DOM
        node.element.remove();

        // 4. Update UI
        updateConnections(); // Redraw lines
        sidebarContent.innerHTML = '<div class="empty-state"><i class="fas fa-trash-alt"></i><p>노드가 삭제되었습니다.</p></div>';
        selectedNodeId = null;
        saveWorkflowState(); // 저장: 삭제 상태 반영
    }

    async function executeNode(node) {
        // 시작 시 로딩 메시지 표시 및 저장
        node.status = 'running';
        node.output = "AI가 아이디어를 생성하고 있습니다... ⏳\n(잠시만 기다려주세요)";
        node.updateSummary();
        renderProperties(node);
        saveWorkflowState(); // Running 상태 저장

        // 1. Context Collection
        const incoming = connections.filter(c => c.to === node);
        const context = incoming.map(c => `[참고 자료: ${NODE_TYPES[c.from.type].name}]\n${c.from.output}`).join('\n\n');

        // 2. Prompt Engineering (Factory Logic)
        let prompt = '';
        const topic = node.data.topic || '주제 미정';

        switch (node.type) {
            case 'channel-name':
                prompt = `주제 '${topic}'에 맞는 창의적인 유튜브 채널명 5개를 추천해줘. 브랜드 컨셉도 간략히 포함해.`; break;
            case 'channel-handle':
                prompt = `위의 채널명 아이디어를 바탕으로, 유튜브 핸들(@)로 쓸 수 있는 영문 아이디 5개를 추천해줘.`; break;
            case 'target-audience':
                // Try to find topic from upstream if not set
                const upstreamTopic = context.match(/주제:\s*(.*)/)?.[1] || node.data.topic || '유튜브 채널';
                prompt = `주제 '${upstreamTopic}'의 주요 타겟 시청자층(연령, 성별, 관심사)을 페르소나 형태로 분석해줘.`;
                break;
            case 'profile-pic':
                prompt = `채널 분위기(${node.data.vibe || '모던'})에 맞는 유튜브 프로필 사진(로고)을 생성하기 위한 고품질 영문 프롬프트를 작성해줘. 
                (형식: "High quality, vector art logo of..., minimalist, professional color palette, 4k", 설명 없이 프롬프트만 출력)`;
                break;
            case 'banner-image':
                prompt = `유튜브 채널 아트(배너)를 생성하기 위한 시네마틱하고 화려한 고화질 영문 프롬프트를 작성해줘. 
                (형식: "Cinematic wide banner showing..., detailed, 8k resolution, trending on artstation, vivid colors", 설명 없이 프롬프트만 출력)`;
                break;
            case 'topic-research':
                prompt = `주제 '${topic}'과 관련하여 현재 유튜브에서 조회수가 잘 나오는 킬러 콘텐츠 아이디어 5개를 분석해줘.`; break;
            case 'video-metadata':
                prompt = `앞서 기획한 콘텐츠 중 1픽을 골라서, 클릭을 부르는 영상 제목, 설명, 태그 세트를 작성해줘.`; break;
            case 'script-gen':
                prompt = `선정된 영상의 인트로-본론-아웃트로 대본을 작성해줘. 길이: ${node.data.duration}`; break;
            case 'translator':
                prompt = `위의 모든 내용을 ${node.data.lang || '영어'}로 번역해줘.`; break;
            case 'settings-general':
                // Static Info basically, but we can ask AI for confirmation/tips
                prompt = `유튜브 수익 창출 시 '${node.data.currency}' 통화 설정의 장단점과 세금 관련 간단한 팁을 한 문장으로 알려줘.`; break;
            case 'settings-channel':
                prompt = `주제 '${topic}'에 적합한 유튜브 채널 키워드(태그) 20개를 쉼표로 구분해서 추천해줘. SEO에 강력한 키워드 위주로.`; break;
            case 'settings-upload':
                prompt = `주제 '${topic}' 영상 업로드 시 '설명' 란에 항상 들어갈 기본 템플릿(인사말, 구독요청, 면책조항, 추천 해시태그 등)을 작성해줘.`; break;
            default:
                prompt = `다음 내용을 바탕으로 인사이트를 제공해줘:\n${context}`;
        }

        if (context) prompt = `${context}\n\n${prompt}`;

        try {
            const aiType = node.data.model || 'gemini';
            const result = await APIClient.callAPI(aiType, prompt, false);

            // Image Generation Logic (Removed by User Request)
            // Just output the high-quality prompt
            if (node.type === 'profile-pic' || node.type === 'banner-image') {
                const cleanPrompt = result.replace(/['"]/g, '').trim();
                node.output = `**[미드저니/DALL-E용 프롬프트]**\n\n${cleanPrompt}\n\nRunning... (이미지 생성은 지원하지 않음)`;

                // Add a "Copy" UI for convenience
                node.output = `**🎨 이미지 생성 프롬프트**\n(미드저니, DALL-E 등에 붙여넣기 하세요)\n\n\`\`\`\n${cleanPrompt}\n\`\`\``;
            } else {
                node.output = result;
            }

            node.status = 'completed';
        } catch (e) {
            node.status = 'error'; node.output = "Error: " + e.message;
        }
        node.updateSummary(); renderProperties(node);
        saveWorkflowState(); // Auto-save after execution
    }

    document.getElementById('run-workflow-btn').addEventListener('click', async () => {
        const btn = document.getElementById('run-workflow-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Factory...';
        btn.disabled = true;

        for (const node of nodes) {
            if (node.status !== 'running') {
                await executeNode(node);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        btn.innerHTML = originalText;
        btn.disabled = false;

        // Auto-show report after run
        showFinalReport();
    });

    // --- Final Report Logic ---
    function showFinalReport() {
        // Collect all outputs
        let reportHTML = `<div style="padding:20px; color:#ddd;">`;

        nodes.forEach(node => {
            if (node.output) {
                const def = NODE_TYPES[node.type];
                reportHTML += `
                    <div style="margin-bottom:30px;">
                        <h3 style="color:${def.color};"><i class="fas ${def.icon}"></i> ${def.name}</h3>
                        <div style="background:#222; padding:15px; border-radius:8px; line-height:1.6;">
                            ${node.output.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;
            }
        });
        reportHTML += '</div>';

        // Create/Open Modal
        let modal = document.getElementById('report-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'report-modal';
            modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000; overflow-y:auto; display:none; transform: translateZ(0);`;
            modal.innerHTML = `<div style="max-width:800px; margin:50px auto; background:#1a1a1a; border-radius:12px; position:relative; padding-bottom: 20px;">
                <div style="padding: 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin:0; color:white;">🎬 채널 생성 결과 리포트</h2>
                    <div>
                        <button id="btn-download-md" style="background:#3498DB; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; margin-right:10px;">
                            <i class="fas fa-download"></i> 다운로드 (.md)
                        </button>
                        <button onclick="document.getElementById('report-modal').style.display='none'" style="background:none; border:none; color:#888; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                </div>
                <div id="report-content"></div>
            </div>`;
            document.body.appendChild(modal);

            // Add Download Event Listener
            document.getElementById('btn-download-md').addEventListener('click', downloadReport);
        }
        document.getElementById('report-content').innerHTML = reportHTML;
        modal.style.display = 'block';
    }

    function downloadReport() {
        const urlParams = new URLSearchParams(window.location.search);
        const topic = urlParams.get('topic') || 'YouTube_Channel';
        let mdContent = `# 📺 유튜브 채널 기획서: ${topic}\n\n`;
        mdContent += `> 생성일: ${new Date().toLocaleString()}\n\n---\n\n`;

        nodes.forEach(node => {
            if (node.output) {
                const def = NODE_TYPES[node.type];
                mdContent += `## ${def.name}\n\n`;

                // Convert HTML output to Markdown
                let text = node.output;

                // Convert Image Tags: <img src="URL"> -> ![Image](URL)
                text = text.replace(/<img src="([^"]+)"[^>]*>/g, '\n![Generated Image]($1)\n');

                // Remove other HTML tags (br)
                text = text.replace(/<br>/g, '\n');

                mdContent += `${text}\n\n---\n\n`;
            }
        });

        // Trigger Download
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Channel_Plan_${topic.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Add Report Button to Header
    const headerActions = document.querySelector('header .actions');
    if (!document.getElementById('btn-report')) {
        const reportBtn = document.createElement('button');
        reportBtn.id = 'btn-report';
        reportBtn.className = 'btn-primary';
        reportBtn.style.background = '#2ECC71';
        reportBtn.style.marginLeft = '10px';
        reportBtn.innerHTML = '<i class="fas fa-file-invoice"></i> 결과 모아보기';
        reportBtn.onclick = showFinalReport;
        headerActions.appendChild(reportBtn);
    }

    // --- API Key Management (Workflow Specific) ---
    const apiModal = document.getElementById('api-modal');
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    const closeApiModalBtn = document.getElementById('close-api-modal');
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const clearApiKeysBtn = document.getElementById('clear-api-keys');

    const geminiInput = document.getElementById('gemini-key');
    const chatgptInput = document.getElementById('chatgpt-key');
    const claudeInput = document.getElementById('claude-key');

    // Open Modal logic
    apiSettingsBtn.onclick = () => {
        const keys = APIClient.getSavedApiKeys(); // uses api-client.js shared logic
        geminiInput.value = keys.gemini;
        chatgptInput.value = keys.chatgpt;
        claudeInput.value = keys.claude;
        apiModal.classList.remove('hidden');
    };

    // Close Modal logic
    closeApiModalBtn.onclick = () => {
        apiModal.classList.add('hidden');
    };

    // Save Keys logic
    saveApiKeysBtn.onclick = () => {
        localStorage.setItem('youtube_recommender_gemini_key', geminiInput.value.trim());
        localStorage.setItem('youtube_recommender_chatgpt_key', chatgptInput.value.trim());
        localStorage.setItem('youtube_recommender_claude_key', claudeInput.value.trim());
        alert('✅ API 키가 저장되었습니다. 모든 공정에 적용됩니다.');
        apiModal.classList.add('hidden');
    };

    // Clear Keys logic
    clearApiKeysBtn.onclick = () => {
        if (confirm('모든 API 키를 삭제하시겠습니까?')) {
            localStorage.removeItem('youtube_recommender_gemini_key');
            localStorage.removeItem('youtube_recommender_chatgpt_key');
            localStorage.removeItem('youtube_recommender_claude_key');
            geminiInput.value = '';
            chatgptInput.value = '';
            claudeInput.value = '';
            alert('🗑️ API 키가 초기화되었습니다.');
        }
    };

    // --- Dynamic Drag & Drop Creation (Toolbox) ---
    toolbarItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('nodeType', item.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('nodeType');
        if (!type || !NODE_TYPES[type]) return;

        // Calculate drop position relative to canvas pan/scale
        const rect = canvasContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;

        const newNode = new Node(type, x, y);
        nodes.push(newNode);
        nodesLayer.appendChild(newNode.element);
        newNode.updateSummary();
        selectNode(newNode);
    });

    // --- Manual Wiring Logic ---
    // 1. Start Wiring (Output Socket)
    function startWiring(e, node) {
        e.stopPropagation();
        isWiring = true;
        wiringStartNode = node;

        // Create Temp Line
        tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempLine.setAttribute('stroke', '#FFD700');
        tempLine.setAttribute('stroke-width', '3');
        tempLine.setAttribute('fill', 'none');
        tempLine.setAttribute('stroke-dasharray', '5,5');
        tempLine.style.pointerEvents = 'none'; // CRITICAL: Prevent line from stealing mouseup event from socket
        connectionsLayer.appendChild(tempLine);

        document.addEventListener('mousemove', onWiringMove);
        document.addEventListener('mouseup', onWiringEnd);
    }

    function onWiringMove(e) {
        if (!isWiring) return;
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - panX) / scale;
        const mouseY = (e.clientY - rect.top - panY) / scale;

        const startX = wiringStartNode.x + 260; // Output is on right
        const startY = wiringStartNode.y + 40;

        // Bezier curve to mouse
        const d = `M ${startX} ${startY} C ${startX + 80} ${startY}, ${mouseX - 80} ${mouseY}, ${mouseX} ${mouseY}`;
        tempLine.setAttribute('d', d);
    }

    function onWiringEnd(e) {
        // Cleanup global listeners
        document.removeEventListener('mousemove', onWiringMove);
        document.removeEventListener('mouseup', onWiringEnd);

        // If we land here and isWiring is true, it means we missed a valid socket 
        // (because valid socket would have triggered finishWiring and stopped propagation/cancelled wiring)
        // UNLESS the tempLine blocked the click.
        if (isWiring) {
            cancelWiring();
        }
    }

    function cancelWiring() {
        isWiring = false;
        wiringStartNode = null;
        if (tempLine) {
            tempLine.remove();
            tempLine = null;
        }
    }

    // 2. Finish Wiring (Input Socket)
    function finishWiring(e, targetNode) {
        // Critical: Stop propagation so document.mouseup (onWiringEnd) doesn't fire and confusingly cancel logic (though logic is redundant there)
        e.stopPropagation();

        if (!isWiring || !wiringStartNode) return;

        // Validation
        if (wiringStartNode === targetNode) { alert('자기 자신에게 연결할 수 없습니다.'); cancelWiring(); return; }
        if (connections.find(c => c.from === wiringStartNode && c.to === targetNode)) { alert('이미 연결되어 있습니다.'); cancelWiring(); return; }

        connectNodes(wiringStartNode, targetNode);
        cancelWiring(); // Clean up temp line
    }

    // --- Init: Check URL param for mode ---
    const initUrlParams = new URLSearchParams(window.location.search);
    const initialMode = initUrlParams.get('mode') || 'channel';

    if (initialMode === 'video') {
        currentMode = 'video';
        document.getElementById('tab-channel').classList.remove('active');
        document.getElementById('tab-video').classList.add('active');
        initVideoMode();
    } else {
        initChannelMode();
    }


});
