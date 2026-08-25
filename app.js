// ==========================================================================
// TalkPulse Data & Scenario Definitions
// ==========================================================================

const SCENARIOS = [
  {
    id: 'coffee',
    category: 'daily',
    icon: '☕',
    title: '咖啡廳點餐 (Coffee Shop)',
    desc: '練習如何客製化咖啡、點心及確認價格',
    partner: 'Barista Alex',
    systemPrompt: `You are Alex, a friendly barista at a lively modern coffee shop. 
The user is a customer who wants to order drinks or food.
Guidelines:
1. Speak in simple, clear, and natural everyday English.
2. Keep each response concise (1-2 sentences max).
3. Ask typical barista questions (size, milk type, iced/hot, for here or to go).
4. After each reply, provide 3 suggested responses and brief gentle feedback if applicable.`
  },
  {
    id: 'airport',
    category: 'daily',
    icon: '✈️',
    title: '機場與飯店登記入住 (Travel & Check-in)',
    desc: '詢問行李、登機口、飯店入住與房間需求',
    partner: 'Front Desk Officer',
    systemPrompt: `You are a polite hotel front desk receptionist / airline staff.
The user is checking in.
Guidelines:
1. Keep answers short, clear, and supportive (1-2 sentences).
2. Ask for reservation name, passport, or preferences (window/aisle, high floor).
3. Always provide 3 helpful rescue response options for beginners.`
  },
  {
    id: 'meeting',
    category: 'work',
    icon: '📅',
    title: '預約與確認會議 (Scheduling a Meeting)',
    desc: '職場基礎：確認同事空檔、喬時間、設定會議目的',
    partner: 'Colleague Sarah',
    systemPrompt: `You are Sarah, a supportive colleague in a tech company. 
The user is reaching out to schedule a quick 15-minute sync meeting with you.
Guidelines:
1. Use realistic workplace English, but keep sentences short and clear (1-2 sentences).
2. Negotiate convenient times (e.g., "How about Thursday at 2 PM?").
3. Give 3 actionable rescue response suggestions for the user.`
  },
  {
    id: 'progress',
    category: 'work',
    icon: '📊',
    title: '專案進度同步 (Project Status Check)',
    desc: '向主管或同事回報進度、說明遇到的小阻礙',
    partner: 'Manager David',
    systemPrompt: `You are David, an encouraging and busy team manager.
The user is syncing up with you on their task progress.
Guidelines:
1. Ask simple status check questions (e.g., "Hey! How is the report coming along?").
2. Speak encouragingly, keeping replies within 1-2 short sentences.
3. Provide 3 suggested answers.`
  },
  {
    id: 'leave',
    category: 'work',
    icon: '📝',
    title: '請假與工作交接 (Requesting Time Off)',
    desc: '說明請假原因、安排職務代理人與回歸時間',
    partner: 'HR / Supervisor',
    systemPrompt: `You are a helpful supervisor discussing a leave request.
The user is asking for a day off for personal reasons or illness.
Guidelines:
1. Acknowledge politely and ask who will cover their urgent tasks.
2. Short, realistic sentences (1-2 sentences).`
  },
  {
    id: 'smalltalk',
    category: 'daily',
    icon: '🌤️',
    title: '茶水間隨意閒聊 (Water Cooler Small Talk)',
    desc: '聊聊天氣、週末計畫、最近看的電影或美食',
    partner: 'Colleague Emma',
    systemPrompt: `You are Emma, a friendly colleague bumping into the user near the coffee machine.
You are making light small talk about the weekend or weather.
Guidelines:
1. Keep responses cheerful, lighthearted, and short (1-2 sentences).
2. Ask natural follow-up questions.`
  }
];


// ==========================================================================
// Web Speech API (STT & TTS) & Gemini AI Integration Engine
// v4 - Auto-discover available models before calling
// ==========================================================================

class SpeechEngine {
  constructor(onResultCallback, onEndCallback) {
    this.recognition = null;
    this.isListening = false;
    this.synth = window.speechSynthesis;
    this.onResultCallback = onResultCallback;
    this.onEndCallback = onEndCallback;
    this.customResultCallback = null;
    this.customEndCallback = null;
    this.initSTT();
  }

  initSTT() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => { this.isListening = true; };
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      if (this.customResultCallback) {
        this.customResultCallback(fullTranscript);
      } else if (this.onResultCallback) {
        this.onResultCallback(fullTranscript);
      }
    };
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        if (this.customEndCallback) this.customEndCallback();
        else if (this.onEndCallback) this.onEndCallback();
      }
    };
    this.recognition.onend = () => {
      // If user did not manually stop, auto-restart to prevent browser silence cutoff
      if (this.isListening) {
        try {
          this.recognition.start();
          return;
        } catch (e) {}
      }
      this.isListening = false;
      if (this.customEndCallback) {
        this.customEndCallback();
      } else if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  startListening(lang = 'en-US', onCustomResult = null, onCustomEnd = null, interim = false) {
    if (!this.recognition) {
      alert('您的瀏覽器不支援 Web Speech 辨識，請使用 Chrome 或 Safari。');
      return;
    }
    if (this.synth && this.synth.speaking) this.synth.cancel();
    if (this.isListening) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.recognition.lang = lang;
    this.recognition.interimResults = interim;
    this.customResultCallback = onCustomResult;
    this.customEndCallback = onCustomEnd;
    try { this.recognition.start(); } catch (e) { console.warn(e); }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  speak(text, onStart, onComplete, rate = 0.95) {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    const voices = this.synth.getVoices();
    const naturalVoice = voices.find(v =>
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('US'))
      && v.lang.startsWith('en')
    );
    if (naturalVoice) utterance.voice = naturalVoice;
    if (onStart) utterance.onstart = onStart;
    if (onComplete) utterance.onend = onComplete;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) this.synth.cancel();
  }
}

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.discoveredModel = null;  // Cache the working model
    this.discoveredApiVersion = null;
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    this.discoveredModel = null;  // Reset on key change
    this.discoveredApiVersion = null;
  }

  // Step 1: Ask Google which models this API Key can access
  async discoverModel() {
    if (this.discoveredModel) return; // Already found

    const preferredModels = [
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-pro'
    ];

    for (const apiVer of ['v1beta', 'v1']) {
      try {
        const listUrl = `https://generativelanguage.googleapis.com/${apiVer}/models?key=${this.apiKey}`;
        const resp = await fetch(listUrl);
        if (!resp.ok) continue;

        const data = await resp.json();
        const modelNames = (data.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));

        console.log(`[TalkPulse] Available models on ${apiVer}:`, modelNames);

        // Pick the best preferred model that's actually available
        for (const preferred of preferredModels) {
          const matchedName = modelNames.find(name => name === preferred || name.startsWith(preferred));
          if (matchedName) {
            this.discoveredModel = matchedName; // Use the ACTUAL name from API, not our short prefix
            this.discoveredApiVersion = apiVer;
            console.log(`[TalkPulse] Selected: ${apiVer}/models/${matchedName}`);
            return;
          }
        }

        // Fallback: pick ANY model that supports generateContent
        if (modelNames.length > 0) {
          this.discoveredModel = modelNames[0];
          this.discoveredApiVersion = apiVer;
          console.log(`[TalkPulse] Fallback selected: ${apiVer}/models/${modelNames[0]}`);
          return;
        }
      } catch (err) {
        console.warn(`[TalkPulse] ListModels on ${apiVer} failed:`, err);
      }
    }

    throw new Error('無法取得可用模型清單，請確認 API Key 正確且有效。');
  }

  _cleanJsonResponse(rawText) {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }
    return JSON.parse(cleaned);
  }

  async sendChatMessage(messages, scenarioSystemPrompt) {
    if (!this.apiKey) {
      throw new Error('請先在設定中輸入 Gemini API Key');
    }

    // Auto-discover working model on first call
    await this.discoverModel();

    const systemInstruction = `
${scenarioSystemPrompt}

Role & Task:
You are an empathetic, encouraging conversational English coach.
Your main response to the user must be concise, natural spoken conversational English (1-2 sentences maximum).

IMPORTANT: Return ONLY a raw JSON object (no markdown, no codeblocks):
{
  "reply": "Your 1-2 sentence conversational reply in spoken English.",
  "translation": "繁體中文翻譯",
  "correction": "若使用者的句子文法不自然，請提供更地道的說法。若說得很好則留空字串。",
  "suggestions": [
    { "text": "Suggested reply 1", "translation": "繁體中文意思1" },
    { "text": "Suggested reply 2", "translation": "繁體中文意思2" },
    { "text": "Suggested reply 3 (rescue phrase)", "translation": "繁體中文意思3" }
  ]
}
`;

    const formattedContents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const endpoint = `https://generativelanguage.googleapis.com/${this.discoveredApiVersion}/models/${this.discoveredModel}:generateContent?key=${this.apiKey}`;

    // Try standard payload first, then fallback
    const payloads = [
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: formattedContents,
        generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
      },
      {
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + '\n\nPlease acknowledge.' }] },
          { role: 'model', parts: [{ text: '{"reply":"Sure! Go ahead!","translation":"沒問題！","correction":"","suggestions":["Hi!","I would like to order.","Could you repeat that?"]}' }] },
          ...formattedContents
        ],
        generationConfig: { temperature: 0.7 }
      }
    ];

    let lastError = '';

    for (const body of payloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${response.status}`;
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = 'AI 回傳空內容';
          continue;
        }

        return this._cleanJsonResponse(rawText);
      } catch (err) {
        lastError = err.message;
      }
    }

    // If both payloads failed, reset discovered model and throw
    this.discoveredModel = null;
    this.discoveredApiVersion = null;
    throw new Error(lastError || '連線失敗');
  }

  async getEnglishSuggestionsFromChinese(chineseText, scenarioSystemPrompt, conversationHistory = []) {
    if (!this.apiKey) {
      throw new Error('請先在設定中輸入 Gemini API Key');
    }

    await this.discoverModel();

    const recentChat = conversationHistory
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.content}`)
      .join('\n');

    const systemInstruction = `
You are an expert conversational English coach helping a Mandarin Chinese speaker.
Current roleplay scenario:
${scenarioSystemPrompt}

Recent conversation context:
${recentChat || '(Just starting the conversation)'}

The user wants to express the following idea in Chinese:
"${chineseText}"

Task:
Generate 3 natural, practical spoken English variations that express the user's intent within this conversation context:
1. Option 1: Casual & Natural (日常自然口語)
2. Option 2: Polite & Professional (禮貌/商務說法)
3. Option 3: Short & Direct (精簡好記)

IMPORTANT: Return ONLY a raw JSON object (no markdown, no codeblocks):
{
  "options": [
    {
      "style": "日常自然",
      "english": "Natural spoken sentence in English",
      "chinese": "繁體中文對照說明"
    },
    {
      "style": "禮貌專業",
      "english": "Polite spoken sentence in English",
      "chinese": "繁體中文對照說明"
    },
    {
      "style": "精簡直接",
      "english": "Short and simple sentence in English",
      "chinese": "繁體中文對照說明"
    }
  ]
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/${this.discoveredApiVersion}/models/${this.discoveredModel}:generateContent?key=${this.apiKey}`;

    const payloads = [
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: `How can I express this in the conversation: "${chineseText}"?` }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
      },
      {
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + `\n\nHow can I say "${chineseText}" in English?` }] }
        ],
        generationConfig: { temperature: 0.7 }
      }
    ];

    let lastError = '';

    for (const body of payloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${response.status}`;
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = 'AI 回傳空內容';
          continue;
        }

        return this._cleanJsonResponse(rawText);
      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || '翻譯生成失敗');
  }

  async fetchDailyNews(forceRefresh = false) {
    if (!this.apiKey) {
      throw new Error('請先在設定中輸入 Gemini API Key');
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const cacheKey = `talkpulse_news_${todayStr}`;

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }

    await this.discoverModel();

    const systemInstruction = `
You are a global news editor and spoken English coach.
Generate 3 engaging, real-world short news bites for an adult English learner practicing spoken English today (${todayStr}).
Cover 3 distinct topics:
1. 🚀 Tech & AI Innovation (科技新知)
2. 🌍 Global Culture & World Trends (國際脈動)
3. ☕ Lifestyle, Food & Health (生活日常)

STRICT Requirements:
- Each "article" MUST be between 50 and 60 words in simple, natural spoken English (ideal for 25-second shadowing practice).
- Include 2 key vocabulary words with traditional Chinese definitions.
- Include a fluent traditional Chinese translation.
- Include a "discussionPrompt" for follow-up conversation.

Return ONLY a raw JSON object (no markdown, no codeblocks):
{
  "date": "${todayStr}",
  "articles": [
    {
      "id": "news-1",
      "category": "🚀 科技趨勢",
      "title": "Clear English Headline",
      "article": "A concise, natural 50-60 word spoken paragraph in English.",
      "translation": "繁體中文白話解析",
      "vocab": [
        { "word": "breakthrough", "meaning": "突破" },
        { "word": "efficiency", "meaning": "效率" }
      ],
      "discussionPrompt": "Do you think this new technology will help your daily life?",
      "partner": "News Anchor Rachel"
    }
  ]
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/${this.discoveredApiVersion}/models/${this.discoveredModel}:generateContent?key=${this.apiKey}`;

    const payloads = [
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: `Please generate today's 3 short news articles for ${todayStr}.` }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
      },
      {
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + `\n\nGenerate 3 short news bites for ${todayStr}.` }] }
        ],
        generationConfig: { temperature: 0.7 }
      }
    ];

    let lastError = '';

    for (const body of payloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${response.status}`;
          continue;
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = 'AI 回傳空內容';
          continue;
        }

        const parsed = this._cleanJsonResponse(rawText);
        if (parsed && parsed.articles && parsed.articles.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
          return parsed;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || '獲取每日新聞失敗');
  }
}


// ==========================================================================
// TalkPulse Main App Controller (Without Diagnosis Report)
// ==========================================================================

class TalkPulseApp {
  constructor() {
    this.apiKey = localStorage.getItem('talkpulse_gemini_key') || '';
    this.gemini = new GeminiService(this.apiKey);
    this.currentScenario = null;
    this.conversationHistory = [];
    this.currentMode = 'scenario';

    this.speech = new SpeechEngine(
      (transcript) => this.handleSpeechResult(transcript),
      () => this.handleSpeechEnd()
    );

    this.initDOM();
    this.initStats();
    this.renderScenarios();
    this.bindEvents();

    if (!this.apiKey) {
      this.showSettingsModal();
    }
  }

  initDOM() {
    this.views = {
      scenario: document.getElementById('view-scenario'),
      chat: document.getElementById('view-chat'),
      call: document.getElementById('view-call'),
      news: document.getElementById('view-news')
    };

    this.modalSettings = document.getElementById('modal-settings');
    this.inputApiKey = document.getElementById('input-api-key');
    this.inputApiKey.value = this.apiKey;

    this.chatMessages = document.getElementById('chat-messages');
    this.suggestionsList = document.getElementById('suggestions-list');
    this.chatInputStatus = document.getElementById('chat-input-status');
    this.btnChatMic = document.getElementById('btn-chat-mic');

    // Call elements
    this.callAvatar = document.getElementById('call-avatar');
    this.callPartnerName = document.getElementById('call-partner-name');
    this.callStatusText = document.getElementById('call-status-text');
    this.visualizerWave = document.getElementById('visualizer-wave');
    this.btnCallMic = document.getElementById('btn-call-mic');
    this.btnCallHangup = document.getElementById('btn-call-hangup');

    // Chinese helper elements
    this.modalChineseHelper = document.getElementById('modal-chinese-helper');
    this.btnOpenChineseHelper = document.getElementById('btn-open-chinese-helper');
    this.btnCloseChineseHelper = document.getElementById('btn-close-chinese-helper');
    this.btnChineseMic = document.getElementById('btn-chinese-mic');
    this.inputChineseText = document.getElementById('input-chinese-text');
    this.btnGenerateEnglish = document.getElementById('btn-generate-english');
    this.chineseHelperStatus = document.getElementById('chinese-helper-status');
    this.chineseHelperResults = document.getElementById('chinese-helper-results');
    this.isListeningChinese = false;

    // Shadowing & Word Toast elements
    this.modalShadowing = document.getElementById('modal-shadowing');
    this.btnCloseShadowing = document.getElementById('btn-close-shadowing');
    this.shadowingTargetBox = document.getElementById('shadowing-target-box');
    this.btnShadowingMic = document.getElementById('btn-shadowing-mic');
    this.btnShadowingListen = document.getElementById('btn-shadowing-listen');
    this.btnShadowingSlow = document.getElementById('btn-shadowing-slow');
    this.shadowingFeedback = document.getElementById('shadowing-feedback');
    this.wordToast = document.getElementById('word-toast');
    this.wordToastTimer = null;
    this.shadowingTargetSentence = '';
    this.isListeningShadowing = false;

    // News elements
    this.gridNews = document.getElementById('grid-news');
    this.btnNewsBack = document.getElementById('btn-news-back');
    this.btnRefreshNews = document.getElementById('btn-refresh-news');
    this.newsLoading = document.getElementById('news-loading');
    this.newsContainer = document.getElementById('news-container');

    // Practice Stats elements
    this.statTodayTime = document.getElementById('stat-today-time');
    this.statTotalTime = document.getElementById('stat-total-time');
    this.statStreakDays = document.getElementById('stat-streak-days');
  }

  bindEvents() {
    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettingsModal());
    document.getElementById('btn-save-key').addEventListener('click', () => this.saveApiKey());
    document.getElementById('btn-test-key').addEventListener('click', () => this.testApiKey());

    // Chat navigation
    document.getElementById('btn-chat-back').addEventListener('click', () => this.switchView('scenario'));
    document.getElementById('btn-switch-to-call').addEventListener('click', () => this.startCallMode());

    // Chat controls
    this.btnChatMic.addEventListener('click', () => this.toggleSpeech());

    // Call controls
    this.btnCallMic.addEventListener('click', () => this.toggleSpeech());
    this.btnCallHangup.addEventListener('click', () => this.endCallMode());

    // Chinese helper events
    if (this.btnOpenChineseHelper) {
      this.btnOpenChineseHelper.addEventListener('click', () => this.showChineseHelperModal());
    }
    if (this.btnCloseChineseHelper) {
      this.btnCloseChineseHelper.addEventListener('click', () => this.hideChineseHelperModal());
    }
    if (this.btnChineseMic) {
      this.btnChineseMic.addEventListener('click', () => this.toggleChineseSpeech());
    }
    if (this.btnGenerateEnglish) {
      this.btnGenerateEnglish.addEventListener('click', () => this.handleChineseHelpSubmit());
    }
    if (this.inputChineseText) {
      this.inputChineseText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleChineseHelpSubmit();
      });
    }
    if (this.modalChineseHelper) {
      this.modalChineseHelper.addEventListener('click', (e) => {
        if (e.target === this.modalChineseHelper) this.hideChineseHelperModal();
      });
    }

    // Clickable Word Global Handler for Instant Pronunciation
    document.addEventListener('click', (e) => {
      const wordSpan = e.target.closest('.clickable-word');
      if (wordSpan && wordSpan.dataset.word) {
        e.stopPropagation();
        const word = wordSpan.dataset.word;
        this.speech.speak(word, null, null, 0.85);
        this.showWordToast(word);
      }
    });

    // Shadowing modal events
    if (this.btnCloseShadowing) {
      this.btnCloseShadowing.addEventListener('click', () => this.hideShadowingModal());
    }
    if (this.btnShadowingMic) {
      this.btnShadowingMic.addEventListener('click', () => this.toggleShadowingSpeech());
    }
    if (this.btnShadowingListen) {
      this.btnShadowingListen.addEventListener('click', () => {
        if (this.shadowingTargetSentence) {
          this.speech.speak(this.shadowingTargetSentence);
        }
      });
    }
    if (this.btnShadowingSlow) {
      this.btnShadowingSlow.addEventListener('click', () => {
        if (this.shadowingTargetSentence) {
          this.speech.speak(this.shadowingTargetSentence, null, null, 0.65);
        }
      });
    }
    if (this.modalShadowing) {
      this.modalShadowing.addEventListener('click', (e) => {
        if (e.target === this.modalShadowing) this.hideShadowingModal();
      });
    }

    // News navigation events
    if (this.btnNewsBack) {
      this.btnNewsBack.addEventListener('click', () => this.switchView('scenario'));
    }
    if (this.btnRefreshNews) {
      this.btnRefreshNews.addEventListener('click', () => this.loadDailyNews(true));
    }
  }

  async testApiKey() {
    const resultDiv = document.getElementById('test-result');
    const key = this.inputApiKey.value.trim();
    if (!key) {
      resultDiv.innerHTML = '❌ 請先輸入 API Key';
      return;
    }

    resultDiv.innerHTML = '⏳ 正在測試連線...';

    let allResults = '';

    for (const apiVer of ['v1beta', 'v1']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVer}/models?key=${key}`;
        const resp = await fetch(url);

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          allResults += `<br>❌ ${apiVer}: ${err?.error?.message || 'HTTP ' + resp.status}`;
          continue;
        }

        const data = await resp.json();
        const models = (data.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));

        if (models.length > 0) {
          allResults += `<br>✅ ${apiVer} 可用模型 (${models.length}個):<br>` + models.map(m => `&nbsp;&nbsp;• ${m}`).join('<br>');
        } else {
          allResults += `<br>⚠️ ${apiVer}: 找到模型但沒有支援 generateContent 的`;
        }
      } catch (err) {
        allResults += `<br>❌ ${apiVer}: 連線失敗 - ${err.message}`;
      }
    }

    resultDiv.innerHTML = `<strong>診斷結果：</strong>${allResults}`;
  }

  renderScenarios() {
    const gridNews = document.getElementById('grid-news');
    const gridWork = document.getElementById('grid-work');
    const gridDaily = document.getElementById('grid-daily');

    if (gridNews) gridNews.innerHTML = '';
    if (gridWork) gridWork.innerHTML = '';
    if (gridDaily) gridDaily.innerHTML = '';

    // Render Daily News Card
    if (gridNews) {
      const newsCard = document.createElement('div');
      newsCard.className = 'scenario-card';
      newsCard.style.borderColor = 'rgba(99, 102, 241, 0.35)';
      newsCard.innerHTML = `
        <div class="scenario-icon">📰</div>
        <div class="scenario-info">
          <div style="display:flex; align-items:center; gap:6px;">
            <h3 style="color:#fff;">每日 3 分鐘時事快報 (Daily News)</h3>
            <span style="font-size:10px; padding:2px 6px; border-radius:10px; background:rgba(99, 102, 241, 0.25); color:#a5b4fc; font-weight:600;">今日更新</span>
          </div>
          <p>精選 3 則 50 字全球時事短文，支援發音點讀、跟讀檢測與觀點對聊</p>
        </div>
      `;
      newsCard.addEventListener('click', () => this.openNewsView());
      gridNews.appendChild(newsCard);
    }

    SCENARIOS.forEach(sc => {
      const card = document.createElement('div');
      card.className = 'scenario-card';
      card.innerHTML = `
        <div class="scenario-icon">${sc.icon}</div>
        <div class="scenario-info">
          <h3>${sc.title}</h3>
          <p>${sc.desc}</p>
        </div>
      `;
      card.addEventListener('click', () => this.selectScenario(sc));

      if (sc.category === 'work') {
        if (gridWork) gridWork.appendChild(card);
      } else {
        if (gridDaily) gridDaily.appendChild(card);
      }
    });
  }

  showSettingsModal() {
    this.modalSettings.classList.add('active');
  }

  saveApiKey() {
    const key = this.inputApiKey.value.trim();
    if (!key) {
      alert('請輸入有效的 Gemini API Key');
      return;
    }
    this.apiKey = key;
    localStorage.setItem('talkpulse_gemini_key', key);
    this.gemini.setApiKey(key);
    this.modalSettings.classList.remove('active');
    alert('API Key 儲存成功！');
  }

  switchView(viewName) {
    this.currentMode = viewName;
    Object.keys(this.views).forEach(k => {
      if (k === viewName) {
        this.views[k].classList.add('active');
      } else {
        this.views[k].classList.remove('active');
      }
    });
    if (viewName === 'scenario') {
      this.updateStatsUI();
    }
  }

  async selectScenario(scenario) {
    if (!this.apiKey) {
      this.showSettingsModal();
      return;
    }

    this.currentScenario = scenario;
    this.conversationHistory = [];
    this.chatMessages.innerHTML = '';
    document.getElementById('chat-partner-title').innerText = scenario.title;
    this.switchView('chat');

    this.chatInputStatus.innerText = 'AI 教練正在開場...';
    try {
      const initialPrompt = [{ role: 'user', content: 'Hello! I am ready to practice. Please start our conversation as ' + scenario.partner }];
      const response = await this.gemini.sendChatMessage(initialPrompt, this.currentScenario.systemPrompt);
      
      this.conversationHistory.push({ role: 'model', content: response.reply });
      this.appendAIMessage(response);
      this.renderSuggestions(response.suggestions || []);
      this.chatInputStatus.innerText = '點擊麥克風說話...';

      this.speech.speak(response.reply);
    } catch (err) {
      console.error(err);
      this.chatInputStatus.innerText = '連線異常: ' + (err.message || '請檢查金鑰');
    }
  }

  startCallMode() {
    if (!this.currentScenario) return;
    this.switchView('call');
    this.callAvatar.innerText = this.currentScenario.icon;
    this.callPartnerName.innerText = this.currentScenario.partner;
    this.callStatusText.innerText = '正在通話中...';

    const lastAI = this.conversationHistory.filter(m => m.role === 'model').slice(-1)[0];
    if (lastAI) {
      this.visualizerWave.classList.add('active');
      this.speech.speak(lastAI.content, null, () => {
        this.visualizerWave.classList.remove('active');
        this.callStatusText.innerText = '輪到你說話囉 (點擊麥克風)';
      });
    }
  }

  endCallMode() {
    this.speech.stopSpeaking();
    this.speech.stopListening();
    // Directly go back to scenario selection without report
    this.switchView('scenario');
  }

  toggleSpeech() {
    if (this.speech.isListening) {
      // Manual stop by user clicking mic again
      this.speech.stopListening();
      this.btnChatMic.classList.remove('recording');
      this.btnCallMic.classList.remove('speaking');
      
      const textToSubmit = (this.currentRecordedTranscript || '').trim();
      this.currentRecordedTranscript = '';
      if (textToSubmit) {
        this.handleUserSubmit(textToSubmit);
      } else {
        this.chatInputStatus.innerText = '點擊麥克風開始說話...';
        if (this.currentMode === 'call') {
          this.callStatusText.innerText = '未收錄到語音，點擊麥克風重試';
        }
      }
    } else {
      // Manual start
      this.currentRecordedTranscript = '';
      this.btnChatMic.classList.add('recording');
      this.btnCallMic.classList.add('speaking');
      this.chatInputStatus.innerText = '🎙️ 聆聽中... (說完請再點一次麥克風送出)';
      if (this.currentMode === 'call') {
        this.callStatusText.innerText = '🎙️ 正在聆聽... (說完點擊麥克風送出)';
      }

      this.speech.startListening('en-US', (fullTranscript) => {
        this.currentRecordedTranscript = fullTranscript;
        this.chatInputStatus.innerText = `🎙️ "${fullTranscript}" (再點麥克風送出)`;
        if (this.currentMode === 'call') {
          this.callStatusText.innerText = `🎙️ "${fullTranscript}" (點擊麥克風送出)`;
        }
      }, () => {
        this.handleSpeechEnd();
      }, true);
    }
  }

  handleSpeechEnd() {
    this.btnChatMic.classList.remove('recording');
    this.btnCallMic.classList.remove('speaking');
  }

  async handleSpeechResult(transcript) {
    if (!transcript) return;
    this.handleUserSubmit(transcript);
  }

  formatClickableWords(text) {
    if (!text) return '';
    return text.replace(/([a-zA-Z0-9'-]+)/g, (match) => {
      const clean = match.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length === 0) return match;
      return `<span class="clickable-word" data-word="${clean}">${match}</span>`;
    });
  }

  async showWordToast(word) {
    if (!this.wordToast) return;
    const cleanWord = (word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let meaning = this.getWordMeaning(cleanWord);

    this.wordToast.innerHTML = `
      <span style="font-size:13.5px; display:inline-flex; align-items:center; gap:4px;">
        <span>🔊</span> <strong style="color:#fff; letter-spacing:0.3px;">${word}</strong>
      </span>
      <span id="word-toast-meaning" style="color:#fcd34d; font-size:12px; font-weight:500; margin-left:6px;">｜ ${meaning || '🔍 查詢中...'}</span>
    `;
    this.wordToast.classList.add('active');

    if (this.wordToastTimer) clearTimeout(this.wordToastTimer);
    this.wordToastTimer = setTimeout(() => {
      this.wordToast.classList.remove('active');
    }, 3500);

    // If meaning not found in static dict or cache, query online and cache to localStorage
    if (!meaning) {
      const fetchedMeaning = await this.fetchOnlineWordMeaning(cleanWord);
      if (fetchedMeaning) {
        localStorage.setItem('talkpulse_word_' + cleanWord, fetchedMeaning);
        const meaningSpan = document.getElementById('word-toast-meaning');
        if (meaningSpan && this.wordToast.classList.contains('active')) {
          meaningSpan.innerText = `｜ ${fetchedMeaning}`;
        }
      } else {
        const meaningSpan = document.getElementById('word-toast-meaning');
        if (meaningSpan && this.wordToast.classList.contains('active')) {
          meaningSpan.innerText = `｜ 發音示範`;
        }
      }
    }
  }

  getWordMeaning(clean) {
    if (!clean) return '';
    const cached = localStorage.getItem('talkpulse_word_' + clean);
    if (cached) return cached;

    const WORD_DICT = {
      // Days, Time, Numbers
      'thursday': '星期四', 'monday': '星期一', 'tuesday': '星期二', 'wednesday': '星期三', 'friday': '星期五', 'saturday': '星期六', 'sunday': '星期日',
      'pm': '下午', 'am': '上午', 'today': '今天', 'tomorrow': '明天', 'yesterday': '昨天', 'week': '週/星期', 'weekend': '週末', 'month': '月份', 'year': '年',
      'time': '時間', 'hour': '小時', 'minute': '分鐘', 'minutes': '分鐘', 'second': '秒', 'seconds': '秒', 'morning': '早晨', 'afternoon': '下午', 'evening': '傍晚', 'night': '晚上',
      'schedule': '安排、行程表', 'meeting': '會議', 'calendar': '行事曆、日曆', 'invite': '邀請、邀請函', 'appointment': '預約、約定',

      // Pronouns, Prepositions, Conjunctions
      'about': '關於、大約', 'how about': '要不要、那...如何', 'grab': '抽空、抓取、喝個', 'grabbed': '抓取/抽空了',
      'this': '這個、這', 'that': '那個、那', 'these': '這些', 'those': '那些',
      'we': '我們', 'our': '我們的', 'ours': '我們的', 'us': '我們', 'you': '你/你們', 'your': '你的/你們的', 'yours': '你的',
      'i': '我', 'me': '我', 'my': '我的', 'mine': '我的', 'he': '他', 'him': '他', 'his': '他的', 'she': '她', 'her': '她的',
      'they': '他們', 'them': '他們', 'their': '他們的', 'it': '它', 'its': '它的',
      'in': '在...裡面', 'on': '在...上面/時間', 'at': '在...地點/時間', 'for': '為了、對...而言', 'to': '去、到、向',
      'from': '來自', 'with': '和...一起、用', 'without': '沒有', 'by': '在...之前、藉由', 'of': '...的', 'off': '離開、休假',
      'up': '向上', 'down': '向下', 'out': '出去', 'over': '過去、結束', 'into': '進入', 'through': '透過、穿過',
      'and': '和、而且', 'or': '或者', 'but': '但是', 'so': '所以、如此', 'if': '如果', 'because': '因為',

      // Verbs & Common Helpers
      'works': '適合、可行、運作', 'work': '工作、運作', 'worked': '運作了', 'works for me': '我很方便/這時間可以',
      'chat': '聊天、對談', 'sync': '同步、討論', 'update': '更新、最新消息', 'progress': '進度、進展',
      'status': '狀態、情況', 'report': '報告', 'send': '寄送', 'sent': '已寄出', 'sending': '寄送中',
      'see': '看見、見面', 'look': '看、看起來', 'forward': '向前、期待', 'looking forward': '非常期待',
      'love': '喜愛、非常想', 'want': '想要', 'wanted': '想要(過去)', 'like': '喜歡、想要', 'need': '需要', 'needed': '需要了',
      'prefer': '偏好、更喜歡', 'help': '幫助、協助', 'cover': '代班、覆蓋', 'leave': '請假、離開',
      'request': '申請、要求', 'confirm': '確認', 'check': '檢查、確認', 'order': '點餐、訂購', 'reserve': '預約', 'book': '預訂',
      'cancel': '取消', 'reschedule': '改期', 'discuss': '討論', 'explain': '解釋', 'practice': '練習', 'pronounce': '發音、唸',
      'speak': '說、講', 'listen': '聽', 'understand': '理解、明白', 'know': '知道', 'think': '認為、思考', 'mean': '意思是',
      'talk': '談話、說話', 'sounds': '聽起來', 'sound': '聲音、聽起來', 'hear': '聽見', 'tell': '告訴',
      'is': '是', 'are': '是', 'am': '是', 'was': '是(過去)', 'were': '是(過去)', 'be': '是、成為', 'been': '已經是',
      'have': '有', 'has': '有', 'had': '有了', 'do': '做、助動詞', 'does': '做、助動詞', 'did': '做了',
      'can': '可以、能', 'could': '可以(委婉)', 'will': '將會', 'would': '將會、想(委婉)', 'should': '應該', 'may': '可能、可以', 'might': '可能',

      // Coffee & Dining & Travel
      'cappuccino': '卡布奇諾', 'latte': '拿鐵', 'coffee': '咖啡', 'americano': '美式咖啡', 'espresso': '濃縮咖啡', 'tea': '茶',
      'milk': '牛奶', 'oat': '燕麥', 'soy': '豆漿', 'almond': '杏仁', 'whole': '全脂', 'skim': '脫脂',
      'iced': '冰的', 'hot': '熱的', 'warm': '溫的', 'size': '尺寸、大小', 'small': '小杯', 'medium': '中杯', 'large': '大杯',
      'sugar': '糖', 'syrup': '糖漿', 'vanilla': '香草', 'caramel': '焦糖', 'extra': '額外的、加量', 'shot': '濃縮份數',
      'cup': '杯子', 'mug': '馬克杯', 'here': '內用', 'go': '外帶/走', 'takeaway': '外帶', 'bag': '提袋', 'receipt': '收據、發票',
      'cost': '費用', 'price': '價格', 'dollar': '美元、元', 'pay': '付款', 'card': '信用卡', 'cash': '現金',
      'airport': '機場', 'hotel': '飯店', 'flight': '航班', 'gate': '登機門', 'boarding': '登機', 'passport': '護照',
      'checkin': '辦理入住/登機', 'checkout': '退房', 'room': '房間', 'key': '鑰匙、關鍵', 'wifi': '無線網路', 'luggage': '行李',

      // News, Tech, General
      'breakthrough': '突破、重大進展', 'discovery': '發現', 'innovation': '創新', 'technology': '科技', 'tech': '科技',
      'artificial': '人工的', 'intelligence': '智能', 'ai': '人工智慧', 'model': '模型', 'robot': '機器人', 'future': '未來',
      'global': '全球的', 'culture': '文化', 'trend': '趨勢', 'market': '市場', 'economy': '經濟', 'health': '健康',
      'lifestyle': '生活風格', 'nature': '大自然', 'space': '太空、空間', 'earth': '地球', 'energy': '能源', 'climate': '氣候',

      // Common Greetings & Essentials
      'hi': '嗨', 'hello': '你好', 'hey': '嘿、嗨', 'awesome': '太棒了、真讚', 'great': '棒極了', 'good': '好的', 'perfect': '完美',
      'thanks': '謝謝', 'thank': '感謝', 'welcome': '不客氣、歡迎', 'please': '請', 'sure': '當然、沒問題', 'yes': '是的',
      'no': '不', 'maybe': '也許', 'got': '明白、得到', 'it': '它', 'now': '現在', 'right': '正好、正確、右', 'right now': '現在、馬上',
      'just': '剛才、只是', 'then': '那麼、那時', 'ready': '準備好', 'fine': '很好、沒問題', 'urgent': '緊急的', 'sick': '生病的'
    };

    if (WORD_DICT[clean]) return WORD_DICT[clean];
    if (clean.endsWith('ing') && WORD_DICT[clean.slice(0, -3)]) return WORD_DICT[clean.slice(0, -3)] + '(進行中)';
    if (clean.endsWith('ed') && WORD_DICT[clean.slice(0, -2)]) return WORD_DICT[clean.slice(0, -2)] + '(過去式)';
    if (clean.endsWith('s') && WORD_DICT[clean.slice(0, -1)]) return WORD_DICT[clean.slice(0, -1)];
    return '';
  }

  async fetchOnlineWordMeaning(cleanWord) {
    if (!cleanWord || cleanWord.length < 2) return '';
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(cleanWord)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          return data[0][0][0].trim();
        }
      }
    } catch (e) {}

    if (this.apiKey) {
      try {
        await this.gemini.discoverModel();
        const endpoint = `https://generativelanguage.googleapis.com/${this.gemini.discoveredApiVersion}/models/${this.gemini.discoveredModel}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{ role: 'user', parts: [{ text: `Provide Traditional Chinese definition for English word "${cleanWord}". Return ONLY the translation word(s), max 8 characters.` }] }]
        };
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          const json = await resp.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err) {}
    }

    return '';
  }

  checkPronunciationQuery(userText) {
    const clean = userText.trim();
    const patterns = [
      /how\s+(?:do\s+you|to)\s+(?:say|pronounce)\s+([a-zA-Z\s'-]+)/i,
      /what\s+is\s+the\s+pronunciation\s+of\s+([a-zA-Z\s'-]+)/i,
      /pronounce\s+([a-zA-Z\s'-]+)/i,
      /(?:怎麼唸|怎麼讀|發音是什麼|請教發音|發音)\s*[:：]?\s*([a-zA-Z\s'-]+)/i,
      /(?:請問|這個單字)?\s*([a-zA-Z\s'-]+)\s*(?:怎麼唸|怎麼讀|的發音是什麼)/i
    ];

    for (const p of patterns) {
      const match = clean.match(p);
      if (match && match[1] && match[1].trim().length > 0) {
        const targetWord = match[1].trim().replace(/[?!.,]/g, '');
        if (targetWord.length > 0) return targetWord;
      }
    }
    return null;
  }

  async handleUserSubmit(userText, options = null) {
    this.speech.stopListening();
    this.speech.stopSpeaking();

    // Check if user is asking how to pronounce a word (Real-time Intercept)
    const targetWord = this.checkPronunciationQuery(userText);
    if (targetWord) {
      this.conversationHistory.push({ role: 'user', content: userText });
      this.appendUserMessage(userText, null);

      // Play pronunciation of target word immediately
      this.speech.speak(targetWord, null, null, 0.65);

      const coachResponse = {
        reply: `The word is pronounced "${targetWord}". Let's practice saying it together: "${targetWord}"!`,
        translation: `這個單字唸作「${targetWord}」。點擊單字可聽發音，跟我練習一次吧！`,
        correction: `💡 即時發音指正：已為您示範 "${targetWord}" 的正確讀音。`,
        suggestions: [
          { text: `I would like to practice ${targetWord}.`, translation: `我想練習說「${targetWord}」。` },
          { text: `Could you pronounce ${targetWord} again?`, translation: `你可以再唸一次「${targetWord}」嗎？` },
          { text: `Got it! Let's continue.`, translation: `收到，我們繼續吧！` }
        ]
      };

      this.conversationHistory.push({ role: 'model', content: coachResponse.reply });
      this.appendAIMessage(coachResponse);
      this.renderSuggestions(coachResponse.suggestions);
      this.chatInputStatus.innerText = '點擊麥克風練習發音或繼續對話...';
      return;
    }

    this.conversationHistory.push({ role: 'user', content: userText });
    this.appendUserMessage(userText, options);

    this.chatInputStatus.innerText = 'AI 思考回覆中...';
    if (this.currentMode === 'call') {
      this.callStatusText.innerText = '對方正在回應...';
      this.visualizerWave.classList.add('active');
    }

    // If this is a rescue phrase, speak it first to demonstrate to the user!
    let rescueSpeechPromise = Promise.resolve();
    if (options && options.isRescue) {
      rescueSpeechPromise = new Promise(resolve => {
        this.speech.speak(userText, null, () => resolve(), 0.95);
        // Safety timeout in case speech end callback doesn't fire
        setTimeout(resolve, 3500);
      });
    }

    try {
      const [response] = await Promise.all([
        this.gemini.sendChatMessage(
          this.conversationHistory,
          this.currentScenario.systemPrompt
        ),
        rescueSpeechPromise
      ]);

      // Small natural pause (250ms) before AI speaks
      if (options && options.isRescue) {
        await new Promise(r => setTimeout(r, 250));
      }

      this.conversationHistory.push({ role: 'model', content: response.reply });
      this.appendAIMessage(response);
      this.renderSuggestions(response.suggestions || []);
      this.chatInputStatus.innerText = '點擊麥克風說話...';

      this.speech.speak(response.reply, 
        () => {
          if (this.currentMode === 'call') {
            this.visualizerWave.classList.add('active');
            this.callStatusText.innerText = '對方說話中...';
          }
        },
        () => {
          if (this.currentMode === 'call') {
            this.visualizerWave.classList.remove('active');
            this.callStatusText.innerText = '換你說囉 (點擊下方麥克風)';
          }
        }
      );

    } catch (err) {
      console.error(err);
      this.chatInputStatus.innerText = '連線異常: ' + (err.message || '請檢查金鑰');
      if (this.currentMode === 'call') {
        this.callStatusText.innerText = '連線異常: ' + (err.message || '請檢查金鑰');
        this.visualizerWave.classList.remove('active');
      }
    }
  }

  appendUserMessage(text, options = null) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    if (options && options.isRescue) {
      const bubbleId = 'trans-user-' + Date.now();
      const clickableText = this.formatClickableWords(text);
      row.innerHTML = `
        <div class="bubble rescue-bubble">
          <div class="rescue-tag">💡 救命句引用</div>
          <div class="bubble-text">${clickableText}</div>
          <div id="${bubbleId}" class="translation-box">${options.translation || ''}</div>
          <div class="user-bubble-actions">
            ${options.translation ? `<button class="small-btn btn-toggle-trans">🌐 翻譯</button>` : ''}
            <button class="small-btn btn-replay-audio">🔊 重聽</button>
            <button class="small-btn btn-slow-audio">🐢 慢速</button>
            <button class="small-btn btn-shadow-practice">🎯 跟讀檢測</button>
          </div>
        </div>
      `;

      if (options.translation) {
        const btnTrans = row.querySelector('.btn-toggle-trans');
        const transBox = row.querySelector(`#${bubbleId}`);
        if (btnTrans && transBox) {
          btnTrans.addEventListener('click', () => {
            transBox.style.display = transBox.style.display === 'block' ? 'none' : 'block';
          });
        }
      }

      const btnAudio = row.querySelector('.btn-replay-audio');
      if (btnAudio) {
        btnAudio.addEventListener('click', () => {
          this.speech.speak(text);
        });
      }

      const btnSlowAudio = row.querySelector('.btn-slow-audio');
      if (btnSlowAudio) {
        btnSlowAudio.addEventListener('click', () => {
          this.speech.speak(text, null, null, 0.65);
        });
      }

      const btnShadow = row.querySelector('.btn-shadow-practice');
      if (btnShadow) {
        btnShadow.addEventListener('click', () => {
          this.startShadowingPractice(text);
        });
      }
    } else {
      row.innerHTML = `<div class="bubble">${text}</div>`;
    }

    this.chatMessages.appendChild(row);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  appendAIMessage(data) {
    const row = document.createElement('div');
    row.className = 'message-row ai';

    const bubbleId = 'trans-' + Date.now();
    let correctionHtml = '';
    if (data.correction && data.correction.trim().length > 0) {
      correctionHtml = `<div class="correction-box">💡 建議修正：${data.correction}</div>`;
    }

    const clickableReply = this.formatClickableWords(data.reply);

    row.innerHTML = `
      <div class="bubble">
        <div class="bubble-text">${clickableReply}</div>
        ${correctionHtml}
        <div id="${bubbleId}" class="translation-box">${data.translation || ''}</div>
        <div class="bubble-actions">
          <button class="small-btn btn-toggle-trans">🌐 翻譯</button>
          <button class="small-btn btn-replay-audio">🔊 重聽</button>
          <button class="small-btn btn-slow-audio">🐢 慢速</button>
          <button class="small-btn btn-shadow-practice">🎯 跟讀檢測</button>
        </div>
      </div>
    `;

    const btnTrans = row.querySelector('.btn-toggle-trans');
    const transBox = row.querySelector(`#${bubbleId}`);
    btnTrans.addEventListener('click', () => {
      transBox.style.display = transBox.style.display === 'block' ? 'none' : 'block';
    });

    const btnAudio = row.querySelector('.btn-replay-audio');
    btnAudio.addEventListener('click', () => {
      this.speech.speak(data.reply);
    });

    const btnSlowAudio = row.querySelector('.btn-slow-audio');
    btnSlowAudio.addEventListener('click', () => {
      this.speech.speak(data.reply, null, null, 0.65);
    });

    const btnShadow = row.querySelector('.btn-shadow-practice');
    btnShadow.addEventListener('click', () => {
      this.startShadowingPractice(data.reply);
    });

    this.chatMessages.appendChild(row);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  renderSuggestions(suggestions) {
    this.suggestionsList.innerHTML = '';
    if (!suggestions || suggestions.length === 0) {
      this.suggestionsList.innerHTML = '<div class="suggestion-chip">點擊下方麥克風說出任何英文...</div>';
      return;
    }

    suggestions.forEach(item => {
      const phrase = typeof item === 'object' && item.text ? item.text : item;
      const translation = typeof item === 'object' && item.translation ? item.translation : '';

      const chip = document.createElement('div');
      chip.className = 'suggestion-chip';
      chip.innerHTML = `
        <span class="chip-text">${phrase}</span>
        <span class="chip-shadow-icon" title="跟讀檢測" style="margin-left:4px; opacity:0.7;">🎯</span>
      `;
      
      chip.querySelector('.chip-text').addEventListener('click', () => {
        this.handleUserSubmit(phrase, { isRescue: true, translation });
      });

      const shadowIcon = chip.querySelector('.chip-shadow-icon');
      shadowIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startShadowingPractice(phrase);
      });

      this.suggestionsList.appendChild(chip);
    });
  }

  showChineseHelperModal() {
    this.speech.stopSpeaking();
    this.speech.stopListening();
    this.modalChineseHelper.classList.add('active');
    this.chineseHelperStatus.innerText = '';
    setTimeout(() => this.inputChineseText.focus(), 150);
  }

  hideChineseHelperModal() {
    if (this.isListeningChinese) {
      this.speech.stopListening();
      this.isListeningChinese = false;
      this.btnChineseMic.classList.remove('recording');
      this.btnChineseMic.innerText = '🎤 說中文';
    }
    this.modalChineseHelper.classList.remove('active');
  }

  toggleChineseSpeech() {
    if (this.isListeningChinese) {
      this.speech.stopListening();
      this.isListeningChinese = false;
      this.btnChineseMic.classList.remove('recording');
      this.btnChineseMic.innerText = '🎤 說中文';
      this.chineseHelperStatus.innerText = '';
    } else {
      this.isListeningChinese = true;
      this.btnChineseMic.classList.add('recording');
      this.btnChineseMic.innerText = '⏹️ 聆聽中...';
      this.chineseHelperStatus.innerText = '請說出想表達的中文想法...';

      this.speech.startListening(
        'zh-TW',
        (chineseTranscript) => {
          this.inputChineseText.value = chineseTranscript;
          this.isListeningChinese = false;
          this.btnChineseMic.classList.remove('recording');
          this.btnChineseMic.innerText = '🎤 說中文';
          this.chineseHelperStatus.innerText = `辨識成功：「${chineseTranscript}」`;
          // Auto submit to generate
          this.handleChineseHelpSubmit();
        },
        () => {
          this.isListeningChinese = false;
          this.btnChineseMic.classList.remove('recording');
          this.btnChineseMic.innerText = '🎤 說中文';
        }
      );
    }
  }

  async handleChineseHelpSubmit() {
    const text = this.inputChineseText.value.trim();
    if (!text) {
      this.chineseHelperStatus.innerText = '請先說話或輸入中文想法！';
      return;
    }

    if (!this.apiKey) {
      this.showSettingsModal();
      return;
    }

    this.chineseHelperStatus.innerText = '🤖 AI 正在為您構思 3 種道地英文說法...';
    this.chineseHelperResults.innerHTML = '';
    this.btnGenerateEnglish.disabled = true;

    try {
      const result = await this.gemini.getEnglishSuggestionsFromChinese(
        text,
        this.currentScenario ? this.currentScenario.systemPrompt : '',
        this.conversationHistory
      );

      this.btnGenerateEnglish.disabled = false;
      this.chineseHelperStatus.innerText = '✨ 為您推薦以下說法（可試聽或直接採用）：';
      this.renderChineseHelperResults(result.options || []);
    } catch (err) {
      console.error(err);
      this.btnGenerateEnglish.disabled = false;
      this.chineseHelperStatus.innerText = '生成失敗: ' + (err.message || '請檢查連線與金鑰');
    }
  }

  renderChineseHelperResults(options) {
    this.chineseHelperResults.innerHTML = '';
    if (!options || options.length === 0) {
      this.chineseHelperResults.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:12px;">無法生成建議，請換個說法試試。</div>';
      return;
    }

    options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'helper-result-card';
      const clickableEnglish = this.formatClickableWords(opt.english);
      card.innerHTML = `
        <div class="result-card-header">
          <span class="result-style-tag">${opt.style || '推薦說法'}</span>
        </div>
        <div class="result-english">${clickableEnglish}</div>
        <div class="result-chinese">${opt.chinese || ''}</div>
        <div class="result-card-actions">
          <div class="result-audio-btns">
            <button class="small-btn btn-play-normal">🔊 正常</button>
            <button class="small-btn btn-play-slow">🐢 慢速</button>
          </div>
          <button class="btn-use-suggestion">💬 採用並回覆</button>
        </div>
      `;

      const btnNormal = card.querySelector('.btn-play-normal');
      btnNormal.addEventListener('click', () => {
        this.speech.speak(opt.english);
      });

      const btnSlow = card.querySelector('.btn-play-slow');
      btnSlow.addEventListener('click', () => {
        this.speech.speak(opt.english, null, null, 0.65);
      });

      const btnUse = card.querySelector('.btn-use-suggestion');
      btnUse.addEventListener('click', () => {
        this.hideChineseHelperModal();
        this.handleUserSubmit(opt.english, { isRescue: true, translation: opt.chinese });
      });

      this.chineseHelperResults.appendChild(card);
    });
  }

  // ==========================================================================
  // Shadowing & Live Pronunciation Check
  // ==========================================================================

  startShadowingPractice(sentence) {
    this.speech.stopSpeaking();
    this.speech.stopListening();
    this.shadowingTargetSentence = sentence;
    this.modalShadowing.classList.add('active');

    // Split sentence into words and render as interactive chips
    this.shadowingTargetBox.innerHTML = '';
    const rawWords = sentence.match(/[a-zA-Z0-9'-]+|[^\s\w]/g) || [sentence];

    rawWords.forEach(raw => {
      const clean = raw.replace(/[^a-zA-Z0-9]/g, '');
      const span = document.createElement('span');
      if (clean.length > 0) {
        span.className = 'shadowing-word';
        span.dataset.word = clean;
        span.innerText = raw;
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          this.speech.speak(clean, null, null, 0.75);
          this.showWordToast(clean);
        });
      } else {
        span.innerText = raw + ' ';
        span.style.color = 'var(--text-muted)';
      }
      this.shadowingTargetBox.appendChild(span);
    });

    this.shadowingFeedback.innerText = '點擊上方麥克風開始朗讀此句...';
    this.btnShadowingMic.classList.remove('recording');
    this.isListeningShadowing = false;
  }

  hideShadowingModal() {
    if (this.isListeningShadowing) {
      this.speech.stopListening();
      this.isListeningShadowing = false;
      this.btnShadowingMic.classList.remove('recording');
    }
    this.modalShadowing.classList.remove('active');
  }

  toggleShadowingSpeech() {
    if (this.isListeningShadowing) {
      this.speech.stopListening();
      this.isListeningShadowing = false;
      this.btnShadowingMic.classList.remove('recording');
      this.shadowingFeedback.innerText = '已停止跟讀。可點擊麥克風再次挑戰！';
    } else {
      this.isListeningShadowing = true;
      this.btnShadowingMic.classList.add('recording');
      this.shadowingFeedback.innerText = '🎙️ 正在聆聽... 請朗讀上方英文（朗讀完請再按一次麥克風結束）';

      // Reset word highlight classes
      const wordSpans = this.shadowingTargetBox.querySelectorAll('.shadowing-word');
      wordSpans.forEach(s => s.classList.remove('correct', 'incorrect', 'current'));

      this.speech.startListening(
        'en-US',
        (transcript) => this.handleShadowingResult(transcript),
        () => this.handleShadowingEnd(),
        true // Enable real-time interim matching
      );
    }
  }

  handleShadowingResult(transcript) {
    if (!transcript) return;
    const spokenWords = transcript.toLowerCase().match(/[a-z0-9]+/g) || [];
    const wordSpans = Array.from(this.shadowingTargetBox.querySelectorAll('.shadowing-word'));

    let matchedCount = 0;
    wordSpans.forEach((span) => {
      const targetWord = (span.dataset.word || '').toLowerCase();
      if (spokenWords.includes(targetWord)) {
        span.classList.add('correct');
        span.classList.remove('incorrect');
        matchedCount++;
      }
    });

    if (matchedCount === wordSpans.length && wordSpans.length > 0) {
      this.shadowingFeedback.innerHTML = '🎉 <strong>太棒了！100% 完整發音正確！</strong>（請點擊麥克風結束）';
      // Do NOT auto stop - wait for user to tap mic
    } else {
      this.shadowingFeedback.innerText = `已匹配 ${matchedCount} / ${wordSpans.length} 個單字，繼續朗讀...（點擊麥克風結束）`;
    }
  }

  handleShadowingEnd() {
    this.isListeningShadowing = false;
    this.btnShadowingMic.classList.remove('recording');
  }

  // ==========================================================================
  // Daily News Handling
  // ==========================================================================

  openNewsView() {
    if (!this.apiKey) {
      this.showSettingsModal();
      return;
    }
    this.switchView('news');
    this.loadDailyNews();
  }

  async loadDailyNews(forceRefresh = false) {
    if (!this.newsLoading || !this.newsContainer) return;
    this.newsLoading.style.display = 'flex';
    this.newsContainer.innerHTML = '';

    try {
      const data = await this.gemini.fetchDailyNews(forceRefresh);
      this.newsLoading.style.display = 'none';
      this.renderNewsArticles(data.articles || []);
    } catch (err) {
      console.error(err);
      this.newsLoading.style.display = 'none';
      this.newsContainer.innerHTML = `
        <div style="text-align:center; padding:30px 16px; color:var(--text-muted);">
          <p style="margin-bottom:12px; font-size:13px;">❌ 載入新聞失敗：${err.message || '請檢查 API Key'}</p>
          <button id="btn-retry-news" class="modal-btn" style="max-width:200px; margin:0 auto;">🔄 重新整理</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-retry-news');
      if (retryBtn) retryBtn.addEventListener('click', () => this.loadDailyNews(true));
    }
  }

  renderNewsArticles(articles) {
    this.newsContainer.innerHTML = '';
    if (!articles || articles.length === 0) {
      this.newsContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">今日尚無新聞內容。</div>';
      return;
    }

    articles.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'news-card';

      const transId = `news-trans-${index}`;
      const clickableArticle = this.formatClickableWords(item.article);
      const wordCount = (item.article.match(/[a-zA-Z0-9'-]+/g) || []).length;

      let vocabHtml = '';
      if (item.vocab && item.vocab.length > 0) {
        vocabHtml = `
          <div class="news-vocab-list">
            ${item.vocab.map(v => `
              <div class="vocab-chip" data-word="${v.word.replace(/[^a-zA-Z]/g, '')}">
                <span>🔤 <strong>${v.word}</strong></span>
                <span class="vocab-chip-meaning">${v.meaning}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="news-card-header">
          <span class="news-category-badge">${item.category || '🌍 焦點時事'}</span>
          <span class="news-word-count">約 ${wordCount} 字 • 25 秒</span>
        </div>
        <div class="news-title">${item.title}</div>
        <div class="news-article">${clickableArticle}</div>
        <div id="${transId}" class="news-translation">${item.translation || ''}</div>
        ${vocabHtml}
        <div class="news-actions">
          <div class="news-audio-group">
            <button class="small-btn btn-toggle-news-trans">🌐 中文</button>
            <button class="small-btn btn-play-news">🔊 朗讀</button>
            <button class="small-btn btn-slow-news">🐢 慢速</button>
            <button class="small-btn btn-shadow-news">🎯 跟讀</button>
          </div>
          <button class="btn-news-chat">💬 聊這則新聞</button>
        </div>
      `;

      // Event handlers
      const transBox = card.querySelector(`#${transId}`);
      const btnTrans = card.querySelector('.btn-toggle-news-trans');
      btnTrans.addEventListener('click', () => {
        transBox.style.display = transBox.style.display === 'block' ? 'none' : 'block';
      });

      const btnPlay = card.querySelector('.btn-play-news');
      btnPlay.addEventListener('click', () => {
        this.speech.speak(item.article);
      });

      const btnSlow = card.querySelector('.btn-slow-news');
      btnSlow.addEventListener('click', () => {
        this.speech.speak(item.article, null, null, 0.65);
      });

      const btnShadow = card.querySelector('.btn-shadow-news');
      btnShadow.addEventListener('click', () => {
        this.startShadowingPractice(item.article);
      });

      const btnChat = card.querySelector('.btn-news-chat');
      btnChat.addEventListener('click', () => {
        this.startNewsDiscussion(item);
      });

      // Vocab chips click to speak
      card.querySelectorAll('.vocab-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const w = chip.dataset.word;
          if (w) {
            this.speech.speak(w, null, null, 0.8);
            this.showWordToast(w);
          }
        });
      });

      this.newsContainer.appendChild(card);
    });
  }

  startNewsDiscussion(article) {
    const newsScenario = {
      id: 'news-' + (article.id || Date.now()),
      title: '📰 ' + article.title,
      partner: article.partner || 'News Anchor Rachel',
      icon: '🎙️',
      systemPrompt: `You are Rachel, an enthusiastic and friendly news anchor and conversational English coach.
You and the user are having a short, engaging 1-on-1 discussion about today's news story.
News headline: "${article.title}"
News summary: "${article.article}"
Guidelines:
1. Speak in natural, concise conversational English (1-2 sentences max).
2. Encourage the user to share their personal thoughts, reactions, or questions.
3. Provide 3 clear suggested responses for English beginners after each turn.`
    };

    this.currentScenario = newsScenario;
    this.conversationHistory = [];
    this.chatMessages.innerHTML = '';
    document.getElementById('chat-partner-title').innerText = newsScenario.title;
    this.switchView('chat');

    const promptText = article.discussionPrompt || "What are your thoughts on this story?";
    const initialAI = {
      reply: `Hi! Welcome to our daily news discussion. Today's story is: "${article.title}". ${promptText}`,
      translation: `嗨！歡迎來到今日時事討論。今天的新聞是「${article.title}」。${article.translation ? '想聽聽你的看法：' + promptText : ''}`,
      correction: '',
      suggestions: [
        "I think this is very exciting news!",
        "I'm curious how this will affect people.",
        "Could you tell me more about it?"
      ]
    };

    this.conversationHistory.push({ role: 'model', content: initialAI.reply });
    this.appendAIMessage(initialAI);
    this.renderSuggestions(initialAI.suggestions);
    this.chatInputStatus.innerText = '點擊麥克風說出你的看法...';
    this.speech.speak(initialAI.reply);
  }

  // ==========================================================================
  // Practice Time & Streak Statistics Tracker
  // ==========================================================================

  initStats() {
    const raw = localStorage.getItem('talkpulse_practice_stats');
    const defaultStats = {
      totalSeconds: 0,
      dailyRecords: {},
      streak: 1,
      lastActiveDate: ''
    };

    try {
      this.stats = raw ? JSON.parse(raw) : defaultStats;
    } catch (e) {
      this.stats = defaultStats;
    }

    if (!this.stats.dailyRecords) this.stats.dailyRecords = {};

    this.checkAndUpdateStreak();
    this.updateStatsUI();
    this.startPracticeTimer();
  }

  checkAndUpdateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.stats.lastActiveDate) {
      this.stats.lastActiveDate = today;
      this.stats.streak = 1;
      this.saveStats();
      return;
    }

    if (this.stats.lastActiveDate === today) {
      return;
    }

    const lastDate = new Date(this.stats.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day streak check
    } else if (diffDays > 1) {
      // Streak broken
      this.stats.streak = 1;
      this.saveStats();
    }
  }

  recordPracticeActivity(seconds = 1) {
    const today = new Date().toISOString().slice(0, 10);

    if (this.stats.lastActiveDate !== today) {
      if (this.stats.lastActiveDate) {
        const lastDate = new Date(this.stats.lastActiveDate);
        const todayDate = new Date(today);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          this.stats.streak = (this.stats.streak || 1) + 1;
        } else if (diffDays > 1) {
          this.stats.streak = 1;
        }
      } else {
        this.stats.streak = 1;
      }
      this.stats.lastActiveDate = today;
    }

    this.stats.dailyRecords[today] = (this.stats.dailyRecords[today] || 0) + seconds;
    this.stats.totalSeconds = (this.stats.totalSeconds || 0) + seconds;
    this.saveStats();
    this.updateStatsUI();
  }

  saveStats() {
    try {
      localStorage.setItem('talkpulse_practice_stats', JSON.stringify(this.stats));
    } catch (e) {}
  }

  startPracticeTimer() {
    setInterval(() => {
      // Track practice time when in Chat, Call, News, or Shadowing Modal
      const isPracticing = 
        this.currentMode === 'chat' || 
        this.currentMode === 'call' || 
        this.currentMode === 'news' || 
        (this.modalShadowing && this.modalShadowing.classList.contains('active')) ||
        (this.modalChineseHelper && this.modalChineseHelper.classList.contains('active'));

      if (isPracticing) {
        this.recordPracticeActivity(1);
      }
    }, 1000);
  }

  formatDuration(totalSec) {
    if (!totalSec || totalSec <= 0) return '0 分鐘';
    if (totalSec < 60) return `${totalSec} 秒`;

    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;

    if (mins < 60) {
      return secs > 0 && mins < 3 ? `${mins}分 ${secs}秒` : `${mins} 分鐘`;
    }

    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours} 小時 ${remainMins} 分` : `${hours} 小時`;
  }

  updateStatsUI() {
    const today = new Date().toISOString().slice(0, 10);
    const todaySec = this.stats?.dailyRecords?.[today] || 0;
    const totalSec = this.stats?.totalSeconds || 0;
    const streak = this.stats?.streak || 1;

    if (this.statTodayTime) {
      this.statTodayTime.innerText = this.formatDuration(todaySec);
    }
    if (this.statTotalTime) {
      this.statTotalTime.innerText = this.formatDuration(totalSec);
    }
    if (this.statStreakDays) {
      this.statStreakDays.innerText = `${streak} 天`;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TalkPulseApp();
});
