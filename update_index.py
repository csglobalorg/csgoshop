import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the sections
new_sections = """
    <!-- Global Bottom Sections (Hidden on Dashboard) -->
    <div id="global-bottom-sections">
        <!-- App Download Section -->
"""

content = content.replace("    <!-- App Download Section -->", new_sections)

# The file ends around here:
#     </footer>
#     <script type="module" src="script.js"></script>
#   </body>
# </html>

content = content.replace("    </footer>\n", "    </footer>\n    </div> <!-- End Global Bottom Sections -->\n")

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html")
