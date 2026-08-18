import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('&copy; 2026 CSGO SHOP.', '&copy; <span id="current-year">2026</span> CSGO SHOP.')

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added current-year id back to index.html.")
