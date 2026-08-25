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
      if (this.onResultCallback) this.onResultCallback(transcript);
    };
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.onEndCallback) this.onEndCallback();
    };
    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) this.onEndCallback();
    };
  }

  startListening() {
    if (!this.recognition) {
      alert('您的瀏覽器不支援 Web Speech 辨識，請使用 Chrome 或 Safari。');
      return;
    }
    if (this.synth && this.synth.speaking) this.synth.cancel();
    try { this.recognition.start(); } catch (e) { console.warn(e); }
  }

  stopListening() {
    if (this.recognition && this.isListening) this.recognition.stop();
  }

  speak(text, onStart, onComplete) {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
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
    "Suggested reply 1",
    "Suggested reply 2",
    "Suggested reply 3 (rescue phrase)"
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
      call: document.getElementById('view-call')
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
    const gridWork = document.getElementById('grid-work');
    const gridDaily = document.getElementById('grid-daily');

    gridWork.innerHTML = '';
    gridDaily.innerHTML = '';

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
        gridWork.appendChild(card);
      } else {
        gridDaily.appendChild(card);
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

  async handleUserSubmit(userText) {
    this.speech.stopListening();
    this.speech.stopSpeaking();

    this.conversationHistory.push({ role: 'user', content: userText });
    this.appendUserMessage(userText);

    this.chatInputStatus.innerText = 'AI 思考回覆中...';
    if (this.currentMode === 'call') {
      this.callStatusText.innerText = '對方正在回應...';
      this.visualizerWave.classList.add('active');
    }

    try {
      const response = await this.gemini.sendChatMessage(
        this.conversationHistory,
        this.currentScenario.systemPrompt
      );

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

  appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row user';
    row.innerHTML = `<div class="bubble">${text}</div>`;
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

    row.innerHTML = `
      <div class="bubble">
        ${data.reply}
        ${correctionHtml}
        <div id="${bubbleId}" class="translation-box">${data.translation || ''}</div>
        <div class="bubble-actions">
          <button class="small-btn btn-toggle-trans">🌐 翻譯</button>
          <button class="small-btn btn-replay-audio">🔊 重聽</button>
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

    this.chatMessages.appendChild(row);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  renderSuggestions(suggestions) {
    this.suggestionsList.innerHTML = '';
    if (!suggestions || suggestions.length === 0) {
      this.suggestionsList.innerHTML = '<div class="suggestion-chip">點擊下方麥克風說出任何英文...</div>';
      return;
    }

    suggestions.forEach(phrase => {
      const chip = document.createElement('div');
      chip.className = 'suggestion-chip';
      chip.innerText = phrase;
      chip.addEventListener('click', () => {
        this.handleUserSubmit(phrase);
      });
      this.suggestionsList.appendChild(chip);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TalkPulseApp();
});
