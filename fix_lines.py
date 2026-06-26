with open('quiz-engine.js', 'r') as f:
    content = f.read()

content = content.replace(
    "line.setAttribute('y2', child.y + 20);\n                svg.appendChild(line);",
    "line.setAttribute('y2', child.y + 20);\n                line.setAttribute('stroke', 'var(--border)');\n                line.setAttribute('stroke-width', '2');\n                svg.appendChild(line);"
)

with open('quiz-engine.js', 'w') as f:
    f.write(content)
