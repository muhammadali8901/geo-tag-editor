fpath = r'c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor\index.html'
with open(fpath, 'rb') as f:
    raw = f.read()

import re
# Search for href patterns
links = re.findall(b'href=.{1,60}?(?:>|\\s)', raw[:8000])
print("Sample href patterns found:")
for l in links[:15]:
    print(' ', repr(l[:80]))

print()
print("File size:", len(raw))
print("BOM present:", raw[:3] == b'\xef\xbb\xbf')
print("UTF-16 LE BOM:", raw[:2] == b'\xff\xfe')
print("UTF-16 BE BOM:", raw[:2] == b'\xfe\xff')

# Try to detect encoding
sample = raw[:200]
print()
print("First 200 bytes repr:")
print(repr(sample))
