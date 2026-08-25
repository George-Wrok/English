// ==========================================================================
// Web Speech API (STT & TTS) & Gemini AI Integration Engine (Direct & Robust)
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

IMPORTANT OUTPUT INSTRUCTION:
Return ONLY a raw JSON object with no markdown formatting, no codeblocks:
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

    // Filter valid conversation messages
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Target official models with fallback endpoints
    const requestCandidates = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        body: {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: formattedContents,
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7
          }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        body: {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: formattedContents,
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7
          }
        }
      },
      {
        // Standard payload without system_instruction (for maximum legacy compatibility)
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        body: {
          contents: [
            { role: 'user', parts: [{ text: systemInstruction }] },
            { role: 'model', parts: [{ text: '{"reply":"Understood!","translation":"明白","correction":"","suggestions":["OK"]}' }] },
            ...formattedContents
          ]
        }
      }
    ];

    let lastErrorMessage = '';

    for (let i = 0; i < requestCandidates.length; i++) {
      const candidate = requestCandidates[i];
      try {
        const response = await fetch(candidate.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(candidate.body)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastErrorMessage = errData?.error?.message || `HTTP ${response.status}`;
          continue; // Try next fallback candidate
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('AI 回傳空內容');
        }

        let cleaned = rawText.trim();
        // Remove markdown backticks if any
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        }

        return JSON.parse(cleaned);
      } catch (err) {
        console.warn(`Request candidate ${i} failed:`, err);
        lastErrorMessage = err.message;
      }
    }

    throw new Error(lastErrorMessage || '無法連線至 Gemini API，請確認 API 金鑰有效性');
  }
}
