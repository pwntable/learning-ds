import json

with open('questions.json', 'r') as f:
    data = json.load(f)

# Shift lessons
if '10' in data['lessons']:
    data['lessons']['13'] = data['lessons'].pop('10')
if '9' in data['lessons']:
    data['lessons']['12'] = data['lessons'].pop('9')

# Add mock questions for 9, 10, 11
data['lessons']['9'] = {
    "questions": [
        {
            "id": "q9_1",
            "type": "mcq",
            "prompt": "Which sorting algorithm repeatedly swaps adjacent elements if they are in wrong order?",
            "options": ["Selection Sort", "Bubble Sort", "Insertion Sort"],
            "correct": 1,
            "hints": ["It 'bubbles' the largest elements to the end."],
            "explanation": "Bubble sort works by repeatedly swapping adjacent elements that are out of order."
        }
    ]
}

data['lessons']['10'] = {
    "questions": [
        {
            "id": "q10_1",
            "type": "mcq",
            "prompt": "What is the topmost node of a tree called?",
            "options": ["Leaf", "Child", "Root"],
            "correct": 2,
            "hints": ["It's where the tree starts."],
            "explanation": "The Root is the topmost node in a tree hierarchy."
        }
    ]
}

data['lessons']['11'] = {
    "questions": [
        {
            "id": "q11_1",
            "type": "mcq",
            "prompt": "Which traversal visits the left subtree, then the root, then the right subtree?",
            "options": ["Pre-order", "In-order", "Post-order"],
            "correct": 1,
            "hints": ["The root is visited 'in' between the subtrees."],
            "explanation": "In-order traversal visits left child, root, right child. For a BST, this gives elements in sorted order."
        }
    ]
}

with open('questions.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Updated questions.json")
