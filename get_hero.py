import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

hero_match = re.search(r'        <!-- 1\. Hero Section -->.*?        </section>', content, re.DOTALL)
if hero_match:
    print(hero_match.group(0))
else:
    print("Hero section not found")
