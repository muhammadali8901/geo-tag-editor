import os
import re

root_dir = r"c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor"
template_file = os.path.join(root_dir, "add-gps-to-photo-online", "index.html")

with open(template_file, "r", encoding="utf-8") as f:
    template = f.read()

# Extract header, footer, and other parts to use as a wrapper
# We will replace <title>, <meta name="description">, canonical, og, twitter, JSON-LD, and <main> content.
def create_page(rel_path, title, desc, canonical, main_content):
    page = template
    # Replace Title
    page = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", page)
    # Replace Meta Description
    page = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', page)
    # Replace Canonical
    page = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{canonical}">', page)
    # Replace OG/Twitter
    page = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title}">', page)
    page = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', page)
    page = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{canonical}">', page)
    page = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{title}">', page)
    page = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{desc}">', page)
    
    # Replace MAIN content
    page = re.sub(r'<main id="main-content">.*?</main>', f'<main id="main-content">{main_content}</main>', page, flags=re.DOTALL)
    
    # Remove existing JSON-LD (we'll just let the new main content have it if needed, or inject a basic one)
    # Actually, let's just strip the specific HowTo and FAQ from the template and replace with generic WebPage schema
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "HowTo".*?\}</script>', '', page, flags=re.DOTALL)
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "FAQPage".*?\}</script>', '', page, flags=re.DOTALL)
    
    # Breadcrumb schema replace
    breadcrumb_schema = f'''<script type="application/ld+json">{{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://geotagseditor.online/"
      }},{{
        "@type": "ListItem",
        "position": 2,
        "name": "{title.split(' - ')[0]}",
        "item": "{canonical}"
      }}]
    }}</script>'''
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "BreadcrumbList".*?\}</script>', breadcrumb_schema, page, flags=re.DOTALL)
    
    # Make sure we don't have em-dash or pipe
    page = page.replace('\u2014', '-').replace('|', '-')
    
    out_path = os.path.join(root_dir, rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"Created: {rel_path}")

pages = [
    {
        "path": "geoimgr-alternative/index.html",
        "title": "GeoImgr Alternative Free - No Upload GPS Photo Editor",
        "desc": "Looking for a free GeoImgr alternative? Geo Tags Editor adds or removes GPS from photos 100% in your browser. No upload, no account, no file size limit.",
        "canonical": "https://geotagseditor.online/geoimgr-alternative/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">No Upload Required</span><h1>The Best Free GeoImgr Alternative</h1><p>Geotag photos without uploading them to a server. 100% free, no account required, and no file size limits.</p><div class="trust-signals"><div class="trust-signal"><svg class="icon"><use href="/images/icons.svg#icon-shield"></use></svg> <span>100% Private</span></div><div class="trust-signal"><svg class="icon"><use href="/images/icons.svg#icon-check"></use></svg> <span>No 5MB Limit</span></div></div><a href="/add-gps-to-photo-online/" class="btn btn-primary">Try Free Alternative Now</a></div></section>
        <section class="section"><div class="container content-block">
        <h2>GeoImgr vs Geo Tags Editor Comparison</h2>
        <table><tr><th>Feature</th><th>GeoImgr</th><th>Geo Tags Editor</th></tr><tr><td>Upload Required</td><td>Yes (Server)</td><td>No (Browser Only)</td></tr><tr><td>Cost</td><td>Free with limits / Paid</td><td>100% Free</td></tr><tr><td>File Size Limit</td><td>5MB on free tier</td><td>No Limit</td></tr><tr><td>Account Needed</td><td>Yes for batch</td><td>Never</td></tr><tr><td>Privacy</td><td>Server Processed</td><td>Local Processed</td></tr></table>
        <h2>Why Switch from GeoImgr?</h2><p>Our tool runs entirely in your browser using local Javascript. Your photos never leave your device.</p>
        </div></section>
        '''
    },
    {
        "path": "geotag-world-alternative/index.html",
        "title": "Geotag.world Alternative - Free Private GPS Photo Editor",
        "desc": "Need a Geotag.world alternative? Geo Tags Editor is 100% free, works without uploading photos, and has no account requirement. Try it now.",
        "canonical": "https://geotagseditor.online/geotag-world-alternative/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">100% Free Tool</span><h1>Free Geotag.world Alternative With No Upload Required</h1><p>A faster, private alternative to Geotag.world. Edit EXIF GPS data securely in your browser.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Open Editor</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Choose Geo Tags Editor over Geotag.world?</h2><p>We process your photos locally. No server uploads means faster processing and total privacy for your sensitive location data.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-without-uploading/index.html",
        "title": "Geotag Photos Without Uploading - 100% Local Browser Tool",
        "desc": "Geotag photos without uploading to any server. Our browser-based GPS editor processes everything locally. No cloud, no account, no privacy risk.",
        "canonical": "https://geotagseditor.online/geotag-photos-without-uploading/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Privacy First</span><h1>Geotag Photos Without Uploading Anything</h1><p>Edit your EXIF GPS data securely. Our tool runs locally in your browser using the HTML5 FileReader API.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Start Geotagging Securely</a></div></section>
        <section class="section"><div class="container content-block"><h2>How Browser-Based Geotagging Works</h2><p>Unlike traditional tools that require you to upload your sensitive photos to a remote server, we do the processing right on your machine.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-real-estate/index.html",
        "title": "Geotag Photos for Real Estate Listings - Free GPS Editor",
        "desc": "Add GPS coordinates to real estate photos before uploading to MLS, Zillow, or Realtor.com. Free browser tool - no account, no upload.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-real-estate/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Perfect for Real Estate Agents</span><h1>Geotag Real Estate Photos for Better MLS Listings</h1><p>Ensure your property photos have accurate GPS metadata before uploading to MLS, Zillow, or Redfin.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Property Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why GPS Metadata Matters for Property Photos</h2><p>Real estate platforms use EXIF location data to verify property imagery and place map pins accurately.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-restaurants/index.html",
        "title": "Geotag Restaurant Photos for Google Business Profile - Free",
        "desc": "Geotag your restaurant photos before uploading to Google Business Profile, Yelp, or TripAdvisor. Free GPS editor - no upload needed.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-restaurants/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Local SEO for Restaurants</span><h1>Geotag Restaurant Photos for Google Maps Rankings</h1><p>Optimize your food and interior photos with precise GPS data to boost your local pack visibility.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Food Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Geotagged Photos Help Restaurants Rank Locally</h2><p>Google Business Profile heavily weighs visual content. Geotagged photos prove to Google exactly where the image was taken.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-hvac/index.html",
        "title": "Geotag HVAC Job Photos for Local Search Rankings - Free",
        "desc": "HVAC technicians - geotag your job site photos before uploading to Google Business Profile. Free GPS editor works in browser.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-hvac/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">For HVAC Pros</span><h1>Geotag HVAC Job Photos to Dominate Local Search</h1><p>Add GPS to your before-and-after job site photos to build service area relevance on Google Maps.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag HVAC Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why HVAC Companies Need Geotagged Photos</h2><p>As a service area business, your local rankings depend on proving you do work in specific neighborhoods. Geotagged job photos provide that proof.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-plumbers/index.html",
        "title": "Geotag Plumber Job Photos for Local Search - Free GPS Tool",
        "desc": "Plumbers - add GPS to your job site photos before uploading to Google Business Profile. Free browser GPS editor. No upload, no account.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-plumbers/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">For Plumbers</span><h1>Geotag Plumbing Job Photos to Win Local Customers</h1><p>Optimize your service call photos with accurate GPS EXIF data to rank higher in your service areas.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Plumbing Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Plumbers Should Geotag Every Job Photo</h2><p>Show Google exactly where your vans are going. Geotagged pipe repair and installation photos build massive local relevance.</p></div></section>
        '''
    },
    {
        "path": "blog/free-geoimgr-alternative/index.html",
        "title": "Free GeoImgr Alternative That Works Without Uploading",
        "desc": "GeoImgr requires uploading photos to their servers. This free alternative does all GPS editing in your browser. No upload, no account, unlimited file size.",
        "canonical": "https://geotagseditor.online/blog/free-geoimgr-alternative/",
        "content": '''
        <section class="page-hero"><div class="container"><h1>Free GeoImgr Alternative That Works Without Uploading</h1></div></section>
        <section class="section"><div class="container content-block"><h2>What is GeoImgr?</h2><p>GeoImgr is a popular tool for adding GPS to photos, but it requires uploading your files to a server and limits free users to 5MB.</p><h2>The Best Free Alternative</h2><p>Geo Tags Editor provides the exact same functionality completely free, with no file size limits, because it processes everything securely in your browser.</p></div></section>
        '''
    },
    {
        "path": "blog/exif-gps-editor-online-free/index.html",
        "title": "Best Free EXIF GPS Editor Online in 2026 - No Download Required",
        "desc": "Compare the best free EXIF GPS editors available online in 2026. Find the fastest, most private option that works without installing software.",
        "canonical": "https://geotagseditor.online/blog/exif-gps-editor-online-free/",
        "content": '''
        <section class="page-hero"><div class="container"><h1>Best Free EXIF GPS Editor Online in 2026</h1></div></section>
        <section class="section"><div class="container content-block"><h2>Why You Need an EXIF GPS Editor</h2><p>Metadata provides crucial context to your photos. We compare the top 5 tools available in 2026 to help you choose the best web-based solution.</p></div></section>
        '''
    },
    {
        "path": "blog/how-to-geotag-photos-for-google-business-profile/index.html",
        "title": "How to Geotag Photos for Google Business Profile in 2026",
        "desc": "Step-by-step guide to geotagging photos before uploading them to Google Business Profile. Improve your local map pack rankings with properly geotagged photos.",
        "canonical": "https://geotagseditor.online/blog/how-to-geotag-photos-for-google-business-profile/",
        "content": '''
        <section class="page-hero"><div class="container"><h1>How to Geotag Photos for Google Business Profile in 2026</h1></div></section>
        <section class="section"><div class="container content-block"><h2>Does Google Business Profile use EXIF GPS data?</h2><p>Yes. Providing exact location coordinates in your photo metadata helps Google understand your service relevance to specific neighborhoods.</p></div></section>
        '''
    },
    {
        "path": "blog/how-to-add-geotag-to-photo-on-iphone/index.html",
        "title": "How to Add Geotag to a Photo on iPhone - Fix Missing GPS Data",
        "desc": "Fix missing GPS location on iPhone photos. Use this free browser tool to add accurate GPS coordinates to any JPEG photo - no app download needed.",
        "canonical": "https://geotagseditor.online/blog/how-to-add-geotag-to-photo-on-iphone/",
        "content": '''
        <section class="page-hero"><div class="container"><h1>How to Add Geotag to a Photo on iPhone</h1></div></section>
        <section class="section"><div class="container content-block"><h2>Fixing Missing GPS on iOS</h2><p>Sometimes iPhone location services fail. You can easily fix missing location data using our browser tool directly in Safari.</p></div></section>
        '''
    }
]

for p in pages:
    create_page(p["path"], p["title"], p["desc"], p["canonical"], p["content"])

print("All 11 pages generated successfully.")
