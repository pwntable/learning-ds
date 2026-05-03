import re

with open('index.html', 'r') as f:
    content = f.read()

# Replace sidebar-btn disabled
content = re.sub(r'<button class="sidebar-btn" onclick="go\((.*?)\)" id="(.*?)" disabled>',
                 r'<button class="sidebar-btn locked" onclick="go(\1)" id="\2">', content)

# Replace nextBtn disabled
content = re.sub(r'<button class="btn btn-primary" id="(.*?)" onclick="(.*?)" disabled>',
                 r'<button class="btn btn-primary locked" id="\1" onclick="\2">', content)

# Modify go(n)
old_go = """    function go(n) {
      if (!unlockedLessons.has(n)) {
        return;
      }"""
new_go = """    function go(n) {
      if (!unlockedLessons.has(n)) {
        alert("Please answer the current quiz correctly to proceed to the next section!");
        return;
      }"""
content = content.replace(old_go, new_go)

# Modify checkAnswer unlock logic
old_unlock_1 = """          document.getElementById(`btn${lessonId + 1}`).disabled = false;"""
new_unlock_1 = """          document.getElementById(`btn${lessonId + 1}`).classList.remove('locked');"""
content = content.replace(old_unlock_1, new_unlock_1)

old_unlock_2 = """        if (nextBtn) nextBtn.disabled = false;"""
new_unlock_2 = """        if (nextBtn) nextBtn.classList.remove('locked');"""
content = content.replace(old_unlock_2, new_unlock_2)

with open('index.html', 'w') as f:
    f.write(content)
