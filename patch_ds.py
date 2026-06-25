import sys

js_addition = """
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
          <span class="dsv-panel-icon">📊</span>
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
          <span class="dsv-panel-icon">🌳</span>
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
          <span class="dsv-panel-icon">🔍</span>
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
"""

with open('ds-visualizer.js', 'r') as f:
    js_content = f.read()

# Replace the public API export
old_export = "return { mountLinkedList, mountStack, mountArray };"
new_export = "return { mountLinkedList, mountStack, mountArray, mountSort, mountTree, mountBST };"

js_content = js_content.replace(old_export, js_addition + "\n  // ── Public API ─────────────────────────────────────────────────────────────\n  " + new_export)

with open('ds-visualizer.js', 'w') as f:
    f.write(js_content)


css_addition = """
/* ── Sorting Visualizer ── */
.dsv-sort-stage {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 150px;
  gap: 10px;
  padding: 20px 0;
  border-bottom: 2px solid var(--border);
}
.dsv-sort-bar {
  width: 30px;
  background: var(--primary);
  transition: height 0.3s, background 0.3s;
  text-align: center;
  color: white;
  font-size: 0.8rem;
  border-radius: 4px 4px 0 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 5px;
}
.dsv-sort-active {
  background: #f59e0b;
}
.dsv-sort-done {
  background: #10b981;
}

/* ── Tree Visualizer ── */
.dsv-tree-stage {
  position: relative;
  height: 220px;
  margin: 20px auto;
  width: 400px;
}
.dsv-tree-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.dsv-t-node {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-alt);
  border: 2px solid var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: all 0.3s ease;
  z-index: 2;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.dsv-t-hl {
  background: var(--primary);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 0 15px var(--primary);
}
.dsv-t-done {
  background: #10b981;
  color: white;
  border-color: #10b981;
}
"""

with open('ds-visualizer.css', 'a') as f:
    f.write(css_addition)

print("Updated ds-visualizer.js and ds-visualizer.css")
