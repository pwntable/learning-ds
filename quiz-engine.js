const QuizEngine = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let questionBank = {};          
  let lessonState  = {};          
  let activePools  = {};          
  let lessonConfig = {};
  let examState    = {};

  let onLessonPass  = () => {};   
  let onAllComplete = () => {};   

  // ── Initialization ─────────────────────────────────────────────────

  async function init(jsonPath, callbacks = {}, initialState = null) {
    if (callbacks.onLessonPass)  onLessonPass  = callbacks.onLessonPass;
    if (callbacks.onAllComplete) onAllComplete = callbacks.onAllComplete;

    try {
      let data;
      if (window.QUESTIONS_DATA) {
        data = window.QUESTIONS_DATA;
      } else {
        const response = await fetch(jsonPath);
        data = await response.json();
      }
      
      Object.keys(data.lessons).forEach(id => {
        const obj = data.lessons[id];
        questionBank[id] = obj.questions || obj;
        lessonConfig[id] = {
          examMode: obj.examMode || false,
          showAll: obj.showAll || false
        };
        examState[id] = { answers: {}, submitted: false, isPractice: false };
      });
    } catch (err) {
      console.error('Failed to load questions:', err);
      return;
    }

    Object.keys(questionBank).forEach(id => {
      lessonState[id] = new Set();
      if (initialState && initialState.pools && initialState.pools[id]) {
        activePools[id] = initialState.pools[id];
      } else {
        const totalQ = questionBank[id].length;
        if (lessonConfig[id].showAll) {
          activePools[id] = Array.from({length: totalQ}, (_, i) => i);
        } else {
          const count = Math.min(3, totalQ);
          const indices = Array.from({length: totalQ}, (_, i) => i);
          shuffleArray(indices);
          activePools[id] = indices.slice(0, count);
        }
      }
    });

    document.querySelectorAll('[data-quiz-lesson]').forEach(container => {
      const lessonId = container.dataset.quizLesson;
      if (questionBank[lessonId]) {
        renderLesson(container, lessonId);
      }
    });

    if (initialState) {
      loadState(initialState);
    }
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function isLessonPassed(lessonId) {
    const id = String(lessonId);
    return lessonState[id] && activePools[id] && lessonState[id].size >= activePools[id].length;
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function renderLesson(container, lessonId) {
    const allQuestions = questionBank[lessonId];
    const pool = activePools[lessonId] || [];
    const config = lessonConfig[lessonId];
    const isExam = config.examMode && !examState[lessonId].isPractice;
    
    container.innerHTML = '';
    
    if (isExam) {
        const header = document.createElement('div');
        header.className = 'exam-header';
        header.innerHTML = `<h3>📝 Full Exam Mode</h3><p>Answer all questions, then submit at the bottom.</p>`;
        container.appendChild(header);
    } else if (config.examMode && examState[lessonId].isPractice) {
        const header = document.createElement('div');
        header.className = 'exam-header practice-header';
        header.innerHTML = `<h3>🎯 Targeted Practice Mode</h3><p>Focusing on your weak areas.</p>`;
        container.appendChild(header);
    }

    pool.forEach((qIdx, loopIdx) => {
      const q = allQuestions[qIdx];
      const block = document.createElement('div');
      block.className = 'qe-question-block';
      block.id = `qblock-${lessonId}-${qIdx}`;
      block.dataset.lessonId = lessonId;
      block.dataset.qIdx = qIdx;
      block.dataset.isGate = loopIdx === 0 ? 'true' : 'false';

      const badge = makeBadge(q.type);
      if (q.topic) {
          const topicBadge = document.createElement('span');
          topicBadge.className = 'qe-topic-badge';
          topicBadge.textContent = q.topic;
          badge.appendChild(topicBadge);
      }
      block.appendChild(badge);

      const prompt = document.createElement('p');
      prompt.className = 'qe-prompt';
      prompt.innerHTML = q.prompt;
      block.appendChild(prompt);

      if (q.code) {
        const pre = document.createElement('pre');
        pre.className = 'code-block qe-code-preview';
        pre.innerHTML = q.code;
        block.appendChild(pre);
      }

      const wrap = document.createElement('div');
      
      if (q.type === 'mcq') {
        wrap.appendChild(buildMCQ(q, wrap, isExam, lessonId, qIdx));
      } else if (q.type === 'predict_output' || q.type === 'code_completion') {
        wrap.appendChild(buildTextAnswer(q, wrap, isExam, lessonId, qIdx));
      } else if (q.type === 'fill_blank') {
        wrap.appendChild(buildFillBlank(q, wrap, isExam, lessonId, qIdx));
      }

      block.appendChild(wrap);

      const feedback = document.createElement('div');
      feedback.className = 'qe-feedback';
      feedback.id = `feedback-${lessonId}-${qIdx}`;
      block.appendChild(feedback);

      if (loopIdx < pool.length - 1) {
        block.appendChild(Object.assign(document.createElement('hr'), { className: 'qe-divider' }));
      }
      container.appendChild(block);
    });

    if (isExam) {
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary exam-submit-btn';
        submitBtn.textContent = 'Submit Exam';
        submitBtn.onclick = () => submitExam(lessonId, container);
        container.appendChild(submitBtn);
    }
  }

  function makeBadge(type) {
    const badges = {
      'mcq': { icon: '🔘', label: 'Multiple Choice' },
      'predict_output': { icon: '🔮', label: 'Predict Output' },
      'code_completion': { icon: '⌨️', label: 'Code Completion' },
      'fill_blank': { icon: '📝', label: 'Fill in the Blank' }
    };
    const info = badges[type] || { icon: '❓', label: 'Question' };
    const badge = document.createElement('div');
    badge.className = 'qe-type-badge';
    badge.innerHTML = `${info.icon} <span>${info.label}</span>`;
    return badge;
  }

  // ── Builders ───────────────────────────────────────────────────────

  function buildMCQ(q, wrap, isExam, lessonId, qIdx) {
    const optsDiv = document.createElement('div');
    optsDiv.className = 'qe-options';

    q.options.forEach((opt, choiceIndex) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.innerHTML = escHtml(opt);
      
      btn.onclick = () => {
        if (wrap.dataset.done && !isExam) return;
        
        if (isExam) {
            optsDiv.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            examState[lessonId].answers[qIdx] = choiceIndex;
        } else {
            submitMCQ(q, choiceIndex, btn, wrap, lessonId, qIdx);
        }
      };
      optsDiv.appendChild(btn);
    });
    return optsDiv;
  }

  function buildTextAnswer(q, wrap, isExam, lessonId, qIdx) {
    const row = document.createElement('div');
    row.className = 'qe-input-row';

    const label = document.createElement('label');
    label.className = 'qe-label';
    label.htmlFor = `input-${lessonId}-${qIdx}`;
    label.textContent = 'Your answer:';
    row.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${lessonId}-${qIdx}`;
    input.className = 'qe-text-input';
    input.placeholder = 'Type here...';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    row.appendChild(input);

    if (isExam) {
        input.addEventListener('input', () => {
            examState[lessonId].answers[qIdx] = input.value.trim();
        });
    } else {
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary qe-submit-btn';
        submitBtn.textContent = 'Check';
        row.appendChild(submitBtn);

        submitBtn.addEventListener('click', () => submitTextAnswer(q, input, submitBtn, wrap, lessonId, qIdx));
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') submitTextAnswer(q, input, submitBtn, wrap, lessonId, qIdx);
        });
    }

    return row;
  }

  function buildFillBlank(q, wrap, isExam, lessonId, qIdx) {
    const templateWrap = document.createElement('div');
    templateWrap.className = 'qe-fill-template';

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
        inp.id = `blank-${lessonId}-${qIdx}-${i}`;
        inputs.push(inp);
        templateWrap.appendChild(inp);
      }
    });

    wrap.appendChild(templateWrap);

    if (isExam) {
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                examState[lessonId].answers[qIdx] = inputs.map(i => i.value.trim());
            });
        });
    } else {
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary qe-submit-btn';
        submitBtn.style.marginTop = '1rem';
        submitBtn.textContent = 'Check Blanks';
        wrap.appendChild(submitBtn);

        submitBtn.addEventListener('click', () => submitFillBlank(q, inputs, submitBtn, wrap, lessonId, qIdx));
        inputs.forEach(inp => {
          inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitFillBlank(q, inputs, submitBtn, wrap, lessonId, qIdx);
          });
        });
    }

    return wrap;
  }

  // ── Exam Logic ─────────────────────────────────────────────────────
  
  function submitExam(lessonId, container) {
      const pool = activePools[lessonId];
      const allQuestions = questionBank[lessonId];
      let score = 0;
      let topicFails = {};
      let failedIndices = [];
      
      pool.forEach(qIdx => {
          const q = allQuestions[qIdx];
          const userAns = examState[lessonId].answers[qIdx];
          const block = document.getElementById(`qblock-${lessonId}-${qIdx}`);
          const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);
          
          let isCorrect = false;
          let displayCorrect = "";
          
          if (q.type === 'mcq') {
              isCorrect = (userAns === q.correct);
              displayCorrect = q.options[q.correct];
              const opts = block.querySelectorAll('.quiz-option');
              opts.forEach((btn, i) => {
                  btn.disabled = true;
                  if (i === q.correct) btn.classList.add('correct');
                  else if (i === userAns) btn.classList.add('wrong');
              });
          } else if (q.type === 'fill_blank') {
              const uArr = userAns || [];
              let allOk = true;
              let exps = [];
              if(q.blanks) {
                  q.blanks.forEach((exp, i) => {
                      const ex = Array.isArray(q.blanks) && Array.isArray(q.blanks[0]) ? q.blanks[i] : (Array.isArray(q.blanks) ? q.blanks[i] : q.blanks);
                      if(!checkAnswer(uArr[i]||'', ex)) allOk = false;
                      exps.push(Array.isArray(ex) ? ex[0] : ex);
                  });
              }
              isCorrect = allOk;
              displayCorrect = exps.join(', ');
              block.querySelectorAll('input').forEach(inp => inp.disabled = true);
          } else {
              isCorrect = checkAnswer(userAns || '', q.correct);
              displayCorrect = Array.isArray(q.correct) ? q.correct[0] : q.correct;
              const inp = block.querySelector('input');
              if(inp) inp.disabled = true;
          }
          
          if (isCorrect) {
              score++;
              showFeedback(feedbackEl, true, "✔ Correct", q.explanation);
              markPassed(lessonId, qIdx);
          } else {
              failedIndices.push(qIdx);
              const t = q.topic || 'General';
              topicFails[t] = (topicFails[t] || 0) + 1;
              showFeedback(feedbackEl, false, `✘ Incorrect. Expected: <code>${escHtml(String(displayCorrect))}</code>`, q.explanation);
          }
      });
      
      const pct = Math.round((score / pool.length) * 100);
      let weakTopicsHTML = "";
      if (failedIndices.length > 0) {
          const sortedTopics = Object.entries(topicFails).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
          weakTopicsHTML = `<div class="exam-weakness">Weak Areas: <strong>${sortedTopics.join(', ')}</strong></div>`;
      }
      
      const summary = document.createElement('div');
      summary.className = 'exam-summary';
      summary.innerHTML = `
        <h2>Exam Complete</h2>
        <div class="exam-score">Score: ${score} / ${pool.length} (${pct}%)</div>
        ${weakTopicsHTML}
      `;
      
      if (failedIndices.length > 0) {
          const pracBtn = document.createElement('button');
          pracBtn.className = 'btn btn-secondary';
          pracBtn.textContent = 'Practice My Weak Areas';
          pracBtn.onclick = () => {
              activePools[lessonId] = failedIndices;
              examState[lessonId].isPractice = true;
              renderLesson(container, lessonId);
          };
          summary.appendChild(pracBtn);
      } else {
          summary.innerHTML += `<div class="exam-mastered">Mastered 🎯</div>`;
          onLessonPass(parseInt(lessonId, 10));
      }
      
      container.querySelector('.exam-submit-btn').style.display = 'none';
      container.appendChild(summary);
  }

  // ── Submission Helpers ─────────────────────────────────────────────

  function submitTextAnswer(q, input, submitBtn, wrap, lessonId, qIdx) {
    if (wrap.dataset.done) return;
    const userVal = input.value.trim();
    if (!userVal) { input.focus(); return; }

    const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);
    const isCorrect = checkAnswer(userVal, q.correct);
    const displayCorrect = Array.isArray(q.correct) ? q.correct[0] : q.correct;

    if (isCorrect) {
      input.classList.add('qe-input-correct');
      submitBtn.disabled = true;
      input.disabled = true;
      wrap.dataset.done = '1';
      showFeedback(feedbackEl, true, '✔ Correct!', q.explanation);
      markPassed(lessonId, qIdx);
    } else {
      input.classList.add('qe-input-wrong');
      showFeedback(feedbackEl, false,
        `✘ Not quite. Expected: <code>${escHtml(String(displayCorrect))}</code><br><small>Note: C is case-sensitive!</small>`, q.explanation); // Added explanation in practice
      setTimeout(() => input.classList.remove('qe-input-wrong'), 900);
    }
  }

  function submitFillBlank(q, inputs, submitBtn, wrap, lessonId, qIdx) {
    if (wrap.dataset.done) return;
    const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);

    let allCorrect = true;
    inputs.forEach((inp, i) => {
      const expected = Array.isArray(q.blanks) && Array.isArray(q.blanks[0]) ? q.blanks[i] : (Array.isArray(q.blanks) ? q.blanks[i] : q.blanks);
      const ok = checkAnswer(inp.value.trim(), expected);
      inp.classList.toggle('qe-input-correct', ok);
      inp.classList.toggle('qe-input-wrong', !ok);
      if (!ok) allCorrect = false;
    });

    if (allCorrect) {
      inputs.forEach(inp => { inp.disabled = true; });
      submitBtn.disabled = true;
      wrap.dataset.done = '1';
      showFeedback(feedbackEl, true, '✔ All blanks correct!', q.explanation);
      markPassed(lessonId, qIdx);
    } else {
      const expectedAnswers = Array.isArray(q.blanks) ? q.blanks.map(b => Array.isArray(b) ? escHtml(String(b[0])) : escHtml(String(b))).join(', ') : escHtml(String(q.blanks));
      showFeedback(feedbackEl, false, `✘ Incorrect. The expected answer is: <code>${expectedAnswers}</code>`, q.explanation);
      setTimeout(() => {
        inputs.forEach(inp => inp.classList.remove('qe-input-wrong', 'qe-input-correct'));
      }, 1200);
    }
  }

  function submitMCQ(q, choiceIndex, btn, wrap, lessonId, qIdx) {
    if (wrap.dataset.done) return;
    const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);
    const isCorrect = (choiceIndex === q.correct);

    if (isCorrect) {
      btn.classList.add('correct');
      wrap.dataset.done = '1';
      disableOptions(wrap);
      
      let successMsg = (q.hints && q.hints[choiceIndex]) ? q.hints[choiceIndex] : "✔ Correct!";
      if (!successMsg.includes("✔") && !successMsg.includes("Correct")) successMsg = "✔ " + successMsg;
      
      showFeedback(feedbackEl, true, successMsg, q.explanation);
      markPassed(lessonId, qIdx);
    } else {
      btn.classList.add('wrong');
      let hintMsg = (q.hints && q.hints[choiceIndex]) ? q.hints[choiceIndex].trim() : "";
      if (!hintMsg) hintMsg = `✘ Incorrect. The correct answer is: <strong>${escHtml(String(q.options[q.correct]))}</strong>.`;
      else if (!hintMsg.startsWith("✘") && !hintMsg.toLowerCase().includes("incorrect")) hintMsg = `✘ Incorrect. ${hintMsg}`;
      
      showFeedback(feedbackEl, false, hintMsg, q.explanation); // Show explanation always on practice/fail
      setTimeout(() => btn.classList.remove('wrong'), 900);
    }
  }

  // ── State management ───────────────────────────────────────────────

  function markPassed(lessonId, qIdx) {
    const reqSize = activePools[lessonId] ? activePools[lessonId].length : 0;
    const wasPassed = lessonState[lessonId].size >= reqSize;
    lessonState[lessonId].add(parseInt(qIdx, 10));
    const isNowPassed = lessonState[lessonId].size >= reqSize;

    if (!wasPassed && isNowPassed) {
      onLessonPass(parseInt(lessonId, 10));
    }
    const allDone = Object.keys(activePools).every(id => lessonState[id].size >= activePools[id].length);
    if (allDone) onAllComplete();
  }

  // ── Utilities ─────────────────────────────────────────────────────

  function showFeedback(el, isCorrect, message, explanation) {
    el.className = 'qe-feedback ' + (isCorrect ? 'qe-feedback-correct' : 'qe-feedback-wrong');
    let html = `<span class="qe-feedback-msg">${message}</span>`;
    if (explanation) {
      html += `<div class="qe-output-box"><div class="qe-output-label">📝 Explanation</div><div class="qe-explanation">${explanation}</div></div>`;
    }
    el.innerHTML = html;
    el.style.display = 'block';
  }

  function disableOptions(wrap) {
    wrap.querySelectorAll('.quiz-option').forEach(b => {
      b.style.pointerEvents = 'none';
    });
  }

  function normalise(str) {
    let res = String(str).replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
    res = res.replace(/\s*([=+\-*/%<>&|!();{},\[\]])\s*/g, '$1');
    return res;
  }

  function checkAnswer(userVal, expected) {
    const u = normalise(userVal);
    if (Array.isArray(expected)) return expected.some(exp => u === normalise(exp));
    return u === normalise(expected);
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getState() {
    const state = { completed: {}, pools: activePools };
    for (const [id, set] of Object.entries(lessonState)) {
      state.completed[id] = Array.from(set);
    }
    return state;
  }

  function loadState(stateObj) {
    if (!stateObj || !stateObj.completed) return;
    for (const [id, arr] of Object.entries(stateObj.completed)) {
      if (lessonState[id]) {
        arr.forEach(idx => {
          lessonState[id].add(idx);
          const block = document.getElementById(`qblock-${id}-${idx}`);
          if (block) {
            const wrap = block.querySelector('.qe-options, .qe-input-row, .qe-fill-template');
            if (wrap) wrap.dataset.done = '1';
            const feedbackEl = document.getElementById(`feedback-${id}-${idx}`);
            if (feedbackEl && questionBank[id] && questionBank[id][idx]) {
              const q = questionBank[id][idx];
              showFeedback(feedbackEl, true, '✔ Completed', q.explanation);
              block.querySelectorAll('input, button.quiz-option, button.qe-submit-btn').forEach(el => {
                el.disabled = true;
                if (el.classList.contains('quiz-option')) el.style.pointerEvents = 'none';
              });
            }
          }
        });
      }
    }
  }

  return { init, isLessonPassed, loadState, getState };
})();
