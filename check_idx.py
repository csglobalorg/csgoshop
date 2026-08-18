import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "    const homeContentHtml = "
end_str = "    // Replace skeletons or set innerHTML BEFORE initializing icons"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    print(f"Found from {start_idx} to {end_idx}")
else:
    print("Not found")
