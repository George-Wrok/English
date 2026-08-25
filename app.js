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
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => { this.isListening = true; };
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.customResultCallback) {
        this.customResultCallback(transcript);
      } else if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }
    };
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.customEndCallback) {
        this.customEndCallback();
      } else if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    this.recognition.onend = () => {
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
    if (this.recognition && this.isListening) {
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
      this.speech.stopListening();
    } else {
      this.speech.startListening();
      this.btnChatMic.classList.add('recording');
      this.btnCallMic.classList.add('speaking');
      this.chatInputStatus.innerText = '聆聽中... (請用英文說話)';
      if (this.currentMode === 'call') {
        this.callStatusText.innerText = '正在聆聽您的發音...';
      }
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

  showWordToast(word) {
    if (!this.wordToast) return;
    this.wordToast.innerHTML = `
      <span>🔊 <strong>${word}</strong></span>
      <button class="word-toast-btn btn-toast-slow">🐢 慢速</button>
    `;
    this.wordToast.classList.add('active');

    const btnSlow = this.wordToast.querySelector('.btn-toast-slow');
    if (btnSlow) {
      btnSlow.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speech.speak(word, null, null, 0.55);
      });
    }

    if (this.wordToastTimer) clearTimeout(this.wordToastTimer);
    this.wordToastTimer = setTimeout(() => {
      this.wordToast.classList.remove('active');
    }, 2500);
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
      this.shadowingFeedback.innerText = '已暫停跟讀。可點擊麥克風再次挑戰！';
    } else {
      this.isListeningShadowing = true;
      this.btnShadowingMic.classList.add('recording');
      this.shadowingFeedback.innerText = '🎙️ 正在聆聽... 請朗讀上方英文句子！';

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
      this.shadowingFeedback.innerHTML = '🎉 <strong>太棒了！100% 完整發音正確！</strong>';
      this.speech.stopListening();
      this.isListeningShadowing = false;
      this.btnShadowingMic.classList.remove('recording');
    } else {
      this.shadowingFeedback.innerText = `已匹配 ${matchedCount} / ${wordSpans.length} 個單字，繼續朗讀...`;
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
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TalkPulseApp();
});
