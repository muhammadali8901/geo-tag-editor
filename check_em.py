"""Check if remaining em dashes are only inside script blocks (JSON-LD) - which is safe"""
import os, re

root = r'c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor'
still_bad = [
    'about\\index.html',
    'blog\\add-location-photos-android-guide\\index.html',
    'blog\\exif-vs-metadata-whats-the-difference\\index.html',
    'blog\\how-to-add-gps-location-to-photos\\index.html',
    'blog\\how-to-add-location-to-photos-android-iphone\\index.html',
    'blog\\how-to-geotag-photos-for-real-estate\\index.html',
    'blog\\what-is-geotagging\\index.html',
    'features\\index.html',
    'geo-tag-editor\\index.html',
    'how-to-remove-location-from-photos\\index.html',
    'remove-geotag-from-photo-online\\index.html',
]

for rel in still_bad:
    fpath = os.path.join(root, rel)
    with open(fpath, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    
    # Find all em dash positions
    positions = [i for i in range(len(text)) if text[i] == '\u2014']
    
    # For each, check if it's inside a script tag
    script_ranges = []
    for m in re.finditer(r'<script[\s\S]*?</script>', text, re.IGNORECASE):
        script_ranges.append((m.start(), m.end()))
    
    def in_script(pos):
        for s, e in script_ranges:
            if s <= pos <= e:
                return True
        return False
    
    outside_script = [p for p in positions if not in_script(p)]
    
    if outside_script:
        print(f"NEEDS FIX - {rel}: {len(outside_script)} em dashes outside scripts")
        for p in outside_script[:3]:
            print(f"  Context: {repr(text[max(0,p-60):p+60])}")
    else:
        print(f"OK (only in JSON-LD) - {rel}: {len(positions)} em dashes all inside script blocks")
