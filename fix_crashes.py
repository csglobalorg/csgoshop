import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: String cast for product.id.split
content = content.replace(
    "const seed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);",
    "const seed = String(product.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);"
)

# Fix 2: Cache the HTML at the end of renderHome
content = content.replace(
    "document.head.appendChild(style);\n}",
    "document.head.appendChild(style);\n\n    // Cache the rendered HTML for instant subsequent loads\n    localStorage.setItem('csgo_home_cache', mainContent.innerHTML);\n}"
)

# Fix 3: Also wrap JSON.parse in renderHome in try/catch to be safe
content = content.replace(
    "let recentlyViewedIds = JSON.parse(localStorage.getItem('csgo_recently_viewed')) || [];",
    "let recentlyViewedIds = [];\n    try { recentlyViewedIds = JSON.parse(localStorage.getItem('csgo_recently_viewed')) || []; } catch(e) {}"
)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fixes to script.js")
