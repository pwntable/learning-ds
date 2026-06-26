/**
 * ds-visualizer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained Data Structure Visualizer module.
 * Exposes: DSViz.mountLinkedList(containerId), DSViz.mountStack(containerId),
 *          DSViz.mountArray(containerId)
 *
 * No external dependencies. Pure vanilla JS + CSS classes from ds-visualizer.css
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DSViz = (() => {

  // ══════════════════════════════════════════════════════════════════════════
  // Shared helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Parse integer input; returns null on invalid. */
  function parseVal(str) {
    const n = parseInt(str, 10);
    return isNaN(n) ? null : n;
  }

  /** Flash an element briefly to highlight a change. */
  function flash(el, cls = 'dsv-flash') {
    el.classList.remove(cls);
    // Force reflow so the animation restarts
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  /** Show a brief status message inside a .dsv-status element. */
  function setStatus(statusEl, msg, type = 'info') {
    statusEl.textContent = msg;
    statusEl.className = `dsv-status dsv-status-${type}`;
  }

  /** Clear status after 2 s */
  function autoHideStatus(statusEl) {
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'dsv-status';
    }, 2500);
  }

  function status(el, msg, type = 'info') {
    setStatus(el, msg, type);
    autoHideStatus(el);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── LINKED LIST VISUALIZER ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mount a Linked List visualizer into a container element.
   * @param {string} containerId
   */
  function mountLinkedList(containerId) {
    const root = document.getElementById(containerId);
    if (!root) { console.warn('[DSViz] LinkedList: container not found:', containerId); return; }

    // ── State: plain JS array as a linked-list model ──
    let nodes = [];   // array of integer values

    // ── Build UI ──
    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-ll">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="link" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Linked List</div>
            <div class="dsv-panel-sub">Each node holds a value and a pointer to the next</div>
          </div>
          <button class="dsv-btn dsv-btn-ghost dsv-reset" title="Reset">↺ Reset</button>
        </div>

        <div class="dsv-controls">
          <input  class="dsv-input" id="${containerId}-ll-val" type="number"
                  placeholder="Value (e.g. 42)" min="-999" max="999">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-ll-head">Insert Head</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-ll-tail">Insert Tail</button>
          <button class="dsv-btn dsv-btn-danger" id="${containerId}-ll-del">Delete Head</button>
        </div>

        <div class="dsv-status" id="${containerId}-ll-status"></div>

        <div class="dsv-ll-stage" id="${containerId}-ll-stage">
          <span class="dsv-empty-hint">List is empty — insert a node to begin</span>
        </div>

        <div class="dsv-legend">
          <div class="dsv-legend-row">
            <span class="dsv-legend-box dsv-ll-node-box"></span> Node (data)
            <span class="dsv-legend-box dsv-ll-ptr-box"></span> Pointer →
            <span class="dsv-legend-box dsv-ll-null-box"></span> NULL
          </div>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const input   = root.querySelector(`#${containerId}-ll-val`);
    const stage   = root.querySelector(`#${containerId}-ll-stage`);
    const statusEl= root.querySelector(`#${containerId}-ll-status`);
    const resetBtn= root.querySelector('.dsv-reset');

    // ── Render ──
    function render(highlightIdx = -1) {
      if (nodes.length === 0) {
        stage.innerHTML = '<span class="dsv-empty-hint">List is empty — insert a node to begin</span>';
        return;
      }

      let html = '<div class="dsv-ll-row">';
      nodes.forEach((val, i) => {
        const hi = i === highlightIdx ? 'dsv-node-highlight' : '';
        html += `
          <div class="dsv-ll-group">
            <div class="dsv-ll-node ${hi}">
              <div class="dsv-ll-data">${val}</div>
              <div class="dsv-ll-ptr">→</div>
            </div>
            ${i === 0 ? '<div class="dsv-ll-label">HEAD</div>' : ''}
            ${i === nodes.length - 1 ? '<div class="dsv-ll-label">TAIL</div>' : '<div class="dsv-ll-label">&nbsp;</div>'}
          </div>`;
      });
      html += `
          <div class="dsv-ll-group">
            <div class="dsv-ll-null">NULL</div>
            <div class="dsv-ll-label">&nbsp;</div>
          </div>
        </div>`;

      stage.innerHTML = html;

      // Flash newly highlighted node
      if (highlightIdx >= 0) {
        const nodeEls = stage.querySelectorAll('.dsv-ll-node');
        if (nodeEls[highlightIdx]) flash(nodeEls[highlightIdx], 'dsv-flash');
      }
    }

    // ── Operations ──
    function insertHead() {
      const v = parseVal(input.value);
      if (v === null) { status(statusEl, '⚠ Enter a valid integer.', 'warn'); return; }
      nodes.unshift(v);
      render(0);
      status(statusEl, `✔ Inserted ${v} at HEAD`, 'ok');
      input.value = '';
    }

    function insertTail() {
      const v = parseVal(input.value);
      if (v === null) { status(statusEl, '⚠ Enter a valid integer.', 'warn'); return; }
      nodes.push(v);
      render(nodes.length - 1);
      status(statusEl, `✔ Inserted ${v} at TAIL`, 'ok');
      input.value = '';
    }

    function deleteHead() {
      if (nodes.length === 0) { status(statusEl, '⚠ List is already empty.', 'warn'); return; }
      const removed = nodes.shift();
      render();
      status(statusEl, `✔ Deleted HEAD node (${removed})`, 'ok');
    }

    function reset() {
      nodes = [];
      render();
      status(statusEl, 'List cleared.', 'info');
    }

    // ── Event wiring ──
    root.querySelector(`#${containerId}-ll-head`).addEventListener('click', insertHead);
    root.querySelector(`#${containerId}-ll-tail`).addEventListener('click', insertTail);
    root.querySelector(`#${containerId}-ll-del`).addEventListener('click', deleteHead);
    resetBtn.addEventListener('click', reset);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') insertTail(); });

    // ── Initial seed ──
    nodes = [10, 20, 30];
    render();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STACK VISUALIZER ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mount a Stack (LIFO) visualizer.
   * @param {string} containerId
   */
  function mountStack(containerId) {
    const root = document.getElementById(containerId);
    if (!root) { console.warn('[DSViz] Stack: container not found:', containerId); return; }

    const MAX = 8;
    let stack = [];  // index 0 = bottom, last = top

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-sk">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="book" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Stack <span class="dsv-badge">LIFO</span></div>
            <div class="dsv-panel-sub">Last In, First Out — like a stack of plates</div>
          </div>
          <button class="dsv-btn dsv-btn-ghost dsv-reset" title="Reset">↺ Reset</button>
        </div>

        <div class="dsv-controls">
          <input  class="dsv-input" id="${containerId}-sk-val" type="number"
                  placeholder="Value (e.g. 7)" min="-999" max="999">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-sk-push">Push</button>
          <button class="dsv-btn dsv-btn-danger" id="${containerId}-sk-pop">Pop</button>
          <button class="dsv-btn dsv-btn-ghost"  id="${containerId}-sk-peek">Peek</button>
        </div>

        <div class="dsv-status" id="${containerId}-sk-status"></div>

        <div class="dsv-sk-wrap">
          <div class="dsv-sk-meta">
            <div class="dsv-sk-pointer" id="${containerId}-sk-top-ptr">TOP ↓</div>
          </div>
          <div class="dsv-sk-shaft" id="${containerId}-sk-stage"></div>
          <div class="dsv-sk-base">▓▓▓▓▓▓▓▓ BASE ▓▓▓▓▓▓▓▓</div>
        </div>

        <div class="dsv-sk-info">
          Size: <strong id="${containerId}-sk-size">0</strong> /
          Max: <strong>${MAX}</strong>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const input    = root.querySelector(`#${containerId}-sk-val`);
    const stage    = root.querySelector(`#${containerId}-sk-stage`);
    const statusEl = root.querySelector(`#${containerId}-sk-status`);
    const sizeEl   = root.querySelector(`#${containerId}-sk-size`);
    const topPtr   = root.querySelector(`#${containerId}-sk-top-ptr`);
    const resetBtn = root.querySelector('.dsv-reset');

    function render(highlightTop = false) {
      // Render from top down (last element first)
      stage.innerHTML = '';

      if (stack.length === 0) {
        stage.innerHTML = '<div class="dsv-empty-hint" style="padding:1rem 0">Stack is empty</div>';
        topPtr.style.visibility = 'hidden';
      } else {
        topPtr.style.visibility = 'visible';
        // Render top→bottom
        for (let i = stack.length - 1; i >= 0; i--) {
          const isTop = i === stack.length - 1;
          const div = document.createElement('div');
          div.className = 'dsv-sk-cell' + (isTop ? ' dsv-sk-top' : '');
          div.innerHTML = `
            <span class="dsv-sk-idx">[${i}]</span>
            <span class="dsv-sk-val">${stack[i]}</span>
            ${isTop ? '<span class="dsv-sk-tag">← TOP</span>' : ''}`;
          stage.appendChild(div);
          if (isTop && highlightTop) flash(div, 'dsv-flash');
        }
      }

      sizeEl.textContent = stack.length;
    }

    function push() {
      if (stack.length >= MAX) { status(statusEl, `⚠ Stack overflow! Max size is ${MAX}.`, 'warn'); return; }
      const v = parseVal(input.value);
      if (v === null) { status(statusEl, '⚠ Enter a valid integer.', 'warn'); return; }
      stack.push(v);
      render(true);
      status(statusEl, `✔ Pushed ${v} onto the stack`, 'ok');
      input.value = '';
    }

    function pop() {
      if (stack.length === 0) { status(statusEl, '⚠ Stack underflow! Nothing to pop.', 'warn'); return; }
      const removed = stack.pop();
      render();
      status(statusEl, `✔ Popped ${removed} from the stack`, 'ok');
    }

    function peek() {
      if (stack.length === 0) { status(statusEl, '⚠ Stack is empty.', 'warn'); return; }
      const top = stack[stack.length - 1];
      // Highlight the top cell briefly
      const topCell = stage.querySelector('.dsv-sk-top');
      if (topCell) flash(topCell, 'dsv-flash');
      status(statusEl, `👁 Top of stack: ${top}`, 'info');
    }

    function reset() {
      stack = [];
      render();
      status(statusEl, 'Stack cleared.', 'info');
    }

    root.querySelector(`#${containerId}-sk-push`).addEventListener('click', push);
    root.querySelector(`#${containerId}-sk-pop`).addEventListener('click', pop);
    root.querySelector(`#${containerId}-sk-peek`).addEventListener('click', peek);
    resetBtn.addEventListener('click', reset);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') push(); });

    // Seed
    stack = [1, 3, 5];
    render();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── QUEUE VISUALIZER ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mount a Queue (FIFO) visualizer.
   * @param {string} containerId
   */
  function mountQueue(containerId) {
    const root = document.getElementById(containerId);
    if (!root) { console.warn('[DSViz] Queue: container not found:', containerId); return; }

    const MAX = 8;
    let queue = [];  // index 0 = front (dequeue here), last = back (enqueue here)

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-q">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="arrow-right-circle" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Queue <span class="dsv-badge">FIFO</span></div>
            <div class="dsv-panel-sub">First In, First Out — like a line at a ticket counter</div>
          </div>
          <button class="dsv-btn dsv-btn-ghost dsv-reset" title="Reset">↺ Reset</button>
        </div>

        <div class="dsv-controls">
          <input  class="dsv-input" id="${containerId}-q-val" type="number"
                  placeholder="Value (e.g. 7)" min="-999" max="999">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-q-enq">Enqueue</button>
          <button class="dsv-btn dsv-btn-danger" id="${containerId}-q-deq">Dequeue</button>
          <button class="dsv-btn dsv-btn-ghost"  id="${containerId}-q-peek">Peek Front</button>
        </div>

        <div class="dsv-status" id="${containerId}-q-status"></div>

        <div class="dsv-q-wrap" style="overflow-x: auto; padding: 20px 0;">
          <div class="dsv-q-meta" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
             <div class="dsv-q-pointer" id="${containerId}-q-front-ptr" style="color: var(--danger);">FRONT ↓</div>
             <div class="dsv-q-pointer" id="${containerId}-q-back-ptr" style="color: var(--accent);">↓ BACK</div>
          </div>
          <div class="dsv-q-stage" id="${containerId}-q-stage" style="display: flex; gap: 10px; min-height: 60px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border);"></div>
        </div>

        <div class="dsv-q-info" style="margin-top: 10px; font-size: 0.9rem; color: var(--text-secondary); text-align: center;">
          Size: <strong id="${containerId}-q-size">0</strong> /
          Max: <strong>${MAX}</strong>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const input    = root.querySelector(`#${containerId}-q-val`);
    const stage    = root.querySelector(`#${containerId}-q-stage`);
    const statusEl = root.querySelector(`#${containerId}-q-status`);
    const sizeEl   = root.querySelector(`#${containerId}-q-size`);
    const frontPtr = root.querySelector(`#${containerId}-q-front-ptr`);
    const backPtr  = root.querySelector(`#${containerId}-q-back-ptr`);
    const resetBtn = root.querySelector('.dsv-reset');

    function render(highlightIdx = -1) {
      stage.innerHTML = '';

      if (queue.length === 0) {
        stage.innerHTML = '<div class="dsv-empty-hint" style="width: 100%; text-align: center; line-height: 40px;">Queue is empty</div>';
        frontPtr.style.visibility = 'hidden';
        backPtr.style.visibility = 'hidden';
      } else {
        frontPtr.style.visibility = 'visible';
        backPtr.style.visibility = 'visible';
        
        queue.forEach((val, i) => {
          const div = document.createElement('div');
          div.className = 'dsv-q-cell' + (i === highlightIdx ? ' dsv-flash' : '');
          div.style.cssText = 'flex: 0 0 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 8px; font-size: 1.2rem; font-family: monospace; position: relative;';
          div.innerHTML = `<span class="dsv-q-val">${val}</span>`;
          stage.appendChild(div);
        });
      }

      sizeEl.textContent = queue.length;
    }

    function enqueue() {
      if (queue.length >= MAX) { status(statusEl, `⚠ Queue full! Max size is ${MAX}.`, 'warn'); return; }
      const v = parseVal(input.value);
      if (v === null) { status(statusEl, '⚠ Enter a valid integer.', 'warn'); return; }
      queue.push(v);
      render(queue.length - 1);
      status(statusEl, `✔ Enqueued ${v} to the back`, 'ok');
      input.value = '';
    }

    function dequeue() {
      if (queue.length === 0) { status(statusEl, '⚠ Queue is empty! Nothing to dequeue.', 'warn'); return; }
      const removed = queue.shift();
      render();
      status(statusEl, `✔ Dequeued ${removed} from the front`, 'ok');
    }

    function peek() {
      if (queue.length === 0) { status(statusEl, '⚠ Queue is empty.', 'warn'); return; }
      const front = queue[0];
      const frontCell = stage.children[0];
      if (frontCell && frontCell.classList) flash(frontCell, 'dsv-flash');
      status(statusEl, `👁 Front of queue: ${front}`, 'info');
    }

    function reset() {
      queue = [];
      render();
      status(statusEl, 'Queue cleared.', 'info');
    }

    root.querySelector(`#${containerId}-q-enq`).addEventListener('click', enqueue);
    root.querySelector(`#${containerId}-q-deq`).addEventListener('click', dequeue);
    root.querySelector(`#${containerId}-q-peek`).addEventListener('click', peek);
    resetBtn.addEventListener('click', reset);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') enqueue(); });

    // Seed
    queue = [10, 20, 30];
    render();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── ARRAY VISUALIZER ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mount an Array visualizer (set/get by index).
   * @param {string} containerId
   */
  function mountArray(containerId) {
    const root = document.getElementById(containerId);
    if (!root) { console.warn('[DSViz] Array: container not found:', containerId); return; }

    const SIZE = 6;
    let arr = new Array(SIZE).fill(null);

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-arr">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="clipboard-list" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Array <span class="dsv-badge">Fixed Size: ${SIZE}</span></div>
            <div class="dsv-panel-sub">Zero-indexed, contiguous memory — access any element in O(1)</div>
          </div>
          <button class="dsv-btn dsv-btn-ghost dsv-reset" title="Reset">↺ Reset</button>
        </div>

        <div class="dsv-controls">
          <input class="dsv-input dsv-input-sm" id="${containerId}-arr-idx" type="number"
                 placeholder="Index (0–${SIZE - 1})" min="0" max="${SIZE - 1}">
          <input class="dsv-input dsv-input-sm" id="${containerId}-arr-val" type="number"
                 placeholder="Value">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-arr-set">Set</button>
          <button class="dsv-btn dsv-btn-ghost"  id="${containerId}-arr-get">Get</button>
          <button class="dsv-btn dsv-btn-danger" id="${containerId}-arr-clr">Clear</button>
        </div>

        <div class="dsv-status" id="${containerId}-arr-status"></div>

        <div class="dsv-arr-stage" id="${containerId}-arr-stage"></div>

        <div class="dsv-arr-labels" id="${containerId}-arr-labels"></div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const idxInput = root.querySelector(`#${containerId}-arr-idx`);
    const valInput = root.querySelector(`#${containerId}-arr-val`);
    const stage    = root.querySelector(`#${containerId}-arr-stage`);
    const labels   = root.querySelector(`#${containerId}-arr-labels`);
    const statusEl = root.querySelector(`#${containerId}-arr-status`);
    const resetBtn = root.querySelector('.dsv-reset');

    function render(highlightIdx = -1, mode = '') {
      stage.innerHTML = '';
      labels.innerHTML = '';

      arr.forEach((val, i) => {
        const cell = document.createElement('div');
        cell.className = 'dsv-arr-cell';
        if (i === highlightIdx) {
          cell.classList.add(mode === 'get' ? 'dsv-arr-get' : 'dsv-arr-set');
        }
        if (val === null) cell.classList.add('dsv-arr-empty');
        cell.textContent = val !== null ? val : '—';
        stage.appendChild(cell);

        const lbl = document.createElement('div');
        lbl.className = 'dsv-arr-lbl';
        lbl.textContent = `[${i}]`;
        labels.appendChild(lbl);

        if (i === highlightIdx) flash(cell, 'dsv-flash');
      });
    }

    function getIdx() {
      const n = parseVal(idxInput.value);
      if (n === null || n < 0 || n >= SIZE) {
        status(statusEl, `⚠ Index must be 0 – ${SIZE - 1}.`, 'warn');
        return null;
      }
      return n;
    }

    function setCell() {
      const i = getIdx(); if (i === null) return;
      const v = parseVal(valInput.value);
      if (v === null) { status(statusEl, '⚠ Enter a valid integer value.', 'warn'); return; }
      arr[i] = v;
      render(i, 'set');
      status(statusEl, `✔ arr[${i}] = ${v}`, 'ok');
    }

    function getCell() {
      const i = getIdx(); if (i === null) return;
      render(i, 'get');
      const val = arr[i];
      status(statusEl,
        val !== null ? `arr[${i}] → ${val}` : `arr[${i}] is empty`,
        val !== null ? 'ok' : 'info');
    }

    function clearCell() {
      const i = getIdx(); if (i === null) return;
      arr[i] = null;
      render(i);
      status(statusEl, `✔ arr[${i}] cleared`, 'ok');
    }

    function reset() {
      arr = new Array(SIZE).fill(null);
      render();
      status(statusEl, 'Array reset.', 'info');
    }

    root.querySelector(`#${containerId}-arr-set`).addEventListener('click', setCell);
    root.querySelector(`#${containerId}-arr-get`).addEventListener('click', getCell);
    root.querySelector(`#${containerId}-arr-clr`).addEventListener('click', clearCell);
    resetBtn.addEventListener('click', reset);

    // Seed
    arr = [90, 85, 95, null, null, null];
    render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  
  // ══════════════════════════════════════════════════════════════════════════
  // ── SORTING VISUALIZER ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  function mountSort(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;

    let arr = [50, 20, 80, 10, 60, 30, 90, 40];
    let isSorting = false;

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-srt">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="bar-chart" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Sorting Visualizer</div>
            <div class="dsv-panel-sub">Compare values and swap them to order the array</div>
          </div>
          <button class="dsv-btn dsv-btn-ghost dsv-reset" title="Reset">↺ Reset</button>
        </div>

        <div class="dsv-controls">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-bubble">Bubble Sort</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-selection">Selection Sort</button>
        </div>

        <div class="dsv-status" id="${containerId}-srt-status"></div>

        <div style="display: flex; gap: 2rem; overflow-x: auto; padding-bottom: 1rem;">
          <div style="flex: 1; min-width: 250px;">
             <h4 style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-align: center;">Before Sorting (Original)</h4>
             <div class="dsv-sort-stage" id="${containerId}-srt-stage-before" style="border: none; border-bottom: 2px solid var(--border); padding-bottom: 0;"></div>
          </div>
          <div style="flex: 1; min-width: 250px;">
             <h4 style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-align: center;">After Sorting (Live Progress)</h4>
             <div class="dsv-sort-stage" id="${containerId}-srt-stage-after" style="border: none; border-bottom: 2px solid var(--border); padding-bottom: 0;"></div>
          </div>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const stageBefore = root.querySelector(`#${containerId}-srt-stage-before`);
    const stageAfter = root.querySelector(`#${containerId}-srt-stage-after`);
    const statusEl = root.querySelector(`#${containerId}-srt-status`);
    const resetBtn = root.querySelector('.dsv-reset');

    const originalArr = [...arr];

    function renderBefore() {
      stageBefore.innerHTML = '';
      const maxVal = Math.max(...originalArr, 100);
      originalArr.forEach((val) => {
        const bar = document.createElement('div');
        bar.className = 'dsv-sort-bar';
        bar.style.height = `${(val / maxVal) * 120}px`;
        bar.textContent = val;
        stageBefore.appendChild(bar);
      });
    }

    function render(activeIndices = [], doneIndices = []) {
      stageAfter.innerHTML = '';
      const maxVal = Math.max(...arr, 100);
      arr.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.className = 'dsv-sort-bar';
        if (activeIndices.includes(i)) bar.classList.add('dsv-sort-active');
        if (doneIndices.includes(i)) bar.classList.add('dsv-sort-done');
        bar.style.height = `${(val / maxVal) * 120}px`;
        bar.textContent = val;
        stageAfter.appendChild(bar);
      });
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));

    async function bubbleSort() {
      if (isSorting) return;
      isSorting = true;
      let n = arr.length;
      let done = [];
      status(statusEl, 'Starting Bubble Sort...', 'info');
      for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
          render([j, j + 1], done);
          await delay(300);
          if (arr[j] > arr[j + 1]) {
            let temp = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = temp;
            render([j, j + 1], done);
            await delay(300);
          }
        }
        done.push(n - i - 1);
      }
      done.push(0);
      render([], done);
      status(statusEl, 'Bubble Sort Complete!', 'ok');
      isSorting = false;
    }

    async function selectionSort() {
      if (isSorting) return;
      isSorting = true;
      let n = arr.length;
      let done = [];
      status(statusEl, 'Starting Selection Sort...', 'info');
      for (let i = 0; i < n; i++) {
        let min_idx = i;
        for (let j = i + 1; j < n; j++) {
          render([i, j, min_idx], done);
          await delay(200);
          if (arr[j] < arr[min_idx]) {
            min_idx = j;
          }
        }
        if (min_idx !== i) {
          let temp = arr[i];
          arr[i] = arr[min_idx];
          arr[min_idx] = temp;
        }
        done.push(i);
        render([], done);
      }
      status(statusEl, 'Selection Sort Complete!', 'ok');
      isSorting = false;
    }

    function reset() {
      if (isSorting) return;
      arr = [50, 20, 80, 10, 60, 30, 90, 40];
      render();
      status(statusEl, 'Array reset.', 'info');
    }

    root.querySelector(`#${containerId}-bubble`).addEventListener('click', bubbleSort);
    root.querySelector(`#${containerId}-selection`).addEventListener('click', selectionSort);
    resetBtn.addEventListener('click', reset);

    renderBefore();
    render();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TREE VISUALIZER ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  function mountTree(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-tree">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="trees" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Tree Structure</div>
            <div class="dsv-panel-sub">Hierarchical data structure with root, children, and leaves</div>
          </div>
        </div>

        <div class="dsv-controls" style="justify-content: center;">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-hl-root">Highlight Root</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-hl-child">Highlight Children</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-hl-leaf">Highlight Leaves</button>
        </div>

        <div class="dsv-tree-stage">
          <svg class="dsv-tree-svg">
            <!-- Root to Children -->
            <line x1="200" y1="30" x2="100" y2="100" stroke="var(--border)" stroke-width="2"/>
            <line x1="200" y1="30" x2="300" y2="100" stroke="var(--border)" stroke-width="2"/>
            <!-- Children to Leaves -->
            <line x1="100" y1="100" x2="50" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="100" y1="100" x2="150" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="300" y1="100" x2="250" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="300" y1="100" x2="350" y2="170" stroke="var(--border)" stroke-width="2"/>
          </svg>
          <div class="dsv-t-node root" style="left: 180px; top: 10px;">A</div>
          <div class="dsv-t-node child" style="left: 80px; top: 80px;">B</div>
          <div class="dsv-t-node child" style="left: 280px; top: 80px;">C</div>
          <div class="dsv-t-node leaf" style="left: 30px; top: 150px;">D</div>
          <div class="dsv-t-node leaf" style="left: 130px; top: 150px;">E</div>
          <div class="dsv-t-node leaf" style="left: 230px; top: 150px;">F</div>
          <div class="dsv-t-node leaf" style="left: 330px; top: 150px;">G</div>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    function highlight(className) {
      root.querySelectorAll('.dsv-t-node').forEach(el => el.classList.remove('dsv-t-hl'));
      root.querySelectorAll('.' + className).forEach(el => el.classList.add('dsv-t-hl'));
    }

    root.querySelector(`#${containerId}-hl-root`).addEventListener('click', () => highlight('root'));
    root.querySelector(`#${containerId}-hl-child`).addEventListener('click', () => {
      highlight('child');
      // Root's children specifically are B and C, D E F G are also children of B and C, but B and C are the direct children of root
      // We will highlight all that have child class
    });
    root.querySelector(`#${containerId}-hl-leaf`).addEventListener('click', () => highlight('leaf'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BST VISUALIZER ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  function mountBST(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;

    let isTraversing = false;

    const treesData = {
      basic: {
        tree: { 10: { left: 5, right: 15 }, 5: { left: null, right: null }, 15: { left: null, right: null } },
        rootNode: 10,
        edges: [
          { from: 10, to: 5, x1: 200, y1: 30, x2: 120, y2: 100 },
          { from: 10, to: 15, x1: 200, y1: 30, x2: 280, y2: 100 }
        ],
        nodes: [
          { val: 10, x: 180, y: 10 }, { val: 5, x: 100, y: 80 }, { val: 15, x: 260, y: 80 }
        ]
      },
      medium: {
        tree: {
          10: { left: 5, right: 15 }, 5: { left: 2, right: 7 }, 15: { left: 12, right: 20 },
          2: { left: null, right: null }, 7: { left: null, right: null }, 12: { left: null, right: null }, 20: { left: null, right: null }
        },
        rootNode: 10,
        edges: [
          { from: 10, to: 5, x1: 200, y1: 30, x2: 100, y2: 100 },
          { from: 10, to: 15, x1: 200, y1: 30, x2: 300, y2: 100 },
          { from: 5, to: 2, x1: 100, y1: 100, x2: 50, y2: 170 },
          { from: 5, to: 7, x1: 100, y1: 100, x2: 150, y2: 170 },
          { from: 15, to: 12, x1: 300, y1: 100, x2: 250, y2: 170 },
          { from: 15, to: 20, x1: 300, y1: 100, x2: 350, y2: 170 }
        ],
        nodes: [
          { val: 10, x: 180, y: 10 }, { val: 5, x: 80, y: 80 }, { val: 15, x: 280, y: 80 },
          { val: 2, x: 30, y: 150 }, { val: 7, x: 130, y: 150 }, { val: 12, x: 230, y: 150 }, { val: 20, x: 330, y: 150 }
        ]
      },
      hard: {
        tree: {
          20: { left: null, right: 30 }, 30: { left: 25, right: 35 }, 25: { left: null, right: null },
          35: { left: 32, right: null }, 32: { left: null, right: null }
        },
        rootNode: 20,
        edges: [
          { from: 20, to: 30, x1: 150, y1: 30, x2: 230, y2: 80 },
          { from: 30, to: 25, x1: 230, y1: 80, x2: 180, y2: 130 },
          { from: 30, to: 35, x1: 230, y1: 80, x2: 280, y2: 130 },
          { from: 35, to: 32, x1: 280, y1: 130, x2: 230, y2: 180 }
        ],
        nodes: [
          { val: 20, x: 130, y: 10 }, { val: 30, x: 210, y: 60 }, { val: 25, x: 160, y: 110 },
          { val: 35, x: 260, y: 110 }, { val: 32, x: 210, y: 160 }
        ]
      },
      leftHeavy: {
        tree: { 40: { left: 30, right: null }, 30: { left: 20, right: null }, 20: { left: 10, right: null }, 10: { left: null, right: null } },
        rootNode: 40,
        edges: [
          { from: 40, to: 30, x1: 280, y1: 30, x2: 230, y2: 80 },
          { from: 30, to: 20, x1: 230, y1: 80, x2: 180, y2: 130 },
          { from: 20, to: 10, x1: 180, y1: 130, x2: 130, y2: 180 }
        ],
        nodes: [
          { val: 40, x: 260, y: 10 }, { val: 30, x: 210, y: 60 }, { val: 20, x: 160, y: 110 }, { val: 10, x: 110, y: 160 }
        ]
      },
      rightHeavy: {
        tree: { 10: { left: null, right: 20 }, 20: { left: null, right: 30 }, 30: { left: null, right: 40 }, 40: { left: null, right: null } },
        rootNode: 10,
        edges: [
          { from: 10, to: 20, x1: 120, y1: 30, x2: 170, y2: 80 },
          { from: 20, to: 30, x1: 170, y1: 80, x2: 220, y2: 130 },
          { from: 30, to: 40, x1: 220, y1: 130, x2: 270, y2: 180 }
        ],
        nodes: [
          { val: 10, x: 100, y: 10 }, { val: 20, x: 150, y: 60 }, { val: 30, x: 200, y: 110 }, { val: 40, x: 250, y: 160 }
        ]
      },
      complex: {
        tree: {
          50: { left: 25, right: 75 }, 25: { left: null, right: 35 }, 35: { left: 30, right: null }, 30: { left: null, right: null },
          75: { left: 60, right: 85 }, 60: { left: null, right: null }, 85: { left: 80, right: null }, 80: { left: null, right: null }
        },
        rootNode: 50,
        edges: [
          { from: 50, to: 25, x1: 200, y1: 30, x2: 120, y2: 80 },
          { from: 50, to: 75, x1: 200, y1: 30, x2: 280, y2: 80 },
          { from: 25, to: 35, x1: 120, y1: 80, x2: 170, y2: 130 },
          { from: 35, to: 30, x1: 170, y1: 130, x2: 140, y2: 180 },
          { from: 75, to: 60, x1: 280, y1: 80, x2: 230, y2: 130 },
          { from: 75, to: 85, x1: 280, y1: 80, x2: 330, y2: 130 },
          { from: 85, to: 80, x1: 330, y1: 130, x2: 300, y2: 180 }
        ],
        nodes: [
          { val: 50, x: 180, y: 10 }, { val: 25, x: 100, y: 60 }, { val: 35, x: 150, y: 110 }, { val: 30, x: 120, y: 160 },
          { val: 75, x: 260, y: 60 }, { val: 60, x: 210, y: 110 }, { val: 85, x: 310, y: 110 }, { val: 80, x: 280, y: 160 }
        ]
      }
    };

    let currentLevel = 'medium';
    let currentTreeData = treesData[currentLevel];

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-bst">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="search" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Binary Search Tree (BST)</div>
            <div class="dsv-panel-sub">BST Property: Left Value &lt; Parent Value &lt; Right Value</div>
          </div>
        </div>

        <div class="dsv-controls" style="justify-content: center; margin-bottom: 1rem;">
          <select class="dsv-input dsv-input-sm" id="${containerId}-level" style="background: var(--bg-secondary); cursor: pointer; max-width: 100%;">
            <option value="basic">Basic Tree</option>
            <option value="medium" selected>Medium Tree</option>
            <option value="hard">Hard (Zigzag)</option>
            <option value="leftHeavy">Left-Heavy</option>
            <option value="rightHeavy">Right-Heavy</option>
            <option value="complex">Complex Edge Cases</option>
          </select>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-pre">Pre-order</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-in">In-order</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-post">Post-order</button>
        </div>
        
        <div class="dsv-status" id="${containerId}-bst-status" style="text-align: center; font-weight: bold; min-height: 24px;"></div>

        <div class="dsv-tree-stage" id="${containerId}-stage">
          <!-- Rendered dynamically -->
        </div>
      </div>`;
    
    if (window.lucide) window.lucide.createIcons({ root: root });

    const statusEl = root.querySelector(`#${containerId}-bst-status`);
    const stageEl = root.querySelector(`#${containerId}-stage`);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    function renderTree() {
      let svgLines = currentTreeData.edges.map((e, idx) => 
        `<line id="edge-${e.from}-${e.to}" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="var(--border)" stroke-width="2"/>`
      ).join('');
      let htmlNodes = currentTreeData.nodes.map(n => 
        `<div class="dsv-t-node node-${n.val}" style="left: ${n.x}px; top: ${n.y}px;">${n.val}</div>`
      ).join('');
      
      stageEl.innerHTML = `
        <svg class="dsv-tree-svg">
          ${svgLines}
        </svg>
        ${htmlNodes}
      `;
    }

    renderTree();

    root.querySelector(`#${containerId}-level`).addEventListener('change', (e) => {
      if (isTraversing) {
        e.target.value = currentLevel; // Revert change if busy
        return;
      }
      currentLevel = e.target.value;
      currentTreeData = treesData[currentLevel];
      renderTree();
      statusEl.innerHTML = '';
    });

    async function traverse(orderName) {
      if (isTraversing) return;
      isTraversing = true;

      const treeObj = currentTreeData.tree;
      const rootNode = currentTreeData.rootNode;

      root.querySelectorAll('.dsv-t-node').forEach(el => {
        el.classList.remove('dsv-t-hl', 'dsv-t-done');
      });
      const lines = root.querySelectorAll('.dsv-tree-svg line');
      lines.forEach(el => {
        el.setAttribute('stroke', 'var(--border)');
        el.classList.remove('dsv-edge-active', 'dsv-edge-backtrack');
      });
      
      statusEl.innerHTML = `<div><strong>${orderName} Traversal:</strong> <span id="${containerId}-trav-result"></span></div>
                            <div id="${containerId}-trav-explain" style="color:var(--text-secondary); font-size: 0.85em; font-weight: normal; margin-top: 4px;"></div>`;
      
      const resultEl = root.querySelector(`#${containerId}-trav-result`);
      const explainEl = root.querySelector(`#${containerId}-trav-explain`);

      const highlightEdge = (from, to, state) => {
        const line = root.querySelector(`#edge-${from}-${to}`) || root.querySelector(`#edge-${to}-${from}`);
        if (line) {
          line.classList.remove('dsv-edge-active', 'dsv-edge-backtrack');
          if (state === 'active') line.classList.add('dsv-edge-active');
          if (state === 'backtrack') line.classList.add('dsv-edge-backtrack');
        }
      };

      async function visit(node) {
        explainEl.innerHTML = `<strong>Action:</strong> Visiting Node <span style="color:var(--accent-primary)">${node}</span>`;
        const el = root.querySelector('.node-' + node);
        el.classList.add('dsv-t-hl');
        await delay(700);
        resultEl.textContent += (resultEl.textContent ? " → " : "") + node;
        el.classList.remove('dsv-t-hl');
        el.classList.add('dsv-t-done');
      }

      async function rec(node, parent) {
        if (!node) return;
        
        if (parent) {
          highlightEdge(parent, node, 'active');
          explainEl.innerHTML = `Traversing down from ${parent} to <strong>${node}</strong>`;
          await delay(600);
        }

        if (orderName === 'Pre-order') await visit(node);

        if (treeObj[node].left) {
          await rec(treeObj[node].left, node);
        } else {
          explainEl.innerHTML = `Node <strong>${node}</strong> has no left child.`;
          await delay(400);
        }

        if (orderName === 'In-order') await visit(node);

        if (treeObj[node].right) {
          await rec(treeObj[node].right, node);
        } else {
          explainEl.innerHTML = `Node <strong>${node}</strong> has no right child.`;
          await delay(400);
        }

        if (orderName === 'Post-order') await visit(node);

        if (parent) {
          explainEl.innerHTML = `Backtracking up from ${node} to <strong>${parent}</strong>`;
          highlightEdge(parent, node, 'backtrack');
          await delay(500);
          highlightEdge(parent, node, 'default');
        }
      }

      await rec(rootNode, null);
      explainEl.innerHTML = "<strong style='color:#10b981'>Traversal Complete!</strong>";
      
      await delay(1500);
      root.querySelectorAll('.dsv-t-node').forEach(el => el.classList.remove('dsv-t-done'));
      isTraversing = false;
    }

    root.querySelector(`#${containerId}-pre`).addEventListener('click', () => traverse('Pre-order'));
    root.querySelector(`#${containerId}-in`).addEventListener('click', () => traverse('In-order'));
    root.querySelector(`#${containerId}-post`).addEventListener('click', () => traverse('Post-order'));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return { mountLinkedList, mountStack, mountQueue, mountArray, mountSort, mountTree, mountBST };

})();
