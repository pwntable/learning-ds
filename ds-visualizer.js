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

        <div class="dsv-sort-stage" id="${containerId}-srt-stage"></div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const stage = root.querySelector(`#${containerId}-srt-stage`);
    const statusEl = root.querySelector(`#${containerId}-srt-status`);
    const resetBtn = root.querySelector('.dsv-reset');

    function render(activeIndices = [], doneIndices = []) {
      stage.innerHTML = '';
      const maxVal = Math.max(...arr, 100);
      arr.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.className = 'dsv-sort-bar';
        if (activeIndices.includes(i)) bar.classList.add('dsv-sort-active');
        if (doneIndices.includes(i)) bar.classList.add('dsv-sort-done');
        bar.style.height = `${(val / maxVal) * 120}px`;
        bar.textContent = val;
        stage.appendChild(bar);
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

    root.innerHTML = `
      <div class="dsv-panel" id="${containerId}-bst">
        <div class="dsv-panel-header">
          <span class="dsv-panel-icon"><i data-lucide="search" class="icon-inline"></i></span>
          <div>
            <div class="dsv-panel-title">Binary Search Tree (BST)</div>
            <div class="dsv-panel-sub">Left child &lt; Parent &lt; Right child</div>
          </div>
        </div>

        <div class="dsv-controls" style="justify-content: center;">
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-pre">Pre-order</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-in">In-order</button>
          <button class="dsv-btn dsv-btn-accent" id="${containerId}-post">Post-order</button>
        </div>
        
        <div class="dsv-status" id="${containerId}-bst-status" style="text-align: center; font-weight: bold; min-height: 24px;"></div>

        <div class="dsv-tree-stage">
          <svg class="dsv-tree-svg">
            <line x1="200" y1="30" x2="100" y2="100" stroke="var(--border)" stroke-width="2"/>
            <line x1="200" y1="30" x2="300" y2="100" stroke="var(--border)" stroke-width="2"/>
            <line x1="100" y1="100" x2="50" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="100" y1="100" x2="150" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="300" y1="100" x2="250" y2="170" stroke="var(--border)" stroke-width="2"/>
            <line x1="300" y1="100" x2="350" y2="170" stroke="var(--border)" stroke-width="2"/>
          </svg>
          <div class="dsv-t-node node-10" style="left: 180px; top: 10px;">10</div>
          <div class="dsv-t-node node-5" style="left: 80px; top: 80px;">5</div>
          <div class="dsv-t-node node-15" style="left: 280px; top: 80px;">15</div>
          <div class="dsv-t-node node-2" style="left: 30px; top: 150px;">2</div>
          <div class="dsv-t-node node-7" style="left: 130px; top: 150px;">7</div>
          <div class="dsv-t-node node-12" style="left: 230px; top: 150px;">12</div>
          <div class="dsv-t-node node-20" style="left: 330px; top: 150px;">20</div>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons({ root: root });

    const statusEl = root.querySelector(`#${containerId}-bst-status`);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    async function traverse(orderName, nodesList) {
      if (isTraversing) return;
      isTraversing = true;
      root.querySelectorAll('.dsv-t-node').forEach(el => el.classList.remove('dsv-t-hl'));
      statusEl.textContent = orderName + " Traversal: ";
      
      for (let i = 0; i < nodesList.length; i++) {
        const val = nodesList[i];
        const nodeEl = root.querySelector('.node-' + val);
        nodeEl.classList.add('dsv-t-hl');
        statusEl.textContent += val + (i < nodesList.length - 1 ? " → " : "");
        await delay(800);
        nodeEl.classList.remove('dsv-t-hl');
        nodeEl.classList.add('dsv-t-done'); // just a custom class for visited
      }
      
      await delay(1000);
      root.querySelectorAll('.dsv-t-node').forEach(el => el.classList.remove('dsv-t-done'));
      isTraversing = false;
    }

    root.querySelector(`#${containerId}-pre`).addEventListener('click', () => traverse('Pre-order', [10, 5, 2, 7, 15, 12, 20]));
    root.querySelector(`#${containerId}-in`).addEventListener('click', () => traverse('In-order', [2, 5, 7, 10, 12, 15, 20]));
    root.querySelector(`#${containerId}-post`).addEventListener('click', () => traverse('Post-order', [2, 7, 5, 12, 20, 15, 10]));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return { mountLinkedList, mountStack, mountQueue, mountArray, mountSort, mountTree, mountBST };

})();
