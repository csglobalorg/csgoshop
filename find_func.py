with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'generateProductsHtml' in line:
        print(f"Line {i+1}: {line.strip()}")
