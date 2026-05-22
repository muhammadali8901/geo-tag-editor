import re
import os

filepath = r"c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor\index.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update noscript tag
old_noscript = r'<noscript><div class="noscript-banner">JavaScript is required for the Geo Tags Editor tool to function. Please enable JavaScript in your browser.</div></noscript>'
new_noscript = r'''<noscript><div class="noscript-banner" role="alert"><strong>JavaScript Required:</strong> Our free online GPS photo editor relies on JavaScript to process your images securely. Because Geo Tags Editor is a 100% client-side tool, your photos are never uploaded to a server. Please enable JavaScript to add GPS coordinates to photos, edit EXIF metadata, or remove geotags directly in your browser.</div></noscript>'''

content = content.replace(old_noscript, new_noscript)

# If old_noscript wasn't found perfectly, let's try a regex
if new_noscript not in content:
    content = re.sub(r'<noscript><div class="noscript-banner">.*?</div></noscript>', new_noscript, content)

# 2. Add font preload to head
font_preload = r'<link rel="preload" href="https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NJtEtq.woff2" as="font" type="font/woff2" crossorigin>'
if font_preload not in content:
    content = content.replace('</head>', f'{font_preload}</head>')

# 3. Remove fetchpriority="high" from logo
content = content.replace('fetchpriority="high"', 'loading="eager"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Homepage updated with technical SEO fixes.")
