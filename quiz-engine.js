/**
 * quiz-engine.js
 * Modular quiz engine for the C Learning Platform.
 * Supports: mcq | predict_output | code_completion | fill_blank
 */

const QuizEngine = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let questionBank = {};          // { lessonId: [ question, ... ] }
  let lessonState  = {};          // { lessonId: { answered: bool, correct: bool } }

  // Callbacks injected by the host page
  let onLessonPass  = () => {};   // called when a lesson's first question passes
  let onAllComplete = () => {};   // called when every lesson is done

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Load questions from a JSON file then initialise the engine.
   * @param {string}   jsonPath  - path to questions.json
   * @param {object}   callbacks - { onLessonPass, onAllComplete }
   */
  async function init(jsonPath, callbacks = {}) {
    if (callbacks.onLessonPass)  onLessonPass  = callbacks.onLessonPass;
    if (callbacks.onAllComplete) onAllComplete = callbacks.onAllComplete;

    try {
      const res  = await fetch(jsonPath);
      const data = await res.json();
      questionBank = data.lessons;
    } catch (e) {
      console.error('[QuizEngine] Failed to load questions:', e);
      return;
    }

    // Build per-lesson state
    Object.keys(questionBank).forEach(id => {
      lessonState[id] = { answered: false, correct: false };
    });

    // Render every quiz container found in the DOM
    document.querySelectorAll('[data-quiz-lesson]').forEach(container => {
      const lessonId = container.dataset.quizLesson;
      if (questionBank[lessonId]) {
        renderLesson(container, lessonId);
      }
    });
  }

  /** Returns true if the lesson's gate question has been answered correctly. */
  function isLessonPassed(lessonId) {
    return lessonState[String(lessonId)]?.correct === true;
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function renderLesson(container, lessonId) {
    const questions = questionBank[lessonId];
    container.innerHTML = '';

    questions.forEach((q, idx) => {
      const block = document.createElement('div');
      block.className = 'qe-question-block';
      block.id = `qblock-${q.id}`;
      block.dataset.lessonId = lessonId;
      block.dataset.qIdx = idx;
      block.dataset.isGate = idx === 0 ? 'true' : 'false'; // first q is the gate

      // Header badge
      const badge = makeBadge(q.type);
      block.appendChild(badge);

      // Prompt
      const prompt = document.createElement('p');
      prompt.className = 'qe-prompt';
      prompt.innerHTML = q.prompt;
      block.appendChild(prompt);

      // Type-specific input area
      switch (q.type) {
        case 'mcq':            block.appendChild(renderMCQ(q));            break;
        case 'predict_output': block.appendChild(renderPredictOutput(q));  break;
        case 'code_completion':block.appendChild(renderCodeCompletion(q)); break;
        case 'fill_blank':     block.appendChild(renderFillBlank(q));      break;
        default:
          console.warn('[QuizEngine] Unknown question type:', q.type);
      }

      // Feedback + explanation area (hidden until submit)
      const feedback = document.createElement('div');
      feedback.className = 'qe-feedback';
      feedback.id = `feedback-${q.id}`;
      block.appendChild(feedback);

      // Add bottom separator except for the last question
      if (idx < questions.length - 1) {
        block.appendChild(Object.assign(document.createElement('hr'), { className: 'qe-divider' }));
      }

      container.appendChild(block);
    });
  }

  // ── MCQ ────────────────────────────────────────────────────────────

  function renderMCQ(q) {
    const wrap = document.createElement('div');
    wrap.className = 'qe-options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';   // reuse existing style
      btn.innerHTML = opt;
      btn.addEventListener('click', () => submitMCQ(q, i, btn, wrap));
      wrap.appendChild(btn);
    });

    return wrap;
  }

  function submitMCQ(q, choiceIndex, btn, wrap) {
    if (wrap.dataset.done) return;

    const isCorrect = choiceIndex === q.correct;
    const feedbackEl = document.getElementById(`feedback-${q.id}`);
    const block = document.getElementById(`qblock-${q.id}`);
    const lessonId = block.dataset.lessonId;
    const isGate = block.dataset.isGate === 'true';

    if (isCorrect) {
      btn.classList.add('correct');
      wrap.dataset.done = '1';
      disableOptions(wrap);
      showFeedback(feedbackEl, true, q.hints[choiceIndex], q.explanation);
      markPassed(lessonId, isGate);
    } else {
      btn.classList.add('wrong');
      showFeedback(feedbackEl, false, q.hints[choiceIndex], null);
      setTimeout(() => btn.classList.remove('wrong'), 900);
    }
  }

  // ── Predict Output ─────────────────────────────────────────────────

  function renderPredictOutput(q) {
    const wrap = document.createElement('div');

    // Code display
    const codeBox = document.createElement('pre');
    codeBox.className = 'code-block qe-code-preview';
    codeBox.innerHTML = q.code;
    wrap.appendChild(codeBox);

    // Input row
    const row = document.createElement('div');
    row.className = 'qe-input-row';

    const label = document.createElement('label');
    label.className = 'qe-label';
    label.textContent = 'Your predicted output:';
    label.htmlFor = `input-${q.id}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${q.id}`;
    input.className = 'qe-text-input';
    input.placeholder = 'Type the exact output…';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary qe-submit-btn';
    submitBtn.textContent = 'Check';

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(submitBtn);
    wrap.appendChild(row);

    const handler = () => submitTextAnswer(q, input, submitBtn, wrap);
    submitBtn.addEventListener('click', handler);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });

    return wrap;
  }

  // ── Code Completion ────────────────────────────────────────────────

  function renderCodeCompletion(q) {
    const wrap = document.createElement('div');

    // Show partial code context
    const codeBox = document.createElement('pre');
    codeBox.className = 'code-block qe-code-preview';
    codeBox.innerHTML =
      `<span class="code-cmt">// …fill in the blank below…</span>\n` +
      q.code_before +
      `<span class="qe-blank-marker"> ___ </span>` +
      q.code_after;
    wrap.appendChild(codeBox);

    const row = document.createElement('div');
    row.className = 'qe-input-row';

    const label = document.createElement('label');
    label.className = 'qe-label';
    label.textContent = 'Your answer:';
    label.htmlFor = `input-${q.id}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${q.id}`;
    input.className = 'qe-text-input';
    input.placeholder = 'Type what goes in the blank…';
    input.setAttribute('spellcheck', 'false');

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary qe-submit-btn';
    submitBtn.textContent = 'Submit';

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(submitBtn);
    wrap.appendChild(row);

    const handler = () => submitTextAnswer(q, input, submitBtn, wrap);
    submitBtn.addEventListener('click', handler);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });

    return wrap;
  }

  // ── Fill in the Blank ──────────────────────────────────────────────

  function renderFillBlank(q) {
    const wrap = document.createElement('div');

    // Template display with inline input fields replacing ___
    const templateWrap = document.createElement('div');
    templateWrap.className = 'qe-fill-template';

    // Split template on ___ and create inputs for each blank
    const parts = q.template.split('___');
    const inputs = [];

    parts.forEach((part, i) => {
      const span = document.createElement('span');
      span.innerHTML = part;
      templateWrap.appendChild(span);

      if (i < parts.length - 1) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'qe-inline-input';
        inp.placeholder = '???';
        inp.setAttribute('spellcheck', 'false');
        inp.id = `blank-${q.id}-${i}`;
        inputs.push(inp);
        templateWrap.appendChild(inp);
      }
    });

    wrap.appendChild(templateWrap);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary qe-submit-btn';
    submitBtn.style.marginTop = '1rem';
    submitBtn.textContent = 'Check Blanks';
    wrap.appendChild(submitBtn);

    submitBtn.addEventListener('click', () => submitFillBlank(q, inputs, submitBtn, wrap));
    inputs.forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitFillBlank(q, inputs, submitBtn, wrap);
      });
    });

    return wrap;
  }

  // ── Submission Helpers ─────────────────────────────────────────────

  /** Generic text-answer submit (predict_output + code_completion). */
  function submitTextAnswer(q, input, submitBtn, wrap) {
    if (wrap.dataset.done) return;

    const userVal = input.value.trim();
    if (!userVal) { input.focus(); return; }

    const feedbackEl = document.getElementById(`feedback-${q.id}`);
    const block = document.getElementById(`qblock-${q.id}`);
    const lessonId = block.dataset.lessonId;
    const isGate = block.dataset.isGate === 'true';

    const isCorrect = normalise(userVal) === normalise(q.correct);

    if (isCorrect) {
      input.classList.add('qe-input-correct');
      submitBtn.disabled = true;
      input.disabled = true;
      wrap.dataset.done = '1';
      showFeedback(feedbackEl, true, '✔ Correct!', q.explanation);
      markPassed(lessonId, isGate);
    } else {
      input.classList.add('qe-input-wrong');
      showFeedback(feedbackEl, false,
        `✘ Not quite. Expected: <code>${escHtml(String(q.correct))}</code>`, null);
      setTimeout(() => input.classList.remove('qe-input-wrong'), 900);
    }
  }

  function submitFillBlank(q, inputs, submitBtn, wrap) {
    if (wrap.dataset.done) return;

    const feedbackEl = document.getElementById(`feedback-${q.id}`);
    const block = document.getElementById(`qblock-${q.id}`);
    const lessonId = block.dataset.lessonId;
    const isGate = block.dataset.isGate === 'true';

    let allCorrect = true;
    inputs.forEach((inp, i) => {
      const expected = Array.isArray(q.blanks) ? q.blanks[i] : q.blanks;
      const ok = normalise(inp.value.trim()) === normalise(expected);
      inp.classList.toggle('qe-input-correct', ok);
      inp.classList.toggle('qe-input-wrong', !ok);
      if (!ok) allCorrect = false;
    });

    if (allCorrect) {
      inputs.forEach(inp => { inp.disabled = true; });
      submitBtn.disabled = true;
      wrap.dataset.done = '1';
      showFeedback(feedbackEl, true, '✔ All blanks correct!', q.explanation);
      markPassed(lessonId, isGate);
    } else {
      showFeedback(feedbackEl, false, '✘ Some blanks are wrong. Try again.', null);
      setTimeout(() => {
        inputs.forEach(inp => inp.classList.remove('qe-input-wrong', 'qe-input-correct'));
      }, 1200);
    }
  }

  // ── State management ───────────────────────────────────────────────

  function markPassed(lessonId, isGate) {
    if (isGate && !lessonState[lessonId]?.correct) {
      lessonState[lessonId].correct = true;
      onLessonPass(parseInt(lessonId, 10));
    }

    // Check if ALL gate questions are done
    const allDone = Object.keys(questionBank).every(id => lessonState[id]?.correct);
    if (allDone) onAllComplete();
  }

  // ── UI Helpers ─────────────────────────────────────────────────────

  function showFeedback(el, isCorrect, message, explanation) {
    el.className = 'qe-feedback ' + (isCorrect ? 'qe-feedback-correct' : 'qe-feedback-wrong');

    let html = `<span class="qe-feedback-msg">${message}</span>`;

    if (isCorrect && explanation) {
      html += `
        <div class="qe-output-box">
          <div class="qe-output-label">📝 Explanation</div>
          <div class="qe-explanation">${explanation}</div>
        </div>`;
    }

    el.innerHTML = html;
    el.style.display = 'block';
  }

  function disableOptions(wrap) {
    wrap.querySelectorAll('.quiz-option').forEach(b => {
      b.style.pointerEvents = 'none';
    });
  }

  function makeBadge(type) {
    const map = {
      mcq:             { label: 'Multiple Choice', icon: '🔘' },
      predict_output:  { label: 'Predict Output',  icon: '🔮' },
      code_completion: { label: 'Code Completion',  icon: '✏️' },
      fill_blank:      { label: 'Fill in the Blank', icon: '📝' },
    };
    const info = map[type] || { label: type, icon: '❓' };
    const badge = document.createElement('div');
    badge.className = 'qe-type-badge';
    badge.innerHTML = `${info.icon} <span>${info.label}</span>`;
    return badge;
  }

  function normalise(str) {
    // Case-insensitive, collapse whitespace, strip surrounding quotes
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Export ─────────────────────────────────────────────────────────
  return { init, isLessonPassed };
})();
