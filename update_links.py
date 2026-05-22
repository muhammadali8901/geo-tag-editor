import re

filepath = r"c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor\index.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Update CTA links on the homepage to scroll to the embedded tool instead of loading a new page
content = content.replace('href="/geo-tag-editor/" class="nav-cta"', 'href="#tool" class="nav-cta"')
content = content.replace('href="/geo-tag-editor/" class="btn btn-primary"', 'href="#tool" class="btn btn-primary"')
content = content.replace('href="/geo-tag-editor/" class="btn btn-teal"', 'href="#tool" class="btn btn-teal"')
content = content.replace('href="/geo-tag-editor/" class="btn btn-primary sidebar-btn"', 'href="#tool" class="btn btn-primary sidebar-btn"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated CTA links on homepage to point to #tool anchor.")
