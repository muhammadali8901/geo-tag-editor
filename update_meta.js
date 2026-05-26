const fs = require('fs');
const path = require('path');

const newMeta = {
  "about\\index.html": {
    "title": "About Geo Tags Editor and Our Privacy First Approach",
    "description": "Discover the story behind Geo Tags Editor. We provide a free privacy first online GPS metadata tool trusted by SEO professionals and photographers."
  },
  "add-gps-to-photo-online\\index.html": {
    "title": "Add GPS Coordinates to Any Photo with Browser Editor",
    "description": "Write GPS coordinates into any JPEG photo. Pick a location on the map, click apply and download. Nothing leaves your device with our free tool."
  },
  "blog\\add-gps-to-photo-ultimate-guide\\index.html": {
    "title": "Complete Geotagging Guide to Add GPS to Photos Online",
    "description": "Learn how to add GPS location to photos with practical methods, free tools, and best practices for clean EXIF metadata and reliable photo geotagging."
  },
  "blog\\add-location-photos-android-guide\\index.html": {
    "title": "Add Location to Photos on Android Pixel and Samsung",
    "description": "Add GPS to photos on Pixel, Samsung One UI and OnePlus. Discover real menu paths for current Android versions and how to backfill missing GPS data."
  },
  "blog\\best-gps-photo-editing-software-comparison-2026\\index.html": {
    "title": "Best GPS Photo Editing Software Comparison Guide 2026",
    "description": "Compare the best GPS photo editing software in 2026 including online and desktop tools. Read our feature, privacy, speed and workflow breakdowns."
  },
  "blog\\best-practices-for-photo-geotagging-2026\\index.html": {
    "title": "Photo Geotagging Best Practices for SEO and Privacy",
    "description": "Explore photo geotagging best practices for 2026. Learn when to add GPS for SEO, when to strip it for privacy and how to organize a photo library."
  },
  "blog\\exif-data-ultimate-guide\\index.html": {
    "title": "Ultimate Guide to EXIF Data and What You Need to Know",
    "description": "Read the ultimate guide to EXIF data in 2026. Learn what EXIF data is, how it works, and why protecting your digital photo metadata is very important."
  },
  "blog\\exif-vs-metadata-whats-the-difference\\index.html": {
    "title": "Difference Between EXIF and Metadata Complete Guide",
    "description": "Understand the difference between EXIF and metadata. Learn what EXIF is, how it relates to IPTC and XMP, and why GPS data in your photos matters."
  },
  "blog\\geo-tagging-seo-complete-guide-2025\\index.html": {
    "title": "Complete Local Search Rankings Guide for Geo Tagging",
    "description": "Master geotagging SEO with practical methods to optimize image GPS metadata, strengthen local relevance signals, and improve local search visibility."
  },
  "blog\\gps-photo-privacy-protection-guide\\index.html": {
    "title": "GPS Photo Privacy Protection and Safety Guide for 2026",
    "description": "Learn how to protect privacy by removing GPS data from photos, understanding location risks, and applying safer photo sharing and metadata hygiene."
  },
  "blog\\how-journalists-use-geotagging-in-photos\\index.html": {
    "title": "Complete Guide on How Journalists Use Photo Geotagging",
    "description": "Discover how journalists use geotagging for photo verification, source context, and story credibility with practical metadata workflows and guidelines."
  },
  "blog\\how-to-add-geotag-to-existing-photos\\index.html": {
    "title": "Learn How to Add Geotags to Existing Photos in 2026",
    "description": "Find out how to add a geotag to existing photos that are missing location data. Follow our complete guide to easily restore missing GPS coordinates."
  },
  "blog\\how-to-add-gps-location-to-photos\\index.html": {
    "title": "How to Add GPS Location to Photos Using The Best Method",
    "description": "Compare every way to add GPS to a photo using your phone, desktop, command line, or browser tools, and pick the right method for your workflow."
  },
  "blog\\how-to-add-location-to-photos-android-iphone\\index.html": {
    "title": "Guide to Adding Location to Photos on iPhone and iOS",
    "description": "Make your iPhone Camera save GPS coordinates, change a photo location after capture, and handle HEIC files when sharing geotagged photos online."
  },
  "blog\\how-to-change-photo-location-gps-coordinates\\index.html": {
    "title": "Learn How to Change Photo Location and GPS Coordinates",
    "description": "Find out how to change photo location and edit GPS coordinates on any image. Follow our guide to modify, update, or correct geotag data on any device."
  },
  "blog\\how-to-check-where-picture-was-taken\\index.html": {
    "title": "Check Where a Picture Was Taken With Our GPS Guide",
    "description": "Learn how to check where a picture was taken by reading GPS metadata, viewing coordinates, and verifying photo location details safely and accurately."
  },
  "blog\\how-to-geotag-photos-for-real-estate\\index.html": {
    "title": "Complete Guide on How to Geotag Real Estate Photos",
    "description": "Learn how to geotag real estate photos to boost local SEO, improve Google Business Profile rankings, and make property listings more discoverable."
  },
  "blog\\how-to-protect-your-privacy-in-photos\\index.html": {
    "title": "Complete Guide on How to Protect Your Privacy in Photos",
    "description": "Learn essential techniques to protect your privacy in photos. Remove location data, manage EXIF metadata, and secure your digital images from tracking."
  },
  "blog\\how-to-remove-gps-location-data-from-photos\\index.html": {
    "title": "Complete Guide to Remove GPS Location Data From Photos",
    "description": "Find out how to remove GPS location data from photos and delete geotag metadata easily. Follow our guide for mobile, desktop, and online tools."
  },
  "blog\\how-to-remove-metadata-from-images\\index.html": {
    "title": "Remove Metadata From Images for Privacy Protection",
    "description": "Learn how to remove image metadata to protect privacy, strip EXIF details, and prevent GPS location leaks before sharing photos online securely."
  },
  "blog\\how-to-use-geotagging-to-rank-local-business-2026\\index.html": {
    "title": "Use Geotagging to Rank a Local Business in Local Search",
    "description": "Learn practical geotagging strategies for local SEO, including image metadata, on page signals, and workflows to improve local business visibility."
  },
  "blog\\index.html": {
    "title": "Geo Tags Editor Blog for EXIF and Geotagging Guides",
    "description": "Read step by step guides on GPS photo editing, EXIF metadata management, and photo privacy. Learn how to add or remove geotags on any modern device."
  },
  "blog\\photo-metadata-security-guide-2026\\index.html": {
    "title": "Photo Metadata Security Guide to Protect Your Privacy",
    "description": "Learn how to protect your privacy by managing photo metadata. Read our complete guide to EXIF data, GPS geotags, and digital photo privacy protection."
  },
  "blog\\remove-geotag-from-photo\\index.html": {
    "title": "Complete Privacy Guide on How to Remove Geotags from Photos",
    "description": "Learn how to remove GPS location data from photos on mobile, desktop, and web tools to protect privacy and share images safely without exposing data."
  },
  "blog\\what-is-geotagging\\index.html": {
    "title": "Complete Beginners Guide to What Geotagging Is Today",
    "description": "Learn what geotagging is, how it works, what GPS data is stored in your photos, the privacy risks, the SEO benefits, and how to add or remove geotags."
  },
  "blog\\why-geotagging-matters-for-local-seo\\index.html": {
    "title": "Experience Driven Guide on Why Geotagging Boosts SEO",
    "description": "Discover why geotagging for local SEO actually works. Find out how search engines read GPS metadata and how to implement a marketing strategy that ranks."
  },
  "contact\\index.html": {
    "title": "Contact Geo Tags Editor to Get Support and Send Feedback",
    "description": "Get in touch with the Geo Tags Editor team. We welcome your questions, feedback, and feature suggestions for our free online geo tag editor tool online."
  },
  "disclaimer\\index.html": {
    "title": "Geo Tags Editor Disclaimer Usage Notice and Policies",
    "description": "Read the Geo Tags Editor disclaimer for important usage, liability, and informational notices related to our photo metadata and geotag editor tools."
  },
  "features\\index.html": {
    "title": "Explore Features of Geo Tags Editor Complete GPS Toolkit",
    "description": "Discover every Geo Tags Editor feature, including adding GPS, editing geotags, batch processing, interactive map picker, and private in browser editing."
  },
  "geo-tag-editor\\index.html": {
    "title": "Free Geo Tag Editor Online Tool for Photo GPS Metadata",
    "description": "Use our free online geo tag editor to add, change, or remove GPS coordinates in JPEG photos right in your browser. Works safely on desktop and mobile."
  },
  "geotag-photos-online\\index.html": {
    "title": "Geotag Photos Online and Add GPS Location to JPEG Images",
    "description": "Geotag photos online for free and add GPS location to JPEG images in your browser. Pick a point on the map or paste coordinates and download instantly."
  },
  "how-to-remove-location-from-photos\\index.html": {
    "title": "How to Remove Location from Photos and Strip GPS Data",
    "description": "Follow this guide to remove GPS from JPEG photos before sharing them online. Use our in browser tool or native steps for iPhone, Android, and Windows."
  },
  "index.html": {
    "title": "Geo Tags Editor to Add or Remove GPS from Photos Free",
    "description": "Add or remove GPS coordinates from JPEG photos directly in your browser. There is no upload and no account needed with our free private EXIF editor."
  },
  "privacy-policy\\index.html": {
    "title": "Geo Tags Editor Privacy Policy Security and Data Rules",
    "description": "Review Geo Tags Editor privacy practices, including local image processing, data handling, cookies, and security measures for our photo metadata tools."
  },
  "remove-geotag-from-photo-online\\index.html": {
    "title": "Remove GPS from Photo Online With Our Free Privacy Tool",
    "description": "Strip GPS coordinates and location metadata from JPEG photos directly in your internet browser. No upload, no account, no software, free and private."
  },
  "sitemap\\index.html": {
    "title": "Geo Tags Editor HTML Sitemap Directory and Page Indexing",
    "description": "Browse the Geo Tags Editor HTML sitemap with direct links to tool pages, comprehensive guides, legal pages, and core resources for fast navigation."
  },
  "terms\\index.html": {
    "title": "Geo Tags Editor Terms Conditions and Acceptable Use Policy",
    "description": "Read the Geo Tags Editor terms and conditions covering acceptable use, service limitations, intellectual property rights, and legal responsibilities."
  }
};

for (const [relPath, meta] of Object.entries(newMeta)) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace title
  content = content.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + meta.title + '</title>');
  
  // Replace description
  content = content.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']/i, '<meta name="description" content="' + meta.description + '"');
  
  fs.writeFileSync(fullPath, content, 'utf8');
}
console.log('Successfully updated HTML files.');
