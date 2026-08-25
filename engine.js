// ==========================================================================
// Web Speech API (STT & TTS) & Gemini AI Integration Engine
// v4 - Auto-discover available models before calling
// ==========================================================================

export class SpeechEngine {
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

export class GeminiService {
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
