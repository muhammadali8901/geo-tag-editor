import os
import re

root_dir = r"c:\Users\DELL\Desktop\geo or genay do\geo-tag-editor"
template_file = os.path.join(root_dir, "add-gps-to-photo-online", "index.html")

with open(template_file, "r", encoding="utf-8") as f:
    template = f.read()

# Visual EEAT and internal linking constants
BRAND_BIO = """
<div class="author-bio" style="display:flex;align-items:center;gap:20px;background:var(--bg-alt,#f1f5f9);padding:24px;border-radius:var(--radius,10px);margin-top:48px;border:1px solid var(--border,#e2e8f0)">
  <div style="width:60px;height:60px;border-radius:50%;background:var(--primary-light,#e0f2fe);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-sm,0 1px 2px rgba(0,0,0,.05))">
    <span style="font-size:1.8rem;">✍️</span>
  </div>
  <div>
    <h4 style="margin:0 0 4px;font-size:1.15rem;font-weight:700;color:var(--text,#0f172a);">Written by the <a href="/about/" style="color:var(--primary,#0284c7);text-decoration:none">GeoTagsEditor Editorial Team</a></h4>
    <p style="margin:0;color:var(--text-secondary,#475569);font-size:.9rem;line-height:1.5;">Our development and editorial team specializes in image metadata architecture, EXIF GPS standards, and digital privacy. Every tool and guide we publish is verified for technical accuracy and operates entirely client-side for absolute privacy.</p>
  </div>
</div>
"""

MIDDLE_CTA_BLOCK = """
<div class="article-middle-cta" style="background: linear-gradient(135deg, #0b2545 0%, #134074 100%); color: #fff; padding: 28px; border-radius: var(--radius, 10px); margin: 36px 0; text-align: center; box-shadow: 0 4px 20px rgba(11,37,69,0.15);">
  <h4 style="margin:0 0 8px; font-size:1.25rem; font-weight:700; color:#fff; font-family:var(--font,'Outfit',sans-serif);">Need to edit your photo locations instantly?</h4>
  <p style="margin:0 0 20px; color:rgba(255,255,255,0.9); font-size:0.95rem; line-height:1.6;">Try our free browser-based GPS Photo Editor. Add coordinates, pick a spot on the map, or strip metadata right in your browser without uploading anything.</p>
  <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
    <a href="/add-gps-to-photo-online/" class="btn btn-primary" style="background:#0ab8a0; color:#fff; padding:10px 20px; border-radius:6px; font-weight:600; font-size:0.9rem; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-height:40px; border:none; transition:background .2s;">Add GPS to Photo</a>
    <a href="/remove-geotag-from-photo-online/" class="btn btn-outline" style="background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.7); padding:10px 20px; border-radius:6px; font-weight:600; font-size:0.9rem; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-height:40px; transition:border-color .2s;">Remove GPS Data</a>
  </div>
</div>
"""

RELATED_RESOURCES_BLOCK = """
<div class="related-resources" style="border-top:1px solid var(--border,#e2e8f0); padding-top:24px; margin-top:36px; margin-bottom:24px;">
  <h3 style="font-size:1.3rem; margin-bottom:16px; color:var(--text,#0f172a); font-weight:700; font-family:var(--font,'Outfit',sans-serif);">Try Our Free Location Tools</h3>
  <ul style="list-style:none; padding-left:0; display:flex; flex-direction:column; gap:12px;">
    <li style="display:flex; align-items:baseline; gap:8px;">🗺️ <div><a href="/add-gps-to-photo-online/" style="color:var(--primary,#0284c7); font-weight:600; text-decoration:none; border-bottom:1px dashed var(--primary,#0284c7);">Add GPS to Photo Online</a> - Pick a location on the interactive map and write coordinates directly into your JPEG EXIF data.</div></li>
    <li style="display:flex; align-items:baseline; gap:8px;">🛡️ <div><a href="/remove-geotag-from-photo-online/" style="color:var(--primary,#0284c7); font-weight:600; text-decoration:none; border-bottom:1px dashed var(--primary,#0284c7);">Remove GPS Geotags from Photo</a> - Strip sensitive location metadata from your photos before sharing them online for privacy protection.</div></li>
    <li style="display:flex; align-items:baseline; gap:8px;">⚙️ <div><a href="/geo-tag-editor/" style="color:var(--primary,#0284c7); font-weight:600; text-decoration:none; border-bottom:1px dashed var(--primary,#0284c7);">Free EXIF GPS Editor</a> - Complete web-based EXIF utility to view, edit, or clear advanced photo metadata in seconds.</div></li>
  </ul>
</div>
"""

def create_page(rel_path, title, desc, canonical, main_content, pub_date=None, mod_date=None):
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
    
    # Adjust Breadcrumb List Schema dynamically
    breadcrumb_schema = f'''<script type="application/ld+json">{{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://geotagseditor.online/"
      }},'''
      
    if "blog/" in rel_path:
        breadcrumb_schema += '''{
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://geotagseditor.online/blog/"
      },{
        "@type": "ListItem",
        "position": 3,
        "name": "''' + title.split(' - ')[0] + '''",
        "item": "''' + canonical + '''"
      }]
    } </script>'''
    else:
        breadcrumb_schema += '''{
        "@type": "ListItem",
        "position": 2,
        "name": "''' + title.split(' - ')[0] + '''",
        "item": "''' + canonical + '''"
      }]
    } </script>'''
    
    # Strip template HowTo, FAQ, and BreadcrumbList schemas
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "HowTo".*?\}</script>', '', page, flags=re.DOTALL)
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "FAQPage".*?\}</script>', '', page, flags=re.DOTALL)
    page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "BreadcrumbList".*?\}</script>', breadcrumb_schema, page, flags=re.DOTALL)
    
    # Clean template index WebSite and SoftwareApplication schemas if they are present and it's a blog page
    if "blog/" in rel_path:
        page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "WebSite".*?\}</script>', '', page, flags=re.DOTALL)
        page = re.sub(r'<script type="application/ld\+json">\{[^}]*"@type": "SoftwareApplication".*?\}</script>', '', page, flags=re.DOTALL)
        
        # Inject standard Article schema for Google
        article_schema = f'''<script type="application/ld+json">{{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "{title}",
          "description": "{desc}",
          "author": {{
            "@type": "Organization",
            "name": "GeoTagsEditor Editorial Team",
            "url": "https://geotagseditor.online/about/"
          }},
          "publisher": {{
            "@type": "Organization",
            "name": "Geo Tags Editor",
            "logo": {{
              "@type": "ImageObject",
              "url": "https://geotagseditor.online/images/logo.webp"
            }}
          }},
          "datePublished": "{pub_date if pub_date else '2026-04-10'}",
          "dateModified": "{mod_date if mod_date else '2026-05-16'}",
          "mainEntityOfPage": {{
            "@type": "WebPage",
            "@id": "{canonical}"
          }},
          "image": "https://geotagseditor.online/images/og-default.jpg"
        }}</script>'''
        page = page.replace('</head>', f'{article_schema}\n</head>')
        
        # Format the visual dates in main content
        def format_date(d_str):
            parts = d_str.split('-')
            months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            return f"{months[int(parts[1])-1]} {int(parts[2])}, {parts[0]}"
        
        disp_pub = format_date(pub_date if pub_date else '2026-04-10')
        disp_mod = format_date(mod_date if mod_date else '2026-05-16')
        
        # Inject the visual EEAT metadata bar
        visual_meta_bar = f"""
        <div class="article-meta-bar" style="display:flex; gap:16px; justify-content:center; align-items:center; flex-wrap:wrap; margin-top:16px; font-size:.875rem; color:var(--text-secondary,#475569); margin-bottom: 12px;">
          <span>By the <a href="/about/" style="color:var(--primary,#0284c7); font-weight:600; text-decoration:none;">GeoTagsEditor Team</a></span>
          <span style="opacity:0.4;">•</span>
          <span>Published: <strong>{disp_pub}</strong></span>
          <span style="opacity:0.4;">•</span>
          <span>Last Updated: <strong>{disp_mod}</strong></span>
        </div>
        <div class="expertise-badge" style="max-width: 680px; margin: 12px auto 0; font-size: 0.82rem; color: #0a5f52; background: #e6faf7; border: 1px solid #c3f5ee; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; justify-content: center; font-weight: 500; line-height: 1.4;">
          <span style="display:inline-flex; align-items:center; justify-content:center; background:#0ab8a0; color:#fff; width:16px; height:16px; border-radius:50%; font-size:0.65rem; font-weight:bold;">✓</span>
          <span><strong>Verified Privacy &amp; Technical Accuracy:</strong> Developed and verified by metadata software engineers. All operations run locally inside your browser with 0% server uploads.</span>
        </div>
        """
        
        # Re-compile main_content to have CTAs, related tools, and author bio
        # Split paragraph midpoint for Middle CTA
        p_split = main_content.split('</p>')
        if len(p_split) >= 2:
            mid = len(p_split) // 2
            p_split[mid] = p_split[mid] + '\n' + MIDDLE_CTA_BLOCK
            main_content = '</p>'.join(p_split)
            
        display_title = title.split(' - ')[0]
        # Prepend the section class page-hero containing the H1 title and visual meta-bar!
        hero_section = f"""<section class="page-hero">
          <div class="container">
            <nav aria-label="Breadcrumb" style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px"><a href="/" style="color:var(--text-muted);text-decoration:none">Home</a> <span style="margin:0 6px">›</span> <a href="/blog/" style="color:var(--text-muted);text-decoration:none">Blog</a> <span style="margin:0 6px">›</span> <span style="color:var(--text-secondary)">{display_title}</span></nav>
            <h1>{display_title}</h1>
            {visual_meta_bar}
          </div>
        </section>"""
        
        main_content = f"{hero_section}\n<article class=\"article\"><div class=\"container\"><div class=\"article-content\">{main_content}</div>{RELATED_RESOURCES_BLOCK}{BRAND_BIO}</div></article>"
        
        # In blog layout, the template wrapper might have other content. Replace the inner hero title logic.
        page = re.sub(r'<main id="main-content">.*?</main>', f'<main id="main-content">{main_content}</main>', page, flags=re.DOTALL)
    else:
        # For non-blog tool comparison pages
        page = re.sub(r'<main id="main-content">.*?</main>', f'<main id="main-content">{main_content}</main>', page, flags=re.DOTALL)
    
    # Ensure there are no em-dashes or pipe delimiters in titles, description meta, and visible text
    page = page.replace('\u2014', '-').replace('&mdash;', '-').replace('|', '-')
    
    out_path = os.path.join(root_dir, rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"Created: {rel_path}")

pages = [
    {
        "path": "geoimgr-alternative/index.html",
        "title": "Free GeoImgr Alternative to Edit Photo GPS Coordinates",
        "desc": "Looking for a free GeoImgr alternative? Geo Tags Editor adds or removes GPS coordinates from JPEG photos 100% in your browser without server uploads.",
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
        "title": "Free Geotag.world Alternative for Private GPS Photo Editing",
        "desc": "Need a Geotag.world alternative? Geo Tags Editor is 100% free, works without uploading photos, and has no account requirements. Try it now.",
        "canonical": "https://geotagseditor.online/geotag-world-alternative/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">100% Free Tool</span><h1>Free Geotag.world Alternative With No Upload Required</h1><p>A faster, private alternative to Geotag.world. Edit EXIF GPS data securely in your browser.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Open Editor</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Choose Geo Tags Editor over Geotag.world?</h2><p>We process your photos locally. No server uploads means faster processing and total privacy for your sensitive location data.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-without-uploading/index.html",
        "title": "Geotag Photos Without Uploading Using a Local Browser Tool",
        "desc": "Geotag photos without uploading to any server. Our browser-based GPS editor processes everything locally. No cloud, no account, no privacy risks.",
        "canonical": "https://geotagseditor.online/geotag-photos-without-uploading/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Privacy First</span><h1>Geotag Photos Without Uploading Anything</h1><p>Edit your EXIF GPS data securely. Our tool runs locally in your browser using the HTML5 FileReader API.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Start Geotagging Securely</a></div></section>
        <section class="section"><div class="container content-block"><h2>How Browser-Based Geotagging Works</h2><p>Unlike traditional tools that require you to upload your sensitive photos to a remote server, we do the processing right on your machine.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-real-estate/index.html",
        "title": "Geotag Photos for Real Estate Listings with a Free GPS Editor",
        "desc": "Add GPS coordinates to real estate photos before uploading to MLS, Zillow, or Realtor.com. Free browser tool - no account, no upload.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-real-estate/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Perfect for Real Estate Agents</span><h1>Geotag Real Estate Photos for Better MLS Listings</h1><p>Ensure your property photos have accurate GPS metadata before uploading to MLS, Zillow, or Redfin.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Property Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why GPS Metadata Matters for Property Photos</h2><p>Real estate platforms use EXIF location data to verify property imagery and place map pins accurately.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-restaurants/index.html",
        "title": "Geotag Restaurant Photos for Better Google Business Profile SEO",
        "desc": "Geotag your restaurant photos before uploading to Google Business Profile, Yelp, or TripAdvisor. Free GPS editor - no upload needed.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-restaurants/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">Local SEO for Restaurants</span><h1>Geotag Restaurant Photos for Google Maps Rankings</h1><p>Optimize your food and interior photos with precise GPS data to boost your local pack visibility.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Food Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Geotagged Photos Help Restaurants Rank Locally</h2><p>Google Business Profile heavily weighs visual content. Geotagged photos prove to Google exactly where the image was taken.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-hvac/index.html",
        "title": "Geotag HVAC Job Photos to Improve Local Search Rankings",
        "desc": "HVAC technicians - geotag your job site photos before uploading to Google Business Profile. Free GPS editor works in browser.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-hvac/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">For HVAC Pros</span><h1>Geotag HVAC Job Photos to Dominate Local Search</h1><p>Add GPS to your before-and-after job site photos to build service area relevance on Google Maps.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag HVAC Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why HVAC Companies Need Geotagged Photos</h2><p>As a service area business, your local rankings depend on proving you do work in specific neighborhoods. Geotagged job photos provide that proof.</p></div></section>
        '''
    },
    {
        "path": "geotag-photos-for-plumbers/index.html",
        "title": "Geotag Plumbing Job Photos for Local Search Relevance",
        "desc": "Plumbers - add GPS to your job site photos before uploading to Google Business Profile. Free browser GPS editor. No upload, no account.",
        "canonical": "https://geotagseditor.online/geotag-photos-for-plumbers/",
        "content": '''
        <section class="hero"><div class="container"><span class="section-label">For Plumbers</span><h1>Geotag Plumbing Job Photos to Win Local Customers</h1><p>Optimize your service call photos with accurate GPS EXIF data to rank higher in your service areas.</p><a href="/add-gps-to-photo-online/" class="btn btn-primary">Geotag Plumbing Photos</a></div></section>
        <section class="section"><div class="container content-block"><h2>Why Plumbers Should Geotag Every Job Photo</h2><p>Show Google exactly where your vans are going. Geotagged pipe repair and installation photos build massive local relevance.</p></div></section>
        '''
    },
    {
        "path": "blog/free-geoimgr-alternative/index.html",
        "title": "Free GeoImgr Alternative That Works Without Server Uploads",
        "desc": "GeoImgr requires uploading photos to their servers. This free alternative does all GPS editing in your browser. No upload, no account, unlimited file size.",
        "canonical": "https://geotagseditor.online/blog/free-geoimgr-alternative/",
        "pub_date": "2026-04-15",
        "mod_date": "2026-05-16",
        "content": '''
        <h2>What is GeoImgr?</h2><p>GeoImgr is a popular tool for adding GPS to photos, but it requires uploading your files to a server and limits free users to 5MB.</p><h2>The Best Free Alternative</h2><p>Geo Tags Editor provides the exact same functionality completely free, with no file size limits, because it processes everything securely in your browser.</p>
        '''
    },
    {
        "path": "blog/exif-gps-editor-online-free/index.html",
        "title": "Best Free EXIF GPS Editor Online in 2026 with No Downloads",
        "desc": "Compare the best free EXIF GPS editors available online in 2026. Find the fastest, most private option that works without installing software.",
        "canonical": "https://geotagseditor.online/blog/exif-gps-editor-online-free/",
        "pub_date": "2026-04-12",
        "mod_date": "2026-05-16",
        "content": '''
        <h2>Why You Need an EXIF GPS Editor</h2><p>Metadata provides crucial context to your photos. We compare the top 5 tools available in 2026 to help you choose the best web-based solution.</p>
        '''
    },
    {
        "path": "blog/how-to-geotag-photos-for-google-business-profile/index.html",
        "title": "How to Geotag Photos for Google Business Profile in 2026",
        "desc": "Step-by-step guide to geotagging photos before uploading them to Google Business Profile. Improve your local map pack rankings with properly geotagged photos.",
        "canonical": "https://geotagseditor.online/blog/how-to-geotag-photos-for-google-business-profile/",
        "pub_date": "2026-04-25",
        "mod_date": "2026-05-16",
        "content": '''
        <h2>Does Google Business Profile use EXIF GPS data?</h2><p>Yes. Providing exact location coordinates in your photo metadata helps Google understand your service relevance to specific neighborhoods.</p>
        '''
    },
    {
        "path": "blog/how-to-add-geotag-to-photo-on-iphone/index.html",
        "title": "How to Add a Geotag to an iPhone Photo and Fix Missing GPS Data",
        "desc": "Fix missing GPS location on iPhone photos. Use this free browser tool to add accurate GPS coordinates to any JPEG photo - no app download needed.",
        "canonical": "https://geotagseditor.online/blog/how-to-add-geotag-to-photo-on-iphone/",
        "pub_date": "2026-04-20",
        "mod_date": "2026-05-16",
        "content": '''
        <h2>Fixing Missing GPS on iOS</h2><p>Sometimes iPhone location services fail. You can easily fix missing location data using our browser tool directly in Safari.</p>
        '''
    }
]

for p in pages:
    create_page(
        p["path"], 
        p["title"], 
        p["desc"], 
        p["canonical"], 
        p["content"],
        p.get("pub_date"),
        p.get("mod_date")
    )

print("All 11 pages generated successfully with high-EEAT schemas, conversational titles, and conversion CTAs.")
