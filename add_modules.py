import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Sidebar updates
sidebar_old = """      <button class="sidebar-btn" onclick="go(8)" id="btn8">8. Linked Lists</button>
      <button class="sidebar-btn" onclick="go(9)" id="btn9">9. Final Project</button>
      <div class="sidebar-section">Bonus</div>
      <button class="sidebar-btn" onclick="go(10)" id="btn10">🎓 10. Past Year</button>"""

sidebar_new = """      <button class="sidebar-btn" onclick="go(8)" id="btn8">8. Linked Lists</button>
      <div class="sidebar-section">Algorithms & Trees</div>
      <button class="sidebar-btn" onclick="go(9)" id="btn9">9. Sorting Algorithms</button>
      <button class="sidebar-btn" onclick="go(10)" id="btn10">10. Trees</button>
      <button class="sidebar-btn" onclick="go(11)" id="btn11">11. Binary Search Tree</button>
      <div class="sidebar-section">Advanced</div>
      <button class="sidebar-btn" onclick="go(12)" id="btn12">12. Final Project</button>
      <div class="sidebar-section">Bonus</div>
      <button class="sidebar-btn" onclick="go(13)" id="btn13">🎓 13. Past Year</button>"""

content = content.replace(sidebar_old, sidebar_new)

# 2. Next button for lesson 8
content = content.replace(
    '<button class="btn btn-primary" id="nextBtn8" onclick="go(9)">Next: Final Project →</button>',
    '<button class="btn btn-primary" id="nextBtn8" onclick="go(9)">Next: Sorting Algorithms →</button>'
)

# 3. Add new lessons before lesson 9
new_lessons = """
        <!-- Lesson 9: Sorting -->
        <section class="lesson-card" id="lesson9">
          <h2>📊 Sorting Algorithms</h2>
          <p>Sorting is arranging data in a particular order. Let's visualize Bubble Sort and Selection Sort.</p>
          <div id="viz-sort"></div>
          <div class="quiz-section" id="quiz9" data-quiz-lesson="9">
            <div class="quiz-title">🏁 Knowledge Check</div>
          </div>
          <div class="nav-btns">
            <button class="btn btn-secondary" onclick="go(8)">← Back</button>
            <button class="btn btn-primary" id="nextBtn9" onclick="go(10)">Next: Trees →</button>
          </div>
        </section>

        <!-- Lesson 10: Trees -->
        <section class="lesson-card" id="lesson10">
          <h2>🌳 Trees</h2>
          <p>A Tree is a hierarchical data structure. The top node is the <strong>Root</strong>, nodes below it are <strong>Children</strong>, and nodes with no children are <strong>Leaf</strong> nodes.</p>
          <div id="viz-tree"></div>
          <div class="quiz-section" id="quiz10" data-quiz-lesson="10">
            <div class="quiz-title">🏁 Knowledge Check</div>
          </div>
          <div class="nav-btns">
            <button class="btn btn-secondary" onclick="go(9)">← Back</button>
            <button class="btn btn-primary" id="nextBtn10" onclick="go(11)">Next: Binary Search Tree →</button>
          </div>
        </section>

        <!-- Lesson 11: Binary Search Tree -->
        <section class="lesson-card" id="lesson11">
          <h2>🔍 Binary Search Tree (BST)</h2>
          <p>A BST is a tree where the left child is smaller than the parent, and the right child is greater. Traversals visit nodes in different orders: <strong>Pre-order</strong>, <strong>In-order</strong>, and <strong>Post-order</strong>.</p>
          <div id="viz-bst"></div>
          <div class="quiz-section" id="quiz11" data-quiz-lesson="11">
            <div class="quiz-title">🏁 Knowledge Check</div>
          </div>
          <div class="nav-btns">
            <button class="btn btn-secondary" onclick="go(10)">← Back</button>
            <button class="btn btn-primary" id="nextBtn11" onclick="go(12)">Next: Final Project →</button>
          </div>
        </section>

        <!-- Lesson 12: Final Project -->"""

content = content.replace('<!-- Lesson 9: Final Project -->', new_lessons)
content = content.replace('<section class="lesson-card" id="lesson9">', '<section class="lesson-card" id="lesson12">', 1)
content = content.replace('id="quiz9"', 'id="quiz12"')
content = content.replace('data-quiz-lesson="9"', 'data-quiz-lesson="12"')
content = content.replace('onclick="go(8)"', 'onclick="go(11)"', 1) # Back button for lesson 12
content = content.replace('id="nextBtn9" onclick="go(10)">Next: Past Year →</button>', 'id="nextBtn12" onclick="go(13)">Next: Past Year →</button>')

# 4. Update Lesson 10 to Lesson 13
content = content.replace('<!-- Lesson 10: Past Year -->', '<!-- Lesson 13: Past Year -->')
content = content.replace('<section class="lesson-card" id="lesson10">', '<section class="lesson-card" id="lesson13">')
content = content.replace('id="quiz10"', 'id="quiz13"')
content = content.replace('data-quiz-lesson="10"', 'data-quiz-lesson="13"')
# Find the back button for lesson 13 which currently has onclick="go(9)"
content = content.replace('<button class="btn btn-secondary" onclick="go(9)">← Back</button>', '<button class="btn btn-secondary" onclick="go(12)">← Back</button>')
content = content.replace('id="nextBtn10" onclick="location.reload()">Finish Course 🏆</button>', 'id="nextBtn13" onclick="location.reload()">Finish Course 🏆</button>')

# 5. Update JS logic
content = content.replace('const totalLessons = 10;', 'const totalLessons = 13;')
content = content.replace('let unlockedLessons = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);', 'let unlockedLessons = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);')

# Mount visualizers
mount_old = """    // ── Mount DS Visualizers ───────────────────────────────────────────
    DSViz.mountArray('viz-array');
    DSViz.mountLinkedList('viz-ll');
    DSViz.mountStack('viz-stack');"""

mount_new = mount_old + """
    DSViz.mountSort('viz-sort');
    DSViz.mountTree('viz-tree');
    DSViz.mountBST('viz-bst');"""

content = content.replace(mount_old, mount_new)

with open('index.html', 'w') as f:
    f.write(content)
print("Updated index.html")
