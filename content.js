// content.js — v2.3 Skip-proof

// ── Auto-solve ────────────────────────────────────────────────────────────
chrome.storage.local.get(['autoSolve', 'provider', 'keys', 'koboimodel'], (data) => {
  if (data.autoSolve && data.provider && data.keys?.[data.provider]) {
    setTimeout(() => solveForm(data.provider, data.keys[data.provider], data.koboimodel), 2000);
  }
});

// ── Message listener ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'solveForm') {
    solveForm(msg.provider, msg.apiKey, msg.koboimodel)
      .then(({ count }) => sendResponse({ success: true, count }))
      .catch((err)      => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ── Core ──────────────────────────────────────────────────────────────────
async function solveForm(provider, apiKey, koboimodel) {
  const questions = extractQuestions();
  if (questions.length === 0) throw new Error('Tidak ada soal yang ditemukan di form ini.');

  showOverlay(`🤖 Menganalisis ${questions.length} soal…`);

  // Split into chunks of 20 to avoid token limits cutting off answers
  const CHUNK = 20;
  let allAnswers = [];
  for (let start = 0; start < questions.length; start += CHUNK) {
    const chunk = questions.slice(start, start + CHUNK);
    const chunkWithLocalIdx = chunk.map((q, i) => ({ ...q, localIdx: i, globalIdx: start + i }));
    showOverlay(`🤖 Menjawab soal ${start + 1}–${Math.min(start + CHUNK, questions.length)} dari ${questions.length}…`);
    const prompt  = buildPrompt(chunkWithLocalIdx);
    const raw     = await callAI(provider, apiKey, prompt, koboimodel);
    // Re-map local indices back to global
    const remapped = raw.map(a => ({ ...a, index: start + (a.index ?? 0) }));
    allAnswers = allAnswers.concat(remapped);
  }

  hideOverlay();
  await applyAnswers(questions, allAnswers);
  return { count: questions.length };
}

// ── Extract questions ─────────────────────────────────────────────────────
function getOptionText(opt) {
  // 1. data-value attribute
  const dv = opt.getAttribute('data-value');
  if (dv && dv.trim()) return dv.trim();

  // 2. Known Google Forms label spans
  const labelSpan = opt.querySelector(
    '.docssharedWizToggleLabeledLabelText, ' +
    '.quantumWizTogglePaperradioLabel, ' +
    '.appsMaterialWizToggleRadiogroupOffRadio, ' +
    '[data-answer-value]'
  );
  if (labelSpan?.innerText?.trim()) return labelSpan.innerText.trim();

  // 3. innerText fallback, strip bullet characters
  return (opt.innerText || '').replace(/^[•*\-]\s*/, '').trim();
}

function extractQuestions() {
  const items = [];
  document.querySelectorAll('[role="listitem"]').forEach((container, idx) => {
    const titleEl = container.querySelector(
      '[role="heading"], ' +
      '.M7eMe, ' +
      '.freebirdFormviewerComponentsQuestionBaseTitle, ' +
      '.freebirdFormviewerViewItemsItemItemTitle, ' +
      '[data-params] .exportLabel'
    );
    if (!titleEl) return;
    const questionText = titleEl.innerText.trim();
    if (!questionText) return;

    const optionEls = container.querySelectorAll('[role="radio"], [role="checkbox"]');
    const options = [];
    optionEls.forEach(opt => {
      const el = opt.closest('[data-value]') || opt;
      const text = getOptionText(el);
      if (text) options.push(text);
    });
    const uniqueOptions = [...new Map(options.map(o => [o.toLowerCase(), o])).values()];

    const dropdownOptions = container.querySelectorAll('[role="option"]');
    const dropOptions = [];
    dropdownOptions.forEach(opt => {
      const text = opt.getAttribute('data-value') || opt.innerText?.trim();
      if (text && text !== 'Pilih' && text !== 'Choose' && text !== '') dropOptions.push(text);
    });

    const textInput = container.querySelector('input[type="text"], textarea');
    const type = optionEls.length > 0
      ? (optionEls[0].getAttribute('role') === 'checkbox' ? 'checkbox' : 'radio')
      : dropdownOptions.length > 0 ? 'dropdown'
      : textInput ? 'text'
      : 'unknown';

    items.push({
      index:   idx,
      text:    questionText,
      options: type === 'dropdown' ? dropOptions : uniqueOptions,
      type,
      element: container,
    });
  });
  return items;
}

// ── Prompt ────────────────────────────────────────────────────────────────
function buildPrompt(questions) {
  // questions have .localIdx (0-based within this chunk) and .globalIdx
  const total = questions.length;
  let p = `Kamu adalah asisten menjawab soal ujian/kuis dengan tepat.

PENTING: Balas HANYA dengan JSON array. Tanpa backtick, tanpa penjelasan, tanpa komentar.
Format: [{"index":0,"answer":"..."},{"index":1,"answer":"..."},...]

Aturan:
- RADIO/CHECKBOX: salin PERSIS teks salah satu pilihan yang benar (huruf per huruf, termasuk spasi).
- TEXT: jawaban lengkap Bahasa Indonesia.
- WAJIB jawab SEMUA ${total} soal. Index mulai dari 0 sampai ${total - 1}.
- JANGAN skip soal apapun.

Soal:\n\n`;

  questions.forEach((q) => {
    const i = q.localIdx;
    p += `Soal index ${i}: [${q.type.toUpperCase()}] ${q.text}\n`;
    if (q.options.length > 0)
      p += `  Pilihan: ${q.options.map((o, j) => `(${String.fromCharCode(65+j)}) ${o}`).join(' | ')}\n`;
    p += '\n';
  });

  p += `\nWAJIB: JSON harus berisi TEPAT ${total} item, index 0 sampai ${total - 1}. Balas HANYA JSON.`;
  return p;
}

// ── AI Dispatcher ─────────────────────────────────────────────────────────
async function callAI(provider, apiKey, prompt, koboimodel) {
  switch (provider) {
    case 'koboi':  return callKoboi(apiKey, prompt, koboimodel);
    case 'openai': return callOpenAI(apiKey, prompt);
    case 'gemini': return callGemini(apiKey, prompt);
    case 'grok':   return callGrok(apiKey, prompt);
    case 'claude': return callClaude(apiKey, prompt);
    default: throw new Error('Provider tidak dikenal: ' + provider);
  }
}

async function callKoboi(apiKey, prompt, model = 'openai/gpt-4o-mini') {
  const res = await fetch('https://lite.koboillm.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, max_tokens: 4000, temperature: 0.1,
      messages: [
        { role: 'system', content: 'Jawab soal ujian. Balas HANYA JSON array. Jangan skip soal apapun.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('API key KoboiLLM tidak valid.');
    if (res.status === 403) throw new Error('Akses ditolak. Cek saldo KoboiLLM.');
    if (res.status === 429) throw new Error('Rate limit KoboiLLM. Tunggu sebentar.');
    throw new Error(e?.error?.message || e?.message || `KoboiLLM error ${res.status}`);
  }
  return parseJSON((await res.json()).choices?.[0]?.message?.content || '[]');
}

async function callOpenAI(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error('Quota ChatGPT habis. Pakai KoboiLLM/Gemini.');
    throw new Error(e?.error?.message || `OpenAI error ${res.status}`);
  }
  return parseJSON((await res.json()).choices?.[0]?.message?.content || '[]');
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 4000, temperature: 0.1 } }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 400) throw new Error('API key Gemini tidak valid.');
    if (res.status === 403) throw new Error('Gemini API belum diaktifkan.');
    throw new Error(e?.error?.message || `Gemini error ${res.status}`);
  }
  return parseJSON((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '[]');
}

async function callGrok(apiKey, prompt) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-3-mini', max_tokens: 4000, temperature: 0.1,
      messages: [
        { role: 'system', content: 'Answer quiz. Return ONLY JSON array. Never skip questions.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw new Error('API key Grok tidak valid.');
    if (res.status === 429) throw new Error('Quota Grok habis.');
    throw new Error(e?.error?.message || `Grok error ${res.status}`);
  }
  return parseJSON((await res.json()).choices?.[0]?.message?.content || '[]');
}

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'x-api-key': apiKey,
      'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Claude error ${res.status}`);
  }
  return parseJSON((await res.json()).content?.[0]?.text || '[]');
}

// ── JSON parser ───────────────────────────────────────────────────────────
function parseJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    throw new Error('AI tidak memberikan respons JSON yang valid.');
  }
}

// ── Apply answers ─────────────────────────────────────────────────────────
function applyAnswers(questions, answers) {
  return new Promise(resolve => {
    // Build map: globalIndex → answer string
    const answerMap = {};
    answers.forEach(a => {
      if (a != null && a.index != null && a.answer != null) {
        answerMap[a.index] = String(a.answer).trim();
      }
    });

    let i = 0;
    function applyNext() {
      if (i >= questions.length) { resolve(); return; }
      const q      = questions[i];
      const answer = answerMap[i];
      i++;

      if (!q || !answer) {
        setTimeout(applyNext, 80);
        return;
      }

      try {
        if      (q.type === 'radio')    selectOption(q.element, answer, 'radio');
        else if (q.type === 'checkbox') answer.split(',').map(s => s.trim()).forEach(p => selectOption(q.element, p, 'checkbox'));
        else if (q.type === 'dropdown') selectDropdown(q.element, answer);
        else if (q.type === 'text')     fillText(q.element, answer);
      } catch(e) {
        console.warn('[GFormAI] Error applying answer for Q' + i, e);
      }

      setTimeout(applyNext, 220);
    }
    applyNext();
  });
}

// ── Normalize ─────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ── Select radio / checkbox ───────────────────────────────────────────────
function selectOption(container, answer, role) {
  const ansNorm = normalize(answer);
  let matched = false;

  container.querySelectorAll(`[role="${role}"]`).forEach(opt => {
    if (matched && role === 'radio') return;

    const wrapper = opt.closest('[data-value]') || opt;
    const val = normalize(getOptionText(wrapper));

    // Match strategies: exact → contains → starts-with (for truncated text)
    const isMatch =
      val === ansNorm ||
      val.includes(ansNorm) ||
      ansNorm.includes(val) ||
      (val.length > 8 && ansNorm.slice(0, val.length) === val);

    if (isMatch) {
      matched = true;
      triggerClick(opt);
      if (wrapper !== opt) triggerClick(wrapper);
      flashHighlight(wrapper);
    }
  });
}

function triggerClick(el) {
  el.focus?.();
  ['mousedown', 'mouseup', 'click'].forEach(name =>
    el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, view: window }))
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────
function selectDropdown(container, answer) {
  const trigger = container.querySelector(
    '[role="listbox"], .quantumWizMenuPaperselectOption, .exportSelect, select'
  );
  if (!trigger) return;
  if (trigger.tagName === 'SELECT') {
    const opt = [...trigger.options].find(o =>
      normalize(o.text) === normalize(answer) || normalize(o.value) === normalize(answer)
    );
    if (opt) { trigger.value = opt.value; trigger.dispatchEvent(new Event('change', { bubbles: true })); flashHighlight(trigger); }
    return;
  }
  triggerClick(trigger);
  setTimeout(() => {
    document.querySelectorAll('[role="option"], [role="listbox"] [data-value]').forEach(opt => {
      if (normalize(opt.innerText) === normalize(answer) || normalize(opt.getAttribute('data-value') || '') === normalize(answer)) {
        triggerClick(opt); flashHighlight(opt);
      }
    });
  }, 400);
}

// ── Text input ────────────────────────────────────────────────────────────
function fillText(container, answer) {
  const input = container.querySelector('input[type="text"], textarea');
  if (!input) return;
  input.focus();
  const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, answer);
  ['input', 'change', 'blur'].forEach(n => input.dispatchEvent(new Event(n, { bubbles: true })));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  flashHighlight(input);
}

// ── Visual feedback ───────────────────────────────────────────────────────
function flashHighlight(el) {
  if (!el) return;
  el.style.outline = '2px solid #c084fc';
  setTimeout(() => { el.style.outline = ''; }, 2000);
}

// ── Overlay ───────────────────────────────────────────────────────────────
function showOverlay(msg) {
  let o = document.getElementById('__ai-solver-overlay__');
  if (!o) { o = document.createElement('div'); o.id = '__ai-solver-overlay__'; document.body.appendChild(o); }
  o.innerHTML = `<div class="ais-card"><div class="ais-spinner"></div><div class="ais-text">${msg}</div></div>`;
  o.style.display = 'flex';
}
function hideOverlay() {
  const o = document.getElementById('__ai-solver-overlay__');
  if (o) o.style.display = 'none';
}
