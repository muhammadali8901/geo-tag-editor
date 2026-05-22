"""
Second pass: Fix remaining em-dash and pipe symbols
These are in minified HTML files where content is deeply nested in single-line HTML.
We do a raw byte-level replacement in non-script sections.
"""
import os, re

root = r'c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor'

# Files still needing fixes (from previous audit)
target_files_em = [
    'about\\index.html',
    'add-gps-to-photo-online\\index.html',
    'author\\alex-rivers\\index.html',
    'blog\\add-location-photos-android-guide\\index.html',
    'blog\\exif-vs-metadata-whats-the-difference\\index.html',
    'blog\\how-to-add-geotag-to-existing-photos\\index.html',
    'blog\\how-to-add-gps-location-to-photos\\index.html',
    'blog\\how-to-add-location-to-photos-android-iphone\\index.html',
    'blog\\how-to-geotag-photos-for-real-estate\\index.html',
    'blog\\index.html',
    'blog\\what-is-geotagging\\index.html',
    'features\\index.html',
    'geo-tag-editor\\index.html',
    'how-to-remove-location-from-photos\\index.html',
    'index.html',
    'remove-geotag-from-photo-online\\index.html',
]

target_files_pipe = [
    'disclaimer\\index.html',
    'privacy-policy\\index.html',
    'sitemap\\index.html',
    'terms\\index.html',
]

EM_UTF8 = '\u2014'  # em dash

def fix_aggressive(content, fix_em=True, fix_pipe_meta=False):
    """More aggressive fix: split on script blocks and replace ALL em dashes outside them."""
    
    # Split out all script/style blocks to protect them
    preserved = {}
    counter = [0]
    
    def save_block(m):
        key = f'__PRESERVED_{counter[0]}__'
        preserved[key] = m.group(0)
        counter[0] += 1
        return key
    
    # Protect script tags
    protected = re.sub(r'<script[\s\S]*?</script>', save_block, content, flags=re.IGNORECASE)
    # Protect style tags  
    protected = re.sub(r'<style[\s\S]*?</style>', save_block, protected, flags=re.IGNORECASE)
    
    if fix_em:
        # Replace ALL em dashes outside protected blocks
        protected = protected.replace(EM_UTF8, '-')
        protected = protected.replace('&mdash;', '-')
        protected = protected.replace('&#8212;', '-')
    
    if fix_pipe_meta:
        # Replace pipe only in content="..." attribute values (meta/og tags)
        def fix_pipe_in_content(m):
            return m.group(0).replace('|', '-')
        protected = re.sub(r'content="[^"]*"', fix_pipe_in_content, protected)
        # Also fix in title
        protected = re.sub(r'(<title>[^<]*)\|([^<]*</title>)', r'\1-\2', protected)
    
    # Restore protected blocks
    for key, val in preserved.items():
        protected = protected.replace(key, val)
    
    return protected


# Process em-dash files
print("=== FIXING EM DASHES (aggressive pass) ===")
for rel in target_files_em:
    fpath = os.path.join(root, rel)
    if not os.path.exists(fpath):
        print(f"  MISSING: {rel}")
        continue
    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    original = content
    content = fix_aggressive(content, fix_em=True, fix_pipe_meta=False)
    if content != original:
        with open(fpath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print(f"  Fixed: {rel}")
    else:
        print(f"  No change: {rel}")

print()
print("=== FIXING PIPES IN META (aggressive pass) ===")
for rel in target_files_pipe:
    fpath = os.path.join(root, rel)
    if not os.path.exists(fpath):
        print(f"  MISSING: {rel}")
        continue
    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    original = content
    content = fix_aggressive(content, fix_em=True, fix_pipe_meta=True)
    if content != original:
        with open(fpath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print(f"  Fixed: {rel}")
    else:
        print(f"  No change: {rel}")

# Final verification
print()
print("=== FINAL VERIFICATION ===")
all_files = []
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if d not in ['.git','.vscode','node_modules']]
    for fn in fns:
        if fn == 'index.html':
            all_files.append(os.path.join(dp, fn))

still_bad = []
for fpath in sorted(all_files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    rel = fpath.replace(root, '').lstrip(os.sep)
    has_em = b'\xe2\x80\x94' in raw
    
    text = raw.decode('utf-8', errors='replace')
    no_scripts = re.sub(r'<script[\s\S]*?</script>', '', text, flags=re.IGNORECASE)
    no_scripts = re.sub(r'<style[\s\S]*?</style>', '', no_scripts, flags=re.IGNORECASE)
    title_matches = re.findall(r'<title>[^<]*</title>', no_scripts)
    has_pipe_title = any('|' in t for t in title_matches)
    meta_matches = re.findall(r'content="[^"]{0,400}"', no_scripts)
    has_pipe_meta = any('|' in m for m in meta_matches)
    
    if has_em or has_pipe_title or has_pipe_meta:
        still_bad.append((rel, has_em, has_pipe_title, has_pipe_meta))

total = len(all_files)
clean = total - len(still_bad)
print(f"Total pages: {total}")
print(f"Clean pages: {clean}/{total} = {round(clean/total*100)}%")
if still_bad:
    print(f"\nStill needing attention ({len(still_bad)} pages):")
    for rel, em, pt, pm in still_bad:
        issues = []
        if em: issues.append('em-dash in body/content')
        if pt: issues.append('pipe in title')
        if pm: issues.append('pipe in meta content')
        print(f"  - {rel}: {', '.join(issues)}")
    print()
    # Show what's left for first bad file
    if still_bad:
        rel = still_bad[0][0]
        fpath = os.path.join(root, rel)
        with open(fpath, 'rb') as f:
            raw = f.read()
        em_idx = raw.find(b'\xe2\x80\x94')
        if em_idx >= 0:
            ctx = raw[max(0,em_idx-100):em_idx+100].decode('utf-8','replace')
            print(f"Context of remaining em dash in {rel}:")
            print(repr(ctx))
else:
    print("\nALL PAGES CLEAN!")
