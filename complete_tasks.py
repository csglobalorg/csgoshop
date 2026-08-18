import re

with open('c:/Users/CS/.gemini/antigravity-ide/brain/0f496118-d5cf-4748-9964-87ba2e05dcd1/task.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ]", "- [x]")
content = content.replace("Phase 4 Tasks: Dashboard Redesign", "Phase 4 Tasks: Dashboard Redesign (Completed)")

with open('c:/Users/CS/.gemini/antigravity-ide/brain/0f496118-d5cf-4748-9964-87ba2e05dcd1/task.md', 'w', encoding='utf-8') as f:
    f.write(content)
