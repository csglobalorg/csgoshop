import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Match standard functions and arrow functions assigned to const/let
functions = re.findall(r'function\s+(\w+)\s*\(', content)
functions += re.findall(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>', content)

for fn in set(functions):
    print(fn)
