import os, re

root = r'c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor'
files = []
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if d not in ['.git','.vscode','node_modules','lib','backup_assets','attached_assets']]
    for fn in fns:
        if fn == 'index.html':
            files.append(os.path.join(dp, fn))

files = sorted(files)
EM_BYTES = b'\xe2\x80\x94'  # UTF-8 em dash
PIPE_BYTE = ord('|')

em_issues = []
pipe_issues = []
home_link_count = 0
page_link_coverage = {}

key_targets = {
    'homepage': b'href="/"',
    'add_gps': b'add-gps-to-photo-online',
    'remove_gps': b'remove-geotag-from-photo-online',
    'geo_editor': b'geo-tag-editor',
    'blog': b'href="/blog/',
    'about': b'href="/about/',
    'contact': b'href="/contact/',
}

results = []

for fpath in files:
    with open(fpath, 'rb') as f:
        raw = f.read()
    rel = fpath.replace(root, '').lstrip(os.sep).replace('\\', '/')

    has_em = EM_BYTES in raw
    
    # Count pipes outside of script blocks
    text = raw.decode('utf-8', errors='replace')
    # Remove script blocks to check pipe in content
    no_scripts = re.sub(r'<script[\s\S]*?</script>', '', text, flags=re.IGNORECASE)
    # Count pipe in meta content and title
    title_match = re.findall(r'<title>[^<]*</title>', no_scripts, re.IGNORECASE)
    has_pipe_title = any('|' in t for t in title_match)
    meta_content = re.findall(r'content="[^"]{1,300}"', no_scripts)
    has_pipe_meta = any('|' in m for m in meta_content)

    links = {}
    for key, pattern in key_targets.items():
        links[key] = pattern in raw

    if links['homepage']:
        home_link_count += 1

    results.append({
        'rel': rel,
        'has_em': has_em,
        'has_pipe_title': has_pipe_title,
        'has_pipe_meta': has_pipe_meta,
        'links': links,
    })

print("=" * 70)
print("SYMBOL AUDIT RESULTS")
print("=" * 70)
em_pages = [r for r in results if r['has_em']]
pipe_pages = [r for r in results if r['has_pipe_title'] or r['has_pipe_meta']]
print(f"Total pages: {len(results)}")
print(f"Em dash remaining: {len(em_pages)} pages")
print(f"Pipe remaining in title/meta: {len(pipe_pages)} pages")

if em_pages:
    print("\nPages still with em dash:")
    for r in em_pages:
        print(f"  - {r['rel']}")
if pipe_pages:
    print("\nPages still with pipe in title/meta:")
    for r in pipe_pages:
        print(f"  - {r['rel']}")
if not em_pages and not pipe_pages:
    print("\n>>> ALL PAGES CLEAN - No em dashes or pipes found in any content!")

print()
print("=" * 70)
print("INTERNAL LINKING AUDIT")
print("=" * 70)
print(f"{'PAGE':<60} {'HOME':>4} {'ADD':>4} {'REM':>4} {'GTE':>4} {'BLG':>4} {'ABT':>4} {'CNT':>4}")
print("-" * 90)

total_pages = len(results)
link_scores = {k: 0 for k in key_targets}

for r in results:
    row = f"{r['rel']:<60}"
    for key in ['homepage','add_gps','remove_gps','geo_editor','blog','about','contact']:
        val = 'Y' if r['links'][key] else 'N'
        row += f" {val:>4}"
        if r['links'][key]:
            link_scores[key] += 1
    print(row)

print()
print("=" * 70)
print("INTERNAL LINKING SCORE")
print("=" * 70)
for key, label in [('homepage','Homepage (/)'),('add_gps','Add GPS tool'),('remove_gps','Remove GPS tool'),('geo_editor','Geo Tag Editor'),('blog','Blog'),('about','About'),('contact','Contact')]:
    pct = round(link_scores[key]/total_pages*100)
    bar = '#' * (pct // 5) + '.' * (20 - pct // 5)
    print(f"  {label:<22} [{bar}] {link_scores[key]:>2}/{total_pages} = {pct:>3}%")

overall = round(sum(link_scores.values()) / (len(key_targets) * total_pages) * 100)
print()
print(f"  OVERALL LINKING SCORE: {overall}%")
print()
print(f"  Symbol Clean Score:    {round((total_pages - len(em_pages) - len(pipe_pages))/total_pages*100)}%")
