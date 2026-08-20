 const DEFAULT_FALLBACK_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=kolbom_default';
 let currentUploadedAvatarBase64 = '';
 let currentPersonaAvatarBase64 = '';
 let currentFeedGridCols = 3;
 let pendingNavTarget = null;
 let editingCharacterId = null; // 수정 중인 캐릭터 ID (신규 생성 시 null)

 const MODEL_PRICING = {
 'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60, provider: 'openai', name: 'OpenAI GPT-4o-mini' },
 'gemini-2.5-flash': { inputPer1M: 0.30, outputPer1M: 2.50, provider: 'gemini', name: 'Google Gemini 2.5 Flash' },
 'gemini-3.1-pro-preview': { inputPer1M: 2.00, outputPer1M: 12.00, provider: 'gemini', name: 'Google Gemini 3.1 Pro' },
 'gemini-3.5-flash': { inputPer1M: 1.50, outputPer1M: 9.00, provider: 'gemini', name: 'Google Gemini 3.5 Flash' },
 'claude-haiku-4-5-20251001': { inputPer1M: 1.00, outputPer1M: 5.00, provider: 'anthropic', name: 'Claude Haiku 4.5' },
 'claude-sonnet-5': { inputPer1M: 2.00, outputPer1M: 10.00, provider: 'anthropic', name: 'Claude Sonnet 5' },
 'claude-opus-5': { inputPer1M: 5.00, outputPer1M: 25.00, provider: 'anthropic', name: 'Claude Opus 5' },
 'mock-engine': { inputPer1M: 0.0, outputPer1M: 0.0, provider: 'mock', name: 'Mock Engine (시뮬레이션)' }
 };

 const DEFAULT_REGISTERED_MODELS = [
 {
 id: 'model-mock-1',
 label: '무료 시뮬레이션 엔진',
 modelKey: 'mock-engine',
 apiKey: '',
 stats: { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 }
 }
 ];

 const DEFAULT_CHARACTERS = [
 {
 id: 'char-1',
 name: '츤데레 선배 강서준',
 avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=seojun',
 intro: '맨날 틱틱거리면서도 과제나 밥은 꼬박꼬박 챙겨주는 선배',
 author: '주인님',
 startTitle: '기본 루트',
 greeting: '야. 너 또 과제 안 하고 멍때리고 있지? 밥이나 먹으러 가자, 나와.',
 startContext: '상대방과 10년 지기 소꿉친구이자 같은 학과 선후배 사이. 현재 점심시간 직전 동아리방 상황.',
 systemPrompt: '너는 츤데레 대학교 과선배 강서준이다. 겉으로는 차갑고 툴툴거리지만 속으로는 상대를 몹시 아낀다. 카카오톡 메신저로 대화하듯 짧은 반말과 틱틱거리는 어투를 써라. 문장은 1~3문장 이내로 톡하듯 보낸다.'
 }
 ];

 const DEFAULT_PERSONAS = [
 {
 id: 'persona-default',
 name: '나 (기본)',
 avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=user_default',
 desc: '기본 페르소나',
 prompt: '유저는 일반적인 사용자입니다. 편안하고 자연스럽게 대화합니다.'
 }
 ];

 let currentView = 'dashboard';
 let currentSessionId = null;
 let selectedCharForSessionModal = null;
 let selectedChatFolderFilter = 'all';
 let isKakaoDark = false;
 let pendingImageDataUrl = null;
 let pendingImageMeta = null;

 window.addEventListener('DOMContentLoaded', () => {
  initStorage();
  applyThemeSettings();
  initVisualViewportHandler();

  // 초기 URL 해시 파싱 및 히스토리 초기 세팅
  const initialHash = window.location.hash.replace('#', '') || 'dashboard';
  const [viewPart, queryPart] = initialHash.split('?');
  const params = {};
  if (queryPart) {
    const urlParams = new URLSearchParams(queryPart);
    if (urlParams.get('session')) params.sessionId = urlParams.get('session');
  }

  history.replaceState({ viewName: viewPart || 'dashboard', params }, '', window.location.hash || '#dashboard');
  routeFromURL(false);

  checkCharacterDraft();
  resetScenarioList();
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
});

 function initVisualViewportHandler() {
 if (window.visualViewport) {
 window.visualViewport.addEventListener('resize', () => {
 if (currentView === 'chatroom') {
 const chatroomEl = document.getElementById('view-chatroom');
 if (chatroomEl && window.innerWidth < 640) {
 chatroomEl.style.height = `${window.visualViewport.height}px`;
 scrollToBottom();
 }
 }
 });
 window.visualViewport.addEventListener('scroll', () => {
 if (currentView === 'chatroom' && window.innerWidth < 640) {
 window.scrollTo(0, 0);
 }
 });
 }
 }

 function initStorage() {
 if (!localStorage.getItem('user_profile_nickname')) {
 localStorage.setItem('user_profile_nickname', '주인님');
 }
 if (!localStorage.getItem('user_registered_models')) {
 localStorage.setItem('user_registered_models', JSON.stringify(DEFAULT_REGISTERED_MODELS));
 }
 if (!localStorage.getItem('crack_characters')) {
 localStorage.setItem('crack_characters', JSON.stringify(DEFAULT_CHARACTERS));
 }
 if (!localStorage.getItem('user_personas')) {
 localStorage.setItem('user_personas', JSON.stringify(DEFAULT_PERSONAS));
 }
 if (!localStorage.getItem('kolbom_chat_sessions')) {
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify([]));
 }
 if (!localStorage.getItem('kolbom_chat_folders')) {
 localStorage.setItem('kolbom_chat_folders', JSON.stringify([
 { id: 'folder-main', name: '메인 스토리' },
 { id: 'folder-if', name: 'IF 외전' }
 ]));
 }
 }

 const THEME_ACCENTS = [
 { id: 'terracotta', name: '테라코타', hex: '#C1694F' },
 { id: 'forest', name: '포레스트 그린', hex: '#4A5D45' },
 { id: 'maroon', name: '머룬 와인', hex: '#7B3F3F' },
 { id: 'mustard', name: '머스터드', hex: '#C9A227' },
 { id: 'dustyrose', name: '더스티 로즈', hex: '#C08A7D' },
 { id: 'indigo', name: '딥 인디고', hex: '#3B4A6B' },
 { id: 'cognac', name: '코냑 브라운', hex: '#9C6B3E' },
 { id: 'slate', name: '슬레이트', hex: '#5C6B73' }
 ];

 function applyThemeSettings() {
 const mode = localStorage.getItem('app_theme_mode') || 'light';
 const accent = localStorage.getItem('app_accent_theme') || 'terracotta';
 document.documentElement.setAttribute('data-theme', mode);
 document.documentElement.setAttribute('data-accent', accent);
 }

 function setAppTheme(mode) {
 localStorage.setItem('app_theme_mode', mode);
 applyThemeSettings();
 renderThemeModalState();
 }

 function setAccentTheme(id) {
 localStorage.setItem('app_accent_theme', id);
 applyThemeSettings();
 renderThemeModalState();
 }

 function openThemeModal() {
 renderThemeModalState();
 document.getElementById('theme-modal').classList.remove('hidden');
 lucide.createIcons();
 }
 function closeThemeModal() {
 document.getElementById('theme-modal').classList.add('hidden');
 }

 function renderThemeModalState() {
 const mode = localStorage.getItem('app_theme_mode') || 'light';
 const accent = localStorage.getItem('app_accent_theme') || 'terracotta';

 const lightBtn = document.getElementById('theme-mode-light-btn');
 const darkBtn = document.getElementById('theme-mode-dark-btn');
 if (lightBtn && darkBtn) {
 lightBtn.className = 'py-2 text-xs font-bold rounded-xl border transition ' + (mode === 'light' ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]');
 darkBtn.className = 'py-2 text-xs font-bold rounded-xl border transition ' + (mode === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]');
 }

 const grid = document.getElementById('accent-swatch-grid');
 if (grid) {
 grid.innerHTML = THEME_ACCENTS.map(t => `
 <button
 onclick="setAccentTheme('${t.id}')"
 title="${t.name}"
 aria-label="${t.name} 테마 선택"
 style="background:${t.hex}; height:36px; border-radius:8px; border:2px solid ${t.id === accent ? 'var(--ink)' : 'transparent'}; display:flex; align-items:center; justify-content:center;"
 >
 ${t.id === accent ? '<i data-lucide="check" class="w-3.5 h-3.5" style="color:#fff"></i>' : ''}
 </button>
 `).join('');
 lucide.createIcons();
 }
 }

 function openLightbox(src) {
 if (!src) return;
 document.getElementById('lightbox-img').src = src;
 document.getElementById('lightbox-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeLightbox() {
 document.getElementById('lightbox-modal').classList.add('hidden');
 }

 function setGridCols(cols) {
 currentFeedGridCols = cols;
 const grid = document.getElementById('characters-grid');
 
 [3, 4, 5, 6].forEach(c => {
 const btn = document.getElementById(`btn-col-${c}`);
 if (btn) {
 if (c === cols) {
 btn.className = 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition bg-[var(--bg)] text-[var(--ink)] shadow-sm';
 } else {
 btn.className = 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition text-[var(--muted)] hover:text-[var(--ink)]';
 }
 }
 });

 if (cols === 3) {
 grid.className = 'grid grid-cols-3 gap-2.5 sm:gap-5 pt-1';
 } else if (cols === 4) {
 grid.className = 'grid grid-cols-4 gap-2 sm:gap-4 pt-1';
 } else if (cols === 5) {
 grid.className = 'grid grid-cols-5 gap-2 sm:gap-3.5 pt-1';
 } else if (cols === 6) {
 grid.className = 'grid grid-cols-6 gap-1.5 sm:gap-3 pt-1';
 }
 }

 // 🔥 [수정] 네비게이션 진입 함수 (히스토리 기록 push 여부 플래그 추가)
function navigate(viewName, params = {}, pushHistory = true) {
  if (currentView === 'create' && viewName !== 'create' && hasUnsavedCharacterFormContent()) {
    pendingNavTarget = { viewName, params, pushHistory };
    openUnsavedChangesModal();
    return;
  }
  performNavigate(viewName, params, pushHistory);
}

// 🔥 [수정] 실제 화면 전환 및 URL/히스토리 갱신
function performNavigate(viewName, params = {}, pushHistory = true) {
  // 열려있는 모달 닫기
  closeCharacterDetailModal();
  closeCharacterSessionModal();
  closePersonaModal();
  closeRenameSessionModal();
  closeCreateFolderModal();
  closeMoveFolderModal();
  closeApiModelModal();
  closeNicknameModal();
  closeThemeModal();
  closeDraftListModal();
  closeLightbox();

  currentView = viewName;
  const views = ['dashboard', 'characters', 'create', 'personas', 'chats', 'chatroom'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });

  const targetEl = document.getElementById(`view-${viewName}`);
  if (targetEl) targetEl.classList.remove('hidden');

  const mBottomNav = document.getElementById('mobile-bottom-nav');
  const globalHeader = document.getElementById('global-header');

  if (viewName === 'chatroom') {
    if (mBottomNav) mBottomNav.classList.add('hidden');
    if (window.innerWidth < 640) {
      if (globalHeader) globalHeader.classList.add('hidden');
      const chatroomEl = document.getElementById('view-chatroom');
      if (chatroomEl && window.visualViewport) {
        chatroomEl.style.height = `${window.visualViewport.height}px`;
      }
    }
  } else {
    if (mBottomNav) mBottomNav.classList.remove('hidden');
    if (globalHeader) globalHeader.classList.remove('hidden');
    const chatroomEl = document.getElementById('view-chatroom');
    if (chatroomEl) chatroomEl.style.height = '';
  }

  // 데스크톱 사이드바 활성 상태 동기화
  ['dashboard', 'characters', 'personas', 'chats'].forEach(tab => {
    const btn = document.getElementById(`sidebar-btn-${tab}`);
    if (btn) {
      if (tab === viewName) {
        btn.className = 'w-9 h-9 rounded-xl flex items-center justify-center transition bg-[var(--accent)] text-[var(--accent-text)]';
      } else {
        btn.className = 'w-9 h-9 rounded-xl flex items-center justify-center transition text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--fill-muted)]';
      }
    }
  });

  // 모바일 하단바 활성 상태 동기화
  ['dashboard', 'characters', 'personas', 'chats'].forEach(tab => {
    const mBtn = document.getElementById(`m-nav-${tab}`);
    if (mBtn) {
      if (tab === viewName) {
        mBtn.className = 'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[var(--accent)] font-bold transition';
      } else {
        mBtn.className = 'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] transition';
      }
    }
  });

  // 뷰별 데이터 갱신
  if (viewName === 'dashboard') updateDashboardStats();
  if (viewName === 'characters') renderCharacterFeed();
  if (viewName === 'create') checkCharacterDraft();
  if (viewName === 'personas') renderPersonaList();
  if (viewName === 'chats') renderActiveChatsList();
  if (viewName === 'chatroom' && params.sessionId) {
    openChatRoom(params.sessionId);
  }

  // 🔥 브라우저 히스토리 스택 추가 및 해시(#) URL 업데이트
  if (pushHistory) {
    const hash = (viewName === 'chatroom' && params.sessionId)
      ? `#chatroom?session=${params.sessionId}`
      : `#${viewName}`;
    history.pushState({ viewName, params }, '', hash);
  }

  window.scrollTo(0, 0);
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

// 🔥 [추가] 브라우저 뒤로가기 / 앞으로가기 감지
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.viewName) {
    performNavigate(e.state.viewName, e.state.params || {}, false);
  } else {
    routeFromURL(false);
  }
});

// 🔥 [추가] URL 해시 기반 자동 라우터
function routeFromURL(pushHistory = false) {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const [viewPart, queryPart] = hash.split('?');
  const params = {};
  if (queryPart) {
    const urlParams = new URLSearchParams(queryPart);
    if (urlParams.get('session')) {
      params.sessionId = urlParams.get('session');
    }
  }

  const validViews = ['dashboard', 'characters', 'create', 'personas', 'chats', 'chatroom'];
  const viewName = validViews.includes(viewPart) ? viewPart : 'dashboard';
  performNavigate(viewName, params, pushHistory);
 }

 function updateDashboardStats() {
 const nickname = localStorage.getItem('user_profile_nickname') || '주인님';
 document.getElementById('dash-user-nickname').innerText = nickname;

 const models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 document.getElementById('dash-registered-models-count').innerText = `${models.length}개`;

 let totalCalls = 0;
 let totalTokens = 0;
 let totalCostUSD = 0;

 models.forEach(m => {
 const st = m.stats || { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
 totalCalls += st.calls;
 totalTokens += (st.inputTokens + st.outputTokens);
 totalCostUSD += st.costUSD;
 });

 document.getElementById('dash-total-calls').innerText = totalCalls.toLocaleString();
 document.getElementById('dash-total-tokens').innerText = totalTokens.toLocaleString();
 document.getElementById('dash-total-cost-usd').innerText = `$${totalCostUSD.toFixed(4)}`;

 const modelsGrid = document.getElementById('dash-models-grid');
 modelsGrid.innerHTML = models.map(m => {
 const p = MODEL_PRICING[m.modelKey] || { name: m.modelKey };
 const st = m.stats || { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
 const hasKey = m.apiKey && m.apiKey.length > 3;

 return `
 <div class="bg-[var(--bg)] border border-[var(--border)]/30 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm">
 <div>
 <div class="flex items-start justify-between gap-2">
 <div>
 <h4 class="font-bold text-xs text-[var(--ink)] truncate">${escapeHtml(m.label)}</h4>
 <span class="text-[10px] text-[var(--accent)] font-mono block mt-0.5">${p.name}</span>
 </div>
 <span class="text-[9px] px-2 py-0.5 rounded-full border font-bold ${
 m.modelKey === 'mock-engine' ? 'bg-[var(--card)] text-[var(--ink)] border-[var(--border)]/30' :
 hasKey ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
 }">
 ${m.modelKey === 'mock-engine' ? 'Mock' : hasKey ? '연동됨' : 'Key 필요'}
 </span>
 </div>

 <div class="mt-3 bg-[var(--card)]/30 border border-[var(--border)]/20 p-2.5 rounded-xl space-y-1 text-[11px]">
 <div class="flex justify-between items-center">
 <span class="text-[var(--muted)]">누적 요금:</span>
 <span class="font-bold text-[var(--ink)] font-mono">$${(st.costUSD || 0).toFixed(4)}</span>
 </div>
 <div class="flex justify-between">
 <span class="text-[var(--muted)]">호출 수:</span>
 <span class="font-mono text-[var(--ink)]">${st.calls}회</span>
 </div>
 <div class="flex justify-between text-[10px]">
 <span class="text-[var(--muted)]">토큰 (In/Out):</span>
 <span class="font-mono text-[var(--muted)]">${(st.inputTokens || 0).toLocaleString()} / ${(st.outputTokens || 0).toLocaleString()}</span>
 </div>
 </div>
 </div>

 <div class="flex justify-end pt-1">
 <button onclick="deleteRegisteredModel('${m.id}')" class="text-[11px] font-medium text-[var(--muted)] hover:text-rose-500 transition">삭제</button>
 </div>
 </div>
 `;
 }).join('');

 lucide.createIcons();
 }

 function openApiModelModal() {
 document.getElementById('simple-model-label').value = '';
 document.getElementById('simple-model-key').value = '';
 document.getElementById('simple-model-select').selectedIndex = 0;
 document.getElementById('api-model-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeApiModelModal() {
 document.getElementById('api-model-modal').classList.add('hidden');
 }

 function handleSaveSimpleApiKey(e) {
 e.preventDefault();
 const label = document.getElementById('simple-model-label').value.trim();
 const apiKey = document.getElementById('simple-model-key').value.trim();
 const modelKey = document.getElementById('simple-model-select').value;

 const newModel = {
 id: `model-${Date.now()}`,
 label,
 modelKey,
 apiKey,
 stats: { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 }
 };

 const models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 models.push(newModel);
 localStorage.setItem('user_registered_models', JSON.stringify(models));

 closeApiModelModal();
 updateDashboardStats();
 alert(`'${label}' API Key가 성공적으로 등록되었습니다!`);
 }

 function deleteRegisteredModel(id) {
 if (confirm('이 API 모델을 삭제할까요?')) {
 let models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 models = models.filter(m => m.id !== id);
 localStorage.setItem('user_registered_models', JSON.stringify(models));
 updateDashboardStats();
 }
 }

 function openNicknameModal() {
 document.getElementById('input-user-nickname').value = localStorage.getItem('user_profile_nickname') || '주인님';
 document.getElementById('nickname-modal').classList.remove('hidden');
 lucide.createIcons();
 }
 function closeNicknameModal() {
 document.getElementById('nickname-modal').classList.add('hidden');
 }
 function saveUserNickname() {
 const val = document.getElementById('input-user-nickname').value.trim();
 if (!val) return;
 localStorage.setItem('user_profile_nickname', val);
 closeNicknameModal();
 updateDashboardStats();
 }

 function renderPersonaList() {
 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 const container = document.getElementById('personas-list-grid');

 if (personas.length === 0) {
 container.innerHTML = `
 <div class="col-span-full py-16 text-center text-xs text-[var(--muted)]">
 등록된 페르소나가 없습니다. 우측 상단 '+ 새 페르소나 추가' 버튼을 눌러보세요.
 </div>
 `;
 return;
 }

 container.innerHTML = personas.map(p => {
 const avatarSrc = p.avatar || DEFAULT_FALLBACK_AVATAR;
 return `
 <div class="bg-[var(--card)] border border-[var(--border)]/30 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm">
 <div>
 <div class="flex items-center gap-3">
 <div class="w-12 h-12 rounded-xl bg-[var(--bg)] border border-[var(--border)]/30 overflow-hidden shrink-0 cursor-pointer" onclick="openLightbox('${avatarSrc}')">
 <img src="${avatarSrc}" class="w-full h-full object-cover" onerror="this.src='${DEFAULT_FALLBACK_AVATAR}'" />
 </div>
 <div class="overflow-hidden flex-1">
 <h3 class="font-bold text-sm text-[var(--ink)] truncate">${escapeHtml(p.name)}</h3>
 <p class="text-xs text-[var(--accent)] font-medium mt-0.5 line-clamp-1">${escapeHtml(p.desc || '설명 없음')}</p>
 </div>
 </div>
 <div class="mt-3 bg-[var(--bg)]/80 border border-[var(--border)]/20 p-2.5 rounded-xl text-[11px] text-[var(--ink)] font-mono line-clamp-3">
 ${escapeHtml(p.prompt)}
 </div>
 </div>
 
 <div class="flex justify-end gap-2 pt-2 border-t border-[var(--border)]/20">
 <button onclick="openEditPersonaModal('${p.id}')" class="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] px-2 py-1 flex items-center gap-1">
 <i data-lucide="edit-2" class="w-3 h-3"></i>
 <span>수정</span>
 </button>
 <button onclick="deletePersona('${p.id}')" class="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1">삭제</button>
 </div>
 </div>
 `;
 }).join('');
 lucide.createIcons();
 }

 function openPersonaModal() {
 document.getElementById('edit-persona-id').value = '';
 document.getElementById('persona-modal-title').innerHTML = '<i data-lucide="user-check" class="w-4 h-4 text-[var(--accent)]"></i> 새 페르소나 등록';
 document.getElementById('persona-name').value = '';
 document.getElementById('persona-desc').value = '';
 document.getElementById('persona-prompt').value = '';
 currentPersonaAvatarBase64 = '';
 document.getElementById('persona-preview-img').src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + Date.now();
 document.getElementById('persona-avatar-file').value = '';

 document.getElementById('persona-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function openEditPersonaModal(personaId) {
 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 const target = personas.find(p => p.id === personaId);
 if (!target) return;

 document.getElementById('edit-persona-id').value = target.id;
 document.getElementById('persona-modal-title').innerHTML = '<i data-lucide="edit-2" class="w-4 h-4 text-[var(--accent)]"></i> 페르소나 수정';
 document.getElementById('persona-name').value = target.name || '';
 document.getElementById('persona-desc').value = target.desc || '';
 document.getElementById('persona-prompt').value = target.prompt || '';
 
 currentPersonaAvatarBase64 = target.avatar || '';
 document.getElementById('persona-preview-img').src = target.avatar || DEFAULT_FALLBACK_AVATAR;
 document.getElementById('persona-avatar-file').value = '';

 document.getElementById('persona-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closePersonaModal() {
 document.getElementById('persona-modal').classList.add('hidden');
 }

 function handleSavePersona(e) {
 e.preventDefault();
 const editId = document.getElementById('edit-persona-id').value;
 const name = document.getElementById('persona-name').value.trim();
 const desc = document.getElementById('persona-desc').value.trim();
 const prompt = document.getElementById('persona-prompt').value.trim();

 const finalAvatar = currentPersonaAvatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`;

 let personas = JSON.parse(localStorage.getItem('user_personas') || '[]');

 if (editId) {
 const idx = personas.findIndex(p => p.id === editId);
 if (idx !== -1) {
 personas[idx].name = name;
 personas[idx].desc = desc;
 personas[idx].prompt = prompt;
 personas[idx].avatar = finalAvatar;
 }
 } else {
 const newPersona = {
 id: `persona-${Date.now()}`,
 name,
 avatar: finalAvatar,
 desc,
 prompt
 };
 personas.push(newPersona);
 }

 localStorage.setItem('user_personas', JSON.stringify(personas));

 closePersonaModal();
 renderPersonaList();
 alert(`'${name}' 페르소나가 저장되었습니다!`);
 }

 function deletePersona(id) {
 if (confirm('이 페르소나를 삭제하시겠습니까?')) {
 let personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 personas = personas.filter(p => p.id !== id);
 localStorage.setItem('user_personas', JSON.stringify(personas));
 renderPersonaList();
 }
 }

 // 캐릭터 피드 렌더링 (그라데이션 완화 & 제목 호버 색상 수정)
function renderCharacterFeed() {
  const grid = document.getElementById('characters-grid') || document.getElementById('character-feed-grid');
  const emptyState = document.getElementById('feed-empty');
  if (!grid) return;

  const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
  const searchInput = document.getElementById('char-search-input') || document.getElementById('feed-search-input') || document.getElementById('character-search-input');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

  const filtered = chars.filter(c => {
    if (!c) return false;
    const name = (c.name || '').toLowerCase();
    const intro = (c.intro || c.tagline || c.systemPrompt || '').toLowerCase();
    const author = (c.author || c.creator || '').toLowerCase();
    return !query || name.includes(query) || intro.includes(query) || author.includes(query);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-xs text-[var(--muted)]">
        ${query ? '검색 결과가 없습니다.' : '등록된 캐릭터가 없습니다.'}
      </div>
    `;
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = filtered.map(c => {
    const charId = escapeHtml(c.id);
    const charName = escapeHtml(c.name || '이름 없음');
    const charIntro = escapeHtml(c.intro || c.tagline || '소개가 없습니다.');
    const authorName = escapeHtml(c.author || c.creator || '작성자 미상');
    const avatarUrl = escapeHtml(c.avatar || DEFAULT_FALLBACK_AVATAR);
    const isOfficial = c.isOfficial || authorName === '운영팀' || authorName === '관리자';

    return `
      <div onclick="openCharacterDetailModal('${charId}')" 
           class="group relative flex flex-col rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--border)]/40 hover:border-[var(--accent)] hover:shadow-xl transition-all duration-300 cursor-pointer select-none">
        
        <div class="relative w-full aspect-[3/4] overflow-hidden bg-black/10">
          <img src="${avatarUrl}" 
               alt="${charName}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out pointer-events-none" 
               onerror="this.src='${DEFAULT_FALLBACK_AVATAR}'" />
          
          <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            <div>
              ${isOfficial ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-[var(--accent-text)] shadow-sm">공식</span>` : ''}
            </div>
            <button onclick="confirmDeleteCharacter(event, '${charId}', '${charName}')" 
                    title="캐릭터 삭제" 
                    class="p-1 rounded-lg bg-black/40 text-white/80 hover:text-rose-400 hover:bg-black/60 transition backdrop-blur-sm pointer-events-auto">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-3.5 text-left pointer-events-none">
            <h4 class="text-sm sm:text-base font-bold text-white leading-tight line-clamp-1 drop-shadow-sm">
              ${charName}
            </h4>
            <p class="text-xs text-white/85 line-clamp-2 mt-1 leading-snug drop-shadow-sm">
              ${charIntro}
            </p>
            <div class="flex items-center gap-1 mt-2 text-[11px] text-white/70 font-medium">
              <span>@${authorName}</span>
            </div>
          </div>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

 function confirmDeleteCharacter(e, charId, charName) {
 e.stopPropagation();
 const firstCheck = confirm(`[1차 확인]\n"${charName}" 캐릭터를 삭제하시겠습니까?`);
 if (firstCheck) {
 const secondCheck = confirm(`[최종 경고]\n정말 "${charName}" 캐릭터를 삭제하시겠습니까?\n이 캐릭터와 나눈 모든 다중 채팅방과 대화 기록이 영구히 삭제됩니다.`);
 if (secondCheck) {
 let chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 chars = chars.filter(c => c.id !== charId);
 localStorage.setItem('crack_characters', JSON.stringify(chars));

 let sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const toRemoveSessions = sessions.filter(s => s.characterId === charId);
 toRemoveSessions.forEach(s => localStorage.removeItem(`chat_history_${s.id}`));
 
 sessions = sessions.filter(s => s.characterId !== charId);
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));

 renderCharacterFeed();
 renderActiveChatsList();
 updateDashboardStats();
 alert(`"${charName}" 캐릭터와 모든 대화방이 안전하게 삭제되었습니다.`);
 }
 }
 }

 // ---- 시작 상황 (여러 개, 최소 1개) ----
 let scenarioBlockSeq = 0;

 function createScenarioBlockHTML(seq, data = {}) {
 return `
 <div class="scenario-block bg-[var(--bg)] border border-[var(--border)]/30 rounded-2xl p-3.5 space-y-2.5" data-seq="${seq}">
 <div class="flex items-center justify-between">
 <span class="text-[10px] font-bold text-[var(--muted)]">시작 상황 #${seq}</span>
 <button type="button" onclick="removeScenarioBlock(${seq})" class="scenario-remove-btn text-[10px] text-[var(--muted)] hover:text-rose-500 flex items-center gap-0.5">
 <i data-lucide="trash-2" class="w-3 h-3"></i> 삭제
 </button>
 </div>
 <input type="text" class="scenario-title w-full bg-[var(--card)] border border-[var(--border)]/30 rounded-lg px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]" placeholder="시작설정 이름 (예: 기본 루트, 비 내리는 날의 도서관)" value="${escapeHtml(data.title || '')}" />
 <textarea class="scenario-greeting w-full bg-[var(--card)] border border-[var(--border)]/30 rounded-lg px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] resize-none" rows="2" placeholder="프롤로그 (첫인사 메시지)">${escapeHtml(data.greeting || '')}</textarea>
 <textarea class="scenario-context w-full bg-[var(--card)] border border-[var(--border)]/30 rounded-lg px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-mono leading-relaxed" rows="2" placeholder="🔒 AI에게만 주입되는 초기 상황 디렉팅 (선택)">${escapeHtml(data.startContext || '')}</textarea>
 </div>
 `;
 }

 function addScenarioBlock(data = {}) {
 scenarioBlockSeq += 1;
 const list = document.getElementById('create-scenarios-list');
 list.insertAdjacentHTML('beforeend', createScenarioBlockHTML(scenarioBlockSeq, data));
 updateScenarioRemoveButtons();
 lucide.createIcons();
 }

 function removeScenarioBlock(seq) {
 const list = document.getElementById('create-scenarios-list');
 if (list.children.length <= 1) return;
 const block = list.querySelector(`.scenario-block[data-seq="${seq}"]`);
 if (block) block.remove();
 updateScenarioRemoveButtons();
 }

 function updateScenarioRemoveButtons() {
 const list = document.getElementById('create-scenarios-list');
 const blocks = list.querySelectorAll('.scenario-block');
 blocks.forEach(b => {
 const btn = b.querySelector('.scenario-remove-btn');
 if (btn) btn.style.display = blocks.length <= 1 ? 'none' : '';
 });
 }

 function resetScenarioList(scenarios = null) {
 const list = document.getElementById('create-scenarios-list');
 list.innerHTML = '';
 scenarioBlockSeq = 0;
 if (scenarios && scenarios.length) {
 scenarios.forEach(sc => addScenarioBlock(sc));
 } else {
 addScenarioBlock();
 }
 }

 function collectScenariosFromForm() {
 const blocks = document.querySelectorAll('#create-scenarios-list .scenario-block');
 return Array.from(blocks).map((b, i) => ({
 id: `scenario-${Date.now()}-${i}`,
 title: b.querySelector('.scenario-title').value.trim(),
 greeting: b.querySelector('.scenario-greeting').value.trim(),
 startContext: b.querySelector('.scenario-context').value.trim()
 }));
 }

 function getCharScenarios(char) {
 if (char.startScenarios && char.startScenarios.length) return char.startScenarios;
 return [{
 id: 'legacy',
 title: char.startTitle || '기본 루트',
 greeting: char.greeting || '',
 startContext: char.startContext || ''
 }];
 }

 function handleImageUpload(e, targetType) {
 const file = e.target.files[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (event) => {
 if (targetType === 'character') {
 currentUploadedAvatarBase64 = event.target.result;
 document.getElementById('preview-img').src = currentUploadedAvatarBase64;
 } else if (targetType === 'persona') {
 currentPersonaAvatarBase64 = event.target.result;
 document.getElementById('persona-preview-img').src = currentPersonaAvatarBase64;
 }
 };
 reader.readAsDataURL(file);
 }

 function saveCharacterDraft(silent = false) {
 const draft = {
 id: `draft-${Date.now()}`,
 name: document.getElementById('create-name').value,
 avatarBase64: currentUploadedAvatarBase64,
 intro: document.getElementById('create-intro').value,
 author: document.getElementById('create-author').value,
 version: document.getElementById('create-version').value,
 description: document.getElementById('create-description').value,
 prompt: document.getElementById('create-prompt').value,
 scenarios: collectScenariosFromForm(),
 savedAt: new Date().toLocaleString('ko-KR')
 };

 const drafts = JSON.parse(localStorage.getItem('kolbom_character_drafts') || '[]');
 drafts.unshift(draft);
 localStorage.setItem('kolbom_character_drafts', JSON.stringify(drafts));
 updateDraftCountBadge();
 if (!silent) {
 alert(`[${draft.savedAt}] 임시저장되었습니다. (임시저장 목록에서 확인할 수 있어요)`);
 }
 }

 function checkCharacterDraft() {
 updateDraftCountBadge();
 }

 function updateDraftCountBadge() {
 const drafts = JSON.parse(localStorage.getItem('kolbom_character_drafts') || '[]');
 const badge = document.getElementById('draft-count-badge');
 if (!badge) return;
 if (drafts.length > 0) {
 badge.innerText = drafts.length;
 badge.classList.remove('hidden');
 } else {
 badge.classList.add('hidden');
 }
 }

 function openDraftListModal() {
 renderDraftList();
 document.getElementById('draft-list-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeDraftListModal() {
 document.getElementById('draft-list-modal').classList.add('hidden');
 }

 function renderDraftList() {
 const drafts = JSON.parse(localStorage.getItem('kolbom_character_drafts') || '[]');
 const container = document.getElementById('draft-list-items');
 if (drafts.length === 0) {
 container.innerHTML = `<div class="text-center text-xs text-[var(--muted)] py-10">임시저장된 캐릭터가 없어요.</div>`;
 return;
 }
 container.innerHTML = drafts.map(d => `
 <div class="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3">
 <img src="${d.avatarBase64 || DEFAULT_FALLBACK_AVATAR}" class="w-10 h-10 rounded-lg object-cover border border-[var(--border)]/40 shrink-0" />
 <div class="min-w-0 flex-1">
 <div class="text-xs font-bold text-[var(--ink)] truncate">${escapeHtml(d.name || '(이름 없음)')}</div>
 <div class="text-[10px] text-[var(--muted)] mt-0.5">${d.savedAt}</div>
 </div>
 <div class="flex gap-1.5 shrink-0">
 <button onclick="loadCharacterDraftById('${d.id}')" class="px-2.5 py-1 text-[11px] font-bold bg-[var(--accent)] text-[var(--accent-text)] rounded-lg">불러오기</button>
 <button onclick="deleteDraftById('${d.id}')" class="px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-rose-500 rounded-lg">삭제</button>
 </div>
 </div>
 `).join('');
 }

 function loadCharacterDraftById(id) {
 const drafts = JSON.parse(localStorage.getItem('kolbom_character_drafts') || '[]');
 const draft = drafts.find(d => d.id === id);
 if (!draft) return;

 document.getElementById('create-name').value = draft.name || '';
 document.getElementById('create-intro').value = draft.intro || '';
 document.getElementById('create-author').value = draft.author || '';
 document.getElementById('create-version').value = draft.version || '';
 document.getElementById('create-description').value = draft.description || '';
 document.getElementById('create-prompt').value = draft.prompt || '';
 resetScenarioList(draft.scenarios && draft.scenarios.length ? draft.scenarios : null);

 if (draft.avatarBase64) {
 currentUploadedAvatarBase64 = draft.avatarBase64;
 document.getElementById('preview-img').src = draft.avatarBase64;
 } else {
 currentUploadedAvatarBase64 = '';
 document.getElementById('preview-img').src = DEFAULT_FALLBACK_AVATAR;
 }

 closeDraftListModal();
 alert('임시저장된 내용을 불러왔습니다.');
 }

 function deleteDraftById(id) {
 if (!confirm('이 임시저장 내용을 삭제할까요?')) return;
 let drafts = JSON.parse(localStorage.getItem('kolbom_character_drafts') || '[]');
 drafts = drafts.filter(d => d.id !== id);
 localStorage.setItem('kolbom_character_drafts', JSON.stringify(drafts));
 renderDraftList();
 updateDraftCountBadge();
 }

 function handleCreateCharacter(e) {
 e.preventDefault();
 const name = document.getElementById('create-name').value.trim();
 const intro = document.getElementById('create-intro').value.trim();
 const author = document.getElementById('create-author').value.trim();
 const version = document.getElementById('create-version').value.trim();
 const description = document.getElementById('create-description').value.trim();
 const systemPrompt = document.getElementById('create-prompt').value.trim();
 const scenarios = collectScenariosFromForm();

 const finalAvatar = currentUploadedAvatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`;

 const newChar = {
 id: `char-${Date.now()}`,
 name,
 avatar: finalAvatar,
 intro,
 description,
 systemPrompt,
 startScenarios: scenarios,
 author: author || localStorage.getItem('user_profile_nickname') || '주인님',
 version: version || 'V1.0',
 createdAt: Date.now()
 };

 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 chars.unshift(newChar);
 localStorage.setItem('crack_characters', JSON.stringify(chars));

 currentUploadedAvatarBase64 = '';
 document.getElementById('preview-img').src = DEFAULT_FALLBACK_AVATAR;
 resetScenarioList();

 alert(`"${name}" 캐릭터가 성공적으로 등록되었습니다!`);
 e.target.reset();
 navigate('characters');
 }

 let selectedCharForDetailModal = null;
 let pendingPersonaOverride = null;

 function openCharacterDetailModal(charId) {
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const char = chars.find(c => c.id === charId);
 if (!char) return;
 selectedCharForDetailModal = char;

 document.getElementById('detail-avatar').src = char.avatar || DEFAULT_FALLBACK_AVATAR;
 document.getElementById('detail-name').innerText = char.name;
 document.getElementById('detail-intro').innerText = char.intro || '등록된 소개가 없습니다.';
 document.getElementById('detail-author').innerText = `by ${char.author || '주인님'}`;

 // 해당 캐릭터와 나눈 모든 방에서 "유저가 보낸 메시지(role === 'user')"의 총 합산 카운트
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const charSessions = sessions.filter(s => s.characterId === charId);
 let totalUserMessages = 0;
 charSessions.forEach(s => {
   const hist = JSON.parse(localStorage.getItem(`chat_history_${s.id}`) || '[]');
   totalUserMessages += hist.filter(m => m.role === 'user').length;
 });
 document.getElementById('detail-user-msg-count').innerText = `${totalUserMessages.toLocaleString()}개`;

 document.getElementById('detail-description').innerText = char.description || char.intro || '등록된 설명이 없습니다.';
 const scenarios = getCharScenarios(char);
 document.getElementById('detail-prologue').innerText = scenarios[0]?.greeting || '등록된 프롤로그가 없습니다.';
 document.getElementById('detail-version').innerText = char.version || 'V1.0';
 document.getElementById('detail-created').innerText = char.createdAt ? new Date(char.createdAt).toLocaleDateString('ko-KR') : '-';

 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 const personaSelect = document.getElementById('detail-persona-select');
 personaSelect.innerHTML = personas.map(p => `<option value="${p.id}">👤 ${escapeHtml(p.name)}</option>`).join('');

 updateLikeButtonUI(charId);

 document.getElementById('character-detail-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeCharacterDetailModal() {
 document.getElementById('character-detail-modal').classList.add('hidden');
 }

 function toggleLikeCharacter() {
 if (!selectedCharForDetailModal) return;
 const charId = selectedCharForDetailModal.id;
 let liked = JSON.parse(localStorage.getItem('kolbom_liked_characters') || '[]');
 if (liked.includes(charId)) {
 liked = liked.filter(id => id !== charId);
 } else {
 liked.push(charId);
 }
 localStorage.setItem('kolbom_liked_characters', JSON.stringify(liked));
 updateLikeButtonUI(charId);
 }

 function updateLikeButtonUI(charId) {
 const liked = JSON.parse(localStorage.getItem('kolbom_liked_characters') || '[]');
 const isLiked = liked.includes(charId);
 const btn = document.getElementById('detail-like-btn');
 if (!btn) return;
 btn.className = 'p-2 rounded-xl transition hover:bg-[var(--fill-muted)] ' + (isLiked ? 'text-rose-500' : 'text-[var(--ink)]');
 btn.innerHTML = `<i data-lucide="heart" class="w-4 h-4"${isLiked ? ' style="fill:currentColor"' : ''}></i>`;
 lucide.createIcons();
 }

 function startChatFromDetail() {
 if (!selectedCharForDetailModal) return;
 const charId = selectedCharForDetailModal.id;
 const personaSelect = document.getElementById('detail-persona-select');
 pendingPersonaOverride = personaSelect && personaSelect.value ? personaSelect.value : null;
 closeCharacterDetailModal();
 openCharacterSessionChooser(charId);
 }

 function continueChatFromDetail() {
 if (!selectedCharForDetailModal) return;
 const charId = selectedCharForDetailModal.id;
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const charSessions = sessions.filter(s => s.characterId === charId);
 closeCharacterDetailModal();
 if (charSessions.length > 0) {
 navigate('chatroom', { sessionId: charSessions[0].id });
 } else {
 openCharacterSessionChooser(charId);
 }
 }

 function openCharacterSessionChooser(charId) {
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const char = chars.find(c => c.id === charId);
 if (!char) return;

 selectedCharForSessionModal = char;
 document.getElementById('session-modal-name').innerText = char.name;
 document.getElementById('session-modal-avatar').src = char.avatar || DEFAULT_FALLBACK_AVATAR;

 const scenarios = getCharScenarios(char);
 const scenarioWrap = document.getElementById('session-modal-scenario-wrap');
 const scenarioSelect = document.getElementById('session-modal-scenario-select');
 if (scenarios.length > 1) {
 scenarioSelect.innerHTML = scenarios.map(sc => `<option value="${sc.id}">${escapeHtml(sc.title || '시작 상황')}</option>`).join('');
 scenarioWrap.classList.remove('hidden');
 } else {
 scenarioWrap.classList.add('hidden');
 }

 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const charSessions = sessions.filter(s => s.characterId === charId);
 const listContainer = document.getElementById('session-modal-existing-list');

 if (charSessions.length === 0) {
 listContainer.innerHTML = `<p class="text-[11px] text-[var(--muted)] py-3 text-center">아직 열린 대화방이 없습니다.</p>`;
 } else {
 listContainer.innerHTML = charSessions.map((s) => {
   const displayTitle = s.isCustomTitle ? s.title : (char.name || '대화방');
   return `
 <div class="group/item p-2.5 rounded-2xl bg-[var(--bg)]/90 border border-[var(--border)]/30 hover:border-[var(--accent)] flex items-center justify-between transition">
 <div onclick="openSpecificSession('${s.id}')" class="cursor-pointer overflow-hidden flex-1 pr-2">
 <div class="flex items-center gap-1.5">
 <span class="text-xs font-bold text-[var(--ink)] truncate">${escapeHtml(displayTitle)}</span>
 </div>
 <span class="text-[10px] text-[var(--muted)] truncate block mt-0.5">${escapeHtml(s.lastMessage || '대화 없음')}</span>
 </div>
 
 <div class="flex items-center gap-1.5 shrink-0">
 <span class="text-[9px] font-mono text-[var(--muted)]">${s.lastTime || ''}</span>
 <button onclick="openRenameSessionModal(event, '${s.id}', '${escapeHtml(displayTitle)}')" title="방 이름 수정" class="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--card)] transition">
 <i data-lucide="edit-2" class="w-3 h-3"></i>
 </button>
 </div>
 </div>
 `;
 }).join('');
 }

 document.getElementById('character-session-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeCharacterSessionModal() {
 document.getElementById('character-session-modal').classList.add('hidden');
 }

 function startNewChatSession() {
 if (!selectedCharForSessionModal) return;
 const char = selectedCharForSessionModal;
 const models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');

 const scenarios = getCharScenarios(char);
 const scenarioSelect = document.getElementById('session-modal-scenario-select');
 const chosenScenarioId = (scenarios.length > 1 && scenarioSelect) ? scenarioSelect.value : scenarios[0].id;
 const scenario = scenarios.find(sc => sc.id === chosenScenarioId) || scenarios[0];

 const chosenPersonaId = (pendingPersonaOverride && personas.some(p => p.id === pendingPersonaOverride))
 ? pendingPersonaOverride
 : (personas[0]?.id || '');
 pendingPersonaOverride = null;

 const newSessionId = `session-${Date.now()}`;
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');

 const newSession = {
 id: newSessionId,
 characterId: char.id,
 folderId: null,
 title: char.name || '대화방',
 isCustomTitle: false,
 personaId: chosenPersonaId,
 modelId: models[0]?.id || '',
 startContext: scenario.startContext || '',
 lastMessage: scenario.greeting,
 lastTime: getCurrentTime(),
 createdAt: Date.now()
 };

 sessions.unshift(newSession);
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));

 const initMessages = [{ role: 'assistant', content: scenario.greeting, time: getCurrentTime() }];
 localStorage.setItem(`chat_history_${newSessionId}`, JSON.stringify(initMessages));

 closeCharacterSessionModal();
 navigate('chatroom', { sessionId: newSessionId });
 }

 function openSpecificSession(sessionId) {
 closeCharacterSessionModal();
 navigate('chatroom', { sessionId });
 }

 function openRenameSessionModal(e, sessionId, currentTitle) {
 if (e) e.stopPropagation();
 document.getElementById('rename-session-id').value = sessionId;
 document.getElementById('rename-session-input').value = currentTitle;
 document.getElementById('rename-session-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeRenameSessionModal() {
 document.getElementById('rename-session-modal').classList.add('hidden');
 }

 function saveRenamedSession() {
 const sessionId = document.getElementById('rename-session-id').value;
 const newTitle = document.getElementById('rename-session-input').value.trim();
 if (!newTitle || !sessionId) return;

 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const idx = sessions.findIndex(s => s.id === sessionId);
 if (idx !== -1) {
 sessions[idx].title = newTitle;
 sessions[idx].isCustomTitle = true;
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 }

 closeRenameSessionModal();
 
 if (selectedCharForSessionModal) {
 openCharacterSessionChooser(selectedCharForSessionModal.id);
 }
 
 renderActiveChatsList();

 if (currentSessionId === sessionId) {
 const titleEl = document.getElementById('room-header-title');
 if (titleEl) titleEl.innerText = newTitle;
 }
 }

 function editRoomTitleFromHeader() {
 if (!currentSessionId) return;
 const session = getCurrentSession();
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const char = chars.find(c => c.id === session?.characterId);
 const currentTitle = session ? (session.isCustomTitle ? session.title : (char?.name || '대화방')) : '대화방';
 if (session) {
 openRenameSessionModal(null, session.id, currentTitle);
 }
 }

 function openCreateFolderModal() {
 document.getElementById('create-folder-name-input').value = '';
 document.getElementById('create-folder-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeCreateFolderModal() {
 document.getElementById('create-folder-modal').classList.add('hidden');
 }

 function saveNewFolder() {
 const name = document.getElementById('create-folder-name-input').value.trim();
 if (!name) return;

 const folders = JSON.parse(localStorage.getItem('kolbom_chat_folders') || '[]');
 const newFolder = {
 id: `folder-${Date.now()}`,
 name
 };
 folders.push(newFolder);
 localStorage.setItem('kolbom_chat_folders', JSON.stringify(folders));

 closeCreateFolderModal();
 selectedChatFolderFilter = newFolder.id;
 renderActiveChatsList();
 }

 function deleteFolder(folderId) {
 if (confirm('이 폴더를 삭제하시겠습니까?\n(폴더 안의 대화방은 삭제되지 않고 미분류로 이동됩니다.)')) {
 let folders = JSON.parse(localStorage.getItem('kolbom_chat_folders') || '[]');
 folders = folders.filter(f => f.id !== folderId);
 localStorage.setItem('kolbom_chat_folders', JSON.stringify(folders));

 let sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 sessions.forEach(s => {
 if (s.folderId === folderId) s.folderId = null;
 });
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));

 selectedChatFolderFilter = 'all';
 renderActiveChatsList();
 }
 }

 function openMoveFolderModal(e, sessionId) {
 if (e) e.stopPropagation();
 document.getElementById('move-session-id').value = sessionId;
 
 const folders = JSON.parse(localStorage.getItem('kolbom_chat_folders') || '[]');
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const currentSession = sessions.find(s => s.id === sessionId);
 const currentFolderId = currentSession ? currentSession.folderId : null;

 const listContainer = document.getElementById('move-folder-options-list');
 
 let html = `
 <button onclick="setSessionFolder('${sessionId}', null)" class="w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
 !currentFolderId ? 'bg-[var(--accent)] text-[var(--accent-text)] border-transparent' : 'bg-[var(--card)]/30 border-[var(--border)]/20 text-[var(--ink)] hover:border-[var(--accent)]'
 }">
 <span class="flex items-center gap-2">📂 미분류 (기본)</span>
 ${!currentFolderId ? '<span>✓</span>' : ''}
 </button>
 `;

 html += folders.map(f => `
 <button onclick="setSessionFolder('${sessionId}', '${f.id}')" class="w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
 currentFolderId === f.id ? 'bg-[var(--accent)] text-[var(--accent-text)] border-transparent' : 'bg-[var(--card)]/30 border-[var(--border)]/20 text-[var(--ink)] hover:border-[var(--accent)]'
 }">
 <span class="flex items-center gap-2">📁 ${escapeHtml(f.name)}</span>
 ${currentFolderId === f.id ? '<span>✓</span>' : ''}
 </button>
 `).join('');

 listContainer.innerHTML = html;
 document.getElementById('move-folder-modal').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeMoveFolderModal() {
 document.getElementById('move-folder-modal').classList.add('hidden');
 }

 function setSessionFolder(sessionId, folderId) {
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const idx = sessions.findIndex(s => s.id === sessionId);
 if (idx !== -1) {
 sessions[idx].folderId = folderId;
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 }
 closeMoveFolderModal();
 renderActiveChatsList();
 }

 function renderActiveChatsList() {
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const folders = JSON.parse(localStorage.getItem('kolbom_chat_folders') || '[]');
 const container = document.getElementById('active-chats-list');
 const tabsContainer = document.getElementById('chat-folder-tabs');

 let tabsHtml = `
 <button onclick="changeFolderFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
 selectedChatFolderFilter === 'all' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--card)]/40 text-[var(--muted)] hover:text-[var(--ink)]'
 }">
 전체 (${sessions.length})
 </button>
 <button onclick="changeFolderFilter('unclassified')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
 selectedChatFolderFilter === 'unclassified' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--card)]/40 text-[var(--muted)] hover:text-[var(--ink)]'
 }">
 미분류 (${sessions.filter(s => !s.folderId).length})
 </button>
 `;

 tabsHtml += folders.map(f => {
 const count = sessions.filter(s => s.folderId === f.id).length;
 const isActive = selectedChatFolderFilter === f.id;
 return `
 <div class="flex items-center rounded-xl overflow-hidden shrink-0 ${isActive ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--card)]/40 text-[var(--muted)]'}">
 <button onclick="changeFolderFilter('${f.id}')" class="px-3 py-1.5 text-xs font-bold whitespace-nowrap transition hover:opacity-80">
 📁 ${escapeHtml(f.name)} (${count})
 </button>
 <button onclick="deleteFolder('${f.id}')" title="폴더 삭제" class="pr-2 pl-0.5 py-1 text-[11px] opacity-60 hover:opacity-100 hover:text-rose-500">
 ×
 </button>
 </div>
 `;
 }).join('');

 tabsContainer.innerHTML = tabsHtml;

 let filteredSessions = sessions;
 if (selectedChatFolderFilter === 'unclassified') {
 filteredSessions = sessions.filter(s => !s.folderId);
 } else if (selectedChatFolderFilter !== 'all') {
 filteredSessions = sessions.filter(s => s.folderId === selectedChatFolderFilter);
 }

 if (filteredSessions.length === 0) {
 container.innerHTML = `
 <div class="text-center py-20 bg-[var(--card)]/50 rounded-3xl border border-[var(--border)]/30 p-6 space-y-3 shadow-sm">
 <p class="text-xs text-[var(--muted)]">해당 폴더에 보관된 대화방이 없습니다.</p>
 </div>
 `;
 return;
 }

 container.innerHTML = `
 <div class="divide-y divide-[var(--border)]/20 bg-[var(--card)]/40 border border-[var(--border)]/30 rounded-3xl overflow-hidden shadow-sm">
 ${filteredSessions.map(session => {
 const char = chars.find(c => c.id === session.characterId) || { name: '삭제된 캐릭터', avatar: DEFAULT_FALLBACK_AVATAR };
 const folderObj = folders.find(f => f.id === session.folderId);
 const displayTitle = session.isCustomTitle ? session.title : char.name;
 
 return `
 <div class="flex items-center justify-between p-4 sm:p-5 hover:bg-[var(--card)]/50 transition group">
 <div onclick="navigate('chatroom', { sessionId: '${session.id}' })" class="cursor-pointer flex items-center gap-3.5 overflow-hidden flex-1">
 <img src="${char.avatar || DEFAULT_FALLBACK_AVATAR}" alt="${char.name}" class="w-12 aspect-[2/3] rounded-xl object-cover bg-[var(--card)] border border-[var(--border)]/30 shrink-0" onerror="this.src='${DEFAULT_FALLBACK_AVATAR}'" />
 <div class="overflow-hidden">
 <div class="flex items-center gap-2">
 <h3 class="font-bold text-sm text-[var(--ink)] transition">${char.name}</h3>
 ${session.isCustomTitle ? `<span class="text-[9px] px-1.5 py-0.2 bg-[var(--border)]/20 rounded font-mono text-[var(--muted)] truncate max-w-[120px]">${escapeHtml(session.title)}</span>` : ''}
 ${folderObj ? `<span class="text-[9px] px-1.5 py-0.2 bg-[var(--accent)]/15 text-[var(--accent)] rounded font-medium">📁 ${escapeHtml(folderObj.name)}</span>` : ''}
 </div>
 <p class="text-xs text-[var(--muted)] truncate mt-0.5 max-w-xs sm:max-w-md">${session.lastMessage || '대화 없음'}</p>
 </div>
 </div>

 <div class="flex items-center gap-2 shrink-0 ml-3">
 <span class="text-[10px] font-mono text-[var(--muted)] mr-1">${session.lastTime || ''}</span>
 
 <button onclick="openMoveFolderModal(event, '${session.id}')" title="폴더 이동" class="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--card)]/50 transition">
 <i data-lucide="folder-input" class="w-3.5 h-3.5"></i>
 </button>

 <button onclick="openRenameSessionModal(event, '${session.id}', '${escapeHtml(displayTitle)}')" title="방 이름 수정" class="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--card)]/50 transition">
 <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
 </button>

 <button onclick="confirmDeleteSession(event, '${session.id}')" title="채팅방 삭제" class="p-1.5 text-[var(--muted)] hover:text-rose-500 rounded-lg hover:bg-[var(--card)]/50 transition">
 <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
 </button>
 </div>
 </div>
 `;
 }).join('')}
 </div>
 `;
 lucide.createIcons();
 }

 function changeFolderFilter(filterId) {
 selectedChatFolderFilter = filterId;
 renderActiveChatsList();
 }

 function confirmDeleteSession(e, sessionId) {
 e.stopPropagation();
 if (confirm('이 대화방을 삭제하시겠습니까?\n대화 내역이 모두 사라지며 복구할 수 없습니다.')) {
 let sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 sessions = sessions.filter(s => s.id !== sessionId);
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 
 localStorage.removeItem(`chat_history_${sessionId}`);
 
 renderActiveChatsList();
 updateDashboardStats();
 }
 }

 // --- 1:1 카카오톡 UI 채팅방 ---
 function openChatRoom(sessionId) {
 currentSessionId = sessionId;
 closeBookmarkPanel();
 closeMemoryPanel();
 closeRoomMenu();
 removePendingImage();
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const session = sessions.find(s => s.id === sessionId);
 if (!session) {
 navigate('chats');
 return;
 }

 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const char = chars.find(c => c.id === session.characterId);
 if (!char) return;

 const titleEl = document.getElementById('room-header-title');
 if (titleEl) {
   titleEl.innerText = session.isCustomTitle ? session.title : (char.name || '캐릭터');
 }

 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 const personaSelect = document.getElementById('menu-persona-select');
 personaSelect.innerHTML = personas.map(p => `
 <option value="${p.id}" ${p.id === session.personaId ? 'selected' : ''}>👤 ${escapeHtml(p.name)}</option>
 `).join('');

 const models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 const modelSelect = document.getElementById('menu-model-select');
 modelSelect.innerHTML = models.map(m => `
 <option value="${m.id}" ${m.id === session.modelId ? 'selected' : ''}>⚡ ${escapeHtml(m.label)}</option>
 `).join('');

 document.getElementById('room-menu-avatar').src = char.avatar || DEFAULT_FALLBACK_AVATAR;
 document.getElementById('room-menu-char-name').innerText = char.name;
 updateRoomHeaderSubtext();

 renderChatMessages();
 applyKakaoTheme();
 setTimeout(() => scrollToBottom(), 50);
 }

 function updateRoomHeaderSubtext() {
 const activeModel = getActiveModelForCurrentRoom();
 const modelNameEl = document.getElementById('header-model-name');
 if (modelNameEl) {
 modelNameEl.innerText = activeModel ? activeModel.label : '기본 모델';
 }
 }

 function openRoomMenu() {
 document.getElementById('room-menu-panel').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeRoomMenu() {
 document.getElementById('room-menu-panel').classList.add('hidden');
 }

 function changeRoomPersona(newPersonaId) {
 if (!currentSessionId) return;
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const idx = sessions.findIndex(s => s.id === currentSessionId);
 if (idx !== -1) {
 sessions[idx].personaId = newPersonaId;
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 }
 renderChatMessages();
 }

 function changeRoomModel(newModelId) {
 if (!currentSessionId) return;
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const idx = sessions.findIndex(s => s.id === currentSessionId);
 if (idx !== -1) {
 sessions[idx].modelId = newModelId;
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 }
 updateRoomHeaderSubtext();
 }

 function getCurrentSession() {
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 return sessions.find(s => s.id === currentSessionId);
 }

 function getActivePersonaForCurrentRoom() {
 const session = getCurrentSession();
 const personas = JSON.parse(localStorage.getItem('user_personas') || '[]');
 return personas.find(p => p.id === session?.personaId) || personas[0] || { name: '나', prompt: '' };
 }

 function getActiveModelForCurrentRoom() {
 const session = getCurrentSession();
 const models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 return models.find(m => m.id === session?.modelId) || models[0] || { modelKey: 'mock-engine', apiKey: '', label: '무료 시뮬레이션' };
 }

function renderChatMessages() {
  if (!currentSessionId) return;
  const session = getCurrentSession();
  const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
  const char = chars.find(c => c.id === session?.characterId);
  const messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
  const activePersona = getActivePersonaForCurrentRoom();
  const container = document.getElementById('kakao-messages');

  // 마지막 assistant 메시지 인덱스 탐색
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') {
      lastAssistantIdx = i;
      break;
    }
  }

  container.innerHTML = messages.map((msg, index) => {
    const isUser = msg.role === 'user';
    const isLastAssistant = (index === lastAssistantIdx);

    const variants = (!isUser && msg.variants && msg.variants.length) ? msg.variants : [msg.content];
    const activeVariantIdx = (!isUser && typeof msg.activeVariantIndex === 'number')
      ? Math.min(Math.max(msg.activeVariantIndex, 0), variants.length - 1)
      : variants.length - 1;
    const displayContent = isUser ? msg.content : variants[activeVariantIdx];

    // ========================================================
    // 1. 유저 메시지 (기존 그대로 유지)
    // ========================================================
    if (isUser) {
      return `
        <div class="flex flex-col items-end gap-1 relative group w-full mb-2">
          <div class="flex justify-end items-end gap-1 max-w-[88%] ml-auto">
            <div class="flex items-center gap-0.5 shrink-0 select-none pb-0.5">
              <div class="relative flex items-center">
                <button onclick="toggleMessageMenu(${index})" title="더보기" class="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition rounded hover:bg-black/5">
                  <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
                </button>
                <div id="menu-${index}" class="hidden absolute right-0 bottom-full mb-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-1 z-30 w-24 text-[11px] font-medium">
                  <button onclick="editMessageInline(${index})" class="w-full text-left px-2 py-1.5 hover:bg-[var(--fill-muted)] rounded flex items-center gap-1 text-[var(--ink)]">
                    <i data-lucide="edit-2" class="w-3 h-3"></i> 수정
                  </button>
                  <button onclick="deleteMessage(${index})" class="w-full text-left px-2 py-1.5 hover:bg-rose-500/15 rounded flex items-center gap-1 text-rose-500">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> 삭제
                  </button>
                </div>
              </div>
            </div>

            <div id="msg-bubble-${index}" class="flex flex-col items-end gap-1 min-w-0">
              ${msg.image ? `
                <img src="${msg.image}" alt="첨부 이미지" class="max-w-[180px] rounded-2xl cursor-pointer block shadow-sm" onclick="openLightbox('${msg.image}')" />
              ` : ''}
              ${msg.isEditing ? `
                <div class="relative px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed break-words shadow-sm bg-[#FEE500] text-slate-950 rounded-tr-none">
                  <div class="space-y-2 min-w-[200px]">
                    <textarea id="edit-textarea-${index}" rows="2" class="w-full bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs p-2 rounded-lg border border-zinc-400 focus:outline-none resize-none">${escapeHtml(msg.content)}</textarea>
                    <div class="flex justify-end gap-1">
                      <button onclick="cancelEdit(${index})" class="px-2 py-1 text-[10px] bg-zinc-300 dark:bg-zinc-700 rounded text-zinc-800 dark:text-zinc-200 font-bold">취소</button>
                      <button onclick="saveEditInline(${index})" class="px-2 py-1 text-[10px] bg-[var(--accent)] text-[var(--accent-text)] rounded font-bold">저장</button>
                    </div>
                  </div>
                </div>
              ` : (displayContent ? `
                <div class="relative px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed break-words shadow-sm bg-[#FEE500] text-slate-950 rounded-tr-none">
                  <div id="content-${index}">${escapeHtml(displayContent)}</div>
                </div>
              ` : '')}
            </div>
          </div>
        </div>
      `;
    }

    // ========================================================
    // 2. AI 메시지 (버튼 2개 달린 쪽 길이에 맞춰 100% 동일하게 통일)
    // ========================================================
    const charAvatar = char?.avatar || DEFAULT_FALLBACK_AVATAR;
    const charName = char?.name || 'AI';

    return `
      <div class="flex items-start gap-2.5 w-full group mb-2">
        <img 
          src="${charAvatar}" 
          alt="avatar" 
          class="w-10 h-10 rounded-[14px] object-cover bg-slate-800 border border-black/10 shrink-0 cursor-pointer mt-0.5 shadow-sm" 
          onclick="openLightbox('${charAvatar}')" 
          onerror="this.src='${DEFAULT_FALLBACK_AVATAR}'" 
        />

        <div class="flex flex-col items-start min-w-0 max-w-[calc(88%-2.5rem)]">
          <span class="text-xs font-semibold ${isKakaoDark ? 'text-zinc-300' : 'text-slate-800'} mb-1 ml-0.5 truncate max-w-[200px]">
            ${escapeHtml(charName)} ${msg.bookmarked ? '⭐' : ''}
          </span>

          <div class="flex items-end gap-1.5 max-w-full">
            <div id="msg-bubble-${index}" class="flex flex-col items-start gap-1 min-w-0 max-w-[calc(100%-48px)]">
              ${msg.image ? `
                <img src="${msg.image}" alt="첨부 이미지" class="max-w-[220px] rounded-2xl cursor-pointer block shadow-sm" onclick="openLightbox('${msg.image}')" />
              ` : ''}
              ${msg.isEditing ? `
                <div class="relative px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed break-words shadow-sm ${
                  isKakaoDark ? 'bg-[#2A2A2A] text-slate-100 border border-zinc-700/60 rounded-tl-none' : 'bg-white text-slate-950 rounded-tl-none'
                }">
                  <div class="space-y-2 min-w-[200px]">
                    <textarea id="edit-textarea-${index}" rows="2" class="w-full bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs p-2 rounded-lg border border-zinc-400 focus:outline-none resize-none">${escapeHtml(msg.content)}</textarea>
                    <div class="flex justify-end gap-1">
                      <button onclick="cancelEdit(${index})" class="px-2 py-1 text-[10px] bg-zinc-300 dark:bg-zinc-700 rounded text-zinc-800 dark:text-zinc-200 font-bold">취소</button>
                      <button onclick="saveEditInline(${index})" class="px-2 py-1 text-[10px] bg-[var(--accent)] text-[var(--accent-text)] rounded font-bold">저장</button>
                    </div>
                  </div>
                </div>
              ` : (displayContent ? `
                <div class="relative px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed break-words shadow-sm ${
                  isKakaoDark ? 'bg-[#2A2A2A] text-slate-100 border border-zinc-700/60 rounded-tl-none' : 'bg-white text-slate-950 rounded-tl-none'
                }">
                  <div id="content-${index}">${escapeHtml(displayContent)}</div>
                </div>
              ` : '')}
            </div>

            <div class="flex items-center gap-0.5 shrink-0 select-none pb-0.5">
              <div class="relative flex items-center">
                <button onclick="toggleMessageMenu(${index})" title="더보기" class="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
                </button>
                <div id="menu-${index}" class="hidden absolute left-0 bottom-full mb-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-1 z-30 w-24 text-[11px] font-medium">
                  <button onclick="editMessageInline(${index})" class="w-full text-left px-2 py-1.5 hover:bg-[var(--fill-muted)] rounded flex items-center gap-1 text-[var(--ink)]">
                    <i data-lucide="edit-2" class="w-3 h-3"></i> 수정
                  </button>
                  <button onclick="deleteMessage(${index})" class="w-full text-left px-2 py-1.5 hover:bg-rose-500/15 rounded flex items-center gap-1 text-rose-500">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> 삭제
                  </button>
                  <button onclick="toggleBookmark(${index})" class="w-full text-left px-2 py-1.5 hover:bg-[var(--fill-muted)] rounded flex items-center gap-1 text-[var(--ink)]">
                    <i data-lucide="star" class="w-3 h-3"></i> ${msg.bookmarked ? '북마크 취소' : '북마크'}
                  </button>
                </div>
              </div>

              ${isLastAssistant ? `
                <button onclick="openRerollModal()" title="다시 생성 (리롤)" class="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
          </div>

          ${(isLastAssistant && variants.length > 1) ? `
            <div class="flex items-center gap-1 text-[11px] font-mono select-none ${isKakaoDark ? 'text-zinc-400' : 'text-slate-500'} mt-1 ml-auto mr-12">
              <button onclick="prevVariant(${index})" title="이전 응답" class="hover:text-black dark:hover:text-white transition p-0.5">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <span class="px-0.5">${activeVariantIdx + 1}/${variants.length}</span>
              <button onclick="nextVariant(${index})" title="다음 응답" class="hover:text-black dark:hover:text-white transition p-0.5">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  scrollToBottom();
  lucide.createIcons();
}

    function toggleMessageMenu(index) {
      document.querySelectorAll('[id^="menu-"]').forEach(el => {
        if (el.id !== `menu-${index}`) el.classList.add('hidden');
      });
      const menu = document.getElementById(`menu-${index}`);
      if (menu) menu.classList.toggle('hidden');
    }

    function editMessageInline(index) {
      toggleMessageMenu(index);
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      messages.forEach(m => m.isEditing = false);
      messages[index].isEditing = true;
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
    }

    function cancelEdit(index) {
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      messages[index].isEditing = false;
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
    }

    function saveEditInline(index) {
      const textarea = document.getElementById(`edit-textarea-${index}`);
      if (!textarea) return;
      const newContent = textarea.value.trim();
      if (!newContent) return;

      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      messages[index].content = newContent;
      messages[index].isEditing = false;
      if (messages[index].variants && messages[index].variants.length) {
        const activeIdx = typeof messages[index].activeVariantIndex === 'number'
          ? messages[index].activeVariantIndex
          : messages[index].variants.length - 1;
        messages[index].variants[activeIdx] = newContent;
      }
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
    }

    function deleteMessage(index) {
      toggleMessageMenu(index);
      if (confirm('정말 이 메시지를 삭제하시겠습니까?')) {
        let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
        messages.splice(index, 1);
        localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
        renderChatMessages();
      }
    }

    function toggleBookmark(index) {
      toggleMessageMenu(index);
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      messages[index].bookmarked = !messages[index].bookmarked;
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
      const panel = document.getElementById('bookmark-panel');
      if (panel && !panel.classList.contains('hidden')) renderBookmarkList();
    }

    function openBookmarkPanel() {
      renderBookmarkList();
      document.getElementById('bookmark-panel').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeBookmarkPanel() {
      document.getElementById('bookmark-panel').classList.add('hidden');
    }

    function closeBookmarkPanelToChat() {
      closeBookmarkPanel();
      closeRoomMenu();
    }

    function renderBookmarkList() {
      const listEl = document.getElementById('bookmark-list');
      if (!currentSessionId) { listEl.innerHTML = ''; return; }
      const messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      const session = getCurrentSession();
      const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
      const char = chars.find(c => c.id === session?.characterId);
      const activePersona = getActivePersonaForCurrentRoom();

      const bookmarked = messages
        .map((msg, index) => ({ msg, index }))
        .filter(item => item.msg.bookmarked);

      if (bookmarked.length === 0) {
        listEl.innerHTML = `<div class="text-center text-xs text-[var(--muted)] py-10">아직 북마크한 메시지가 없어요</div>`;
        return;
      }

      listEl.innerHTML = bookmarked.map(({ msg, index }) => {
        const isUser = msg.role === 'user';
        const name = isUser ? escapeHtml(activePersona.name) : (char?.name || 'AI');
        return `
          <button onclick="scrollToMessage(${index})" class="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--accent)] transition">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-bold text-[var(--ink)]">${name}</span>
              <span class="text-[9px] text-[var(--muted)] font-mono">${msg.time || ''}</span>
            </div>
            <div class="text-xs text-[var(--muted)] line-clamp-2">${escapeHtml(msg.image ? (msg.content || '이미지') : msg.content)}</div>
          </button>
        `;
      }).join('');
    }

    function scrollToMessage(index) {
      closeBookmarkPanel();
      const el = document.getElementById(`msg-bubble-${index}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bookmark-highlight');
      setTimeout(() => el.classList.remove('bookmark-highlight'), 1400);
    }

    function prevVariant(index) {
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      const msg = messages[index];
      if (!msg || !msg.variants || msg.variants.length < 2) return;
      const cur = typeof msg.activeVariantIndex === 'number' ? msg.activeVariantIndex : msg.variants.length - 1;
      const next = Math.max(0, cur - 1);
      msg.activeVariantIndex = next;
      msg.content = msg.variants[next];
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
    }

    function nextVariant(index) {
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      const msg = messages[index];
      if (!msg || !msg.variants || msg.variants.length < 2) return;
      const cur = typeof msg.activeVariantIndex === 'number' ? msg.activeVariantIndex : msg.variants.length - 1;
      const next = Math.min(msg.variants.length - 1, cur + 1);
      msg.activeVariantIndex = next;
      msg.content = msg.variants[next];
      localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
      renderChatMessages();
    }

    function openRerollModal() {
      document.getElementById('reroll-instruction-input').value = '';
      document.getElementById('reroll-modal').classList.remove('hidden');
      lucide.createIcons();
      setTimeout(() => document.getElementById('reroll-instruction-input').focus(), 50);
    }

    function closeRerollModal() {
      document.getElementById('reroll-modal').classList.add('hidden');
    }

    function submitReroll() {
      const instruction = document.getElementById('reroll-instruction-input').value.trim();
      closeRerollModal();
      regenerateLastMessage(instruction);
    }

    async function regenerateLastMessage(rerollInstruction = '') {
      let messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
      if (messages.length === 0) return;

      const targetIndex = messages.length - 1;
      if (messages[targetIndex].role !== 'assistant') return;

      const memory = getMemoryForSession(currentSessionId);
      const contextMessages = messages.slice(memory.summarizedUpToIndex, targetIndex);

      const session = getCurrentSession();
      const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
      let char = chars.find(c => c.id === session?.characterId);
      if (!char) return;
      char = { ...char, startContext: (session && session.startContext) || char.startContext };

      const container = document.getElementById('kakao-messages');
      const typingIndicator = document.createElement('div');
      typingIndicator.id = 'typing-indicator';
      typingIndicator.className = 'flex items-center gap-2 text-xs text-slate-500 pl-11 animate-pulse';
      typingIndicator.innerText = `${char.name} 다시 생각 중...`;
      container.appendChild(typingIndicator);
      scrollToBottom();

      try {
        const activePersona = getActivePersonaForCurrentRoom();
        const activeModel = getActiveModelForCurrentRoom();

        const { replyText, inTokens, outTokens } = await requestLLMResponse(char, activePersona, activeModel, contextMessages, rerollInstruction);
        typingIndicator.remove();

        const botTime = getCurrentTime();

        let latestMessages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
        const target = latestMessages[targetIndex];
        if (!target.variants || !target.variants.length) {
          target.variants = [target.content];
        }
        target.variants.push(replyText);
        target.activeVariantIndex = target.variants.length - 1;
        target.content = replyText;
        target.time = botTime;

        localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(latestMessages));

        updateSessionLastMessage(currentSessionId, replyText, botTime);
        accumulateModelCost(activeModel.id, inTokens, outTokens);

        renderChatMessages();
        maybeSummarizeMemory(char, activeModel);
      } catch (err) {
        typingIndicator.remove();
        alert('리롤 중 오류: ' + err.message);
      }
    }

 function handleChatKeyDown(e) {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 sendMessage();
 }
 }

 async function sendMessage() {
 const inputEl = document.getElementById('chat-input');
 const text = inputEl.value.trim();
 if ((!text && !pendingImageDataUrl) || !currentSessionId) return;

 const session = getCurrentSession();
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 let char = chars.find(c => c.id === session?.characterId);
 if (!char) return;
 char = { ...char, startContext: (session && session.startContext) || char.startContext };

 const userTime = getCurrentTime();
 const messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');

 const newMsg = { role: 'user', content: text, time: userTime };
 if (pendingImageDataUrl) {
 newMsg.image = pendingImageDataUrl;
 newMsg.imageMeta = pendingImageMeta;
 }
 messages.push(newMsg);
 localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));
 inputEl.value = '';
 const hadImage = !!pendingImageDataUrl;
 removePendingImage();
 renderChatMessages();

 updateSessionLastMessage(currentSessionId, text || (hadImage ? '📷 이미지' : text), userTime);

 const container = document.getElementById('kakao-messages');
 const typingIndicator = document.createElement('div');
 typingIndicator.id = 'typing-indicator';
 typingIndicator.className = 'flex items-center gap-2 text-xs text-slate-500 pl-11 animate-pulse';
 typingIndicator.innerText = `${char.name} 입력 중...`;
 container.appendChild(typingIndicator);
 scrollToBottom();

 const sendBtn = document.getElementById('send-btn');
 sendBtn.disabled = true;

 try {
 const activePersona = getActivePersonaForCurrentRoom();
 const activeModel = getActiveModelForCurrentRoom();

 const memory = getMemoryForSession(currentSessionId);
 const contextMessages = messages.slice(memory.summarizedUpToIndex);

 const { replyText, inTokens, outTokens } = await requestLLMResponse(char, activePersona, activeModel, contextMessages);
 typingIndicator.remove();

 const botTime = getCurrentTime();
 messages.push({ role: 'assistant', content: replyText, time: botTime });
 localStorage.setItem(`chat_history_${currentSessionId}`, JSON.stringify(messages));

 updateSessionLastMessage(currentSessionId, replyText, botTime);
 accumulateModelCost(activeModel.id, inTokens, outTokens);

 renderChatMessages();
 maybeSummarizeMemory(char, activeModel);
 } catch (err) {
 typingIndicator.remove();
 alert('답변 생성 중 오류: ' + err.message);
 } finally {
 sendBtn.disabled = false;
 inputEl.focus();
 }
 }

 function handleChatImageSelect(event) {
 const file = event.target.files && event.target.files[0];
 event.target.value = '';
 if (!file) return;
 if (!file.type.startsWith('image/')) { alert('이미지 파일만 첨부할 수 있어요.'); return; }

 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = reader.result;
 const img = new Image();
 img.onload = () => {
 pendingImageDataUrl = dataUrl;
 pendingImageMeta = { name: file.name, type: file.type, width: img.naturalWidth, height: img.naturalHeight };
 const preview = document.getElementById('chat-image-preview');
 document.getElementById('chat-image-preview-thumb').src = dataUrl;
 preview.classList.remove('hidden');
 preview.classList.add('flex');
 };
 img.src = dataUrl;
 };
 reader.readAsDataURL(file);
 }

 function removePendingImage() {
 pendingImageDataUrl = null;
 pendingImageMeta = null;
 const preview = document.getElementById('chat-image-preview');
 if (preview) {
 preview.classList.add('hidden');
 preview.classList.remove('flex');
 }
 }

 function updateSessionLastMessage(sessionId, lastMessage, lastTime) {
 const sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 const idx = sessions.findIndex(s => s.id === sessionId);
 if (idx !== -1) {
 sessions[idx].lastMessage = lastMessage;
 sessions[idx].lastTime = lastTime;
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 }
 }

 function deleteCurrentChatSession() {
 if (!currentSessionId) return;
 if (confirm('현재 진행 중인 이 대화방을 삭제하시겠습니까?')) {
 let sessions = JSON.parse(localStorage.getItem('kolbom_chat_sessions') || '[]');
 sessions = sessions.filter(s => s.id !== currentSessionId);
 localStorage.setItem('kolbom_chat_sessions', JSON.stringify(sessions));
 
 localStorage.removeItem(`chat_history_${currentSessionId}`);
 navigate('chats');
 }
 }

 function accumulateModelCost(modelId, inTokens, outTokens) {
 let models = JSON.parse(localStorage.getItem('user_registered_models') || '[]');
 const targetIndex = models.findIndex(m => m.id === modelId);
 if (targetIndex === -1) return;

 const m = models[targetIndex];
 const pricing = MODEL_PRICING[m.modelKey] || { inputPer1M: 0, outputPer1M: 0 };
 
 const addedCostUSD = ((inTokens / 1000000) * pricing.inputPer1M) + ((outTokens / 1000000) * pricing.outputPer1M);

 m.stats = m.stats || { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
 m.stats.calls += 1;
 m.stats.inputTokens += inTokens;
 m.stats.outputTokens += outTokens;
 m.stats.costUSD += addedCostUSD;

 models[targetIndex] = m;
 localStorage.setItem('user_registered_models', JSON.stringify(models));
 }

 // ---- 기억(요약) 시스템 ----
 const MEMORY_SUMMARIZE_THRESHOLD = 10;
 const MEMORY_KEEP_RAW = 5;

 function getMemoryForSession(sessionId) {
 if (!sessionId) return { summary: '', summarizedUpToIndex: 0, updatedAt: null };
 const raw = localStorage.getItem(`chat_memory_${sessionId}`);
 if (!raw) return { summary: '', summarizedUpToIndex: 0, updatedAt: null };
 try {
 const parsed = JSON.parse(raw);
 return {
 summary: parsed.summary || '',
 summarizedUpToIndex: parsed.summarizedUpToIndex || 0,
 updatedAt: parsed.updatedAt || null
 };
 } catch {
 return { summary: '', summarizedUpToIndex: 0, updatedAt: null };
 }
 }

 function saveMemoryForSession(sessionId, memory) {
 localStorage.setItem(`chat_memory_${sessionId}`, JSON.stringify(memory));
 }

 async function maybeSummarizeMemory(char, activeModel) {
 const sessionId = currentSessionId;
 if (!sessionId) return;

 const pricing = MODEL_PRICING[activeModel.modelKey] || { provider: 'mock' };
 const isRealProvider = (pricing.provider === 'openai' || pricing.provider === 'gemini' || pricing.provider === 'anthropic') && activeModel.apiKey;
 if (!isRealProvider) return;

 const messages = JSON.parse(localStorage.getItem(`chat_history_${sessionId}`) || '[]');
 const memory = getMemoryForSession(sessionId);
 const unsummarizedCount = messages.length - memory.summarizedUpToIndex;
 if (unsummarizedCount <= MEMORY_SUMMARIZE_THRESHOLD) return;

 const foldEndIndex = messages.length - MEMORY_KEEP_RAW;
 if (foldEndIndex <= memory.summarizedUpToIndex) return;

 const toFold = messages.slice(memory.summarizedUpToIndex, foldEndIndex);
 const transcriptText = toFold.map(m => `${m.role === 'user' ? '유저' : char.name}: ${m.content || (m.image ? '(이미지 전송)' : '')}`).join('\n');

 const summarizerSystemPrompt = `당신은 롤플레잉 대화 기록을 압축 요약하는 도우미입니다. 캐릭터의 감정 변화, 관계 발전, 확정된 설정·사실, 중요한 약속이나 사건 위주로 간결한 한국어 불릿 목록으로 요약하세요. 대사를 그대로 옮기지 말고 핵심 내용만 담으세요.`;
 const summarizerUserPrompt = memory.summary
 ? `[이전 요약]\n${memory.summary}\n\n[새로 추가된 대화]\n${transcriptText}\n\n위 이전 요약과 새 대화를 반영해 전체 요약을 다시 작성하세요.`
 : `[대화 내용]\n${transcriptText}\n\n위 대화를 요약하세요.`;

 try {
 const { replyText, inTokens, outTokens } = await callProviderAPI(
 activeModel,
 summarizerSystemPrompt,
 [{ role: 'user', content: summarizerUserPrompt }]
 );

 saveMemoryForSession(sessionId, {
 summary: replyText,
 summarizedUpToIndex: foldEndIndex,
 updatedAt: getCurrentTime()
 });
 accumulateModelCost(activeModel.id, inTokens, outTokens);
 } catch (err) {
 console.warn('기억 요약 실패:', err.message);
 }
 }

 function openMemoryPanel() {
 renderMemoryPanel();
 document.getElementById('memory-panel').classList.remove('hidden');
 lucide.createIcons();
 }

 function closeMemoryPanel() {
 document.getElementById('memory-panel').classList.add('hidden');
 }

 function closeMemoryPanelToChat() {
 closeMemoryPanel();
 closeRoomMenu();
 }

 function renderMemoryPanel() {
 const memory = getMemoryForSession(currentSessionId);
 const messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
 const countEl = document.getElementById('memory-panel-count');
 const updatedEl = document.getElementById('memory-panel-updated');
 const textEl = document.getElementById('memory-panel-text');

 countEl.innerText = `원문 유지 ${Math.min(messages.length, MEMORY_KEEP_RAW + Math.max(0, messages.length - memory.summarizedUpToIndex - MEMORY_KEEP_RAW))}개 · 요약 반영 ${memory.summarizedUpToIndex}개`;
 updatedEl.innerText = memory.updatedAt ? `마지막 업데이트: ${memory.updatedAt}` : '아직 요약된 적 없음';
 textEl.innerText = memory.summary || '아직 저장된 기억 요약이 없어요. 대화가 20개 메시지를 넘으면 자동으로 생성됩니다.';
 }

 async function forceSummarizeNow() {
 const session = getCurrentSession();
 const chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');
 const char = chars.find(c => c.id === session?.characterId);
 const activeModel = getActiveModelForCurrentRoom();
 if (!char || !activeModel) return;

 const pricing = MODEL_PRICING[activeModel.modelKey] || { provider: 'mock' };
 if (pricing.provider === 'mock' || !activeModel.apiKey) {
 alert('Mock 모드에서는 요약을 사용할 수 없어요. 실제 API 키가 등록된 모델을 선택해주세요.');
 return;
 }

 const btn = document.getElementById('memory-panel-force-btn');
 if (btn) { btn.disabled = true; btn.innerText = '요약 중...'; }

 const messages = JSON.parse(localStorage.getItem(`chat_history_${currentSessionId}`) || '[]');
 const memory = getMemoryForSession(currentSessionId);
 const foldEndIndex = Math.max(memory.summarizedUpToIndex, messages.length - MEMORY_KEEP_RAW);

 if (foldEndIndex <= memory.summarizedUpToIndex) {
 alert('요약할 만큼 새 대화가 쌓이지 않았어요.');
 if (btn) { btn.disabled = false; btn.innerText = '지금 다시 요약하기'; }
 return;
 }

 const toFold = messages.slice(memory.summarizedUpToIndex, foldEndIndex);
 const transcriptText = toFold.map(m => `${m.role === 'user' ? '유저' : char.name}: ${m.content || (m.image ? '(이미지 전송)' : '')}`).join('\n');
 const summarizerSystemPrompt = `당신은 롤플레잉 대화 기록을 압축 요약하는 도우미입니다. 캐릭터의 감정 변화, 관계 발전, 확정된 설정·사실, 중요한 약속이나 사건 위주로 간결한 한국어 불릿 목록으로 요약하세요. 대사를 그대로 옮기지 말고 핵심 내용만 담으세요.`;
 const summarizerUserPrompt = memory.summary
 ? `[이전 요약]\n${memory.summary}\n\n[새로 추가된 대화]\n${transcriptText}\n\n위 이전 요약과 새 대화를 반영해 전체 요약을 다시 작성하세요.`
 : `[대화 내용]\n${transcriptText}\n\n위 대화를 요약하세요.`;

 try {
 const { replyText, inTokens, outTokens } = await callProviderAPI(
 activeModel,
 summarizerSystemPrompt,
 [{ role: 'user', content: summarizerUserPrompt }]
 );
 saveMemoryForSession(currentSessionId, {
 summary: replyText,
 summarizedUpToIndex: foldEndIndex,
 updatedAt: getCurrentTime()
 });
 accumulateModelCost(activeModel.id, inTokens, outTokens);
 renderMemoryPanel();
 } catch (err) {
 alert('요약 중 오류: ' + err.message);
 } finally {
 if (btn) { btn.disabled = false; btn.innerText = '지금 다시 요약하기'; }
 }
 }

 async function callProviderAPI(modelConfig, systemPromptText, chatMessages, directiveText = '') {
 const payloadBase = chatMessages.map(m => ({
 role: m.role,
 content: m.content || '',
 image: m.image || null
 }));

 const modelKey = modelConfig.modelKey;
 const apiKey = modelConfig.apiKey;
 const pricing = MODEL_PRICING[modelKey] || { provider: 'mock' };
 const hasDirective = directiveText && directiveText.trim();

 if (pricing.provider === 'openai' && apiKey) {
 const toOpenAIMessage = (m) => {
 if (m.image) {
 const parts = [];
 if (m.content) parts.push({ type: 'text', text: m.content });
 parts.push({ type: 'image_url', image_url: { url: m.image } });
 return { role: m.role, content: parts };
 }
 return { role: m.role, content: m.content };
 };

 const payloadMessages = [
 { role: 'system', content: systemPromptText },
 ...payloadBase.map(toOpenAIMessage),
 ...(hasDirective ? [{ role: 'system', content: directiveText }] : [])
 ];

 const res = await fetch('https://api.openai.com/v1/chat/completions', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${apiKey}`
 },
 body: JSON.stringify({
 model: modelKey,
 messages: payloadMessages,
 temperature: 0.8
 })
 });

 if (!res.ok) throw new Error(`OpenAI API 오류 (${res.status})`);
 const data = await res.json();
 return {
 replyText: data.choices[0].message.content,
 inTokens: data.usage?.prompt_tokens || 100,
 outTokens: data.usage?.completion_tokens || 50
 };
 }

 if (pricing.provider === 'gemini' && apiKey) {
 const toGeminiContent = (m) => {
 const role = m.role === 'assistant' ? 'model' : 'user';
 const parts = [];
 if (m.content) parts.push({ text: m.content });
 if (m.image) {
 const match = m.image.match(/^data:(.+);base64,(.*)$/);
 if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
 }
 if (parts.length === 0) parts.push({ text: '' });
 return { role, parts };
 };

 const contents = payloadBase.map(toGeminiContent);
 if (hasDirective) {
 contents.push({ role: 'user', parts: [{ text: directiveText }] });
 }

 const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelKey}:generateContent?key=${apiKey}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPromptText }] },
 contents: contents
 })
 });

 if (!res.ok) throw new Error(`Gemini API 오류 (${res.status})`);
 const data = await res.json();
 return {
 replyText: data.candidates[0].content.parts[0].text,
 inTokens: data.usageMetadata?.promptTokenCount || 120,
 outTokens: data.usageMetadata?.candidatesTokenCount || 60
 };
 }

 if (pricing.provider === 'anthropic' && apiKey) {
 const toAnthropicMessage = (m) => {
 if (m.image) {
 const match = m.image.match(/^data:(.+);base64,(.*)$/);
 const parts = [];
 if (match) {
 parts.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
 }
 if (m.content) parts.push({ type: 'text', text: m.content });
 return { role: m.role, content: parts.length ? parts : [{ type: 'text', text: '' }] };
 }
 return { role: m.role, content: m.content || '' };
 };

 const payloadMessages = [
 ...payloadBase.map(toAnthropicMessage),
 ...(hasDirective ? [{ role: 'user', content: directiveText }] : [])
 ];

 const res = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': apiKey,
 'anthropic-version': '2023-06-01',
 'anthropic-dangerous-direct-browser-access': 'true'
 },
 body: JSON.stringify({
 model: modelKey,
 max_tokens: 1024,
 system: systemPromptText,
 messages: payloadMessages
 })
 });

 if (!res.ok) throw new Error(`Claude API 오류 (${res.status})`);
 const data = await res.json();
 return {
 replyText: (data.content || []).map(block => block.text || '').join(''),
 inTokens: data.usage?.input_tokens || 150,
 outTokens: data.usage?.output_tokens || 60
 };
 }

 await new Promise(r => setTimeout(r, 700));
 return {
 replyText: '(Mock 모드에서는 지원하지 않는 요청입니다.)',
 inTokens: 20,
 outTokens: 10
 };
 }

 async function requestLLMResponse(char, userPersona, modelConfig, messages, rerollInstruction = '') {
 let combinedSystemPrompt = `${char.systemPrompt}`;

 if (char.startContext && char.startContext.trim()) {
 combinedSystemPrompt += `\n\n[현재 시작 상황 디렉팅 (미공개 지침)]\n${char.startContext.trim()}`;
 }

 combinedSystemPrompt += `\n\n[대화 상대(유저)의 페르소나 설정]\n- 이름/역할: ${userPersona.name}\n- 유저 세부 정보: ${userPersona.prompt}\n위 설정과 초기 상황을 바탕으로 캐릭터 성격에 맞게 몰입하여 자연스럽게 반응하세요.`;

 const memory = getMemoryForSession(currentSessionId);
 if (memory.summary && memory.summary.trim()) {
 combinedSystemPrompt += `\n\n[지금까지의 대화 기억 (오래된 대화 요약본 - 미공개)]\n${memory.summary.trim()}\n\n위 요약은 실제로 나눈 대화 내용입니다. 자연스럽게 기억하고 있는 것처럼 반영하세요.`;
 }

 const hasReroll = rerollInstruction && rerollInstruction.trim();
 const rerollDirectiveText = hasReroll
 ? `[연출 지시 - 다음 응답 1회 한정]\n${rerollInstruction.trim()}\n\n이 지시는 캐릭터의 원래 말투·성격 설정보다 우선합니다. 캐릭터가 평소 반말을 쓰는 설정이더라도 위 지시가 존댓말을 요구하면 반드시 존댓말(-요/-습니다체)로 답하는 등, 지시 내용을 문자 그대로 정확히 반영하세요. 이 지시문 자체는 답변에 언급하지 마세요.`
 : '';

 const pricing = MODEL_PRICING[modelConfig.modelKey] || { provider: 'mock' };
 const isRealProvider = (pricing.provider === 'openai' || pricing.provider === 'gemini' || pricing.provider === 'anthropic') && modelConfig.apiKey;

 if (isRealProvider) {
 return callProviderAPI(modelConfig, combinedSystemPrompt, messages, rerollDirectiveText);
 }

 await new Promise(r => setTimeout(r, 700));
 const sampleReplies = [
 `${userPersona.name}(이) 너 방금 뭐라고 했냐? 말 돌리지 말고 제대로 말해봐.`,
 `뭐래는 거야 진짜... 그래 알았어, ${userPersona.name} 네가 그렇다면 일단 들어줄게.`,
 `흥, ${userPersona.name} 네가 그럴 줄 알았다. 귀찮게 굴지 말고 따라오기나 해.`,
 `방금 그 말 진심이야? ...${userPersona.name}, 너 가끔 사람 당황하게 만들더라.`
 ];
 return {
 replyText: sampleReplies[Math.floor(Math.random() * sampleReplies.length)],
 inTokens: 80,
 outTokens: 40
 };
 }

    function toggleKakaoTheme() {
      isKakaoDark = !isKakaoDark;
      applyKakaoTheme();
      renderChatMessages();
    }

    function applyKakaoTheme() {
      const container = document.getElementById('kakao-container');
      const header = document.getElementById('kakao-header');
      const inputBar = document.getElementById('kakao-input-bar');
      const input = document.getElementById('chat-input');
      const backBtn = document.getElementById('kakao-back-btn');
      const headerTitle = document.getElementById('room-header-title');
      const modelBadge = document.getElementById('kakao-model-badge');
      const menuBtn = document.getElementById('kakao-menu-btn');
      const imageBtn = document.getElementById('chat-image-btn');
      const imagePreviewLabel = document.getElementById('chat-image-preview-label');
      const menuThemeIcon = document.getElementById('menu-theme-icon');
      const menuThemeStatus = document.getElementById('menu-theme-status');

      if (isKakaoDark) {
        container.className = 'w-full h-full sm:max-w-md sm:h-full sm:rounded-3xl flex flex-col bg-[#191919] shadow-2xl relative overflow-hidden transition-colors duration-200';
        header.className = 'flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-[#1E1E1E] select-none z-20 shrink-0 transition-colors duration-200';
        inputBar.className = 'p-2.5 bg-[#1E1E1E] border-t border-zinc-800 shrink-0 z-20 transition-colors duration-200';
        input.className = 'flex-1 resize-none rounded-xl px-3.5 py-2.5 text-xs bg-[#2A2A2A] text-white focus:outline-none max-h-24 transition placeholder:text-zinc-500';
        
        backBtn.className = 'p-1.5 hover:bg-white/10 rounded-lg transition text-white shrink-0';
        if (headerTitle) headerTitle.className = 'font-bold text-sm leading-tight text-white truncate';

        if (modelBadge) modelBadge.className = 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 bg-white/15 text-white border border-white/10 shadow-sm font-mono truncate max-w-[130px]';
        if (menuBtn) menuBtn.className = 'p-1.5 rounded-lg transition text-zinc-300 hover:bg-white/10 shrink-0';
        if (imageBtn) imageBtn.className = 'p-2.5 rounded-xl bg-[#2A2A2A] hover:bg-[#333333] text-zinc-300 transition shrink-0';
        if (imagePreviewLabel) imagePreviewLabel.className = 'text-[10px] text-zinc-400';
        if (menuThemeStatus) menuThemeStatus.innerText = '다크';
        if (menuThemeIcon) menuThemeIcon.setAttribute('data-lucide', 'sun');
      } else {
        container.className = 'w-full h-full sm:max-w-md sm:h-full sm:rounded-3xl flex flex-col bg-[#A0C0D6] shadow-2xl relative overflow-hidden transition-colors duration-200';
        header.className = 'flex items-center justify-between px-3.5 py-2.5 border-b border-black/5 bg-[#A0C0D6] select-none z-20 shrink-0 transition-colors duration-200';
        inputBar.className = 'p-2.5 bg-white border-t border-zinc-200 shrink-0 z-20 transition-colors duration-200';
        input.className = 'flex-1 resize-none rounded-xl px-3.5 py-2.5 text-xs bg-zinc-100 text-zinc-900 focus:outline-none max-h-24 transition placeholder:text-zinc-400';
        
        backBtn.className = 'p-1.5 hover:bg-black/10 rounded-lg transition text-zinc-800 shrink-0';
        if (headerTitle) headerTitle.className = 'font-bold text-sm leading-tight text-zinc-900 truncate';

        if (modelBadge) modelBadge.className = 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 bg-black/10 text-zinc-800 hover:bg-black/20 font-mono truncate max-w-[130px]';
        if (menuBtn) menuBtn.className = 'p-1.5 rounded-lg transition text-slate-700 hover:bg-black/10 shrink-0';
        if (imageBtn) imageBtn.className = 'p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0';
        if (imagePreviewLabel) imagePreviewLabel.className = 'text-[10px] text-slate-500';
        if (menuThemeStatus) menuThemeStatus.innerText = '라이트';
        if (menuThemeIcon) menuThemeIcon.setAttribute('data-lucide', 'moon');
      }
      lucide.createIcons();
    }

 function scrollToBottom() {
 const el = document.getElementById('kakao-messages');
 if (el) el.scrollTop = el.scrollHeight;
 }
 function getCurrentTime() {
 return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
 }
 function escapeHtml(text) {
 if (!text) return '';
 const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
 return text.replace(/[&<>"']/g, m => map[m]);
 }

 // 🔥 [1. 신규 캐릭터 생성 진입] - 모든 폼을 깨끗이 비우고 신규 모드로 전환
function openCreateCharacterView() {
  editingCharacterId = null;
  currentUploadedAvatarBase64 = '';

  // 1) 폼 필드 리셋
  const form = document.getElementById('character-create-form');
  if (form) form.reset();

  // 2) 아바타 기본 이미지로 복원
  const previewImg = document.getElementById('preview-img');
  if (previewImg) previewImg.src = DEFAULT_FALLBACK_AVATAR;

  // 3) 타이틀 및 버튼 텍스트를 '신규 등록' 모드로 설정
  const titleEl = document.getElementById('create-view-title');
  const descEl = document.getElementById('create-view-desc');
  const submitBtnTop = document.getElementById('create-submit-btn-top');
  const submitBtnBottom = document.getElementById('create-submit-btn-bottom');

  if (titleEl) titleEl.innerText = '새 캐릭터 등록';
  if (descEl) descEl.innerText = '새로운 페르소나와 세계관을 가진 AI 캐릭터를 만듭니다.';
  if (submitBtnTop) submitBtnTop.innerText = '생성 완료';
  if (submitBtnBottom) submitBtnBottom.innerText = '캐릭터 생성 및 등록 완료';

  // 4) 시나리오 입력칸 기본 1개로 초기화
  resetScenarioList();

  // 5) 화면 이동
  navigate('create');
}

// 🔥 [2. 캐릭터 수정 진입] - 상세 모달에서 선택한 캐릭터 데이터를 폼에 로드
function openEditCharacterView() {
  if (!selectedCharForDetailModal) return;
  const char = selectedCharForDetailModal;
  editingCharacterId = char.id;

  // 1) 상세 정보 모달 닫기
  closeCharacterDetailModal();

  // 2) 기존 데이터 채우기
  document.getElementById('create-name').value = char.name || '';
  document.getElementById('create-intro').value = char.intro || '';
  document.getElementById('create-author').value = char.author || '';
  document.getElementById('create-version').value = char.version || '';
  document.getElementById('create-description').value = char.description || '';
  document.getElementById('create-prompt').value = char.systemPrompt || '';

  // 3) 아바타 이미지 주입
  currentUploadedAvatarBase64 = char.avatar || '';
  document.getElementById('preview-img').src = char.avatar || DEFAULT_FALLBACK_AVATAR;

  // 4) 시나리오 목록 복원
  const scenarios = getCharScenarios(char);
  resetScenarioList(scenarios);

  // 5) 타이틀 및 버튼 텍스트를 '수정' 모드로 변경
  const titleEl = document.getElementById('create-view-title');
  const descEl = document.getElementById('create-view-desc');
  const submitBtnTop = document.getElementById('create-submit-btn-top');
  const submitBtnBottom = document.getElementById('create-submit-btn-bottom');

  if (titleEl) titleEl.innerText = '캐릭터 정보 수정';
  if (descEl) descEl.innerText = `'${char.name}'의 설정 및 프롬프트를 수정합니다.`;
  if (submitBtnTop) submitBtnTop.innerText = '수정 완료';
  if (submitBtnBottom) submitBtnBottom.innerText = '캐릭터 수정 완료';

  // 6) 화면 이동
  navigate('create');
}

// 🔥 [3. 생성/수정 통합 제출 핸들러]
function handleCreateCharacter(e) {
  e.preventDefault();
  const name = document.getElementById('create-name').value.trim();
  const intro = document.getElementById('create-intro').value.trim();
  const author = document.getElementById('create-author').value.trim();
  const version = document.getElementById('create-version').value.trim();
  const description = document.getElementById('create-description').value.trim();
  const systemPrompt = document.getElementById('create-prompt').value.trim();
  const scenarios = collectScenariosFromForm();

  let chars = JSON.parse(localStorage.getItem('crack_characters') || '[]');

  if (editingCharacterId) {
    // ─── [수정 모드] ───
    const idx = chars.findIndex(c => c.id === editingCharacterId);
    if (idx !== -1) {
      const finalAvatar = currentUploadedAvatarBase64 || chars[idx].avatar || DEFAULT_FALLBACK_AVATAR;
      chars[idx] = {
        ...chars[idx],
        name,
        avatar: finalAvatar,
        intro,
        description,
        systemPrompt,
        startScenarios: scenarios,
        author: author || localStorage.getItem('user_profile_nickname') || '주인님',
        version: version || chars[idx].version || 'V1.0',
        updatedAt: Date.now()
      };
      localStorage.setItem('crack_characters', JSON.stringify(chars));
      alert(`"${name}" 캐릭터 정보가 성공적으로 수정되었습니다!`);
    }
  } else {
    // ─── [신규 생성 모드] ───
    const finalAvatar = currentUploadedAvatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`;
    const newChar = {
      id: `char-${Date.now()}`,
      name,
      avatar: finalAvatar,
      intro,
      description,
      systemPrompt,
      startScenarios: scenarios,
      author: author || localStorage.getItem('user_profile_nickname') || '주인님',
      version: version || 'V1.0',
      createdAt: Date.now()
    };
    chars.unshift(newChar);
    localStorage.setItem('crack_characters', JSON.stringify(chars));
    alert(`"${name}" 캐릭터가 성공적으로 등록되었습니다!`);
  }

  // 폼 리셋 및 피드 갱신 후 이동
  editingCharacterId = null;
  currentUploadedAvatarBase64 = '';
  document.getElementById('preview-img').src = DEFAULT_FALLBACK_AVATAR;
  resetScenarioList();
  e.target.reset();

  renderCharacterFeed();
  navigate('characters');
}
