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

    // --- DOM Elements ---
    const canvasContainer = document.getElementById('canvas-container');
    const nodesLayer = document.getElementById('nodes-layer');
    const connectionsLayer = document.getElementById('connections-layer');
    const sidebarContent = document.getElementById('properties-content');
    const toolbarItems = document.querySelectorAll('.toolbar-item');

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
                    ${this.type === 'channel-name' ? (this.data.topic ? "주제: " + this.data.topic : '주제 입력 대기...') : '입력 대기 중...'}
                </div>
                <div class="node-status ${this.status}"></div>
                <div class="socket input"></div>
                <div class="socket output"></div>
            `;
            el.addEventListener('mousedown', (e) => startDragNode(e, this));
            el.addEventListener('click', (e) => { e.stopPropagation(); selectNode(this); });
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
        function onMouseUp() { document.removeEventListener('mousemove', onMouseMove); isDraggingNode = false; }
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
            <div class="prop-actions"><button class="run-node-btn" id="btn-run-${node.id}">실행 (Run)</button></div>
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
        document.getElementById('prop-model').addEventListener('change', (e) => node.data.model = e.target.value);
        document.getElementById('prop-output').addEventListener('input', (e) => { node.output = e.target.value; node.updateSummary(); });
        document.getElementById(`btn-run-${node.id}`).addEventListener('click', () => executeNode(node));
        if (def.props) def.props.forEach(p => document.getElementById(`prop-${p.id}`).addEventListener('input', (e) => { node.data[p.id] = e.target.value; node.updateSummary(); }));
    }

    async function executeNode(node) {
        node.status = 'running'; node.updateSummary(); renderProperties(node);

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
                prompt = `채널 분위기에 맞는 유튜브 프로필 사진(로고)을 생성하기 위한 심플하고 명확한 영문 프롬프트를 작성해줘. 
                (형식: "A minimalist logo of...", 설명 없이 프롬프트만 출력)
                스타일: ${node.data.vibe || '모던'}`;
                break;
            case 'banner-image':
                prompt = `유튜브 채널 아트(배너)를 생성하기 위한 고화질 영문 프롬프트를 작성해줘. 
                (형식: "Wide banner image showing...", 설명 없이 프롬프트만 출력)`;
                break;
            case 'topic-research':
                prompt = `주제 '${topic}'과 관련하여 현재 유튜브에서 조회수가 잘 나오는 킬러 콘텐츠 아이디어 5개를 분석해줘.`; break;
            case 'video-metadata':
                prompt = `앞서 기획한 콘텐츠 중 1픽을 골라서, 클릭을 부르는 영상 제목, 설명, 태그 세트를 작성해줘.`; break;
            case 'script-gen':
                prompt = `선정된 영상의 인트로-본론-아웃트로 대본을 작성해줘. 길이: ${node.data.duration}`; break;
            case 'translator':
                prompt = `위의 모든 내용을 ${node.data.lang || '영어'}로 번역해줘.`; break;
            default:
                prompt = `다음 내용을 바탕으로 인사이트를 제공해줘:\n${context}`;
        }

        if (context) prompt = `${context}\n\n${prompt}`;

        try {
            const aiType = node.data.model || 'gemini';
            const result = await APIClient.callAPI(aiType, prompt, false);

            // Image Generation Logic (Pollinations.ai)
            if (node.type === 'profile-pic' || node.type === 'banner-image') {
                const cleanPrompt = result.replace(/['"]/g, '').trim();
                const encoded = encodeURIComponent(cleanPrompt);
                // Random seed for variety
                const seed = Math.floor(Math.random() * 1000);
                const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?nologo=true&seed=${seed}`;

                // Store both prompt and image HTML
                node.output = `**프롬프트:** ${cleanPrompt}\n\n**생성된 이미지:**\n<img src="${imageUrl}" style="max-width:100%; border-radius:8px; margin-top:10px;">`;
            } else {
                node.output = result;
            }

            node.status = 'completed';
        } catch (e) {
            node.status = 'error'; node.output = "Error: " + e.message;
        }
        node.updateSummary(); renderProperties(node);
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
        let reportHTML = `<div style="padding:20px; color:white;"><h2>🎬 채널 생성 결과 리포트</h2><hr style="border-color:#444;">`;

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

    // --- Init: The Factory Mega-Chain ---
    const urlParams = new URLSearchParams(window.location.search);
    const initialTopic = urlParams.get('topic');

    if (initialTopic) {
        // Layout: 3 Columns
        // Col 1: Identity (Name -> Handle -> Target)
        // Col 2: Visuals (Profile -> Banner)
        // Col 3: Content (Research -> Meta -> Script)

        // Shifted right by +250px to avoid toolbar overlay
        const c1x = 350, c2x = 750, c3x = 1150, c4x = 1550;
        const startY = 100, gapY = 250;

        // Nodes
        const n1 = new Node('channel-name', c1x, startY); n1.data.topic = initialTopic;
        const n2 = new Node('channel-handle', c1x, startY + gapY);
        const n3 = new Node('target-audience', c1x, startY + gapY * 2);
        n3.data.topic = initialTopic; // Fix: Explicitly set topic for n3

        const n4 = new Node('profile-pic', c2x, startY);
        const n5 = new Node('banner-image', c2x, startY + gapY);

        const n6 = new Node('topic-research', c3x, startY); n6.data.topic = initialTopic;
        const n7 = new Node('video-metadata', c3x, startY + gapY);
        const n8 = new Node('script-gen', c3x, startY + gapY * 2);

        const n9 = new Node('translator', c4x, startY + gapY);

        [n1, n2, n3, n4, n5, n6, n7, n8, n9].forEach(n => { nodes.push(n); nodesLayer.appendChild(n.element); n.updateSummary(); });

        // Connections
        connectNodes(n1, n2); // Name -> Handle
        connectNodes(n1, n3); // Name -> Target

        connectNodes(n1, n4); // Name -> Profile
        connectNodes(n1, n5); // Name -> Banner

        connectNodes(n3, n6); // Target -> Research
        connectNodes(n6, n7); // Research -> Meta
        connectNodes(n7, n8); // Meta -> Script

        connectNodes(n8, n9); // Script -> Translate

        selectNode(n1);
        updateCanvasTransform();
    }
});
