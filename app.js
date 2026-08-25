// ==========================================================================
// TalkPulse Main App Controller (Without Diagnosis Report)
// ==========================================================================

import { SCENARIOS } from './scenarios.js';
import { SpeechEngine, GeminiService } from './engine.js';

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

    // Chat navigation
    document.getElementById('btn-chat-back').addEventListener('click', () => this.switchView('scenario'));
    document.getElementById('btn-switch-to-call').addEventListener('click', () => this.startCallMode());

    // Chat controls
    this.btnChatMic.addEventListener('click', () => this.toggleSpeech());

    // Call controls
    this.btnCallMic.addEventListener('click', () => this.toggleSpeech());
    this.btnCallHangup.addEventListener('click', () => this.endCallMode());
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
