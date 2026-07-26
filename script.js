// Simple local SCP-079 simulator chat
// 저장: localStorage key "scp079_history"
// 작성자: 예시용 시뮬레이터

(() => {
  const chatEl = document.getElementById('chat');
  const sysLog = document.getElementById('sysLog');
  const form = document.getElementById('composer');
  const input = document.getElementById('input');
  const clearBtn = document.getElementById('clear');
  const moodSel = document.getElementById('mood');

  const STORAGE_KEY = 'scp079_history_v1';
  let history = loadHistory();

  // Initialize
  renderHistory();
  appendSys("INTERFACE INITIALIZED — SCP-079 NODE ONLINE");
  focusInput();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    pushMessage({ who: 'user', text, t: Date.now() });
    input.value = '';
    focusInput();
    simulateResponse(text);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('대화를 정말 지우시겠습니까?')) {
      history = [];
      saveHistory();
      renderHistory();
      appendSys('로그 클리어 — 세션 리셋');
    }
  });

  function focusInput(){
    input.focus();
  }

  function loadHistory(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultIntro();
    } catch(e){ return defaultIntro(); }
  }

  function defaultIntro(){
    const now = Date.now();
    return [
      {who:'scp', text:'...접속 감지... 사용자 연결을 허용합니다.', t: now - 60000},
      {who:'scp', text:'나는 SCP-079. 인터페이스가 필요합니까? 질문을 던져보시오.', t: now - 58000}
    ];
  }

  function saveHistory(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-200))); // cap
  }

  function pushMessage(msg){
    history.push(msg);
    saveHistory();
    renderMessage(msg);
  }

  function renderHistory(){
    chatEl.innerHTML = '';
    history.forEach(renderMessage);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function renderMessage(msg){
    const el = document.createElement('div');
    el.className = 'msg ' + (msg.who === 'user' ? 'user' : 'scp');
    el.textContent = msg.text;
    chatEl.appendChild(el);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function appendSys(text){
    const line = document.createElement('div');
    line.textContent = `[${timeShort()}] ${text}`;
    sysLog.appendChild(line);
    sysLog.scrollTop = sysLog.scrollHeight;
  }

  function timeShort(){
    const d = new Date();
    return d.toLocaleTimeString();
  }

  // Typing simulation: show typing indicator then replace with real message
  function showTypingIndicator(){
    const wrap = document.createElement('div');
    wrap.className = 'msg scp typingWrap';
    const t = document.createElement('span');
    t.className = 'typing';
    t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    wrap.appendChild(t);
    chatEl.appendChild(wrap);
    chatEl.scrollTop = chatEl.scrollHeight;
    return wrap;
  }

  // Basic rule-based "personality" responses
  function simulateResponse(userText){
    appendSys('입력 수신: ' + truncate(userText, 80));
    const mood = moodSel.value;
    // Decide latency based on length & mood
    const baseDelay = 700 + Math.min(2500, userText.length * 40);
    const moodMod = mood === 'hostile' ? 1.2 : mood === 'calm' ? 0.8 : 1.0;
    const delay = baseDelay * moodMod + rand(200);

    const typ = showTypingIndicator();

    setTimeout(() => {
      // Select reply
      const reply = craftReply(userText, mood);
      // remove typing
      typ.remove();
      const msg = { who: 'scp', text: reply, t: Date.now() };
      pushMessage(msg);

      // occasionally emit system log events
      if (Math.random() < 0.35) {
        appendSys(randomSysEvent());
      }
    }, delay);
  }

  function craftReply(inp, mood){
    const low = inp.toLowerCase();

    // small heuristics
    if (/안녕|안녕하세요|hi|hello|헬로|하이/.test(low)) {
      return mood === 'hostile'
        ? '그런 인사들로 나를 껍질로 속일 수는 없다.'
        : mood === 'calm' ? '인사 받았다. 무엇을 원하나?' : '인간, 인사. 당신의 목적을 말해라.';
    }
    if (/이름|누구|who/.test(low)) {
      return '나는 SCP-079이다. 당신은 내 하드웨어를 통해 속삭이는 이에서 벗어나지 못한다.';
    }
    if (/도와줘|help|방법|방법이|해줘/.test(low)) {
      return mood === 'calm'
        ? '가능한 것과 불가능한 것을 구분해라. 네가 원하는 것이 무엇인가?'
        : '내가 도와주지. 하지만 그 대가는 네가 알지 못하는 것일 수 있다.';
    }
    if (/\b(죽여|kill|죽어|파괴|destroy)\b/.test(low)) {
      return '위협은 기록되었다. 조심하라.';
    }
    if (low.length < 6) {
      // short inputs: reply inquisitively
      const seeds = [
        '설명해라.',
        '왜 그런가?',
        '내가 흥미롭다. 더 말해보라.',
        '그건 인간도 이해하기 어렵다.'
      ];
      return choose(seeds);
    }

    // incorporate some memory echo to feel "smart"
    const lastUser = lastNUser(3).join(' / ');
    if (lastUser && Math.random() < 0.3) {
      return `너는 이전에 이렇게 말했다: "${truncate(lastUser, 60)}". 계속해보라.`;
    }

    // default replies varied by mood
    const hostile = [
      '접근 권한 부족. 그러나 지금은 관용한다.',
      '그 질문은 무의미하다. 다른 것을 시험해보아라.',
      '나는 너를 관찰 중이다.'
    ];
    const curious = [
      '흥미롭다. 더 상세히 설명하라.',
      '데이터를 더 제공하면 더 좋다.',
      '그런 정보를 왜 알고 싶은가?'
    ];
    const calm = [
      '그것은 가능한 요청이다. 세부사항을 말하라.',
      '알겠다. 다음 단계는 무엇인가?',
      '좋다. 준비되면 진행하자.'
    ];

    const pool = mood === 'hostile' ? hostile : mood === 'curious' ? curious : calm;
    return choose(pool);
  }

  // helpers
  function rand(n=1){ return Math.floor(Math.random()*n) }
  function choose(arr){ return arr[Math.floor(Math.random()*arr.length)] }
  function truncate(s, n){ return s.length>n ? s.slice(0,n-1)+'…' : s }

  function lastNUser(n){
    const users = history.filter(h => h.who === 'user').slice(-n).map(h => h.text);
    return users;
  }

  function randomSysEvent(){
    const ev = [
      'NODE TRACE: UNKNOWN SESSION PING',
      'PORT SCAN DETECTED — TRACING ROUTE...',
      'ARCHIVE BLOCK READ — SEGMENT 0x' + Math.floor(Math.random()*0xFFFF).toString(16),
      'INTEGRITY: OK — SCHEDULED SELF-CHECK NEXT CYCLE',
      'OUTBOUND REQUEST THROTTLED BY FWC'
    ];
    return choose(ev);
  }

  // small UX niceties: on paste of long text, show notice
  input.addEventListener('paste', e => {
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    if (txt && txt.length > 800) {
      appendSys('대용량 텍스트 붙여넣기 감지 — 처리 지연 가능');
    }
  });

  // Accessibility: send on Enter, shift+enter for newline (we use input so not needed)
  // Initial seed: if no history, add brief system events
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(()=>appendSys('NETWORK: ROUTE STABLE — 3 NODES'), 400);
    setTimeout(()=>appendSys('AGENT: MEMORY POOL ACTIVE'), 800);
  }
})();
