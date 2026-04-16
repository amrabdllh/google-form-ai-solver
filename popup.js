// popup.js — v2.1 with KoboiLLM

const PROVIDERS = {
  koboi: {
    name: 'KoboiLLM (Indonesia)',
    color: '#c084fc',
    placeholder: 'sk-...',
    hint: `🇮🇩 <b>KoboiLLM — AI Provider Lokal Indonesia!</b><br>
           Daftar di <a href="https://docs.koboillm.com/pembuatan-akun" target="_blank">docs.koboillm.com</a> atau WA <a href="https://wa.me/6289528067981" target="_blank">+62 895 2806 7981</a>.<br>
           Akses 100+ model (GPT, Claude, Gemini, DeepSeek) dalam satu key. Top up saldo Rupiah!`,
  },
  gemini: {
    name: 'Gemini (Google)',
    color: '#4285f4',
    placeholder: 'AIzaSy...',
    hint: `💎 <b>Gemini — 100% GRATIS!</b><br>
           Buka <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com/app/apikey</a> → Login Google → <b>Create API key</b>.<br>
           Tidak perlu kartu kredit. Model: <code>gemini-2.0-flash</code>`,
  },
  grok: {
    name: 'Grok (xAI)',
    color: '#1d9bf0',
    placeholder: 'xai-...',
    hint: `𝕏 <b>Grok</b> — Buka <a href="https://console.x.ai" target="_blank">console.x.ai</a> → Login → <b>API Keys → Create</b>.<br>
           Ada <b>$25 free credit/bulan</b> untuk akun baru. Format: <code>xai-...</code>`,
  },
  openai: {
    name: 'ChatGPT (OpenAI)',
    color: '#10a37f',
    placeholder: 'sk-proj-...',
    hint: `🟢 <b>ChatGPT</b> — <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a><br>
           ⚠️ Perlu isi saldo min. $5 di billing. Tidak ada free tier sejak 2024.`,
  },
  claude: {
    name: 'Claude (Anthropic)',
    color: '#e94560',
    placeholder: 'sk-ant-api03-...',
    hint: `🔴 <b>Claude</b> — <a href="https://console.anthropic.com/api-keys" target="_blank">console.anthropic.com</a> → API Keys → Create.<br>
           Perlu isi saldo. Format: <code>sk-ant-api03-...</code>`,
  },
};

let selectedProvider = null;

const apiKeyInput  = document.getElementById('apiKey');
const saveKeyBtn   = document.getElementById('saveKey');
const toggleVisBtn = document.getElementById('toggleVis');
const autoToggle   = document.getElementById('autoSolve');
const solveBtn     = document.getElementById('solveBtn');
const statusEl     = document.getElementById('status');
const statusText   = document.getElementById('statusText');
const spinner      = document.getElementById('spinner');
const apiHint      = document.getElementById('apiHint');
const mainContent  = document.getElementById('main-content');
const notForm      = document.getElementById('not-form');
const providerBtns = document.querySelectorAll('.provider-btn');
const modelRow     = document.getElementById('modelRow');
const modelSelect  = document.getElementById('modelSelect');

// ── Check Google Form ─────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (!url.includes('docs.google.com/forms')) {
    mainContent.style.display = 'none';
    notForm.style.display     = 'block';
  }
});

// ── Load saved settings ───────────────────────────────────────────────────
chrome.storage.local.get(['provider', 'keys', 'autoSolve', 'koboimodel'], (data) => {
  if (data.autoSolve)   autoToggle.checked = true;
  if (data.koboimodel)  modelSelect.value  = data.koboimodel;
  if (data.provider)    selectProvider(data.provider, data.keys?.[data.provider] || '');
});

// ── Provider buttons ──────────────────────────────────────────────────────
providerBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.provider;
    chrome.storage.local.get('keys', (data) => {
      selectProvider(p, data.keys?.[p] || '');
    });
  });
});

function selectProvider(p, savedKey) {
  selectedProvider = p;
  const info = PROVIDERS[p];

  document.body.style.setProperty('--provider-color', info.color);
  providerBtns.forEach(b => b.classList.toggle('active', b.dataset.provider === p));

  apiHint.innerHTML       = info.hint;
  apiKeyInput.placeholder = info.placeholder;
  apiKeyInput.disabled    = false;
  apiKeyInput.value       = savedKey;
  solveBtn.disabled       = !savedKey;

  // Show model selector only for KoboiLLM
  modelRow.classList.toggle('visible', p === 'koboi');

  chrome.storage.local.set({ provider: p });
}

// ── Toggle visibility ─────────────────────────────────────────────────────
toggleVisBtn.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// ── Save model choice ─────────────────────────────────────────────────────
modelSelect.addEventListener('change', () => {
  chrome.storage.local.set({ koboimodel: modelSelect.value });
});

// ── Save key ──────────────────────────────────────────────────────────────
saveKeyBtn.addEventListener('click', () => {
  if (!selectedProvider) { showStatus('error', '❌ Pilih provider dulu!'); return; }
  const key = apiKeyInput.value.trim();
  if (!key) { showStatus('error', '❌ API key tidak boleh kosong!'); return; }

  chrome.storage.local.get('keys', (data) => {
    const keys = data.keys || {};
    keys[selectedProvider] = key;
    const extra = selectedProvider === 'koboi' ? { koboimodel: modelSelect.value } : {};
    chrome.storage.local.set({ keys, ...extra }, () => {
      solveBtn.disabled = false;
      showStatus('success', '✅ Tersimpan!');
    });
  });
});

// ── Auto-solve ────────────────────────────────────────────────────────────
autoToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoSolve: autoToggle.checked });
});

// ── Solve ─────────────────────────────────────────────────────────────────
solveBtn.addEventListener('click', () => {
  if (!selectedProvider) { showStatus('error', '❌ Pilih provider dulu!'); return; }

  chrome.storage.local.get(['keys', 'koboimodel'], (data) => {
    const key = data.keys?.[selectedProvider];
    if (!key) { showStatus('error', '❌ Simpan API key dulu!'); return; }

    solveBtn.disabled = true;
    showStatus('info', 'Membaca soal-soal…', true);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'solveForm',
          provider: selectedProvider,
          apiKey: key,
          koboimodel: data.koboimodel || 'openai/gpt-4o-mini',
        },
        (response) => {
          solveBtn.disabled = false;
          if (chrome.runtime.lastError) {
            showStatus('error', '❌ Gagal terhubung. Refresh halaman & coba lagi.');
            return;
          }
          if (response?.success) showStatus('success', `✅ ${response.count} soal berhasil dijawab!`);
          else                   showStatus('error', `❌ ${response?.error || 'Terjadi kesalahan.'}`);
        }
      );
    });
  });
});

function showStatus(type, msg, loading = false) {
  statusEl.className     = `status show ${type}`;
  statusText.textContent = msg;
  spinner.style.display  = loading ? 'block' : 'none';
}
