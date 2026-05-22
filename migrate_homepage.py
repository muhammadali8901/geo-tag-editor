import re
import os
import shutil

root_dir = r"c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor"
old_home = os.path.join(root_dir, "index.html")
new_home = os.path.join(root_dir, "geo-tag-editor", "index.html")
backup_home = os.path.join(root_dir, "index_backup_before_new.html")

# Backup the old homepage just in case
shutil.copy(old_home, backup_home)

with open(old_home, "r", encoding="utf-8") as f:
    old_content = f.read()

# Extract the tool card HTML
tool_match = re.search(r'(<div class="tool-card" id="tool-card">.*?</div>\s*</div>\s*</div>)', old_content, re.DOTALL)
if not tool_match:
    # Try a looser match
    tool_match = re.search(r'(<div class="tool-card" id="tool-card">.*?</section>)', old_content, re.DOTALL)
    
if not tool_match:
    print("Could not find the tool-card in the old index.html")
    exit(1)

# Just extract the tool-card div specifically. We know it ends before </section>
start_idx = old_content.find('<div class="tool-card" id="tool-card">')
# Find the matching closing div for tool-card
div_depth = 0
end_idx = start_idx
for i in range(start_idx, len(old_content)):
    if old_content[i:i+4] == '<div':
        div_depth += 1
    elif old_content[i:i+5] == '</div':
        div_depth -= 1
        if div_depth == 0:
            end_idx = i + 6
            break

tool_html = old_content[start_idx:end_idx]

# Wrap it in the tool-embed-section
wrapped_tool = f"""
<!-- ═══ TOOL EMBED ════════════════════════════════════════ -->
<section class="tool-embed-section" id="tool">
  <div class="container">
    <div class="tool-anchor-card">
      {tool_html}
    </div>
  </div>
</section>
"""

with open(new_home, "r", encoding="utf-8") as f:
    new_content = f.read()

# Insert the wrapped tool after the stats-strip section
stats_end_idx = new_content.find('</section>', new_content.find('<section class="stats-strip"')) + 10
final_content = new_content[:stats_end_idx] + wrapped_tool + new_content[stats_end_idx:]

# Also ensure that any missing scripts for the tool are present.
# The new file already has common.js and site.js.

with open(old_home, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Successfully replaced homepage with the new design and injected the tool HTML.")
