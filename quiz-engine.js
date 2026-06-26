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

      if (q.type === 'mcq') {
        block.appendChild(buildMCQ(q, isExam, lessonId, qIdx));
      } else if (q.type === 'predict_output' || q.type === 'code_completion') {
        block.appendChild(buildTextAnswer(q, isExam, lessonId, qIdx));
      } else if (q.type === 'fill_blank') {
        block.appendChild(buildFillBlank(q, isExam, lessonId, qIdx));
      } else if (q.type === 'sortable') {
        block.appendChild(buildSortable(q, isExam, lessonId, qIdx));
      } else if (q.type === 'tree_build') {
        block.appendChild(buildTreeBuild(q, isExam, lessonId, qIdx));
      }

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
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function makeBadge(type) {
    const badges = {
      'mcq': { icon: 'circle-dot', label: 'Multiple Choice' },
      'predict_output': { icon: 'terminal', label: 'Predict Output' },
      'code_completion': { icon: 'code', label: 'Code Completion' },
      'fill_blank': { icon: 'file-signature', label: 'Fill in the Blank' },
      'sortable': { icon: 'arrow-up-down', label: 'Drag & Drop Order' },
      'tree_build': { icon: 'git-merge', label: 'Build Tree' }
    };
    const info = badges[type] || { icon: 'help-circle', label: 'Question' };
    const badge = document.createElement('div');
    badge.className = 'qe-type-badge';
    badge.innerHTML = `<i data-lucide="${info.icon}" class="icon-inline"></i> <span>${info.label}</span>`;
    return badge;
  }

  // ── Builders ───────────────────────────────────────────────────────

  function buildMCQ(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
    const optsDiv = document.createElement('div');
    optsDiv.className = 'qe-options';

    q.options.forEach((opt, choiceIndex) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      if (opt.includes('\n') || opt.includes('struct') || opt.includes(';')) {
        btn.innerHTML = `<code style="display:block; text-align:left; white-space:pre-wrap; font-family:'Fira Code', monospace; padding:0.5rem 0;">${escHtml(opt)}</code>`;
      } else {
        btn.innerHTML = escHtml(opt);
      }
      
      btn.onclick = () => {
        if (mainWrap.dataset.done && !isExam) return;
        
        if (isExam) {
            optsDiv.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            examState[lessonId].answers[qIdx] = choiceIndex;
        } else {
            submitMCQ(q, choiceIndex, btn, mainWrap, lessonId, qIdx);
        }
      };
      optsDiv.appendChild(btn);
    });
    mainWrap.appendChild(optsDiv);
    return mainWrap;
  }

  function buildTextAnswer(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
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

        submitBtn.addEventListener('click', () => submitTextAnswer(q, input, submitBtn, mainWrap, lessonId, qIdx));
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') submitTextAnswer(q, input, submitBtn, mainWrap, lessonId, qIdx);
        });
    }

    mainWrap.appendChild(row);
    return mainWrap;
  }

  function buildFillBlank(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
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

    mainWrap.appendChild(templateWrap);

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
        mainWrap.appendChild(submitBtn);

        submitBtn.addEventListener('click', () => submitFillBlank(q, inputs, submitBtn, mainWrap, lessonId, qIdx));
        inputs.forEach(inp => {
          inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitFillBlank(q, inputs, submitBtn, mainWrap, lessonId, qIdx);
          });
        });
    }

    return mainWrap;
  }

  function buildSortable(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
    const listWrap = document.createElement('div');
    listWrap.className = 'qe-sortable-list';
    
    let currentItems = [...q.items];
    if (!examState[lessonId]?.answers?.[qIdx] && !mainWrap.dataset.done) {
       shuffleArray(currentItems);
       if (JSON.stringify(currentItems) === JSON.stringify(q.correctOrder)) shuffleArray(currentItems);
    } else if (examState[lessonId]?.answers?.[qIdx]) {
       currentItems = examState[lessonId].answers[qIdx];
    }
    
    currentItems.forEach((itemText, idx) => {
       const itemDiv = document.createElement('div');
       itemDiv.className = 'qe-sortable-item';
       itemDiv.draggable = true;
       itemDiv.dataset.val = itemText;
       itemDiv.innerHTML = `<span class="qe-sortable-index">${idx + 1}.</span> <span class="qe-sortable-text">${escHtml(itemText)}</span> <i data-lucide="grip-vertical" style="margin-left:auto; color:var(--text-muted);"></i>`;
       listWrap.appendChild(itemDiv);
    });

    let draggedItem = null;
    listWrap.addEventListener('dragstart', e => {
      if (mainWrap.dataset.done && !isExam) return;
      draggedItem = e.target.closest('.qe-sortable-item');
      if (!draggedItem) return;
      draggedItem.classList.add('dragging');
      if(e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); }
    });

    listWrap.addEventListener('dragend', e => {
      if (draggedItem) draggedItem.classList.remove('dragging');
      draggedItem = null;
      [...listWrap.children].forEach((item, idx) => {
        const idxSpan = item.querySelector('.qe-sortable-index');
        if (idxSpan) idxSpan.textContent = `${idx + 1}.`;
      });
      if (isExam) examState[lessonId].answers[qIdx] = Array.from(listWrap.children).map(c => c.dataset.val);
    });

    listWrap.addEventListener('dragover', e => {
      e.preventDefault();
      if (mainWrap.dataset.done && !isExam) return;
      const draggable = document.querySelector('.dragging');
      if (!draggable) return;
      const afterElement = [...listWrap.querySelectorAll('.qe-sortable-item:not(.dragging)')].reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
      
      if (afterElement == null) listWrap.appendChild(draggable);
      else listWrap.insertBefore(draggable, afterElement);
    });

    mainWrap.appendChild(listWrap);

    if (!isExam) {
      const controlsWrap = document.createElement('div');
      controlsWrap.className = 'qe-btn-group';

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary qe-submit-btn';
      submitBtn.textContent = 'Check Order';
      submitBtn.onclick = () => submitSortable(q, listWrap, submitBtn, mainWrap, lessonId, qIdx);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-secondary qe-submit-btn';
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = () => {
        if (mainWrap.dataset.done) return;
        shuffleArray(currentItems);
        if (JSON.stringify(currentItems) === JSON.stringify(q.correctOrder)) shuffleArray(currentItems);
        listWrap.innerHTML = '';
        currentItems.forEach((itemText, idx) => {
           const itemDiv = document.createElement('div');
           itemDiv.className = 'qe-sortable-item';
           itemDiv.draggable = true;
           itemDiv.dataset.val = itemText;
           itemDiv.innerHTML = `<span class="qe-sortable-index">${idx + 1}.</span> <span class="qe-sortable-text">${escHtml(itemText)}</span> <i data-lucide="grip-vertical" style="margin-left:auto; color:var(--text-muted);"></i>`;
           listWrap.appendChild(itemDiv);
        });
        if (window.lucide) window.lucide.createIcons();
      };

      controlsWrap.appendChild(submitBtn);
      controlsWrap.appendChild(resetBtn);

      if (q.hints && q.hints.length > 0) {
         const hintBtn = document.createElement('button');
         hintBtn.className = 'btn btn-secondary qe-submit-btn';
         hintBtn.textContent = 'Hint';
         hintBtn.onclick = () => alert('Hint: ' + q.hints[0]);
         controlsWrap.appendChild(hintBtn);
      }

      mainWrap.appendChild(controlsWrap);
    }
    return mainWrap;
  }

  // ── Exam Logic ─────────────────────────────────────────────────────
  
  
  function buildTreeBuild(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
    mainWrap.className = 'qe-tree-wrap';
    
    let activeSelection = null;
    
    // Create the tree stage
    const stage = document.createElement('div');
    stage.className = 'qe-tree-stage';
    
    // Draw SVG lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'qe-tree-svg';
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    // Ensure the SVG canvas matches the stage size so no lines are clipped
    svg.setAttribute('viewBox', '0 0 420 250');
    q.treeStructure.forEach(node => {
        if (node.left) {
            const child = q.treeStructure.find(n => n.id === node.left);
            if (child) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', node.x + 20);
                line.setAttribute('y1', node.y + 20);
                line.setAttribute('x2', child.x + 20);
                line.setAttribute('y2', child.y + 20);
                line.setAttribute('stroke', 'var(--border)');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            }
        }
        if (node.right) {
            const child = q.treeStructure.find(n => n.id === node.right);
            if (child) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', node.x + 20);
                line.setAttribute('y1', node.y + 20);
                line.setAttribute('x2', child.x + 20);
                line.setAttribute('y2', child.y + 20);
                line.setAttribute('stroke', 'var(--border)');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            }
        }
    });
    stage.appendChild(svg);
    
    // Create nodes (drop zones)
    q.treeStructure.forEach(node => {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'qe-tree-node qe-dropzone';
        nodeDiv.id = `zone-${lessonId}-${qIdx}-${node.id}`;
        nodeDiv.dataset.nodeId = node.id;
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        
        nodeDiv.addEventListener('dragover', e => {
            e.preventDefault();
            if (mainWrap.dataset.done && !isExam) return;
            nodeDiv.classList.add('drag-over');
        });
        nodeDiv.addEventListener('dragleave', e => {
            nodeDiv.classList.remove('drag-over');
        });
        nodeDiv.addEventListener('drop', e => {
            e.preventDefault();
            nodeDiv.classList.remove('drag-over');
            if (mainWrap.dataset.done && !isExam) return;
            const draggedId = e.dataTransfer.getData('text/plain');
            const draggedEl = document.getElementById(draggedId);
            if (draggedEl) {
                if (nodeDiv.children.length > 0) {
                    // swap logic or put existing back to pool
                    const existing = nodeDiv.children[0];
                    draggedEl.parentNode.appendChild(existing);
                }
                nodeDiv.appendChild(draggedEl);
                updateTreeState();
            }
        });

        nodeDiv.addEventListener('click', e => {
            if (mainWrap.dataset.done && !isExam) return;
            if (activeSelection) {
                const item = activeSelection;
                item.classList.remove('selected');
                activeSelection = null;
                if (nodeDiv.children.length > 0) {
                    const existing = nodeDiv.children[0];
                    item.parentNode.appendChild(existing);
                }
                nodeDiv.appendChild(item);
                updateTreeState();
            }
        });
        stage.appendChild(nodeDiv);
    });
    
    const stageWrapper = document.createElement('div');
    stageWrapper.className = 'qe-tree-stage-wrapper';
    stageWrapper.appendChild(stage);
    mainWrap.appendChild(stageWrapper);

    // Create pool
    const pool = document.createElement('div');
    pool.className = 'qe-pool qe-dropzone';
    pool.id = `pool-${lessonId}-${qIdx}`;
    
    pool.addEventListener('dragover', e => {
        e.preventDefault();
        if (mainWrap.dataset.done && !isExam) return;
        pool.classList.add('drag-over');
    });
    pool.addEventListener('dragleave', e => {
        pool.classList.remove('drag-over');
    });
    pool.addEventListener('drop', e => {
        e.preventDefault();
        pool.classList.remove('drag-over');
        if (mainWrap.dataset.done && !isExam) return;
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedEl = document.getElementById(draggedId);
        if (draggedEl) {
            pool.appendChild(draggedEl);
            updateTreeState();
        }
    });

    pool.addEventListener('click', e => {
        if (mainWrap.dataset.done && !isExam) return;
        if (activeSelection) {
            const item = activeSelection;
            item.classList.remove('selected');
            activeSelection = null;
            pool.appendChild(item);
            updateTreeState();
        }
    });

    let currentItems = [...q.nodes];
    if (!examState[lessonId]?.answers?.[qIdx] && !mainWrap.dataset.done) {
       shuffleArray(currentItems);
    }
    
    const existingAns = examState[lessonId]?.answers?.[qIdx];

    currentItems.forEach((val, idx) => {
        const item = document.createElement('div');
        item.className = 'qe-pool-item';
        item.draggable = true;
        item.textContent = val;
        item.dataset.val = val;
        item.id = `item-${lessonId}-${qIdx}-${idx}`;
        
        item.addEventListener('dragstart', e => {
            if (mainWrap.dataset.done && !isExam) return;
            if(e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.id);
            }
            setTimeout(() => item.classList.add('dragging'), 0);
        });
        item.addEventListener('dragend', e => {
            item.classList.remove('dragging');
        });

        item.addEventListener('click', e => {
            if (mainWrap.dataset.done && !isExam) return;
            e.stopPropagation();
            if (activeSelection && activeSelection !== item) {
                activeSelection.classList.remove('selected');
            }
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                activeSelection = null;
            } else {
                item.classList.add('selected');
                activeSelection = item;
            }
        });
        
        // Restore state if any
        if (existingAns) {
            let placed = false;
            for (let nodeId in existingAns) {
                if (existingAns[nodeId] === val) {
                    const targetZone = stage.querySelector(`[data-node-id="${nodeId}"]`);
                    if (targetZone) {
                        targetZone.appendChild(item);
                        placed = true;
                        // remove from existingAns to avoid duplicates matching same zone
                        delete existingAns[nodeId];
                        break;
                    }
                }
            }
            if (!placed) pool.appendChild(item);
        } else {
            pool.appendChild(item);
        }
    });
    mainWrap.appendChild(pool);

    function updateTreeState() {
        if (!isExam) return;
        const state = {};
        stage.querySelectorAll('.qe-tree-node').forEach(zone => {
            if (zone.children.length > 0) {
                state[zone.dataset.nodeId] = zone.children[0].dataset.val;
            }
        });
        examState[lessonId].answers[qIdx] = state;
    }

    if (!isExam) {
      const controlsWrap = document.createElement('div');
      controlsWrap.className = 'qe-btn-group';

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary qe-submit-btn';
      submitBtn.textContent = 'Check Tree';
      submitBtn.onclick = () => submitTreeBuild(q, stage, submitBtn, mainWrap, lessonId, qIdx);

      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-secondary qe-submit-btn';
      resetBtn.textContent = 'Reset';
       resetBtn.onclick = () => {
          if (mainWrap.dataset.done) return;
          if (activeSelection) {
              activeSelection.classList.remove('selected');
              activeSelection = null;
          }
          // Move all items from the tree stage back to the pool
          stage.querySelectorAll('.qe-pool-item').forEach(el => pool.appendChild(el));
       };

      controlsWrap.appendChild(submitBtn);
      controlsWrap.appendChild(resetBtn);

      if (q.hints && q.hints.length > 0) {
         const hintBtn = document.createElement('button');
         hintBtn.className = 'btn btn-secondary qe-submit-btn';
         hintBtn.textContent = 'Hint';
         hintBtn.onclick = () => alert('Hint: ' + q.hints[0]);
         controlsWrap.appendChild(hintBtn);
      }

      mainWrap.appendChild(controlsWrap);
    }
    return mainWrap;
  }

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
          } else if (q.type === 'sortable') {
              isCorrect = JSON.stringify(userAns || []) === JSON.stringify(q.correctOrder);
              displayCorrect = q.correctOrder.join(' → ');
              block.querySelectorAll('.qe-sortable-item').forEach(inp => inp.draggable = false);
          } else if (q.type === 'tree_build') {
              isCorrect = true;
              let uMap = userAns || {};
              for (let nodeId in q.correctMapping) {
                  if (uMap[nodeId] !== q.correctMapping[nodeId]) {
                      isCorrect = false; break;
                  }
              }
              displayCorrect = "Correct tree structure";
              block.querySelectorAll('.qe-pool-item').forEach(inp => inp.draggable = false);
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

  function submitSortable(q, listWrap, submitBtn, wrap, lessonId, qIdx) {
    if (wrap.dataset.done) return;
    const currentOrder = Array.from(listWrap.children).map(c => c.dataset.val);
    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(q.correctOrder);
    
    const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);
    if (isCorrect) {
      submitBtn.disabled = true;
      wrap.dataset.done = '1';
      listWrap.querySelectorAll('.qe-sortable-item').forEach(el => el.draggable = false);
      showFeedback(feedbackEl, true, '✔ Perfect! You got the correct order.', q.explanation);
      markPassed(lessonId, qIdx);
    } else {
      listWrap.classList.add('qe-input-wrong');
      showFeedback(feedbackEl, false, '✘ Incorrect order. Try dragging them again!');
      setTimeout(() => listWrap.classList.remove('qe-input-wrong'), 400);
    }
  }

  
  function submitTreeBuild(q, stage, submitBtn, wrap, lessonId, qIdx) {
    if (wrap.dataset.done) return;
    
    let isCorrect = true;
    stage.querySelectorAll('.qe-tree-node').forEach(zone => {
        const expected = q.correctMapping[zone.dataset.nodeId];
        if (expected) {
            if (zone.children.length === 0 || zone.children[0].dataset.val !== expected) {
                isCorrect = false;
            }
        }
    });

    const feedbackEl = document.getElementById(`feedback-${lessonId}-${qIdx}`);
    if (isCorrect) {
      submitBtn.disabled = true;
      wrap.dataset.done = '1';
      wrap.querySelectorAll('.qe-pool-item').forEach(el => el.draggable = false);
      showFeedback(feedbackEl, true, '✔ Perfect! You built the correct tree.', q.explanation);
      markPassed(lessonId, qIdx);
    } else {
      wrap.classList.add('qe-input-wrong');
      showFeedback(feedbackEl, false, '✘ Incorrect tree structure. Try arranging them again!');
      setTimeout(() => wrap.classList.remove('qe-input-wrong'), 400);
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
              block.querySelectorAll('.qe-sortable-item').forEach(el => el.draggable = false);
              block.querySelectorAll('.qe-pool-item').forEach(el => el.draggable = false);
            }
          }
        });
      }
    }
  }

  return { init, isLessonPassed, loadState, getState };
})();
