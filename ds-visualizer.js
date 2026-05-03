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
          <span class="dsv-panel-icon">🔗</span>
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
          <span class="dsv-panel-icon">📚</span>
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
          <span class="dsv-panel-icon">📋</span>
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
  return { mountLinkedList, mountStack, mountArray };

})();
