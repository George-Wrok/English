// ==========================================================================
// Web Speech API (STT & TTS) & Gemini AI Integration Engine (Updated)
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
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition already started or error:', e);
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
    const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('US')) && v.lang.startsWith('en'));
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
    // Supported models in order of priority
    this.models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
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

IMPORTANT OUTPUT:
You must return your response in valid JSON format ONLY:
{
  "reply": "Your 1-2 sentence conversational reply in spoken English.",
  "translation": "繁體中文翻譯",
  "correction": "若使用者的句子文法不自然，請提供一句更地道的說法 (例: Better: Can I have a latte please?)。若說得很好則留空字串。",
  "suggestions": [
    "Suggested user reply option 1 (short & natural)",
    "Suggested user reply option 2",
    "Suggested user reply option 3 (rescue phrase like: Could you repeat that?)"
  ]
}
`;

    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    let lastError = null;

    // Try models in order for maximum compatibility
    for (const modelName of this.models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: contents,
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.7
            }
          })
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Clean markdown code fence if present
        let cleanedJson = rawText.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        return JSON.parse(cleanedJson);
      } catch (err) {
        console.warn(`Model ${modelName} attempt failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('連線失敗，請檢查 API Key 是否正確');
  }

  async generateCallReport(conversationHistory) {
    if (!this.apiKey) return null;

    const historyText = conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `
Analyze this English speaking practice conversation between a beginner learner and AI:
${historyText}

Output strict JSON report:
{
  "strengths": ["Highlight 2-3 positive things the user did well in Traditional Chinese"],
  "improvements": ["Highlight 2-3 specific grammatical or natural phrasing tips in Traditional Chinese with English examples"],
  "keywords": ["List 3-5 useful workplace/daily vocabulary words from this session with Chinese explanations"]
}
`;

    for (const modelName of this.models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (!response.ok) continue;
        const data = await response.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (rawText.startsWith('```')) rawText = rawText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(rawText);
      } catch (e) {
        console.warn(e);
      }
    }
    return null;
  }
}
