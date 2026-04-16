# 🤖 Google Form AI Solver v2.1

Chrome Extension yang otomatis menjawab soal Google Form — pilih AI provider favoritmu, termasuk **KoboiLLM**, provider lokal Indonesia!

## ✨ AI Provider yang Didukung

| Provider | Model | Harga |
|----------|-------|-------|
| 🇮🇩 **KoboiLLM** (Indonesia) | 100+ model (GPT, Claude, Gemini, DeepSeek, dll) | Top up saldo Rupiah |
| 💎 **Gemini** (Google) | gemini-2.0-flash | Gratis tanpa kartu kredit! |
| 𝕏 **Grok** (xAI) | grok-3-mini | $25 free credit/bulan |
| 🟢 **ChatGPT** (OpenAI) | gpt-4o-mini | Perlu isi saldo min. $5 |
| 🔴 **Claude** (Anthropic) | claude-sonnet-4 | Perlu isi saldo |

## 🚀 Cara Install

1. Download / clone repo ini
2. Buka Chrome → `chrome://extensions`
3. Aktifkan **Developer Mode** (pojok kanan atas)
4. Klik **"Load unpacked"** → pilih folder `gform-ai-extension`

## 🔑 Cara Dapat API Key

### 🇮🇩 KoboiLLM (Rekomendasi untuk pengguna Indonesia)
1. Daftar di [docs.koboillm.com/pembuatan-akun](https://docs.koboillm.com/pembuatan-akun) atau WA [+62 895 2806 7981](https://wa.me/6289528067981)
2. Top up saldo Rupiah — akses 100+ model dalam **satu API key**!
3. Format key: `sk-...`

### 💎 Gemini (Paling Mudah & 100% Gratis)
1. Buka [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Login Google → klik **"Create API key"**
3. Copy key (format: `AIzaSy...`)

### 𝕏 Grok
1. Daftar di [console.x.ai](https://console.x.ai)
2. Pergi ke **API Keys → Create key**
3. Ada **$25 free credit/bulan** untuk akun baru (format: `xai-...`)

### 🟢 ChatGPT (OpenAI)
1. Daftar di [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create new key
3. ⚠️ Tidak ada free tier sejak 2024, perlu isi saldo min. $5 (format: `sk-proj-...`)

### 🔴 Claude (Anthropic)
1. Buka [console.anthropic.com](https://console.anthropic.com/api-keys)
2. Pergi ke **API Keys → Create**
3. Perlu isi saldo (format: `sk-ant-api03-...`)

## 🎮 Cara Pakai

1. Buka Google Form berisi soal
2. Klik ikon ekstensi di toolbar Chrome
3. Pilih AI provider & masukkan API key → **Simpan**
4. (Khusus KoboiLLM) Pilih model yang diinginkan
5. Klik **✨ Jawab Sekarang** — atau aktifkan **Auto Solve** agar otomatis menjawab saat form dibuka!

## 📁 Struktur File

```
gform-ai-extension/
├── manifest.json       # Konfigurasi ekstensi (Manifest V3)
├── popup.html          # UI popup ekstensi
├── popup.js            # Logic pemilihan provider & settings
├── content.js          # Script utama yang berjalan di halaman Google Form
├── overlay.css         # Styling overlay & animasi
├── background.js       # Service worker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🛠️ Tech Stack

- **Manifest V3** — Chrome Extension API terbaru
- **Vanilla JS** — Tanpa framework, ringan dan cepat
- AI APIs: KoboiLLM, Google Generative AI, OpenAI, xAI, Anthropic

## ⚠️ Disclaimer

Ekstensi ini dibuat untuk keperluan edukasi dan kemudahan. Pastikan penggunaan sesuai dengan kebijakan Google Form dan institusi masing-masing.

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.
