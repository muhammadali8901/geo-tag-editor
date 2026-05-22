"""
Safe em-dash and pipe symbol remover for geotagseditor.online
- Replaces em dash (—) and pipe (|) in: <title>, meta content, og/twitter tags, visible text nodes
- Does NOT touch: <script> blocks (JSON-LD, GA, JS code), URLs, href attributes, CSS
"""
import os, re

root = r'c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor'

files = []
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if d not in ['.git','.vscode','node_modules','lib','backup_assets','attached_assets']]
    for fn in fns:
        if fn == 'index.html':
            files.append(os.path.join(dp, fn))

EM = '\u2014'  # em dash character
MDASH_ENT = '&mdash;'
MDASH_NUM = '&#8212;'

def fix_html(content):
    """Replace em dash and pipe symbols in SEO-relevant HTML attributes and text nodes,
    while preserving script blocks, URLs, and code."""
    
    result = []
    # Split on <script...>...</script> blocks (greedy within block)
    script_split = re.compile(r'(<script(?:\s[^>]*)?>[\s\S]*?</script>)', re.IGNORECASE)
    parts = script_split.split(content)
    
    for part in parts:
        # Skip script blocks entirely
        if re.match(r'<script', part, re.IGNORECASE):
            result.append(part)
            continue
        
        # --- Fix <title>...</title> ---
        def fix_title(m):
            inner = m.group(1)
            inner = inner.replace(EM, '-').replace(MDASH_ENT, '-').replace(MDASH_NUM, '-')
            inner = inner.replace('|', '-')
            return '<title>' + inner + '</title>'
        part = re.sub(r'<title>([\s\S]*?)</title>', fix_title, part, flags=re.IGNORECASE)
        
        # --- Fix meta content="..." attributes ---
        # Covers: name="description", property="og:title", property="og:description",
        #         name="twitter:title", name="twitter:description"
        def fix_meta(m):
            full_tag = m.group(0)
            # Only fix content attribute value
            def fix_content_attr(cm):
                val = cm.group(1)
                val = val.replace(EM, '-').replace(MDASH_ENT, '-').replace(MDASH_NUM, '-')
                val = val.replace('|', '-')
                return 'content="' + val + '"'
            return re.sub(r'content="([^"]*)"', fix_content_attr, full_tag)
        
        # Match meta tags with these names/properties
        part = re.sub(
            r'<meta\s[^>]*(?:name|property)="(?:description|og:title|og:description|og:site_name|twitter:title|twitter:description)"[^>]*/?>',
            fix_meta, part, flags=re.IGNORECASE
        )
        # Also the reversed attribute order (content first, then name/property)
        part = re.sub(
            r'<meta\s[^>]*content="[^"]*"[^>]*(?:name|property)="(?:description|og:title|og:description|og:site_name|twitter:title|twitter:description)"[^>]*/?>',
            fix_meta, part, flags=re.IGNORECASE
        )
        
        # --- Fix visible text nodes (between HTML tags, not inside attributes) ---
        # This covers: h1, h2, h3, p, li, span, strong, a text, etc.
        def fix_text_node(m):
            gt = m.group(1)   # the ">" char
            text = m.group(2) # the text content
            lt = m.group(3)   # the "<" char
            text = text.replace(EM, '-').replace(MDASH_ENT, '-').replace(MDASH_NUM, '-')
            return gt + text + lt
        part = re.sub(r'(>)([^<]+)(<)', fix_text_node, part)
        
        result.append(part)
    
    return ''.join(result)


fixed_count = 0
for fpath in sorted(files):
    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    original = content
    content = fix_html(content)
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        fixed_count += 1
        rel = fpath.replace(root, '').lstrip(os.sep)
        print(f'Fixed: {rel}')

print(f'\nTotal files modified: {fixed_count}/{len(files)}')

# Verify
print('\n=== VERIFICATION ===')
still_bad = []
for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    rel = fpath.replace(root, '').lstrip(os.sep)
    
    # Check UTF-8 em dash bytes
    has_em = b'\xe2\x80\x94' in raw
    
    # Check pipe in title/meta content attributes (read as text)
    text = raw.decode('utf-8', errors='replace')
    no_scripts = re.sub(r'<script[\s\S]*?</script>', '', text, flags=re.IGNORECASE)
    title_matches = re.findall(r'<title>[^<]*</title>', no_scripts)
    has_pipe_title = any('|' in t for t in title_matches)
    meta_matches = re.findall(r'content="[^"]{0,400}"', no_scripts)
    has_pipe_meta = any('|' in m for m in meta_matches)
    
    if has_em or has_pipe_title or has_pipe_meta:
        still_bad.append((rel, has_em, has_pipe_title, has_pipe_meta))

if still_bad:
    print(f'Pages still needing fixes: {len(still_bad)}')
    for rel, em, pt, pm in still_bad:
        issues = []
        if em: issues.append('em-dash')
        if pt: issues.append('pipe-in-title')
        if pm: issues.append('pipe-in-meta')
        print(f'  {rel}: {", ".join(issues)}')
else:
    print('ALL PAGES CLEAN - No em dashes or pipes in any SEO-critical content!')

print(f'\nFinal Score:')
print(f'  Symbol Clean: {len(files) - len(still_bad)}/{len(files)} = {round((len(files)-len(still_bad))/len(files)*100)}%')
