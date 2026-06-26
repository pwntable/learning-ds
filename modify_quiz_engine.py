import re

with open('quiz-engine.js', 'r') as f:
    content = f.read()

# 1. Add to renderLesson
content = content.replace(
    "} else if (q.type === 'sortable') {\n        block.appendChild(buildSortable(q, isExam, lessonId, qIdx));\n      }",
    "} else if (q.type === 'sortable') {\n        block.appendChild(buildSortable(q, isExam, lessonId, qIdx));\n      } else if (q.type === 'tree_build') {\n        block.appendChild(buildTreeBuild(q, isExam, lessonId, qIdx));\n      }"
)

# 2. Add badge
content = content.replace(
    "'sortable': { icon: 'arrow-up-down', label: 'Drag & Drop Order' }",
    "'sortable': { icon: 'arrow-up-down', label: 'Drag & Drop Order' },\n      'tree_build': { icon: 'git-merge', label: 'Build Tree' }"
)

# 3. Add buildTreeBuild
build_func = """
  function buildTreeBuild(q, isExam, lessonId, qIdx) {
    const mainWrap = document.createElement('div');
    mainWrap.className = 'qe-tree-wrap';
    
    // Create the tree stage
    const stage = document.createElement('div');
    stage.className = 'qe-tree-stage';
    
    // Draw SVG lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'qe-tree-svg';
    q.treeStructure.forEach(node => {
        if (node.left) {
            const child = q.treeStructure.find(n => n.id === node.left);
            if (child) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', node.x + 20);
                line.setAttribute('y1', node.y + 20);
                line.setAttribute('x2', child.x + 20);
                line.setAttribute('y2', child.y + 20);
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
        stage.appendChild(nodeDiv);
    });
    mainWrap.appendChild(stage);

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
            e.dataTransfer.setData('text/plain', item.id);
            setTimeout(() => item.classList.add('dragging'), 0);
        });
        item.addEventListener('dragend', e => {
            item.classList.remove('dragging');
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
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary qe-submit-btn';
      submitBtn.textContent = 'Check Tree';
      submitBtn.style.marginTop = '1rem';
      submitBtn.onclick = () => submitTreeBuild(q, stage, submitBtn, mainWrap, lessonId, qIdx);
      mainWrap.appendChild(submitBtn);
    }
    return mainWrap;
  }
"""

content = content.replace(
    "function submitExam",
    build_func + "\n  function submitExam"
)

# 4. Add to submitExam
submit_exam_logic = """} else if (q.type === 'sortable') {
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
          } else {"""
          
content = content.replace(
    "} else if (q.type === 'sortable') {\n              isCorrect = JSON.stringify(userAns || []) === JSON.stringify(q.correctOrder);\n              displayCorrect = q.correctOrder.join(' → ');\n              block.querySelectorAll('.qe-sortable-item').forEach(inp => inp.draggable = false);\n          } else {",
    submit_exam_logic
)

# 5. Add submitTreeBuild
submit_tree_func = """
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
"""

content = content.replace(
    "function submitMCQ",
    submit_tree_func + "\n  function submitMCQ"
)

# 6. Add loadState logic
content = content.replace(
    "block.querySelectorAll('.qe-sortable-item').forEach(el => el.draggable = false);",
    "block.querySelectorAll('.qe-sortable-item').forEach(el => el.draggable = false);\n              block.querySelectorAll('.qe-pool-item').forEach(el => el.draggable = false);"
)

with open('quiz-engine.js', 'w') as f:
    f.write(content)
