import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/scratch.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search via regex for the start of the else block
match = re.search(r'\} else \{\s*// User is logged in', content)
if match:
    print("Found else block at index:", match.start())
    start_idx = match.start()
    
    main_assign_start = content.find("mainContent.innerHTML = `", start_idx)
    # Because there might be nested backticks (like inside `${}`), simple find is dangerous.
    # But let's find the closing backtick that ends mainContent.innerHTML.
    # We can look for the string:
    #             </div>
    #         <div class="reveal">
    # 
    # Or just use the original script file and rewrite renderAccount fully from scratch.
    
    print("Main Content Assignment found at", main_assign_start)
    
else:
    print("Could not find regex match")
