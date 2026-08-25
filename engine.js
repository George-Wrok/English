// ==========================================================================
// Web Speech API (STT & TTS) & Gemini AI Integration Engine (v3 - Multi-endpoint)
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

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }
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
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition already started:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
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
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onComplete) utterance.onend = onComplete;

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey ? apiKey.trim() : '';
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
  }

  // Build all possible endpoint + model combinations to try
  _buildEndpoints() {
    const key = this.apiKey;
    const apiVersions = ['v1beta', 'v1'];
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ];

    const endpoints = [];
    for (const ver of apiVersions) {
      for (const model of modelNames) {
        endpoints.push(
          `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`
        );
      }
    }
    return endpoints;
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

    const endpoints = this._buildEndpoints();
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
      // Try with system_instruction first
      for (const bodyPayload of [
        // Attempt 1: Standard payload with system_instruction
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: formattedContents,
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
        },
        // Attempt 2: Without system_instruction (inject as first user turn)
        {
          contents: [
            { role: 'user', parts: [{ text: systemInstruction + '\n\nPlease acknowledge and wait for my first message.' }] },
            { role: 'model', parts: [{ text: '{"reply":"Sure! I am ready. Go ahead!","translation":"沒問題，我準備好了！","correction":"","suggestions":["Hi, how are you?","I would like to order a coffee.","Could you repeat that?"]}' }] },
            ...formattedContents
          ],
          generationConfig: { temperature: 0.7 }
        }
      ]) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastErrorMsg = errData?.error?.message || `HTTP ${response.status}`;
            continue;
          }

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) continue;

          return this._cleanJsonResponse(rawText);
        } catch (err) {
          lastErrorMsg = err.message;
          continue;
        }
      }
    }

    throw new Error(lastErrorMsg || '無法連線至 Gemini API，請確認 API 金鑰有效');
  }
}
