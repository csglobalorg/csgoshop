import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleRoute
route_logic = """
    // Add entrance animation class
    mainContent.classList.remove('reveal');
    void mainContent.offsetWidth; // Force reflow
    mainContent.classList.add('reveal');
    
    // Hide global footer sections on Dashboard
    const globalBottom = document.getElementById('global-bottom-sections');
    if (globalBottom) {
        const user = JSON.parse(localStorage.getItem('csgo_user'));
        if (page === 'account' && user) {
            globalBottom.style.display = 'none';
        } else {
            globalBottom.style.display = 'block';
        }
    }
"""

content = content.replace(
    "    // Add entrance animation class\n    mainContent.classList.remove('reveal');\n    void mainContent.offsetWidth; // Force reflow\n    mainContent.classList.add('reveal');",
    route_logic
)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated handleRoute in script.js")
