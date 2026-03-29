// [아키텍처 대공사]: 이미지를 일절 쓰지 않고 100% SVG(Pure Vector) 코드로 렌더링.
// 외부 이미지 변수나 해상도 제약을 없애 이격률 0%를 달성합니다.
const SHOP_ITEMS = [
  { id: 1, name: '인싸 뿔테안경', price: 300, icon: '👓' },
  { id: 2, name: '합격 기원 학사모', price: 800, icon: '🎓' },
  { id: 3, name: '면접용 깔끔 정장', price: 1200, icon: '👔' },
  { id: 4, name: '집중 보스 헤드셋', price: 500, icon: '🎧' },
];

const QUIZ_DATA = {
  question: "ISA(개인종합자산관리계좌)의 의무가입기간은 몇 년일까요?",
  options: ["1년", "3년", "5년", "제한없음"],
  answerIndex: 1, // 3년
  reward: 10,
  badgeReward: 100
};

const BADGE_DATA = {
  'quiz_master': { id: 'quiz_master', name: '금융 지식왕', icon: '👑', reward: 100, desc: '첫 금융 퀴즈 정답' },
  'receipt_auth': { id: 'receipt_auth', name: '알뜰살뜰 인증', icon: '🧾', reward: 200, desc: '첫 교육비 인증' }
};

const state = {
  currentView: 'login',
  storyIndex: 0,
  selectedCharacter: null, // 'byeoldori' or 'byeolsongi'
  userProfile: null,
  points: 1500, 
  ownedItems: [], 
  equippedItems: [], 
  badges: [], // 'quiz_master', 'receipt_auth'
  dailyQuizCompleted: false,
  receiptAuthCount: 0,
  missions: [
    { id: 1, text: 'IT/개발 뉴스 기사 1건 스크랩하기', completed: false, points: 50 },
    { id: 2, text: '스터디 앱에서 1시간 이상 집중하기', completed: false, points: 100 }
  ],
  studyPhotos: [],
  communityPosts: [
    { id: 1, author: '합격기원', content: '하반기 하나은행 자소서 스터디 구합니다! (비대면)', likes: 12, comments: 4 },
    { id: 2, author: '면접왕별돌', content: 'PT 면접 팁 공유합니다. 꼭 읽어보세요.', likes: 45, comments: 12 }
  ]
};

const views = {
  'login': renderLogin,
  'story': renderStory,
  'character_select': renderCharacterSelect,
  'onboarding': renderOnboarding,
  'home': renderHome,
  'study': renderStudy,
  'community': renderCommunity,
  'marketplace': renderMarketplace,
  'quiz': renderQuiz
}

const appContainer = document.querySelector('#app')

function renderApp() {
  appContainer.innerHTML = '';
  const viewElement = document.createElement('div');
  viewElement.className = 'view-container';
  viewElement.innerHTML = views[state.currentView]();
  
  appContainer.appendChild(viewElement);

  const noNavViews = ['login', 'story', 'character_select', 'onboarding'];
  if(!noNavViews.includes(state.currentView)) {
    appContainer.appendChild(renderBottomNav());
    attachNavListeners();
  }
  attachViewListeners();

  // [Canvas 렌더링 호출]: 뷰가 DOM에 붙은 직후 Canvas에 이미지를 그림
  if (state.currentView === 'home') {
    drawAvatarOnCanvas('avatar-canvas-home', state.equippedItems);
  } else if (state.currentView === 'marketplace') {
    drawAvatarOnCanvas('avatar-canvas-market', state.equippedItems);
  }
}

function renderBottomNav() {
  const nav = document.createElement('div');
  nav.className = 'bottom-nav';
  nav.innerHTML = `
    <div class="nav-item ${['home', 'marketplace'].includes(state.currentView) ? 'active' : ''}" data-view="home">
      <div class="nav-icon" style="font-size: 24px;">🏠</div>
      <span style="font-size: 11px; margin-top: 2px;">홈</span>
    </div>
    <div class="nav-item ${state.currentView === 'study' ? 'active' : ''}" data-view="study">
      <div class="nav-icon" style="font-size: 24px;">⏱️</div>
      <span style="font-size: 11px; margin-top: 2px;">스터디</span>
    </div>
    <div class="nav-item ${state.currentView === 'community' ? 'active' : ''}" data-view="community">
      <div class="nav-icon" style="font-size: 24px;">💬</div>
      <span style="font-size: 11px; margin-top: 2px;">커뮤니티</span>
    </div>
  `;
  return nav;
}

function attachNavListeners() {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      state.currentView = item.getAttribute('data-view');
      renderApp();
    });
  });
}

// --------------------------------------------------------
// [아키텍처 대공사]: HTML5 Canvas 2D 렌더링 시스템 교체 (추천 1위 방식)
// 여러 장의 파츠(아바타 베이스, 안경, 정장 등) 에셋들을 하나의 Canvas 도화지에 순서대로 겹쳐 그립니다.
// 이 코드를 통해 Z-Index 버그 등 이격률을 0%로 만들 수 있고, 향후 Canvas.toDataURL()을 통해 하나의 프로필 이미지 추출도 용이합니다.
// --------------------------------------------------------

// 임시 이미지 에셋 (현재는 시각적 유지를 위해 DataURI SVG이나, 차후 실제 .png나 .webp 파일 경로 텍스트로 교체하시면 됩니다. 예: "./assets/items/base.png")
const ASSETS = {
  base: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><g id="base-character"><path d="M70,140 C70,220 50,260 60,280 C70,300 90,280 90,260 C90,240 110,240 110,260 C110,280 130,300 140,280 C150,260 130,220 130,140 Z" fill="%23fff" stroke="%23333" stroke-width="6" stroke-linejoin="round"/><path d="M60,150 C40,160 30,200 40,220 C50,240 60,210 65,190" fill="%23fff" stroke="%23333" stroke-width="6" stroke-linecap="round"/><path d="M140,150 C160,160 170,200 160,220 C150,240 140,210 135,190" fill="%23fff" stroke="%23333" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="110" r="55" fill="%23fff" stroke="%23333" stroke-width="6"/><path d="M100,20 L110,40 L135,45 L115,60 L120,85 L100,70 L80,85 L85,60 L65,45 L90,40 Z" fill="%23008485" stroke="%23005a5a" stroke-width="4" stroke-linejoin="round"/><circle cx="80" cy="110" r="4" fill="%23333"/><circle cx="120" cy="110" r="4" fill="%23333"/><circle cx="65" cy="120" r="6" fill="%23ffb8b8" opacity="0.6"/><circle cx="135" cy="120" r="6" fill="%23ffb8b8" opacity="0.6"/><path d="M90,125 Q100,135 110,125" fill="none" stroke="%23333" stroke-width="4" stroke-linecap="round"/></g></svg>',
  item_1: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="110" r="16" fill="none" stroke="%23222" stroke-width="6"/><circle cx="120" cy="110" r="16" fill="none" stroke="%23222" stroke-width="6"/><line x1="96" y1="110" x2="104" y2="110" stroke="%23222" stroke-width="6"/><line x1="64" y1="110" x2="40" y2="105" stroke="%23222" stroke-width="4"/><line x1="136" y1="110" x2="160" y2="105" stroke="%23222" stroke-width="4"/></svg>',
  item_2: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M60,35 L60,55 C60,65 140,65 140,55 L140,35 Z" fill="%23333"/><polygon points="100,10 40,30 100,50 160,30" fill="%23222"/><path d="M100,30 Q140,40 145,60" fill="none" stroke="%23f4b41a" stroke-width="3"/><path d="M142,60 L148,60 L145,75 Z" fill="%23f4b41a"/><circle cx="100" cy="30" r="4" fill="%23f0a"/></svg>',
  item_3: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M70,140 C70,200 65,220 75,230 L125,230 C135,220 130,200 130,140 Z" fill="%232c3e50"/><polygon points="85,140 100,170 115,140" fill="%23ecf0f1"/><polygon points="97,155 103,155 100,190" fill="%23c0392b"/></svg>',
  item_4: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><path d="M40,110 C40,30 160,30 160,110" fill="none" stroke="%23444" stroke-width="8"/><rect x="30" y="85" width="20" height="50" rx="10" fill="%23ff4757"/><rect x="150" y="85" width="20" height="50" rx="10" fill="%23ff4757"/></svg>'
};

function drawAvatarOnCanvas(canvasId, equippedIds) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // 브라우저 렌더링 최적화를 위해 이미지 품질 보정
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. 캔버스 초기화 (이전 프레임 지우기)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. 그릴 레이어(에셋)의 순서를 배열로 정의 
  // (스택의 아래에 깔릴 요소부터 먼저. 예: 몸통 -> 정장 -> 헤드셋 -> 안경)
  const layersToDraw = ['base'];
  if (equippedIds.includes(3)) layersToDraw.push('item_3');
  if (equippedIds.includes(2)) layersToDraw.push('item_2');
  if (equippedIds.includes(4)) layersToDraw.push('item_4');
  if (equippedIds.includes(1)) layersToDraw.push('item_1');

  // 3. 이미지 무손실 병렬 로딩 후 순서대로 그리기
  const images = {};
  let loadedCount = 0;

  layersToDraw.forEach(layerKey => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 외부 URL 사용 시 CORS 오류 방지
    img.src = ASSETS[layerKey] || `./assets/items/${layerKey}.png`; // 실제 에셋 경로 규칙
    
    img.onload = () => {
      images[layerKey] = img;
      loadedCount++;
      
      // 모든 레이어가 로드된 후 그리기 (깜빡임과 순서 뒤바뀜 방지)
      if (loadedCount === layersToDraw.length) {
        layersToDraw.forEach(key => {
          // 좌표 (0,0)에 캔버스 꽉 차게 렌더링
          ctx.drawImage(images[key], 0, 0, canvas.width, canvas.height);
        });
      }
    };
  });
}

// --- Views HTML ---
function renderLogin() {
  return `
    <div style="padding: 40px 20px; display:flex; flex-direction:column; align-items:center; height:100%; background:#fff;">
      <h1 style="font-size:32px; font-weight:lighter; letter-spacing:1px; margin-top:40px; margin-bottom:40px; color:#222;"><span style="font-weight:bold;">하나랑</span> Cheer Up!</h1>
      
      <div style="flex:1; display:flex; justify-content:center; align-items:center; width:100%;">
        <!-- 메인 캐릭터 일러스트 -->
        <div style="width:100%; max-width:320px; display:flex; justify-content:center; align-items:center;">
          <img src="./assets/login_main.png?v=12345" alt="HANA DROP Main" style="width:100%; height:auto; object-fit:contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'280\\' height=\\'240\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23f0f8f8\\' rx=\\'30\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'14\\' fill=\\'%23008485\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>이미지를 assets/login_main.png 폴더에 저장해주세요!</text></svg>'">
        </div>
      </div>

      <div style="width:100%; display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
        <button class="login-btn" style="background:#008485; color:#fff; border:none; padding:15px; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px;">
          <span style="font-size:18px;">🌿</span> 하나은행 로그인
        </button>
        <button class="login-btn" style="background:#000; color:#fff; border:none; padding:15px; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px;">
          <span style="font-size:18px;">🍎</span> Apple로 로그인
        </button>
        <button class="login-btn" style="background:#f5f5f5; color:#333; border:1px solid #ddd; padding:15px; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px;">
          <span style="font-size:18px;">G</span> 구글 로그인
        </button>
        <button class="login-btn" style="background:#FEE500; color:#000; border:none; padding:15px; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px;">
          <span style="font-size:18px;">💬</span> 카카오 로그인
        </button>
      </div>
      <div style="color:#999; font-size:14px; text-decoration:underline; cursor:pointer; margin-bottom:20px;">ID로 로그인</div>
    </div>
  `;
}

function renderStory() {
  const charName = state.selectedCharacter === 'byeorsongi' ? '별송이는' : '별돌이는';

  const storyData = [
    {
      imgSrc: './assets/story1.png',
      text: '아주 먼 우주에<br>행복으로 가득 찬 별,<br>마카리오스가 있었어'
    },
    {
      imgSrc: './assets/story2.png',
      text: '그곳에는<br>행복이 모이면 차오르는<br>"행복의 샘"이 있었지.'
    },
    {
      imgSrc: './assets/story3.png',
      text: `${charName}<br>더 큰 세상을 보고 싶어<br><br>샘물을 연료로 우주 여행을 떠났고<br>그만 지구에 불시착하게 돼.`
    },
    {
      imgSrc: './assets/story4.png',
      text: '남은 힘으로<br>작은 샘 하나를 만들었지만,<br>이곳에서는 쉽게 채워지지 않았어.'
    },
    {
      imgSrc: './assets/story5.png',
      text: '그러다 알게 되었어.<br>지구에서는<br>노력, 성장, 도전의 순간들이<br>행복 에너지로 바뀐다는 걸.'
    },
    {
      imgSrc: './assets/story6.png',
      text: '그래서 우리는<br>작은 에너지, 하나드롭을 모으기 시작했어.'
    },
    {
      imgSrc: './assets/story7.png',
      text: '“하나드롭을 모아,<br>너만의 ‘행복의 샘’을 완성해봐.”<br><br>그 과정 속에서 우리는<br>너의 여정을 함께 응원할게.'
    }
  ];
  
  const current = storyData[state.storyIndex];

  return `
    <div id="story-container" style="padding: 24px; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; background: linear-gradient(180deg, #1a2a6c, #11998e); color:white; cursor:pointer; text-align:center;">
      <div style="flex:1; display:flex; justify-content:center; align-items:center; width:100%; padding-bottom: 20px;">
        <!-- 스토리 일러스트 이미지 -->
        <div style="width:100%; max-width:340px; display:flex; justify-content:center; align-items:center; animation: fadeIn 1.2s ease-out forwards;">
          <img src="${current.imgSrc}?v=1" alt="스토리 씬" style="width:100%; max-height:42vh; object-fit:contain; border-radius:16px; filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));">
        </div>
      </div>
      
      <div style="height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10;">
        <p style="font-size:17px; line-height:1.6; font-weight:300; letter-spacing:0.5px; margin-bottom: 10px; word-break:keep-all;">
          ${current.text}
        </p>
      </div>
      <div style="font-size:12px; opacity:0.6; margin-top:20px;">화면을 탭하여 다음으로 넘어가기 (${state.storyIndex + 1}/${storyData.length})</div>
    </div>
  `;
}

function renderCharacterSelect() {
  return `
    <div style="padding: 40px 20px; display:flex; flex-direction:column; align-items:center; height:100%; background:#fafafa;">
      <h2 style="font-size:26px; font-weight:300; margin-top:60px; margin-bottom:50px; text-align:center; line-height:1.4; color:#222; letter-spacing:-0.5px;">나만의 별돌이<br>생성하기</h2>
      
      <div style="display:flex; gap:15px; width:100%; justify-content:center; flex:1; padding-top:20px;">
        <div class="char-select" data-char="byeoldori" style="flex:1; display:flex; flex-direction:column; align-items:center; cursor:pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" style="transition:0.2s;">
          <div style="width:100%; max-width:140px; aspect-ratio:3/4; display:flex; justify-content:center; align-items:end;">
            <img src="./assets/byeordori.png?v=1" alt="별돌이" style="width:100%; max-height:100%; object-fit:contain; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.1));" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'140\\' height=\\'200\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23eee\\' rx=\\'20\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'12\\' fill=\\'%23888\\' text-anchor=\\'middle\\'>assets/byeordori.png</text></svg>'">
          </div>
          <p style="margin-top:30px; font-size:22px; font-weight:300; color:#222; letter-spacing:-0.5px;">별돌이</p>
        </div>
        
        <div class="char-select" data-char="byeolsongi" style="flex:1; display:flex; flex-direction:column; align-items:center; cursor:pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" style="transition:0.2s;">
          <div style="width:100%; max-width:140px; aspect-ratio:3/4; display:flex; justify-content:center; align-items:end;">
            <img src="./assets/byeorsongi.png?v=1" alt="별송이" style="width:100%; max-height:100%; object-fit:contain; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.1));" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'140\\' height=\\'200\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23eee\\' rx=\\'20\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'12\\' fill=\\'%23888\\' text-anchor=\\'middle\\'>assets/byeorsongi.png</text></svg>'">
          </div>
          <p style="margin-top:30px; font-size:22px; font-weight:300; color:#222; letter-spacing:-0.5px;">별송이</p>
        </div>
      </div>
    </div>
  `;
}

function renderOnboarding() {
  return `
    <div style="padding: 30px; display:flex; flex-direction:column; justify-content:center; height:100%; background: linear-gradient(135deg, var(--hana-light-green), #ffffff)">
      <h1 style="font-size:24px; font-weight:bold; margin-bottom: 20px; color: var(--hana-green); line-height: 1.4;">나만의 별돌이<br>크리에이터</h1>
      <p style="color:var(--text-secondary); margin-bottom:30px; font-size:14px;">당신의 취업 목표에 맞는 우대금리를 위해 한 가지만 답해주세요.</p>
      
      <div class="q-box" style="margin-bottom:20px; background:#fff; padding:20px; border-radius: var(--border-radius-md); box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <h3 style="margin-bottom:15px; font-size:16px;">어떤 스터디 트랙이 필요하신가요?</h3>
        <div style="font-size:14px; line-height:1.6;">
          <label style="display:block; margin-bottom:15px; cursor:pointer;">
            <input type="radio" name="track" value="A" id="trackA"> <strong style="color:var(--hana-green);">[트랙 A 결과형] </strong> 자격증 위주 취준생
          </label>
          <label style="display:block; cursor:pointer;">
            <input type="radio" name="track" value="B" id="trackB"> <strong style="color:var(--hana-green);">[트랙 B 과정형] </strong> 꾸준함이 무기 (포폴 등)
          </label>
        </div>
      </div>
      
      <button id="btn-start" style="margin-top:auto; padding: 16px; border-radius: 30px; background: var(--hana-green); color: #fff; font-weight:bold; font-size:16px; border:none; cursor:pointer; width:100%; box-shadow: 0 4px 10px rgba(0,132,133,0.3);">새로운 아바타 만나기</button>
    </div>
  `;
}

function renderHome() {
  return `
    <div style="padding: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-size:20px; font-weight:bold;">내 캐릭터 별돌이 ✨</h2>
        <div style="font-weight:bold; color:var(--hana-green); font-size:16px;">🪙 ${state.points} P</div>
      </div>
      
      <!-- Character Area: Code-driven SVG Rendering -->
      <div id="character-area" style="cursor:pointer; background:var(--card-bg); height: 260px; border-radius: var(--border-radius-lg); display:flex; flex-direction:column; justify-content:center; align-items:center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom:24px; position:relative; overflow:hidden;">
        
        <div style="position:relative; width: 140px; height: 180px; margin-bottom: 5px; filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.1));">
          <!-- 해상도를 위해 실제 표시 크기보다 큰 해상도(400x600)의 Canvas를 사용하고 CSS로 크기를 맞춥니다 -->
          <canvas id="avatar-canvas-home" width="400" height="600" style="width:100%; height:100%;"></canvas>
        </div>
        
        <div style="background:#f4f4f4; padding:8px 16px; border-radius:20px; font-size:13px; font-weight:bold; color:var(--text-primary); border: 1px solid #ddd; z-index:20;">🔥 하반기 금융권 합격 가즈아!</div>
        
        <!-- Marketplace Entry Hint -->
        <div style="position:absolute; top:15px; right:15px; background:var(--hana-green); color:white; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; box-shadow:0 2px 10px rgba(0,132,133,0.3); font-size:18px;">
          🛒
        </div>
        <div style="position:absolute; bottom:15px; right:15px; font-size:12px; color:var(--text-secondary); opacity:0.8;">상점 열기 👆</div>
      </div>
      
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
        <h3 style="font-size:15px; font-weight:bold;">📈 금주 우대금리 달성도 (3/5일)</h3>
        <span style="font-size:12px; color:var(--hana-green); font-weight:bold;">현재 +1.5%</span>
      </div>
      <div style="height:12px; background:#e0e0e0; border-radius:10px; overflow:hidden; margin-bottom: 24px;">
        <div style="height:100%; width:60%; background:var(--hana-green); border-radius:10px; transition: width 0.5s;"></div>
      </div>

      <!-- 나의 뱃지 컬렉션 -->
      <h3 style="font-size:15px; font-weight:bold; margin-bottom:12px; display:flex; justify-content:space-between;">
        <span>🏅 나의 뱃지 컬렉션</span>
        <span style="font-size:12px; color:var(--text-secondary); font-weight:normal;">${state.badges.length} / ${Object.keys(BADGE_DATA).length}</span>
      </h3>
      <div style="background:var(--card-bg); padding:15px; border-radius:var(--border-radius-md); box-shadow:0 4px 15px rgba(0,0,0,0.05); margin-bottom:24px; display:flex; gap:15px;">
        ${Object.values(BADGE_DATA).map(b => {
          const hasBadge = state.badges.includes(b.id);
          return `
            <div style="display:flex; flex-direction:column; align-items:center; opacity:${hasBadge ? '1' : '0.3'}; transition:0.3s;">
              <div style="width:50px; height:50px; border-radius:50%; background:${hasBadge ? '#fff6d6' : '#eee'}; display:flex; justify-content:center; align-items:center; font-size:24px; margin-bottom:8px; border:${hasBadge ? '2px solid #ffd700' : '2px solid transparent'}; box-shadow:${hasBadge ? '0 4px 10px rgba(255,215,0,0.3)' : 'none'};">
                ${b.icon}
              </div>
              <span style="font-size:11px; font-weight:bold; color:var(--text-secondary); text-align:center;">${b.name}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 매일 금융 퀴즈 연동 -->
      <div id="btn-quiz" style="background:linear-gradient(135deg, #008485, #005a5a); padding:16px 20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:24px; cursor:pointer; box-shadow:0 4px 10px rgba(0,132,133,0.3); transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
        <div>
          <div style="font-size:15px; font-weight:bold; margin-bottom:4px;">💡 매일 금융 퀴즈 풀기</div>
          <div style="font-size:12px; opacity:0.8;">${QUIZ_DATA.reward}P 일일 보상 + 특별 뱃지 찬스!</div>
        </div>
        <div style="font-size:24px;">🤔</div>
      </div>

      <h3 style="font-size:15px; font-weight:bold; margin-bottom:12px;">📌 오늘의 일일 미션 (스와이프)</h3>
      <div style="background:var(--card-bg); padding:18px; border-radius: var(--border-radius-md); box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${state.missions.map(m => `
          <div style="display:flex; align-items:center; margin-bottom:12px;">
            <input type="checkbox" class="mission-checkbox" data-id="${m.id}" ${m.completed ? 'checked disabled' : ''} style="margin-right:10px; accent-color:var(--hana-green); width:18px; height:18px;">
            <span style="color:${m.completed ? 'var(--text-secondary)' : 'var(--text-primary)'}; font-size:14px; ${m.completed ? 'text-decoration:line-through;' : 'font-weight:500;'}">${m.text} <span style="font-weight:bold; color:var(--hana-green); font-size:12px;">(+${m.points}P)</span></span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMarketplace() {
  let itemsHtml = SHOP_ITEMS.map(item => {
    const isOwned = state.ownedItems.includes(item.id);
    const isEquipped = state.equippedItems.includes(item.id);
    
    let btnHtml = '';
    if(isEquipped) {
      btnHtml = `<button class="toggle-btn" data-id="${item.id}" data-action="unequip" style="background:#ff5e5e; color:#fff; border:none; padding:8px 0; width:100%; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(255,94,94,0.3);">🚫 장착 해제</button>`;
    } else if(isOwned) {
      btnHtml = `<button class="toggle-btn" data-id="${item.id}" data-action="equip" style="background:#005a5a; color:#fff; border:none; padding:8px 0; width:100%; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,90,90,0.3);">👕 장착하기</button>`;
    } else {
      btnHtml = `<button class="buy-btn" data-id="${item.id}" data-price="${item.price}" data-name="${item.name}" style="background:var(--hana-light-green); color:var(--hana-green); border:none; padding:8px 0; width:100%; border-radius:8px; font-weight:bold; cursor:pointer;">🪙 ${item.price}</button>`;
    }

    return `
      <div class="market-item" style="background:var(--card-bg); padding:15px; border-radius:var(--border-radius-md); text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); position:relative; border: ${isEquipped ? '2px solid var(--hana-green)' : '2px solid transparent'}">
        <div style="font-size:40px; margin-bottom:10px;">${item.icon}</div>
        <div style="font-size:13px; font-weight:bold; margin-bottom:8px; display:block; height:34px; line-height:1.2;">${item.name}</div>
        ${btnHtml}
      </div>
    `;
  }).join('');

  return `
    <div style="padding: 24px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div id="btn-back" style="font-size:24px; cursor:pointer; font-weight:bold; color:var(--text-primary);">←</div>
        <h2 style="font-size:18px; font-weight:bold;">별돌이 옷장상점</h2>
        <div style="font-weight:bold; color:var(--hana-green); font-size:15px; background:var(--card-bg); padding:5px 12px; border-radius:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
          🪙 ${state.points} P
        </div>
      </div>

      <!-- Preview Image -->
      <div style="background:#f4f7f7; height: 160px; border-radius: var(--border-radius-lg); display:flex; justify-content:center; align-items:center; margin-bottom:24px; border:2px dashed #bbd9d9; position:relative;">
         <div style="position:relative; width:90px; height:120px; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.1));">
           <canvas id="avatar-canvas-market" width="400" height="600" style="width:100%; height:100%;"></canvas>
         </div>
         <div style="position:absolute; bottom:10px; right:10px; font-size:11px; font-weight:bold; color:#005a5a;">아키텍처 스튜디오 📸</div>
      </div>

      <h3 style="font-size:16px; font-weight:bold; margin-bottom:15px;">이 달의 신상 아이템</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; padding-bottom:50px;">
        ${itemsHtml}
      </div>
      
    </div>
  `;
}

function renderStudy() {
  return `
    <div style="padding: 24px 20px; height: 100%; display:flex; flex-direction:column; align-items:center;">
      <h2 style="font-size:22px; font-weight:bold; margin-bottom:30px; text-align:left; width:100%; color:#111;">스터디 타이머</h2>
      
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; width:100%; justify-content: flex-start; padding-top: 20px;">
        <!-- Timer Circle -->
        <div style="position: relative; width: 260px; height: 260px; margin-bottom: 40px;">
          <svg style="transform: rotate(-90deg); width: 100%; height: 100%;">
            <circle cx="130" cy="130" r="120" stroke="#EBF3F3" stroke-width="20" fill="transparent" />
            <circle cx="130" cy="130" r="120" stroke="#DDEFEF" stroke-width="20" fill="transparent" stroke-dasharray="753" stroke-dashoffset="200" style="transition: stroke-dashoffset 1s ease;" />
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
            <div style="font-size: 52px; font-weight: 800; color: #111; letter-spacing: -1px;">00:00:00</div>
            <p style="color: #888; font-size: 14px; margin-top: 4px;">오늘의 총 집중 시간</p>
          </div>
        </div>

        <button id="btn-timer" style="background:var(--hana-dark-green); color:#fff; padding:18px; width:100%; max-width:280px; border-radius:40px; font-size:18px; font-weight:bold; border:none; cursor:pointer; box-shadow: 0 8px 20px rgba(0,90,90,0.2); margin-bottom: 30px;">START (화면 잠금)</button>

        <!-- Certification Sections -->
        <div style="width:100%; display:flex; flex-direction:column; gap:16px;">
          <!-- Card 1 -->
          <div class="card" style="padding: 16px; margin-bottom: 0; box-shadow: var(--shadow-sm); border-radius: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-weight:bold; font-size:15px;">📜 자격증 인증 사진</span>
              <button style="background:none; border:none; color:var(--hana-green); font-size:12px; font-weight:bold; cursor:pointer;">+ 인증 제출하기</button>
            </div>
            <div style="width:70px; height:70px; border: 2px dashed #E0E0E0; border-radius: 12px; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#F9FAFB; cursor:pointer;">
              <span style="font-size:20px;">📷</span>
              <span style="font-size:10px; color:#999; margin-top:2px;">자격증 인증</span>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="card" style="padding: 16px; margin-bottom: 40px; box-shadow: var(--shadow-sm); border-radius: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-weight:bold; font-size:15px;">👨‍👩‍👧‍👦 내 스터디 그룹</span>
              <button style="background:none; border:none; color:var(--hana-green); font-size:12px; font-weight:bold; cursor:pointer;">+ 인증 제출하기</button>
            </div>
            <div style="width:70px; height:70px; border: 2px dashed #E0E0E0; border-radius: 12px; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#F9FAFB; cursor:pointer;">
              <span style="font-size:20px;">📷</span>
              <span style="font-size:10px; color:#999; margin-top:2px;">스터디 그룹 인증</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCommunity() {
  return `
    <div style="padding: 24px 20px; padding-bottom: 100px;">
      <h2 style="font-size:22px; font-weight:bold; margin-bottom:20px; color:#111;">하나은행 취준 라운지</h2>
      
      <!-- Banner -->
      <div class="banner" style="margin-bottom:24px; padding: 24px 20px;">
        <div style="z-index:2; position:relative; max-width: 70%;">
          <h3 style="font-size:18px; margin-bottom:12px; font-weight:800; display:flex; align-items:center; gap:6px;">
            🎓 취업의 마지막 관문
          </h3>
          <p style="font-size:14px; opacity:0.95; line-height:1.5; font-weight:400; word-break:keep-all;">
            하나은행 급여통장 인증하고<br>특별한 졸업 뱃지 & 우대금리 정산받기!
          </p>
        </div>
        <img src="https://img.icons8.com/bubbles/200/briefcase.png" class="banner-icon" alt="Briefcase">
      </div>
      
      <!-- Top Grid Buttons (3-column) -->
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:16px;">
        <div class="board-card" style="padding: 24px 10px;">
          <div style="font-size:28px; margin-bottom:10px;">🔥</div>
          <p style="font-weight:700; font-size:13px; color:#111;">스터디 모집</p>
        </div>
        <div class="board-card" style="padding: 24px 10px;">
          <div style="font-size:28px; margin-bottom:10px;">🏅</div>
          <p style="font-weight:700; font-size:13px; color:#111;">스터디 인증</p>
        </div>
        <div class="board-card" style="padding: 24px 10px;">
          <div style="font-size:28px; margin-bottom:10px;">📝</div>
          <p style="font-weight:700; font-size:13px; color:#111;">취준 후기</p>
        </div>
      </div>

      <!-- Bottom Grid Buttons (2-column) -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
        <div class="board-card" style="display:flex; align-items:center; justify-content:center; gap:12px; padding: 16px;">
          <div style="font-size:24px;">💬</div>
          <p style="font-weight:700; font-size:14px; color:#111;">Q&A</p>
        </div>
        <div class="board-card" style="display:flex; align-items:center; justify-content:center; gap:12px; padding: 16px;">
          <div style="font-size:24px;">⭐</div>
          <p style="font-weight:700; font-size:14px; color:#111;">벌돌이 자랑</p>
        </div>
      </div>

      <!-- Post Input -->
      <div style="display:flex; gap:12px; margin-bottom: 24px; align-items: stretch;">
        <input type="text" id="post-input" placeholder="새로운 글을 작성해보세요!" style="flex:1; padding: 14px 18px; border: none; border-radius: 16px; background: #fff; box-shadow: var(--shadow-sm); font-size:14px; outline:none;">
        <button id="post-btn" style="background:var(--hana-dark-green); color:white; border:none; border-radius: 16px; padding: 0 24px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 12px rgba(0,90,90,0.15);">등록</button>
      </div>
      
      <!-- Community Posts -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${state.communityPosts.map(post => `
          <div class="card" style="padding: 24px; margin-bottom: 0; box-shadow: var(--shadow-sm); border-radius: 20px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
              <div style="width:36px; height:36px; background:#EBF3F3; border-radius:50%; display:flex; justify-content:center; align-items:center; color:var(--hana-green); font-size:14px; font-weight:800;">합</div>
              <span style="font-weight:700; font-size:15px; color:#111;">합격기원</span>
            </div>
            <p style="font-size:15px; color:#333; line-height:1.6; font-weight:400; margin-bottom: 16px;">${post.content}</p>
            <div style="display:flex; gap:15px; font-size:13px; color:#888;">
              <span style="display:flex; align-items:center; gap:4px;">❤️ ${post.likes}</span>
              <span style="display:flex; align-items:center; gap:4px;">💬 ${post.comments}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderQuiz() {
  const q = QUIZ_DATA;
  return `
    <div style="padding:24px; display:flex; flex-direction:column; height:100%; position:relative; background:#f4f7f7;">
      <div id="btn-back-quiz" style="font-size:24px; cursor:pointer; font-weight:bold; margin-bottom:30px; color:var(--text-primary);">←</div>
      
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; max-width:400px; margin:0 auto;">
        <div style="font-size:40px; text-align:center; margin-bottom:20px;">💡</div>
        <h2 style="font-size:22px; font-weight:bold; line-height:1.4; text-align:center; margin-bottom:40px; word-break:keep-all; color:var(--text-primary);">
          ${q.question}
        </h2>
        
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option-btn" data-idx="${idx}" style="background:#fff; border:1px solid #ddd; padding:18px; border-radius:12px; font-size:16px; font-weight:bold; color:var(--text-primary); cursor:pointer; text-align:left; box-shadow:0 2px 8px rgba(0,0,0,0.02); display:flex; gap:10px;">
              <span style="color:var(--hana-green); opacity:0.7;">${idx + 1}.</span> ${opt}
            </button>
          `).join('')}
        </div>
      </div>
      
      ${state.dailyQuizCompleted ? `
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.95); display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:100; padding:20px;">
          <div style="font-size:60px; margin-bottom:20px;">🎉</div>
          <h2 style="font-size:22px; font-weight:bold; margin-bottom:10px; color:#222;">오늘의 퀴즈를 완료했어요!</h2>
          <p style="color:var(--text-secondary); margin-bottom:40px; font-size:15px;">내일 또 퀴즈를 풀고 보상을 받으세요.</p>
          <button id="btn-quiz-done" style="background:var(--hana-green); color:#fff; border:none; padding:16px 40px; border-radius:30px; font-size:16px; font-weight:bold; cursor:pointer; box-shadow:0 6px 15px rgba(0,132,133,0.3); width:100%; max-width:300px;">홈으로 돌아가기</button>
        </div>
      ` : ''}
    </div>
  `;
}

function attachViewListeners() {
  if(state.currentView === 'login') {
    const loginBtns = document.querySelectorAll('.login-btn');
    loginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentView = 'character_select';
        renderApp();
      });
    });
  }

  if(state.currentView === 'character_select') {
    const chars = document.querySelectorAll('.char-select');
    chars.forEach(el => {
      el.addEventListener('click', () => {
        state.selectedCharacter = el.getAttribute('data-char');
        state.currentView = 'story';
        state.storyIndex = 0;
        renderApp();
      });
    });
  }

  if(state.currentView === 'story') {
    const container = document.getElementById('story-container');
    if(container) {
      container.addEventListener('click', () => {
        if(state.storyIndex < 6) {
          state.storyIndex++;
          renderApp();
        } else {
          state.currentView = 'onboarding'; // Move to Track Selection
          renderApp();
        }
      });
    }
  }

  if(state.currentView === 'onboarding') {
    const btn = document.getElementById('btn-start');
    if(btn) {
      btn.addEventListener('click', () => {
        const trackA = document.getElementById('trackA').checked;
        const trackB = document.getElementById('trackB').checked;
        if(!trackA && !trackB) return alert('목표 트랙을 하나 골라주세요!');
        
        state.userProfile = trackA ? 'A' : 'B';
        btn.innerHTML = '로딩중...';
        btn.style.opacity = '0.7';
        setTimeout(() => {
          state.currentView = 'home';
          renderApp();
        }, 500);
      });
    }
  }

  if(state.currentView === 'home') {
    const charArea = document.getElementById('character-area');
    if(charArea) {
      charArea.addEventListener('click', () => {
        state.currentView = 'marketplace';
        renderApp();
      });
    }

    const btnQuiz = document.getElementById('btn-quiz');
    if(btnQuiz) {
      btnQuiz.addEventListener('click', () => {
        state.currentView = 'quiz';
        renderApp();
      });
    }

    const missionCheckboxes = document.querySelectorAll('.mission-checkbox');
    missionCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        if(e.target.checked) {
          const id = parseInt(e.target.getAttribute('data-id'));
          const mission = state.missions.find(m => m.id === id);
          if(mission && !mission.completed) {
            mission.completed = true;
            state.points += mission.points;
            alert(`미션 완료! 🪙 ${mission.points}P를 획득했습니다.`);
            renderApp();
          }
        }
      });
    });
  }

  if(state.currentView === 'quiz') {
    const btnBack = document.getElementById('btn-back-quiz');
    if(btnBack) btnBack.addEventListener('click', () => { state.currentView = 'home'; renderApp(); });
    
    const btnDone = document.getElementById('btn-quiz-done');
    if(btnDone) btnDone.addEventListener('click', () => { state.currentView = 'home'; renderApp(); });

    const options = document.querySelectorAll('.quiz-option-btn');
    options.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if(state.dailyQuizCompleted) return;

        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
        if(idx === QUIZ_DATA.answerIndex) {
          e.currentTarget.style.background = '#e8f5e9';
          e.currentTarget.style.borderColor = 'green';
          
          setTimeout(() => {
            state.points += QUIZ_DATA.reward;
            state.dailyQuizCompleted = true;
            let msg = `정답입니다! 🎉\n[보상] +${QUIZ_DATA.reward}P 지급!`;
            
            if(!state.badges.includes('quiz_master')) {
              state.badges.push('quiz_master');
              state.points += BADGE_DATA['quiz_master'].reward;
              msg += `\n\n🏅 특별 보너스!\n[${BADGE_DATA.quiz_master.name} 뱃지] 달성!\n추가 보상: +${BADGE_DATA.quiz_master.reward}P 지급!`;
            }
            alert(msg);
            state.currentView = 'home';
            renderApp();
          }, 300);
        } else {
          e.currentTarget.style.background = '#ffebee';
          e.currentTarget.style.borderColor = 'red';
          setTimeout(() => alert('오답입니다! 다시 생각해보세요.'), 100);
        }
      });
    });
  }

  if(state.currentView === 'study') {
    const photoUpload = document.getElementById('study-photo-upload');
    if(photoUpload) {
      photoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            state.studyPhotos.unshift(event.target.result);
            state.points += 50; // 사진 인증 포인트
            alert('인증 완료! 🪙 50P를 획득했습니다.');
            renderApp();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const receiptUpload = document.getElementById('receipt-upload');
    if(receiptUpload) {
      receiptUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const reward = Math.floor(Math.random() * 41) + 10; // 10 ~ 50 points
            state.points += reward;
            state.receiptAuthCount++;
            
            let msg = `🧾 교육비 영수증 인증 완료!\n(0.005% 적립 시뮬레이션)\n[보상] +${reward}P 획득!`;
            
            if(!state.badges.includes('receipt_auth')) {
              state.badges.push('receipt_auth');
              state.points += BADGE_DATA['receipt_auth'].reward;
              msg += `\n\n🏅 특별 보너스!\n[${BADGE_DATA.receipt_auth.name} 뱃지] 달성!\n추가 보상: +${BADGE_DATA.receipt_auth.reward}P 지급!`;
            }
            alert(msg);
            renderApp();
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  if(state.currentView === 'community') {
    const postBtn = document.getElementById('post-btn');
    if(postBtn) {
      postBtn.addEventListener('click', () => {
        const input = document.getElementById('post-input');
        const content = input.value.trim();
        if(content) {
          state.communityPosts.unshift({
            id: Date.now(),
            author: '나만의 별돌이', 
            content: content,
            likes: 0,
            comments: 0
          });
          alert('게시글이 등록되었습니다!');
          renderApp();
        } else {
          alert('내용을 입력해주세요.');
        }
      });
    }
  }

  if(state.currentView === 'marketplace') {
    const btnBack = document.getElementById('btn-back');
    if(btnBack) {
      btnBack.addEventListener('click', () => {
        state.currentView = 'home';
        renderApp();
      });
    }

    const buyBtns = document.querySelectorAll('.buy-btn');
    buyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.buy-btn');
        const id = parseInt(itemEl.getAttribute('data-id'));
        const name = itemEl.getAttribute('data-name');
        const price = parseInt(itemEl.getAttribute('data-price'));

        if(state.points >= price) {
          const confirmBuy = confirm(`'${name}' 아이템을 구매하시겠습니까? (🪙 ${price} P 차감)`);
          if(confirmBuy) {
            state.points -= price;
            state.ownedItems.push(id);
            if(confirm(`구매 완료! 🎉 지금 바로 씌워 보시겠습니까?`)) {
               state.equippedItems.push(id);
            }
            renderApp();
          }
        } else {
          alert('포인트 부족!');
        }
      });
    });

    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.toggle-btn');
        const id = parseInt(itemEl.getAttribute('data-id'));
        const action = itemEl.getAttribute('data-action');

        if(action === 'equip') {
          if (!state.equippedItems.includes(id)) {
             state.equippedItems.push(id);
          }
        } else if(action === 'unequip') {
          state.equippedItems = state.equippedItems.filter(itemId => itemId !== id);
        }
        renderApp();
      });
    });
  }
}

// Init
renderApp();
