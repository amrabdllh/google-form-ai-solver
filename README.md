# 🤖 Google Form AI Solver v2.0

Chrome Extension yang otomatis menjawab soal Google Form — pilih AI provider favoritmu!

## ✨ AI Provider yang Didukung

| Provider | Model | Free Tier |
|----------|-------|-----------|
| 🟢 **ChatGPT** (OpenAI) | gpt-4o-mini | $5 free credit akun baru |
| 💎 **Gemini** (Google) | gemini-1.5-flash | Gratis tanpa kartu kredit! |
| 𝕏 **Grok** (xAI) | grok-3-mini | Free quota bulanan |
| 🔴 **Claude** (Anthropic) | claude-sonnet | Berbayar |

## 🚀 Cara Install

1. Extract folder `gform-ai-extension` ke komputer
2. Buka Chrome → `chrome://extensions`
3. Aktifkan **Developer Mode** (pojok kanan atas)
4. Klik **"Load unpacked"** → pilih folder `gform-ai-extension`

## 🔑 Cara Dapat API Key Gratis

### Gemini (Paling Mudah & 100% Gratis)
1. Buka https://aistudio.google.com/app/apikey
2. Login Google → klik "Create API Key"
3. Copy key (format: `AIzaSy...`)

### ChatGPT
1. Daftar di https://platform.openai.com
2. Pergi ke API Keys → Create new key
3. Ada $5 free credit untuk akun baru (format: `sk-...`)

### Grok
1. Daftar di https://console.x.ai
2. API Keys → Create key
3. Ada free monthly quota (format: `xai-...`)

## 🎮 Cara Pakai

1. Buka Google Form berisi soal
2. Klik ikon ekstensi di toolbar Chrome
3. Pilih AI provider & masukkan API key → Simpan
4. Klik **✨ Jawab Sekarang** — atau aktifkan **Auto Solve** agar otomatis!

## 📁 Struktur File
```
gform-ai-extension/
├── manifest.json
├── popup.html / popup.js
├── content.js
├── overlay.css
├── background.js
└── icons/
```
