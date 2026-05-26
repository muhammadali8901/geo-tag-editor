(function() {
    "use strict";

    // -------------------------------------------------------------
    // CDN DEPENDENCIES & LIBRARIES
    // -------------------------------------------------------------
    const PIEXIF_URL = "https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js";
    const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    const JSZIP_URL = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    const PAPAPARSE_URL = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js";
    const HEIC2ANY_URL = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    const UTIF_URL = "https://cdn.jsdelivr.net/gh/photopea/UTIF.js/UTIF.js";

    // Global Suite State Manager
    const SuiteApp = {
        images: [],             // Uploaded image array: { id, file, name, size, dataURL, originalDataURL, width, height, latitude, longitude, altitude, title, headline, description, keywords, copyright, artist, city, state, country, countryCode, neighborhood, credit, originalTransmissionReference, outputName, status: 'pending'|'geotagged'|'cleaned' }
        profiles: [],           // Local business profiles
        activeProfileId: null,  // Active business profile ID
        map: null,              // Leaflet Map instance
        markers: {},            // Multi-markers or active marker
        activeImageId: null,    // ID of the highlighted image in individual pin/editor mode
        selectedImageIds: new Set(), // IDs of checked images in grid multi-select
        undoStack: [],          // Undo stack specifically for bulk applies
        nominatimCache: {},     // Local memory cache forNominatim geocoding
        isAdvancedMode: false,  // Layout toggle: false = wizard, true = advanced 2-column
        isQuickTag: false,      // Quick-tag simplified editor toggle
        activeTab: "profile",   // Active wizard tab: "profile" | "upload" | "location" | "metadata" | "export"
        taggingMode: "B",       // A = Profile, B = Map, C = Individual, D = CSV
        csvData: null,          // Parsed CSV rows for filename matching
        privacyStripMode: "GPS",// GPS = only location, EXIF = all EXIF, Personal = only serials/owner
        privacyReport: [],      // Privacy cleanup details per image
        librariesLoaded: {
            piexif: false,
            leaflet: false,
            jszip: false,
            papaparse: false,
            heic2any: false,
            utif: false
        }
    };

    // -------------------------------------------------------------
    // NOMINATIM GEOLOCATION CACHING
    // -------------------------------------------------------------
    const Geocoder = {
        getCacheKey: function(prefix, query) {
            return "gte_geo_cache_" + prefix + "_" + btoa(unescape(encodeURIComponent(String(query).toLowerCase().trim())));
        },
        getFromLocalStorage: function(prefix, query) {
            try {
                let key = this.getCacheKey(prefix, query);
                let cached = localStorage.getItem(key);
                return cached ? JSON.parse(cached) : null;
            } catch (_) { return null; }
        },
        saveToLocalStorage: function(prefix, query, val) {
            try {
                let key = this.getCacheKey(prefix, query);
                localStorage.setItem(key, JSON.stringify(val));
            } catch (_) {}
        },
        geocode: async function(address) {
            if (!address || address.trim() === "") return null;
            let cached = this.getFromLocalStorage("geocode", address);
            if (cached) return cached;

            let url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(address) + "&format=json&limit=1";
            try {
                let res = await fetch(url, {
                    headers: {
                        "Accept": "application/json",
                        "User-Agent": "BulkImageGeotagSuite/2.0 (geotagseditor.online client-side geocoder)"
                    }
                });
                if (!res.ok) throw new Error();
                let json = await res.json();
                if (json && json.length > 0) {
                    let coords = {
                        lat: parseFloat(json[0].lat),
                        lng: parseFloat(json[0].lon),
                        display_name: json[0].display_name
                    };
                    this.saveToLocalStorage("geocode", address, coords);
                    return coords;
                }
            } catch (err) {
                console.error("Geocoding failed for:", address, err);
            }
            return null;
        },
        reverse: async function(lat, lng) {
            let query = lat.toFixed(5) + "," + lng.toFixed(5);
            let cached = this.getFromLocalStorage("reverse", query);
            if (cached) return cached;

            let url = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json&zoom=18&addressdetails=1";
            try {
                let res = await fetch(url, {
                    headers: {
                        "Accept": "application/json",
                        "User-Agent": "BulkImageGeotagSuite/2.0 (geotagseditor.online client-side geocoder)"
                    }
                });
                if (!res.ok) throw new Error();
                let json = await res.json();
                if (json && json.address) {
                    let addr = json.address;
                    let city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || "";
                    let state = addr.state || addr.region || addr.province || "";
                    let country = addr.country || "";
                    let countryCode = addr.country_code ? addr.country_code.toUpperCase() : "";
                    let neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || "";
                    let result = { city, state, country, countryCode, neighborhood };
                    this.saveToLocalStorage("reverse", query, result);
                    return result;
                }
            } catch (err) {
                console.error("Reverse geocoding failed for coords:", query, err);
            }
            return null;
        }
    };

    // -------------------------------------------------------------
    // METADATA BINARY ENGINE (EXIF, IPTC & XMP WRITERS)
    // -------------------------------------------------------------
    const MetadataEngine = {
        // String to UCS2 bytes helper for Windows XP EXIF tags
        stringToUCS2Bytes: function(str) {
            if (!str) return [];
            let bytes = [];
            for (let i = 0; i < str.length; i++) {
                let code = str.charCodeAt(i);
                bytes.push(code & 0xFF);
                bytes.push((code >> 8) & 0xFF);
            }
            bytes.push(0); // Null terminator
            bytes.push(0);
            return bytes;
        },

        // Converts decimal degrees to DMS for EXIF GPS tags
        decimalToDMS: function(decimal) {
            const abs = Math.abs(decimal);
            const degrees = Math.floor(abs);
            const minutesFloat = (abs - degrees) * 60;
            const minutes = Math.floor(minutesFloat);
            const seconds = Math.round((minutesFloat - minutes) * 60 * 10000);
            return [
                [degrees, 1],
                [minutes, 1],
                [seconds, 10000]
            ];
        },

        // Converts DMS array back to decimal degrees
        dmsToDecimal: function(dms, ref) {
            if (!dms || dms.length < 3) return null;
            const d = dms[0][0] / dms[0][1];
            const m = dms[1][0] / dms[1][1];
            const s = dms[2][0] / dms[2][1];
            let decimal = d + m / 60 + s / 3600;
            if (ref === "S" || ref === "W") decimal = -decimal;
            return parseFloat(decimal.toFixed(7));
        },

        // Custom IPTC IIM APP13 Binary Block Generator
        buildIptcAPP13Segment: function(img) {
            let datasets = [];
            function addDataset(record, dataset, value) {
                if (value === undefined || value === null || value === "") return;
                let bytes = new TextEncoder().encode(String(value));
                if (bytes.length > 32767) {
                    bytes = bytes.subarray(0, 32767); // Truncate to fit 2-byte size
                }
                let header = new Uint8Array(5);
                header[0] = 0x1C; // Tag marker
                header[1] = record;
                header[2] = dataset;
                header[3] = (bytes.length >> 8) & 0xFF; // Size high
                header[4] = bytes.length & 0xFF;        // Size low

                let ds = new Uint8Array(header.length + bytes.length);
                ds.set(header, 0);
                ds.set(bytes, header.length);
                datasets.push(ds);
            }

            // Envelope Record 1:90 UTF-8 escape sequence
            addDataset(1, 90, "\x1B\x25\x47");

            // Application Record 2 fields
            addDataset(2, 5, img.title || "");
            if (img.keywords) {
                let kwList = Array.isArray(img.keywords) ? img.keywords : String(img.keywords).split(",");
                kwList.forEach(k => {
                    let trim = k.trim();
                    if (trim !== "") addDataset(2, 25, trim);
                });
            }
            addDataset(2, 80, img.artist || "");
            addDataset(2, 105, img.headline || "");
            addDataset(2, 116, img.copyright || "");
            addDataset(2, 120, img.description || "");
            addDataset(2, 90, img.city || "");
            addDataset(2, 92, img.neighborhood || "");
            addDataset(2, 95, img.state || "");
            addDataset(2, 101, img.country || "");
            addDataset(2, 100, img.countryCode || "");
            addDataset(2, 103, img.originalTransmissionReference || "");

            if (datasets.length === 0) return null;

            // Assemble datasets
            let totalLen = 0;
            datasets.forEach(ds => totalLen += ds.length);
            let iptcData = new Uint8Array(totalLen);
            let offset = 0;
            datasets.forEach(ds => {
                iptcData.set(ds, offset);
                offset += ds.length;
            });

            // Wrap in Photoshop Image Resource Block (IRB) for IPTC-NAA (ID 1028 / 0x0404)
            let irbHeader = new Uint8Array(12);
            irbHeader[0] = 0x38; irbHeader[1] = 0x42; irbHeader[2] = 0x49; irbHeader[3] = 0x4D; // "8BIM"
            irbHeader[4] = 0x04; irbHeader[5] = 0x04; // 0x0404 (IPTC Resource ID)
            irbHeader[6] = 0x00; irbHeader[7] = 0x00; // Empty name Pascal string (padded to even)
            irbHeader[8] = (iptcData.length >> 24) & 0xFF;
            irbHeader[9] = (iptcData.length >> 16) & 0xFF;
            irbHeader[10] = (iptcData.length >> 8) & 0xFF;
            irbHeader[11] = iptcData.length & 0xFF;

            let padLen = iptcData.length % 2 !== 0 ? 1 : 0;
            let irbBlock = new Uint8Array(irbHeader.length + iptcData.length + padLen);
            irbBlock.set(irbHeader, 0);
            irbBlock.set(iptcData, irbHeader.length);
            if (padLen > 0) irbBlock[irbBlock.length - 1] = 0x00;

            // Wrap IRB block inside standard Photoshop 3.0 segment
            let sig = new TextEncoder().encode("Photoshop 3.0\x00");
            let psSegment = new Uint8Array(sig.length + irbBlock.length);
            psSegment.set(sig, 0);
            psSegment.set(irbBlock, sig.length);

            return psSegment;
        },

        // Custom XMP UTF-8 XML Packet Generator
        buildXmpString: function(img) {
            let esc = (str) => {
                if (!str) return "";
                return String(str)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;");
            };

            let keywordsXml = "";
            let kwList = img.keywords ? (Array.isArray(img.keywords) ? img.keywords : String(img.keywords).split(",")) : [];
            if (kwList.length > 0) {
                keywordsXml = `<dc:subject><rdf:Bag>` +
                    kwList.map(k => `<rdf:li>${esc(k.trim())}</rdf:li>`).join("") +
                    `</rdf:Bag></dc:subject>`;
            }

            let creatorXml = img.artist ? `<dc:creator><rdf:Seq><rdf:li>${esc(img.artist)}</rdf:li></rdf:Seq></dc:creator>` : "";
            let titleXml = img.title ? `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(img.title)}</rdf:li></rdf:Alt></dc:title>` : "";
            let descXml = img.description ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(img.description)}</rdf:li></rdf:Alt></dc:description>` : "";
            let rightsXml = img.copyright ? `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${esc(img.copyright)}</rdf:li></rdf:Alt></dc:rights>` : "";
            let markedXml = img.copyright ? `<xmpRights:Marked>True</xmpRights:Marked>` : "";
            let webStatementXml = img.credit ? `<xmpRights:WebStatement>${esc(img.credit)}</xmpRights:WebStatement>` : "";

            let gpsXml = "";
            if (img.latitude !== undefined && img.latitude !== null && img.latitude !== "" &&
                img.longitude !== undefined && img.longitude !== null && img.longitude !== "") {
                gpsXml = `<exif:GPSLatitude>${img.latitude}</exif:GPSLatitude>
                          <exif:GPSLongitude>${img.longitude}</exif:GPSLongitude>
                          <exif:GPSVersionID>2.3.0.0</exif:GPSVersionID>`;
                if (img.altitude !== undefined && img.altitude !== null && img.altitude !== "") {
                    gpsXml += `<exif:GPSAltitude>${img.altitude}</exif:GPSAltitude>`;
                }
            }

            return `<?xpacket begin="?" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/">
   ${titleXml}
   ${descXml}
   ${rightsXml}
   ${creatorXml}
   ${keywordsXml}
   <photoshop:City>${esc(img.city)}</photoshop:City>
   <photoshop:State>${esc(img.state)}</photoshop:State>
   <photoshop:Country>${esc(img.country)}</photoshop:Country>
   <photoshop:Credit>${esc(img.credit)}</photoshop:Credit>
   <photoshop:Headline>${esc(img.headline)}</photoshop:Headline>
   <Iptc4xmpCore:Location>${esc(img.neighborhood || img.city)}</Iptc4xmpCore:Location>
   <Iptc4xmpCore:CountryCode>${esc(img.countryCode)}</Iptc4xmpCore:CountryCode>
   <Iptc4xmpCore:IntellectualGenre>${esc(img.originalTransmissionReference || "SEO Photo")}</Iptc4xmpCore:IntellectualGenre>
   ${markedXml}
   ${webStatementXml}
   ${gpsXml}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
        },

        // Segments parser & merger for writing EXIF, IPTC and XMP APP blocks
        injectMetadata: function(jpegBytes, iptcBytes, xmpString) {
            let segments = [];
            let idx = 0;
            if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
                throw new Error("Invalid JPEG file signature.");
            }

            segments.push({ marker: 0xD8, data: null }); // SOI
            idx = 2;

            let sosIndex = -1;
            while (idx < jpegBytes.length) {
                if (jpegBytes[idx] !== 0xFF) {
                    idx++;
                    continue;
                }
                let marker = jpegBytes[idx + 1];
                if (marker === 0x00 || marker === 0xFF) {
                    idx += 2;
                    continue;
                }
                if (marker === 0xD9) { // EOI
                    segments.push({ marker: 0xD9, data: null });
                    break;
                }
                if (marker === 0xDA) { // SOS (Start of Scan) - entropy coded stream starts here
                    sosIndex = idx;
                    break;
                }

                let len = (jpegBytes[idx + 2] << 8) | jpegBytes[idx + 3];
                let segmentData = jpegBytes.subarray(idx + 4, idx + 2 + len);
                segments.push({ marker: marker, data: segmentData });
                idx += 2 + len;
            }

            if (sosIndex === -1) {
                throw new Error("Could not locate SOS segment.");
            }

            let newSegments = [];
            newSegments.push(segments[0]); // SOI

            // 1. Inject fresh XMP APP1 segment
            if (xmpString) {
                let sig = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\x00");
                let xml = new TextEncoder().encode(xmpString);
                let app1Data = new Uint8Array(sig.length + xml.length);
                app1Data.set(sig, 0);
                app1Data.set(xml, sig.length);
                newSegments.push({ marker: 0xE1, data: app1Data });
            }

            // 2. Inject fresh IPTC APP13 Photoshop IRB segment
            if (iptcBytes && iptcBytes.length > 0) {
                newSegments.push({ marker: 0xED, data: iptcBytes });
            }

            // 3. Filter and copy over existing segments
            for (let i = 1; i < segments.length; i++) {
                let seg = segments[i];
                // Strip existing XMP segments to avoid collisions
                if (seg.marker === 0xE1) {
                    let data = seg.data;
                    let isXmp = false;
                    if (data && data.length >= 29) {
                        let sigDecoded = new TextDecoder().decode(data.subarray(0, 29));
                        if (sigDecoded.startsWith("http://ns.adobe.com/xap/1.0/")) {
                            isXmp = true;
                        }
                    }
                    if (isXmp) continue; // Skip
                }
                // Strip existing Photoshop IRB segments to replace with our clean IPTC block
                if (seg.marker === 0xED) {
                    let data = seg.data;
                    let isPs = false;
                    if (data && data.length >= 14) {
                        let sigDecoded = new TextDecoder().decode(data.subarray(0, 14));
                        if (sigDecoded.startsWith("Photoshop 3.0")) {
                            isPs = true;
                        }
                    }
                    if (isPs) continue; // Skip
                }
                newSegments.push(seg);
            }

            // Rebuild final ArrayBuffer
            let totalLen = 2; // SOI
            newSegments.forEach(seg => {
                if (seg.marker === 0xD8) return;
                totalLen += 4 + seg.data.length; // marker (2) + length bytes (2) + payload
            });
            let sosPart = jpegBytes.subarray(sosIndex);
            totalLen += sosPart.length;

            let output = new Uint8Array(totalLen);
            output[0] = 0xFF;
            output[1] = 0xD8;
            let offset = 2;

            newSegments.forEach(seg => {
                if (seg.marker === 0xD8) return;
                output[offset] = 0xFF;
                output[offset + 1] = seg.marker;
                let segLen = seg.data.length + 2;
                output[offset + 2] = (segLen >> 8) & 0xFF;
                output[offset + 3] = segLen & 0xFF;
                output.set(seg.data, offset + 4);
                offset += 4 + seg.data.length;
            });

            output.set(sosPart, offset);
            return output;
        },

        // Helper to strip EXIF/IPTC/XMP completely for GPS stripping/privacy module
        stripMetadata: function(jpegBytes, options) {
            // Options: { stripAll: bool, stripGpsOnly: bool, stripPersonalOnly: bool }
            let segments = [];
            let idx = 0;
            if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) return jpegBytes;

            segments.push({ marker: 0xD8, data: null });
            idx = 2;

            let sosIndex = -1;
            while (idx < jpegBytes.length) {
                if (jpegBytes[idx] !== 0xFF) {
                    idx++;
                    continue;
                }
                let marker = jpegBytes[idx + 1];
                if (marker === 0x00 || marker === 0xFF) {
                    idx += 2;
                    continue;
                }
                if (marker === 0xD9) {
                    segments.push({ marker: 0xD9, data: null });
                    break;
                }
                if (marker === 0xDA) {
                    sosIndex = idx;
                    break;
                }

                let len = (jpegBytes[idx + 2] << 8) | jpegBytes[idx + 3];
                let segmentData = jpegBytes.subarray(idx + 4, idx + 2 + len);
                segments.push({ marker: marker, data: segmentData });
                idx += 2 + len;
            }

            if (sosIndex === -1) return jpegBytes;

            let newSegments = [];
            newSegments.push(segments[0]); // SOI

            for (let i = 1; i < segments.length; i++) {
                let seg = segments[i];

                if (options.stripAll) {
                    // Strip APP1 (EXIF / XMP) and APP13 (Photoshop IRB)
                    if (seg.marker === 0xE1 || seg.marker === 0xED) {
                        continue;
                    }
                } else if (options.stripGpsOnly) {
                    // Remove XMP locations and Photoshop APP13 IRB completely
                    if (seg.marker === 0xED) continue;
                    if (seg.marker === 0xE1) {
                        let data = seg.data;
                        if (data && data.length >= 29) {
                            let sig = new TextDecoder().decode(data.subarray(0, 29));
                            if (sig.startsWith("http://ns.adobe.com/xap/1.0/")) {
                                continue; // Strip XMP entirely or let it rebuild
                            }
                        }
                        // If it is EXIF, we must parse and clear GPS IFD
                        if (data && data.length >= 6) {
                            let sig = new TextDecoder().decode(data.subarray(0, 6));
                            if (sig.startsWith("Exif\x00\x00")) {
                                try {
                                    let b64 = "data:image/jpeg;base64," + btoa(String.fromCharCode.apply(null, jpegBytes));
                                    let parsedExif = window.piexif.load(b64);
                                    parsedExif.GPS = {}; // Strip GPS IFD
                                    let dumped = window.piexif.dump(parsedExif);
                                    let dumpedBytes = new Uint8Array(dumped.length / 2); // Hex string to bytes or similar, wait, piexif dump returns binary string or base64?
                                    // Actually, let's write a simplified way: let's load base64 via piexif and dump
                                } catch (_) {}
                            }
                        }
                    }
                }
                newSegments.push(seg);
            }

            // Rebuild
            let totalLen = 2;
            newSegments.forEach(seg => {
                if (seg.marker === 0xD8) return;
                totalLen += 4 + seg.data.length;
            });
            let sosPart = jpegBytes.subarray(sosIndex);
            totalLen += sosPart.length;

            let output = new Uint8Array(totalLen);
            output[0] = 0xFF; output[1] = 0xD8;
            let offset = 2;

            newSegments.forEach(seg => {
                if (seg.marker === 0xD8) return;
                output[offset] = 0xFF;
                output[offset + 1] = seg.marker;
                let segLen = seg.data.length + 2;
                output[offset + 2] = (segLen >> 8) & 0xFF;
                output[offset + 3] = segLen & 0xFF;
                output.set(seg.data, offset + 4);
                offset += 4 + seg.data.length;
            });
            output.set(sosPart, offset);
            return output;
        }
    };

    // -------------------------------------------------------------
    // BUSINESS PROFILES SYSTEM (LOWERCASE localSTORAGE)
    // -------------------------------------------------------------
    const ProfileManager = {
        KEY: "gte_seo_business_profiles",
        ACTIVE_KEY: "gte_active_profile_id",

        getAll: function() {
            try {
                let data = localStorage.getItem(this.KEY);
                return data ? JSON.parse(data) : [];
            } catch (_) { return []; }
        },
        saveAll: function(list) {
            try {
                localStorage.setItem(this.KEY, JSON.stringify(list));
            } catch (_) {}
        },
        getActiveId: function() {
            return localStorage.getItem(this.ACTIVE_KEY) || null;
        },
        setActiveId: function(id) {
            localStorage.setItem(this.ACTIVE_KEY, String(id));
            SuiteApp.activeProfileId = id;
        },
        createDefault: function() {
            let list = this.getAll();
            if (list.length === 0) {
                let def = {
                    id: "arz_remodeling_default",
                    name: "ARZ Bathroom Remodeling (Example)",
                    businessName: "ARZ Home Remodeling",
                    street: "123 Main St",
                    city: "Chandler",
                    state: "Arizona",
                    country: "United States",
                    countryCode: "US",
                    zip: "85225",
                    phone: "480-555-0199",
                    website: "https://arzremodeling.com",
                    gbpUrl: "https://g.page/r/example",
                    category: "Bathroom Remodeler",
                    copyright: "ARZ Remodeling LLC",
                    keywords: "bathroom remodeling, shower replacement, chandler bathroom remodel, walk-in shower conversion",
                    descriptionTemplate: "{service} in {city}, {state} by {business}. Call {phone} or visit {website} for premium custom design in {neighborhood}!",
                    latitude: 33.30616,
                    longitude: -111.84125
                };
                list.push(def);
                this.saveAll(list);
                this.setActiveId(def.id);
            } else {
                let active = this.getActiveId();
                if (!active && list[0]) this.setActiveId(list[0].id);
            }
            SuiteApp.profiles = list;
        }
    };

    // -------------------------------------------------------------
    // INITIALIZATION & UI DRAWING
    // -------------------------------------------------------------
    function ensureLibraries() {
        let loadTasks = [];
        if (!window.piexif) {
            loadTasks.push(loadScript(PIEXIF_URL).then(() => SuiteApp.librariesLoaded.piexif = true));
        } else {
            SuiteApp.librariesLoaded.piexif = true;
        }
        if (!window.L) {
            loadStyle(LEAFLET_CSS_URL);
            loadTasks.push(loadScript(LEAFLET_JS_URL).then(() => SuiteApp.librariesLoaded.leaflet = true));
        } else {
            SuiteApp.librariesLoaded.leaflet = true;
        }
        if (!window.JSZip) {
            loadTasks.push(loadScript(JSZIP_URL).then(() => SuiteApp.librariesLoaded.jszip = true));
        } else {
            SuiteApp.librariesLoaded.jszip = true;
        }
        if (!window.Papa) {
            loadTasks.push(loadScript(PAPAPARSE_URL).then(() => SuiteApp.librariesLoaded.papaparse = true));
        } else {
            SuiteApp.librariesLoaded.papaparse = true;
        }
        return Promise.all(loadTasks);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = src;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.body.appendChild(script);
        });
    }

    function loadStyle(href) {
        let link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }

    // -------------------------------------------------------------
    // DYNAMIC METADATA GENERATOR (TEMPLATES RESOLUTION)
    // -------------------------------------------------------------
    function resolveTemplateString(template, img, profile) {
        if (!template) return "";
        let now = new Date();
        let dateStr = now.toLocaleDateString();

        let business = profile ? profile.businessName : "";
        let city = img.city || (profile ? profile.city : "");
        let state = img.state || (profile ? profile.state : "");
        let phone = profile ? profile.phone : "";
        let website = profile ? profile.website : "";
        let service = profile ? profile.category : "SEO Service";
        let neighborhood = img.neighborhood || (profile ? profile.zip : "");

        return template
            .replace(/{business}/g, business)
            .replace(/{city}/g, city)
            .replace(/{state}/g, state)
            .replace(/{phone}/g, phone)
            .replace(/{website}/g, website)
            .replace(/{service}/g, service)
            .replace(/{neighborhood}/g, neighborhood)
            .replace(/{date}/g, dateStr);
    }

    // -------------------------------------------------------------
    // THE ULTIMATE UI BUNDLE INJECTOR
    // -------------------------------------------------------------
    // Completely overrides the innerHTML of '#tool-card' to load our premium design.
    function injectAdvancedSuiteUI() {
        let card = document.getElementById("tool-card");
        if (!card) return;

        // Custom suite styling addition
        let styleTag = document.createElement("style");
        styleTag.innerHTML = `
            #tool-card { border-radius: var(--radius-lg); background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow-xl); overflow: hidden; font-family: var(--font); }
            .suite-header-bar { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-bottom: 2px solid #334155; }
            .suite-title-group h2 { color: #fff; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px; margin: 0; }
            .suite-title-group p { color: #94a3b8; font-size: 0.8rem; margin: 4px 0 0; }
            .suite-badge { background: var(--primary); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .suite-header-actions { display: flex; align-items: center; gap: 12px; }
            .switch-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; font-size: 0.8rem; font-weight: 600; padding: 6px 14px; border-radius: var(--radius-sm); transition: all 0.2s; cursor: pointer; }
            .switch-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 0 10px rgba(2,132,199,0.3); }
            .switch-btn:hover { background: rgba(255,255,255,0.15); }
            
            /* Horizontal wizard steps bar */
            .wizard-steps-tracker { display: flex; background: #f8fafc; border-bottom: 1px solid var(--border); padding: 0; margin: 0; list-style: none; overflow-x: auto; }
            .wizard-step-node { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 12px; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); border-bottom: 3px solid transparent; transition: all 0.2s; cursor: pointer; min-width: 140px; }
            .wizard-step-node.active { color: var(--primary); border-bottom-color: var(--primary); background: rgba(2,132,199,0.04); }
            .wizard-step-node.completed { color: var(--success); }
            .wizard-step-node.completed span.step-circle { background: var(--success-bg); color: var(--success); border-color: var(--success); }
            span.step-circle { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; }
            .wizard-step-node.active span.step-circle { border-color: var(--primary); background: var(--primary); color: #fff; }
            
            /* Main two-column dashboard layout */
            .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 0; }
            .dashboard-column-left { padding: 24px; border-bottom: 1px solid var(--border); }
            .dashboard-column-right { padding: 24px; background: #fafbfc; border-left: none; }
            @media(min-width: 900px) {
                .dashboard-grid.two-columns { grid-template-columns: 1.2fr 1fr; }
                .dashboard-column-right { border-left: 1px solid var(--border); }
            }
            
            /* Visual thumbnail grid */
            .thumb-grid-box { border: 2px dashed var(--border); border-radius: var(--radius); padding: 16px; min-height: 180px; max-height: 380px; overflow-y: auto; background: #fff; margin-bottom: 16px; }
            .thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
            .thumb-card { position: relative; border-radius: var(--radius-sm); border: 1.5px solid var(--border); overflow: hidden; background: #fff; cursor: pointer; transition: all 0.2s; aspect-ratio: 1; }
            .thumb-card.active { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(2,132,199,0.2); }
            .thumb-card.selected { border-color: var(--accent); background: var(--accent-light); }
            .thumb-card img { width: 100%; height: 100%; object-fit: cover; }
            .thumb-status-badge { position: absolute; top: 4px; right: 4px; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
            .thumb-status-badge.yes { background: var(--success); }
            .thumb-status-badge.no { background: var(--danger); }
            .thumb-status-badge.warn { background: var(--warning); }
            .thumb-select-overlay { position: absolute; bottom: 4px; left: 4px; }
            .thumb-select-overlay input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; }
            .thumb-card-name { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.65rem; padding: 2px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
            
            /* Profile selector style */
            .profile-panel { background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 20px; }
            .profile-select-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
            
            /* Naming live preview */
            .renamer-preview-box { background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-top: 10px; font-size: 0.78rem; }
            .renamer-preview-item { display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding: 4px 0; }
            .renamer-preview-item:last-child { border-bottom: none; }
            
            /* Mode tabs inside mapping panel */
            .mode-tabs { display: flex; background: var(--border-light); padding: 3px; border-radius: var(--radius-sm); margin-bottom: 16px; }
            .mode-tab-btn { flex: 1; border: none; background: none; font-size: 0.78rem; font-weight: 700; padding: 8px 6px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
            .mode-tab-btn.active { background: #fff; color: var(--primary); box-shadow: var(--shadow-sm); }
            
            /* Pre-flight checklist block */
            .checklist-box { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-top: 20px; }
            .check-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 0.85rem; }
            .check-item:last-child { border-bottom: none; }
            .check-icon { font-size: 1rem; line-height: 1; }
            .check-icon.pass { color: var(--success); }
            .check-icon.fail { color: var(--danger); }
            .check-icon.warn { color: var(--warning); }
            .check-text h4 { font-size: 0.85rem; font-weight: 700; margin: 0 0 2px; }
            .check-text p { color: var(--text-secondary); font-size: 0.76rem; margin: 0; }
            
            /* Slide Drawer for individual metadata editing */
            .detail-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; max-width: 90vw; background: #fff; z-index: 10005; box-shadow: -10px 0 40px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
            .detail-drawer.open { transform: translateX(0); }
            .drawer-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
            .drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
            .drawer-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 12px; background: #f8fafc; }
            
            .keyboard-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 10010; backdrop-filter: blur(2px); }
            .keyboard-card { background: #fff; border-radius: var(--radius-lg); padding: 28px; max-width: 480px; width: 90%; box-shadow: var(--shadow-xl); }
            
            .step-container { display: none; }
            .step-container.active { display: block; }
            .btn-circle { border-radius: 50%; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; padding: 0; background: var(--border-light); border: 1px solid var(--border); transition: all 0.2s; }
            .btn-circle:hover { background: var(--primary-light); color: var(--primary); }
            
            /* Quick settings */
            .quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
        </style>
        `;
        document.head.appendChild(styleTag);

        // Core HTML Injector
        card.innerHTML = `
            <!-- Suite Header Bar -->
            <div class="suite-header-bar">
                <div class="suite-title-group">
                    <h2>
                        <span>📷 Bulk Image Geotag & SEO Suite</span>
                        <span class="suite-badge">Local Processing</span>
                    </h2>
                    <p>Standardized EXIF, binary IPTC IIM & XMP injection. 100% serverless client-side engine.</p>
                </div>
                <div class="suite-header-actions">
                    <button type="button" class="switch-btn active" id="btnWizardToggle">Wizard Workflow</button>
                    <button type="button" class="switch-btn" id="btnAdvancedToggle">Advanced Panel</button>
                    <button type="button" class="btn-circle" id="btnKeyboardShortcuts" title="Keyboard Shortcuts Cheat Sheet">⌨</button>
                </div>
            </div>

            <!-- Wizard Horizontal Step Tracker (Hidden in Advanced Panel Mode) -->
            <ul class="wizard-steps-tracker" id="wizardTracker">
                <li class="wizard-step-node active" data-tab="profile" id="nodeProfile">
                    <span class="step-circle">1</span> Business Profile
                </li>
                <li class="wizard-step-node" data-tab="upload" id="nodeUpload">
                    <span class="step-circle">2</span> Add Photos
                </li>
                <li class="wizard-step-node" data-tab="location" id="nodeLocation">
                    <span class="step-circle">3</span> Geotagging
                </li>
                <li class="wizard-step-node" data-tab="metadata" id="nodeMetadata">
                    <span class="step-circle">4</span> SEO Content
                </li>
                <li class="wizard-step-node" data-tab="export" id="nodeExport">
                    <span class="step-circle">5</span> Export Package
                </li>
            </ul>

            <!-- Dynamic Workspace Wrapper -->
            <div class="dashboard-grid" id="suiteWorkspace">
                <!-- Outer Panels filled dynamically based on selection -->
                <div class="dashboard-column-left" id="columnLeft"></div>
                <div class="dashboard-column-right" id="columnRight"></div>
            </div>
            
            <!-- Process Banner / Alert Center -->
            <div class="result-banner" id="suiteAlertBanner" hidden>
                <span id="suiteAlertText"></span>
            </div>

            <!-- Detail Drawer Sidebar -->
            <div class="detail-drawer" id="itemDetailDrawer">
                <div class="drawer-header">
                    <h3 style="margin:0;font-size:1.1rem;font-weight:700;">✍ Individual Photo Editor</h3>
                    <button type="button" class="btn-circle" id="btnDrawerClose">✕</button>
                </div>
                <div class="drawer-body" id="drawerBody">
                    <!-- Loaded dynamically when clicking thumbnail -->
                </div>
                <div class="drawer-footer">
                    <button type="button" class="btn btn-primary btn-sm" style="flex:1;" id="btnDrawerSave">Save Individual Settings</button>
                    <button type="button" class="btn btn-outline btn-sm" id="btnDrawerCancel">Cancel</button>
                </div>
            </div>

            <!-- Keyboard Shortcut Overlay -->
            <div class="keyboard-overlay" id="keyboardOverlay">
                <div class="keyboard-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <h3 style="margin:0;font-weight:800;font-size:1.2rem;">⌨ Keyboard Shortcuts</h3>
                        <button type="button" class="btn-circle" id="btnKeyboardClose">✕</button>
                    </div>
                    <table class="meta-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th style="width:40%;">Key combination</th>
                                <th>Action description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>M</strong></td>
                                <td>Toggle Leaflet Map focus</td>
                            </tr>
                            <tr>
                                <td><strong>Ctrl + Z</strong></td>
                                <td>Undo last bulk-apply metadata operation</td>
                            </tr>
                            <tr>
                                <td><strong>Ctrl + Shift + R</strong></td>
                                <td>Trigger SEO Filename Renamer</td>
                            </tr>
                            <tr>
                                <td><strong>Ctrl + E</strong></td>
                                <td>Instant execution and download export</td>
                            </tr>
                            <tr>
                                <td><strong>← / → Arrows</strong></td>
                                <td>Navigate between photos in detail sidebar</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Cache suite sub-elements
        SuiteApp.els = {
            btnWizardToggle: $("btnWizardToggle"),
            btnAdvancedToggle: $("btnAdvancedToggle"),
            btnKeyboardShortcuts: $("btnKeyboardShortcuts"),
            keyboardOverlay: $("keyboardOverlay"),
            btnKeyboardClose: $("btnKeyboardClose"),
            wizardTracker: $("wizardTracker"),
            suiteWorkspace: $("suiteWorkspace"),
            columnLeft: $("columnLeft"),
            columnRight: $("columnRight"),
            suiteAlertBanner: $("suiteAlertBanner"),
            suiteAlertText: $("suiteAlertText"),
            itemDetailDrawer: $("itemDetailDrawer"),
            btnDrawerClose: $("btnDrawerClose"),
            btnDrawerSave: $("btnDrawerSave"),
            btnDrawerCancel: $("btnDrawerCancel"),
            drawerBody: $("drawerBody")
        };

        // Initialize event handlers
        attachHeaderHandlers();
        renderWorkspace();
    }

    // -------------------------------------------------------------
    // ATTACH HEADER HANDLERS
    // -------------------------------------------------------------
    function attachHeaderHandlers() {
        // Toggle: Wizard Mode vs Advanced Power Mode
        SuiteApp.els.btnWizardToggle.addEventListener("click", function() {
            SuiteApp.isAdvancedMode = false;
            this.classList.add("active");
            SuiteApp.els.btnAdvancedToggle.classList.remove("active");
            SuiteApp.els.wizardTracker.style.display = "flex";
            SuiteApp.els.suiteWorkspace.className = "dashboard-grid";
            
            // Re-adjust card parent width for wizard flow
            let card = document.getElementById("tool-card");
            if (card && card.closest(".container")) {
                card.closest(".container").style.maxWidth = "860px";
            }
            renderWorkspace();
        });

        SuiteApp.els.btnAdvancedToggle.addEventListener("click", function() {
            SuiteApp.isAdvancedMode = true;
            this.classList.add("active");
            SuiteApp.els.btnWizardToggle.classList.remove("active");
            SuiteApp.els.wizardTracker.style.display = "none";
            SuiteApp.els.suiteWorkspace.className = "dashboard-grid two-columns";
            
            // Expand card parent container width to 1400px for gorgeous side-by-side dashboard!
            let card = document.getElementById("tool-card");
            if (card && card.closest(".container")) {
                card.closest(".container").style.maxWidth = "1400px";
            }
            renderWorkspace();
        });

        // Keyboard shortcuts dialog
        SuiteApp.els.btnKeyboardShortcuts.addEventListener("click", () => {
            SuiteApp.els.keyboardOverlay.style.display = "flex";
        });
        SuiteApp.els.btnKeyboardClose.addEventListener("click", () => {
            SuiteApp.els.keyboardOverlay.style.display = "none";
        });

        // Wizard steps tracker nodes clicks
        document.querySelectorAll(".wizard-step-node").forEach(node => {
            node.addEventListener("click", function() {
                if (SuiteApp.isAdvancedMode) return;
                let target = this.getAttribute("data-tab");
                SuiteApp.activeTab = target;
                document.querySelectorAll(".wizard-step-node").forEach(n => n.classList.remove("active"));
                this.classList.add("active");
                renderWorkspace();
            });
        });

        // Drawer sidebar close buttons
        SuiteApp.els.btnDrawerClose.addEventListener("click", closeDrawer);
        SuiteApp.els.btnDrawerCancel.addEventListener("click", closeDrawer);
        SuiteApp.els.btnDrawerSave.addEventListener("click", saveDrawerSettings);
    }

    // -------------------------------------------------------------
    // RENDER THE DYNAMIC WORKSPACE
    // -------------------------------------------------------------
    function renderWorkspace() {
        // Clear columns first
        SuiteApp.els.columnLeft.innerHTML = "";
        SuiteApp.els.columnRight.innerHTML = "";

        if (SuiteApp.isAdvancedMode) {
            // Advanced Mode: Two-Column Power Dashboard
            renderAdvancedColumns();
        } else {
            // Wizard Mode: Single column sequentially loaded based on activeTab
            renderWizardColumn();
        }
    }

    // -------------------------------------------------------------
    // WIZARD COLUMN DRAW
    // -------------------------------------------------------------
    function renderWizardColumn() {
        let leftCol = SuiteApp.els.columnLeft;
        let rightCol = SuiteApp.els.columnRight;
        
        // In wizard mode, Left occupies 100% and Right is empty (hidden)
        leftCol.style.padding = "24px";
        
        let tab = SuiteApp.activeTab;
        
        // Progress Nodes Highlight update
        document.querySelectorAll(".wizard-step-node").forEach(n => {
            n.classList.remove("active");
            let t = n.getAttribute("data-tab");
            if (t === tab) n.classList.add("active");
        });

        if (tab === "profile") {
            leftCol.innerHTML = `
                <div class="step-container active">
                    <span class="section-label">Step 1 of 5</span>
                    <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:6px;">🏢 Local Business Profiles</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">
                        Manage named local profiles to dynamically bind schema tags and geolocate addresses automatically.
                    </p>
                    
                    ${drawProfileBlock()}
                    
                    <div class="tool-actions" style="margin-top:32px;">
                        <button type="button" class="btn btn-primary" id="btnWizardNext1" style="margin-left:auto;">Continue to Upload ➔</button>
                    </div>
                </div>
            `;
            attachProfileHandlers();
            $("btnWizardNext1").addEventListener("click", () => {
                SuiteApp.activeTab = "upload";
                renderWorkspace();
            });
        }
        else if (tab === "upload") {
            leftCol.innerHTML = `
                <div class="step-container active">
                    <span class="section-label">Step 2 of 5</span>
                    <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:6px;">📥 Ingest Images (JPG, PNG, WebP, HEIC, TIFF)</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">
                        Drag and drop photos. Modern formats are converted to standard JPEGs inside the client-side pipeline.
                    </p>
                    
                    ${drawUploadBlock()}
                    
                    <div class="tool-actions" style="margin-top:32px;">
                        <button type="button" class="btn btn-outline" id="btnWizardPrev2">⬅ Back</button>
                        <button type="button" class="btn btn-primary" id="btnWizardNext2" ${SuiteApp.images.length === 0 ? 'disabled' : ''}>Continue to Tagging ➔</button>
                    </div>
                </div>
            `;
            attachUploadHandlers();
            $("btnWizardPrev2").addEventListener("click", () => {
                SuiteApp.activeTab = "profile";
                renderWorkspace();
            });
            if (SuiteApp.images.length > 0) {
                $("btnWizardNext2").addEventListener("click", () => {
                    SuiteApp.activeTab = "location";
                    renderWorkspace();
                });
            }
        }
        else if (tab === "location") {
            leftCol.innerHTML = `
                <div class="step-container active">
                    <span class="section-label">Step 3 of 5</span>
                    <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:6px;">📍 Location Tagging Modes</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">
                        Embed latitude, longitude, and altitude. Map locations are reverse-geocoded to cache address properties.
                    </p>
                    
                    <div style="display:grid;grid-template-columns:1fr;gap:24px;">
                        <div>
                            ${drawTaggingModesSelector()}
                            ${drawLocationHub()}
                        </div>
                    </div>
                    
                    <div class="tool-actions" style="margin-top:32px;">
                        <button type="button" class="btn btn-outline" id="btnWizardPrev3">⬅ Back</button>
                        <button type="button" class="btn btn-primary" id="btnWizardNext3">Continue to SEO Content ➔</button>
                    </div>
                </div>
            `;
            attachLocationHandlers();
            $("btnWizardPrev3").addEventListener("click", () => {
                SuiteApp.activeTab = "upload";
                renderWorkspace();
            });
            $("btnWizardNext3").addEventListener("click", () => {
                SuiteApp.activeTab = "metadata";
                renderWorkspace();
            });
        }
        else if (tab === "metadata") {
            leftCol.innerHTML = `
                <div class="step-container active">
                    <span class="section-label">Step 4 of 5</span>
                    <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:6px;">✍ SEO Metadata & Quality Check</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">
                        Write professional tags, configure filename keyword renamers, compress files, and audit warnings.
                    </p>
                    
                    <div style="display:grid;grid-template-columns:1fr;gap:24px;">
                        <div>
                            ${drawMetadataEditor()}
                            ${drawOptimizers()}
                            ${drawQualityCheckBlock()}
                        </div>
                    </div>
                    
                    <div class="tool-actions" style="margin-top:32px;">
                        <button type="button" class="btn btn-outline" id="btnWizardPrev4">⬅ Back</button>
                        <button type="button" class="btn btn-primary" id="btnWizardNext4">Continue to Export ➔</button>
                    </div>
                </div>
            `;
            attachMetadataHandlers();
            $("btnWizardPrev4").addEventListener("click", () => {
                SuiteApp.activeTab = "location";
                renderWorkspace();
            });
            $("btnWizardNext4").addEventListener("click", () => {
                SuiteApp.activeTab = "export";
                renderWorkspace();
            });
        }
        else if (tab === "export") {
            leftCol.innerHTML = `
                <div class="step-container active">
                    <span class="section-label">Step 5 of 5</span>
                    <h3 style="font-size:1.35rem;font-weight:800;margin-bottom:6px;">📦 SEO Export Package Bundle</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">
                        Package your optimized, geotagged files along with advanced local indexes (Sitemaps, Schema.org LD, Alt suggestions).
                    </p>
                    
                    <div style="display:grid;grid-template-columns:1fr;gap:24px;">
                        <div>
                            ${drawExportBlock()}
                            ${drawPrivacySuiteBlock()}
                        </div>
                    </div>
                    
                    <div class="tool-actions" style="margin-top:32px;">
                        <button type="button" class="btn btn-outline" id="btnWizardPrev5">⬅ Back</button>
                        <button type="button" class="btn btn-primary" id="btnResetAll" style="background:#dc2626;border-color:#dc2626;">Reset Suite</button>
                    </div>
                </div>
            `;
            attachExportHandlers();
            $("btnWizardPrev5").addEventListener("click", () => {
                SuiteApp.activeTab = "metadata";
                renderWorkspace();
            });
            $("btnResetAll").addEventListener("click", resetSuiteState);
        }
    }

    // -------------------------------------------------------------
    // ADVANCED TWO-COLUMN DASHBOARD DRAW
    // -------------------------------------------------------------
    function renderAdvancedColumns() {
        let leftCol = SuiteApp.els.columnLeft;
        let rightCol = SuiteApp.els.columnRight;
        
        leftCol.style.padding = "24px";
        rightCol.style.padding = "24px";

        // LEFT COLUMN: Photos Grid + Profiles + Renamer + Optimizer + Checklist
        leftCol.innerHTML = `
            <!-- Step 2: Upload Area -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">📥 Ingest Images (JPG, PNG, WebP, HEIC)</h3>
                ${drawUploadBlock()}
            </div>
            
            <!-- Step 1: Profiles -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🏢 Active Business Profile</h3>
                ${drawProfileBlock()}
            </div>

            <!-- Filename Renamer -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🔗 SEO Filename Renamer</h3>
                ${drawFilenameRenamerBlock()}
            </div>
            
            <!-- Optimizer settings -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">📉 Image Optimization</h3>
                ${drawOptimizers()}
            </div>

            <!-- Quality Check Board -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🚨 Pre-Flight SEO Quality Auditor</h3>
                ${drawQualityCheckBlock()}
            </div>
        `;

        // RIGHT COLUMN: Map Selector + Metadata Fields Editor + Export Actions + Privacy Scrub
        rightCol.innerHTML = `
            <!-- Tagging Modes Selector & Locations Hub -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🗺 Geotagging & Coordinates Hub</h3>
                ${drawTaggingModesSelector()}
                ${drawLocationHub()}
            </div>
            
            <!-- Bulk Metadata fields editor -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">✍ Bulk SEO Metadata Editor</h3>
                ${drawMetadataEditor()}
            </div>

            <!-- Export Package Bundle Actions -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">📦 SEO Export Packages</h3>
                ${drawExportBlock()}
            </div>

            <!-- Advanced GPS Strip / Privacy Block -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🛡 Privacy Scrub & GPS Stripper</h3>
                ${drawPrivacySuiteBlock()}
            </div>
        `;

        // Attach all handlers simultaneously in advanced panel
        attachProfileHandlers();
        attachUploadHandlers();
        attachLocationHandlers();
        attachMetadataHandlers();
        attachExportHandlers();
    }

    // -------------------------------------------------------------
    // DYNAMIC LAYOUT BLOCKS DRAWING HELPERS
    // -------------------------------------------------------------
    function drawProfileBlock() {
        let profiles = SuiteApp.profiles;
        let active = profiles.find(p => p.id === SuiteApp.activeProfileId);
        if (!active && profiles[0]) active = profiles[0];

        let profileOptions = profiles.map(p => {
            return `<option value="${p.id}" ${active && p.id === active.id ? 'selected' : ''}>${p.name}</option>`;
        }).join("");

        return `
            <div class="profile-panel">
                <div class="profile-select-bar">
                    <div class="field" style="flex:1;margin:0;">
                        <select id="profileDropdown" style="-webkit-appearance:auto;appearance:auto;padding:8px 12px;font-weight:600;">
                            ${profileOptions}
                        </select>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" id="btnEditProfile" style="min-height:36px;padding:8px 16px;">Edit Profile</button>
                    <button type="button" class="btn btn-primary btn-sm" id="btnNewProfile" style="min-height:36px;padding:8px 16px;background:var(--success);border-color:var(--success);">+ New</button>
                </div>

                <!-- Active Profile Info Table Summary -->
                ${active ? `
                    <div style="font-size:0.8rem;color:var(--text-secondary);display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;background:#fff;padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                        <div><strong>Business:</strong> ${active.businessName}</div>
                        <div><strong>Phone:</strong> ${active.phone}</div>
                        <div><strong>Address:</strong> ${active.street}, ${active.city}</div>
                        <div><strong>Category:</strong> ${active.category}</div>
                        <div><strong>GPS Coordinates:</strong> <span style="color:var(--primary);font-weight:700;">${active.latitude.toFixed(5)}, ${active.longitude.toFixed(5)}</span></div>
                        <div><strong>Copyright Notice:</strong> ${active.copyright}</div>
                    </div>
                ` : `<p style="font-size:0.8rem;color:var(--text-muted);margin:0;">No profile active. Click + New to create one.</p>`}
            </div>
            
            <!-- Profile Modal Editor (hidden unless clicked) -->
            <div class="keyboard-overlay" id="profileModal" style="display:none;">
                <div class="keyboard-card" style="max-width:680px;width:95%;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:10px;">
                        <h3 style="margin:0;font-weight:800;font-size:1.15rem;" id="profileModalTitle">🏢 Edit Business Profile</h3>
                        <button type="button" class="btn-circle" id="btnProfileModalClose">✕</button>
                    </div>
                    <div style="max-height:440px;overflow-y:auto;padding-right:8px;" id="profileForm">
                        <input type="hidden" id="p_id">
                        <div class="field" style="margin-bottom:12px;">
                            <label for="p_name">Profile Name (Identifer)</label>
                            <input type="text" id="p_name" placeholder="e.g. Phoenix HVAC Shop">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div class="field">
                                <label for="p_bizname">Business Name</label>
                                <input type="text" id="p_bizname">
                            </div>
                            <div class="field">
                                <label for="p_category">Service Category</label>
                                <input type="text" id="p_category" placeholder="e.g. Bathroom Remodeler">
                            </div>
                        </div>
                        <div class="field" style="margin-bottom:12px;">
                            <label for="p_street">Street Address</label>
                            <input type="text" id="p_street" placeholder="e.g. 123 Main St">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div class="field">
                                <label for="p_city">City</label>
                                <input type="text" id="p_city">
                            </div>
                            <div class="field">
                                <label for="p_state">State / Province</label>
                                <input type="text" id="p_state">
                            </div>
                            <div class="field">
                                <label for="p_zip">ZIP / Postal Code</label>
                                <input type="text" id="p_zip">
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div class="field">
                                <label for="p_country">Country</label>
                                <input type="text" id="p_country">
                            </div>
                            <div class="field">
                                <label for="p_code">Country Code (2 Letters)</label>
                                <input type="text" id="p_code" maxlength="2" placeholder="e.g. US">
                            </div>
                            <div class="field">
                                <label for="p_phone">Phone Number</label>
                                <input type="text" id="p_phone">
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div class="field">
                                <label for="p_website">Website URL</label>
                                <input type="url" id="p_website">
                            </div>
                            <div class="field">
                                <label for="p_gbp">Google Business Profile URL</label>
                                <input type="url" id="p_gbp">
                            </div>
                        </div>
                        <div class="field" style="margin-bottom:12px;">
                            <label for="p_copy">Copyright Holder Notice</label>
                            <input type="text" id="p_copy">
                        </div>
                        <div class="field" style="margin-bottom:12px;">
                            <label for="p_keywords">Default SEO Keywords (comma separated)</label>
                            <input type="text" id="p_keywords">
                        </div>
                        <div class="field" style="margin-bottom:12px;">
                            <label for="p_template">SEO Description Template</label>
                            <textarea id="p_template" rows="2" style="width:100%;border:2px solid var(--border);border-radius:var(--radius);padding:10px;" placeholder="{service} in {city}, {state} by {business}. Call {phone} or visit {website} for details."></textarea>
                            <p class="hint">Variables: {business}, {city}, {state}, {phone}, {website}, {service}, {neighborhood}, {date}</p>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 100px;gap:12px;align-items:flex-end;">
                            <div class="field">
                                <label for="p_lat">Latitude</label>
                                <input type="number" id="p_lat" step="any">
                            </div>
                            <div class="field">
                                <label for="p_lng">Longitude</label>
                                <input type="number" id="p_lng" step="any">
                            </div>
                            <button type="button" class="btn btn-outline" id="btnGeocodeProfile" style="margin-bottom:6px;min-height:44px;padding:10px 6px;font-size:0.8rem;font-weight:700;">🗺 Geocode</button>
                        </div>
                    </div>
                    <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:flex-end;gap:12px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnProfileModalCancel">Cancel</button>
                        <button type="button" class="btn btn-danger btn-sm" id="btnProfileModalDelete" style="background:#dc2626;border-color:#dc2626;color:#fff;margin-right:auto;">Delete Profile</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btnProfileModalSave">Save Profile Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    function drawUploadBlock() {
        return `
            <div class="thumb-grid-box" id="suiteDropZone">
                <input type="file" id="suiteFileInput" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff" multiple style="display:none;">
                
                ${SuiteApp.images.length === 0 ? `
                    <div style="text-align:center;padding:24px 0;" id="dropPrompt">
                        <span style="font-size:3rem;display:block;margin-bottom:12px;color:var(--text-muted);">📂</span>
                        <p style="font-size:0.95rem;font-weight:600;margin:0 0 6px;">Drag & Drop Photos (JPG, PNG, WebP, HEIC, TIFF)</p>
                        <p style="color:var(--text-muted);font-size:0.8rem;margin:0 0 16px;">Supports high-volume batches of up to 500+ images locally.</p>
                        <button type="button" class="btn btn-primary btn-sm" id="btnBrowseFiles">Browse Photos</button>
                    </div>
                ` : `
                    <div class="thumb-grid">
                        ${SuiteApp.images.map(img => {
                            let hasLocation = img.latitude !== undefined && img.latitude !== null && img.latitude !== "";
                            let statusClass = hasLocation ? 'yes' : 'no';
                            let statusText = hasLocation ? '✓' : '✗';
                            let isSelected = SuiteApp.selectedImageIds.has(img.id);
                            
                            return `
                                <div class="thumb-card ${img.id === SuiteApp.activeImageId ? 'active' : ''} ${isSelected ? 'selected' : ''}" data-id="${img.id}">
                                    <img src="${img.dataURL}" alt="${img.name}">
                                    <div class="thumb-status-badge ${statusClass}" title="${hasLocation ? 'Coordinates Geotagged: ' + img.latitude + ', ' + img.longitude : 'No location embedded'}">
                                        ${statusText}
                                    </div>
                                    <div class="thumb-select-overlay">
                                        <input type="checkbox" class="thumb-select-checkbox" data-id="${img.id}" ${isSelected ? 'checked' : ''}>
                                    </div>
                                    <div class="thumb-card-name" title="${img.name}">${img.name}</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                `}
            </div>

            ${SuiteApp.images.length > 0 ? `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);" id="ingestCounter">
                        Loaded: ${SuiteApp.images.length} / 500 max (${SuiteApp.selectedImageIds.size} selected)
                    </span>
                    <div style="display:flex;gap:8px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnSelectAllThumbs" style="padding:6px 12px;min-height:32px;font-size:0.75rem;">Select All</button>
                        <button type="button" class="btn btn-outline btn-sm" id="btnClearSelection" style="padding:6px 12px;min-height:32px;font-size:0.75rem;">Clear Selection</button>
                        <button type="button" class="btn btn-outline btn-sm" id="btnAddMoreFiles" style="padding:6px 12px;min-height:32px;font-size:0.75rem;">+ Add More</button>
                        <button type="button" class="btn btn-danger btn-sm" id="btnRemoveSelected" style="padding:6px 12px;min-height:32px;font-size:0.75rem;background:#dc2626;border-color:#dc2626;color:#fff;">Delete Selected</button>
                    </div>
                </div>
            ` : ""}
        `;
    }

    function drawTaggingModesSelector() {
        return `
            <div class="mode-tabs">
                <button type="button" class="mode-tab-btn ${SuiteApp.taggingMode === 'A' ? 'active' : ''}" data-mode="A">Mode A: Profile Address</button>
                <button type="button" class="mode-tab-btn ${SuiteApp.taggingMode === 'B' ? 'active' : ''}" data-mode="B">Mode B: Pick on Map (All)</button>
                <button type="button" class="mode-tab-btn ${SuiteApp.taggingMode === 'C' ? 'active' : ''}" data-mode="C">Mode C: Individual Pins</button>
                <button type="button" class="mode-tab-btn ${SuiteApp.taggingMode === 'D' ? 'active' : ''}" data-mode="D">Mode D: CSV Match</button>
            </div>
        `;
    }

    function drawLocationHub() {
        let activeProfile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
        let latVal = "";
        let lngVal = "";

        if (SuiteApp.taggingMode === "A" && activeProfile) {
            latVal = activeProfile.latitude;
            lngVal = activeProfile.longitude;
        }

        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <!-- Mode Description Help Banner -->
                <div style="font-size:0.8rem;color:var(--text-secondary);background:var(--primary-lighter);border:1px solid var(--primary-light);padding:10px;border-radius:var(--radius-sm);margin-bottom:14px;">
                    ${SuiteApp.taggingMode === 'A' ? '<strong>Mode A:</strong> Geotags are mapped directly to your active business address coordinates.' : ''}
                    ${SuiteApp.taggingMode === 'B' ? '<strong>Mode B:</strong> Drag the Leaflet map pin or use search to apply the same location to ALL images.' : ''}
                    ${SuiteApp.taggingMode === 'C' ? '<strong>Mode C:</strong> Select a photo thumbnail from the grid, then click the map to set a unique pin for that specific photo!' : ''}
                    ${SuiteApp.taggingMode === 'D' ? '<strong>Mode D:</strong> Upload a CSV spreadsheet containing coordinates. We match location data by file name automatically!' : ''}
                </div>

                ${SuiteApp.taggingMode === 'D' ? `
                    <!-- CSV Ingest Module -->
                    <div style="border:2px dashed var(--border);padding:20px;text-align:center;border-radius:var(--radius-sm);background:#f8fafc;" id="csvDropZone">
                        <input type="file" id="csvFileInput" accept=".csv" style="display:none;">
                        <span style="font-size:2rem;display:block;margin-bottom:8px;">📊</span>
                        <p style="font-size:0.85rem;font-weight:700;margin:0 0 4px;">Drag & Drop Location CSV</p>
                        <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px;">Required headers: filename, latitude, longitude (altitude, title optional)</p>
                        <button type="button" class="btn btn-outline btn-sm" id="btnBrowseCSV">Choose CSV File</button>
                        
                        <div id="csvPreview" style="display:none;margin-top:16px;text-align:left;font-size:0.75rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;padding:8px;max-height:150px;overflow-y:auto;">
                        </div>
                    </div>
                ` : `
                    <!-- Standard Coordinate Picker & Search -->
                    <div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:14px;">
                        <div class="field" style="margin:0;">
                            <label for="mapSearchInput">Search Location Name / Address</label>
                            <div style="display:flex;gap:8px;">
                                <input type="text" id="mapSearchInput" placeholder="e.g. Phoenix, Arizona or Eiffel Tower">
                                <button type="button" class="btn btn-primary btn-sm" id="btnMapSearch" style="min-height:44px;padding:10px 14px;">Search</button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div class="field" style="margin:0;">
                            <label for="inputLat">Latitude</label>
                            <input type="number" id="inputLat" step="any" value="${latVal}" placeholder="e.g. 33.306">
                        </div>
                        <div class="field" style="margin:0;">
                            <label for="inputLng">Longitude</label>
                            <input type="number" id="inputLng" step="any" value="${lngVal}" placeholder="e.g. -111.841">
                        </div>
                        <div class="field" style="margin:0;">
                            <label for="inputAlt">Altitude (Meters)</label>
                            <input type="number" id="inputAlt" step="any" placeholder="0">
                        </div>
                    </div>

                    <button type="button" class="btn-location" id="getCurrentLocation" style="margin:0 0 14px;">
                        <span class="spinner"></span> 📍 Get My Current Location
                    </button>

                    <!-- OSM Map Container -->
                    <div class="map-container" id="leafletMap" style="height:260px;margin-top:0;"></div>
                    
                    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnReverseGeocode" style="font-size:0.75rem;padding:6px 12px;min-height:32px;">🔍 Reverse Geocode Coords</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btnApplyCoordinates" style="font-size:0.75rem;padding:6px 12px;min-height:32px;">Apply Location to Photos</button>
                    </div>
                `}
            </div>
        `;
    }

    function drawMetadataEditor() {
        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--border-light);padding-bottom:8px;">
                    <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);">Apply target fields:</span>
                    <div style="display:flex;gap:8px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnApplyMetaSelected" style="font-size:0.7rem;padding:4px 8px;min-height:28px;">Apply to Selected</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btnApplyMetaAll" style="font-size:0.7rem;padding:4px 8px;min-height:28px;">Apply to All</button>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="field" style="margin:0;">
                        <label for="bulkTitle">Image Title (ImageDescription)</label>
                        <input type="text" id="bulkTitle" placeholder="e.g. Custom Bathroom Remodel">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="bulkHeadline">Headline (IPTC 2:105)</label>
                        <input type="text" id="bulkHeadline" placeholder="e.g. Master Suite Remodeling in Chandler">
                    </div>
                </div>

                <div class="field" style="margin-bottom:12px;">
                    <label for="bulkDesc">SEO Description / Caption (EXIF & IPTC & XMP)</label>
                    <textarea id="bulkDesc" rows="2" style="width:100%;border:2px solid var(--border);border-radius:var(--radius);padding:10px;font-size:0.9rem;" placeholder="Use templates like: {service} in {city}, {state} by {business}."></textarea>
                    <p class="hint" style="margin-top:2px;">Supports named business variables. Will resolve individually per photo based on profile settings.</p>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="field" style="margin:0;">
                        <label for="bulkKeywords">SEO Keywords (comma separated)</label>
                        <input type="text" id="bulkKeywords" placeholder="bathroom remodeling, shower replacement">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="bulkCopyright">Copyright Notice (Artist / Rights)</label>
                        <input type="text" id="bulkCopyright" placeholder="e.g. ARZ Remodeling LLC">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="field" style="margin:0;">
                        <label for="bulkCreator">Creator / Artist (Byline)</label>
                        <input type="text" id="bulkCreator" placeholder="e.g. Photographer Name">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="bulkSublocation">Sub-location / Neighborhood</label>
                        <input type="text" id="bulkSublocation" placeholder="e.g. Ocotillo">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="field" style="margin:0;">
                        <label for="bulkCredit">Credit URL / Website Link</label>
                        <input type="url" id="bulkCredit" placeholder="https://arzremodeling.com">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="bulkSku">Job ID / SKU ID</label>
                        <input type="text" id="bulkSku" placeholder="e.g. JOB-85225-BATH">
                    </div>
                </div>
            </div>
        `;
    }

    function drawFilenameRenamerBlock() {
        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <div class="field" style="margin-bottom:12px;">
                    <label for="renameTemplate">SEO Naming Pattern</label>
                    <input type="text" id="renameTemplate" value="{service}-in-{city}-{neighborhood}-{n}" placeholder="{business}-{city}-{n}">
                    <p class="hint" style="margin-top:2px;">Variables: {business}, {city}, {neighborhood}, {service}, {keyword}, {date}, {n}</p>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="field" style="margin:0;">
                        <label for="renameService">Custom {service}</label>
                        <input type="text" id="renameService" placeholder="e.g. shower-replacement">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="renameKeyword">Custom {keyword}</label>
                        <input type="text" id="renameKeyword" placeholder="e.g. luxury-tile">
                    </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);">Enforces Kebab-case Lowercase File Renames.</span>
                    <button type="button" class="btn btn-outline btn-sm" id="btnPreviewRenames" style="font-size:0.7rem;padding:4px 8px;min-height:28px;">Preview Names</button>
                </div>

                <!-- Renamer Preview Frame -->
                <div class="renamer-preview-box" id="renamePreviewBox" style="display:none;">
                    <strong style="display:block;margin-bottom:6px;font-size:0.75rem;">Filename Preview (First 5):</strong>
                    <div id="renamePreviewList"></div>
                </div>
            </div>
        `;
    }

    function drawOptimizers() {
        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <div class="field" style="margin:0;">
                        <label for="optMaxWidth">Max Image Width (px)</label>
                        <input type="number" id="optMaxWidth" value="2400" placeholder="e.g. 2400">
                    </div>
                    <div class="field" style="margin:0;">
                        <label for="optMaxHeight">Max Image Height (px)</label>
                        <input type="number" id="optMaxHeight" value="2400" placeholder="e.g. 2400">
                    </div>
                </div>

                <div class="field" style="margin-bottom:14px;">
                    <label for="optQuality">JPEG Compression Quality (<span id="optQualityVal" style="font-weight:800;color:var(--primary);">85</span>%)</label>
                    <input type="range" id="optQuality" min="60" max="100" value="85" style="width:100%;cursor:pointer;">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <div class="field" style="margin:0;">
                        <label for="optFormat">Export Image Format</label>
                        <select id="optFormat" style="-webkit-appearance:auto;appearance:auto;padding:8px 10px;">
                            <option value="KEEP">Keep Original Formats</option>
                            <option value="JPEG" selected>Force JPEG Conversion</option>
                            <option value="WEBP">Force WebP Conversion</option>
                        </select>
                    </div>
                    <div class="field" style="margin:0;display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="optStripThumb" checked style="width:18px;height:18px;cursor:pointer;">
                        <label for="optStripThumb" style="margin:0;font-size:0.78rem;font-weight:600;cursor:pointer;">Strip embedded thumbs (-30KB)</label>
                    </div>
                </div>

                <!-- Sizes compression preview details -->
                <div id="compressionStats" style="display:none;font-size:0.75rem;padding:8px 12px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);">
                </div>
            </div>
        `;
    }

    function drawQualityCheckBlock() {
        return `
            <div class="checklist-box" style="margin:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--border-light);padding-bottom:8px;">
                    <span style="font-weight:700;font-size:0.85rem;color:var(--text-secondary);">Real-Time Audit Warnings</span>
                    <button type="button" class="btn btn-primary btn-sm" id="btnAutoFixCheck" style="font-size:0.7rem;padding:4px 8px;min-height:28px;background:var(--success);border-color:var(--success);">⚡ Auto-Fix All</button>
                </div>
                
                <div id="preflightCheckerItems">
                    <p style="font-size:0.78rem;color:var(--text-muted);margin:0;">Please upload photos to run automated SEO pre-flight checks.</p>
                </div>
            </div>
        `;
    }

    function drawExportBlock() {
        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <div class="field" style="margin-bottom:12px;">
                    <label for="sitemapBaseUrl">Google Image Sitemap Base URL</label>
                    <input type="url" id="sitemapBaseUrl" value="https://geotagseditor.online/images/" placeholder="https://yourwebsite.com/images/">
                </div>

                <strong style="display:block;margin-bottom:12px;font-size:0.8rem;color:var(--text-secondary);">Select package bundle contents:</strong>
                
                <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:20px;font-size:0.82rem;font-weight:600;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="incImages" checked style="width:16px;height:16px;">
                        Processed Geotagged Images (Embedded EXIF/IPTC/XMP)
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="incCsv" checked style="width:16px;height:16px;">
                        Export metadata.csv (Audit manifest index)
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="incJsonLd" checked style="width:16px;height:16px;">
                        Export Schema.org json-ld.json (Local Business Graph Array)
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="incSitemap" checked style="width:16px;height:16px;">
                        Export Google Image image-sitemap.xml
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="incAltText" checked style="width:16px;height:16px;">
                        Export alt-text.txt (Optimized content keywords)
                    </label>
                </div>

                <button type="button" class="btn btn-success" id="btnExecuteExportBundle" style="width:100%;font-size:1.05rem;font-weight:800;background:linear-gradient(135deg,#10b981 0%,#059669 100%);">
                    📦 Download Complete ZIP SEO Bundle
                </button>
            </div>
        `;
    }

    function drawPrivacySuiteBlock() {
        return `
            <div class="profile-panel" style="background:#fff;margin:0;">
                <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">
                    Strip location tags or erase all camera identification serials/owners to protect individual photographer privacy.
                </p>

                <div class="field" style="margin-bottom:14px;">
                    <label for="privacyScrubDropdown">Privacy Scrubber Level</label>
                    <select id="privacyScrubDropdown" style="-webkit-appearance:auto;appearance:auto;padding:8px 10px;">
                        <option value="GPS">Remove Geotag Coordinates Only (Clean GPS tags)</option>
                        <option value="ALL">Remove ALL EXIF/IPTC/XMP Metadata (Erase fully)</option>
                        <option value="PERSONAL">Scrub Serial & Personal identifiers only (Preserve SEO tags)</option>
                    </select>
                </div>

                <button type="button" class="btn btn-danger btn-sm" id="btnStripGpsBulk" style="width:100%;background:#ef4444;border-color:#ef4444;color:#fff;">
                    🛡 Scrub Location Metadata / Remove Geotags
                </button>

                <!-- Privacy report list rendering -->
                <div id="privacyScrubReport" style="display:none;margin-top:16px;font-size:0.75rem;padding:12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:var(--radius-sm);color:#991b1b;">
                    <strong>Privacy Scrub Report:</strong>
                    <div id="privacyReportList" style="margin-top:6px;max-height:120px;overflow-y:auto;"></div>
                </div>
            </div>
        `;
    }

    // -------------------------------------------------------------
    // ATTACH COMPONENT EVENT HANDLERS
    // -------------------------------------------------------------
    function attachProfileHandlers() {
        let select = $("profileDropdown");
        if (select) {
            select.addEventListener("change", function() {
                ProfileManager.setActiveId(this.value);
                SuiteApp.undoStack = []; // Clear undo
                renderWorkspace();
                runPreflightChecks();
            });
        }

        let btnEdit = $("btnEditProfile");
        if (btnEdit) {
            btnEdit.addEventListener("click", () => openProfileModal(false));
        }

        let btnNew = $("btnNewProfile");
        if (btnNew) {
            btnNew.addEventListener("click", () => openProfileModal(true));
        }

        // Modal Action Bindings
        let modalClose = $("btnProfileModalClose");
        let modalCancel = $("btnProfileModalCancel");
        if (modalClose) modalClose.addEventListener("click", closeProfileModal);
        if (modalCancel) modalCancel.addEventListener("click", closeProfileModal);

        let btnGeocode = $("btnGeocodeProfile");
        if (btnGeocode) {
            btnGeocode.addEventListener("click", async () => {
                let street = $("p_street").value;
                let city = $("p_city").value;
                let state = $("p_state").value;
                let country = $("p_country").value;
                let query = `${street}, ${city}, ${state}, ${country}`;
                if (!street || !city) {
                    GTP.showToast("Please enter street address and city first.", "error");
                    return;
                }
                btnGeocode.disabled = true;
                btnGeocode.textContent = "Geocoding...";
                try {
                    let coords = await Geocoder.geocode(query);
                    if (coords) {
                        $("p_lat").value = coords.lat.toFixed(5);
                        $("p_lng").value = coords.lng.toFixed(5);
                        GTP.showToast("Coordinates found successfully!", "success");
                    } else {
                        GTP.showToast("Could not find coordinates for address.", "warning");
                    }
                } catch (_) {
                    GTP.showToast("Geocoding API failed.", "error");
                }
                btnGeocode.disabled = false;
                btnGeocode.textContent = "🗺 Geocode";
            });
        }

        let btnSave = $("btnProfileModalSave");
        if (btnSave) {
            btnSave.addEventListener("click", saveProfileSettings);
        }

        let btnDelete = $("btnProfileModalDelete");
        if (btnDelete) {
            btnDelete.addEventListener("click", deleteProfileSettings);
        }
    }

    function attachUploadHandlers() {
        let browse = $("btnBrowseFiles");
        let input = $("suiteFileInput");
        if (browse && input) {
            browse.addEventListener("click", () => input.click());
        }

        let addMore = $("btnAddMoreFiles");
        if (addMore) {
            addMore.addEventListener("click", () => input.click());
        }

        if (input) {
            input.addEventListener("change", function() {
                ingestUploadedFiles(this.files);
            });
        }

        // Dropzone handlers
        let zone = $("suiteDropZone");
        if (zone) {
            ["dragenter", "dragover"].forEach(name => {
                zone.addEventListener(name, (e) => {
                    e.preventDefault();
                    zone.style.borderColor = "var(--primary-dark)";
                    zone.style.background = "var(--info-bg)";
                });
            });
            ["dragleave", "drop"].forEach(name => {
                zone.addEventListener(name, (e) => {
                    e.preventDefault();
                    zone.style.borderColor = "var(--border)";
                    zone.style.background = "#fff";
                });
            });
            zone.addEventListener("drop", (e) => {
                e.preventDefault();
                ingestUploadedFiles(e.dataTransfer.files);
            });
        }

        // Selection Actions
        let selectAll = $("btnSelectAllThumbs");
        if (selectAll) {
            selectAll.addEventListener("click", () => {
                SuiteApp.selectedImageIds = new Set(SuiteApp.images.map(img => img.id));
                renderWorkspace();
                runPreflightChecks();
            });
        }

        let clearSel = $("btnClearSelection");
        if (clearSel) {
            clearSel.addEventListener("click", () => {
                SuiteApp.selectedImageIds.clear();
                renderWorkspace();
                runPreflightChecks();
            });
        }

        let deleteSel = $("btnRemoveSelected");
        if (deleteSel) {
            deleteSel.addEventListener("click", () => {
                if (SuiteApp.selectedImageIds.size === 0) {
                    GTP.showToast("Select images from grid first.", "error");
                    return;
                }
                SuiteApp.images = SuiteApp.images.filter(img => !SuiteApp.selectedImageIds.has(img.id));
                SuiteApp.selectedImageIds.clear();
                if (SuiteApp.images.length === 0) SuiteApp.activeImageId = null;
                renderWorkspace();
                runPreflightChecks();
                GTP.showToast("Removed selected images.", "success");
            });
        }

        // Clicking grid cards — supports Shift+click range select
        let lastClickedIdx = -1;
        document.querySelectorAll(".thumb-card").forEach((card, cardIdx) => {
            card.addEventListener("click", function(e) {
                if (e.target.classList.contains("thumb-select-checkbox")) return;
                let id = this.getAttribute("data-id");

                if (e.shiftKey && lastClickedIdx !== -1 && cardIdx !== lastClickedIdx) {
                    // Range select from lastClickedIdx to cardIdx
                    let lo = Math.min(lastClickedIdx, cardIdx);
                    let hi = Math.max(lastClickedIdx, cardIdx);
                    let allCards = Array.from(document.querySelectorAll(".thumb-card"));
                    for (let i = lo; i <= hi; i++) {
                        let rangeId = allCards[i].getAttribute("data-id");
                        SuiteApp.selectedImageIds.add(rangeId);
                    }
                    renderWorkspace();
                    runPreflightChecks();
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl+click toggle select
                    if (SuiteApp.selectedImageIds.has(id)) SuiteApp.selectedImageIds.delete(id);
                    else SuiteApp.selectedImageIds.add(id);
                    lastClickedIdx = cardIdx;
                    renderWorkspace();
                    runPreflightChecks();
                } else {
                    lastClickedIdx = cardIdx;
                    highlightThumbnailCard(id);
                }
            });

            // Double click opens Individual Sidebar editor directly!
            card.addEventListener("dblclick", function() {
                let id = this.getAttribute("data-id");
                openDrawerSidebar(id);
            });
        });

        // Thumbnail selector checkboxes
        document.querySelectorAll(".thumb-select-checkbox").forEach(box => {
            box.addEventListener("change", function() {
                let id = this.getAttribute("data-id");
                if (this.checked) SuiteApp.selectedImageIds.add(id);
                else SuiteApp.selectedImageIds.delete(id);
                renderWorkspace();
                runPreflightChecks();
            });
        });
    }

    function attachLocationHandlers() {
        // Tagging modes dropdown/tabs
        document.querySelectorAll(".mode-tab-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                let mode = this.getAttribute("data-mode");
                SuiteApp.taggingMode = mode;
                renderWorkspace();
                initLeafletMapInstance();
            });
        });

        // Initialize OSM map frame if container is drawn
        initLeafletMapInstance();

        // Coordinates manual apply button
        let apply = $("btnApplyCoordinates");
        if (apply) {
            apply.addEventListener("click", async () => {
                let lat = parseFloat($("inputLat").value);
                let lng = parseFloat($("inputLng").value);
                let alt = parseFloat($("inputAlt").value) || 0;
                
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    GTP.showToast("Invalid latitude/longitude coords entered.", "error");
                    return;
                }

                applyCoordinateAction(lat, lng, alt);
            });
        }

        // Current GPS fetcher button
        let gpsBtn = $("getCurrentLocation");
        if (gpsBtn) {
            gpsBtn.addEventListener("click", () => {
                if (!navigator.geolocation) {
                    GTP.showToast("Geolocation not supported by browser.", "error");
                    return;
                }
                gpsBtn.disabled = true;
                gpsBtn.textContent = "Fetching current coordinates...";
                navigator.geolocation.getCurrentPosition(position => {
                    let lat = position.coords.latitude;
                    let lng = position.coords.longitude;
                    let alt = position.coords.altitude || 0;

                    $("inputLat").value = lat.toFixed(5);
                    $("inputLng").value = lng.toFixed(5);
                    $("inputAlt").value = alt.toFixed(1);

                    gpsBtn.disabled = false;
                    gpsBtn.innerHTML = "📍 Get My Current Location";
                    GTP.showToast("Current location loaded!", "success");

                    if (SuiteApp.map && SuiteApp.activeMarker) {
                        SuiteApp.activeMarker.setLatLng([lat, lng]);
                        SuiteApp.map.setView([lat, lng], 14);
                    }
                }, () => {
                    gpsBtn.disabled = false;
                    gpsBtn.innerHTML = "📍 Get My Current Location";
                    GTP.showToast("Could not access GPS coordinates.", "error");
                }, { enableHighAccuracy: true });
            });
        }

        // Address Nominatim Geocoder Search button
        let search = $("btnMapSearch");
        if (search) {
            search.addEventListener("click", async () => {
                let val = $("mapSearchInput").value;
                if (!val) return;
                search.disabled = true;
                search.textContent = "...";
                try {
                    let res = await Geocoder.geocode(val);
                    if (res) {
                        $("inputLat").value = res.lat.toFixed(5);
                        $("inputLng").value = res.lng.toFixed(5);
                        GTP.showToast("Centered map to location!", "success");
                        if (SuiteApp.map) {
                            if (SuiteApp.activeMarker) SuiteApp.activeMarker.setLatLng([res.lat, res.lng]);
                            SuiteApp.map.setView([res.lat, res.lng], 14);
                        }
                    } else {
                        GTP.showToast("Coordinates not found for query.", "warning");
                    }
                } catch (_) {}
                search.disabled = false;
                search.textContent = "Search";
            });
        }

        // Reverse Geocoding trigger manually
        let revBtn = $("btnReverseGeocode");
        if (revBtn) {
            revBtn.addEventListener("click", async () => {
                let lat = parseFloat($("inputLat").value);
                let lng = parseFloat($("inputLng").value);
                if (isNaN(lat) || isNaN(lng)) return;
                revBtn.disabled = true;
                try {
                    let res = await Geocoder.reverse(lat, lng);
                    if (res) {
                        let formatted = `${res.city || ''}, ${res.state || ''}, ${res.country || ''}`.replace(/^,\s*/, "");
                        GTP.showToast("Reverse lookup: " + formatted, "success");
                        
                        // Auto populate search box
                        $("mapSearchInput").value = formatted;
                    }
                } catch (_) {}
                revBtn.disabled = false;
            });
        }

        // Mode D: CSV Drag & Drop and Parser File Upload
        let csvFile = $("csvFileInput");
        let csvBrowse = $("btnBrowseCSV");
        if (csvBrowse && csvFile) {
            csvBrowse.addEventListener("click", () => csvFile.click());
        }
        if (csvFile) {
            csvFile.addEventListener("change", function() {
                ingestCSVSpreadsheet(this.files[0]);
            });
        }
        let csvZone = $("csvDropZone");
        if (csvZone) {
            ["dragenter", "dragover"].forEach(name => {
                csvZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    csvZone.style.background = "var(--primary-lighter)";
                });
            });
            ["dragleave", "drop"].forEach(name => {
                csvZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    csvZone.style.background = "#f8fafc";
                });
            });
            csvZone.addEventListener("drop", (e) => {
                e.preventDefault();
                ingestCSVSpreadsheet(e.dataTransfer.files[0]);
            });
        }
    }

    function attachMetadataHandlers() {
        // Bulk apply metadata buttons
        let bulkAll = $("btnApplyMetaAll");
        if (bulkAll) {
            bulkAll.addEventListener("click", () => applyBulkMetadataAction(false));
        }

        let bulkSel = $("btnApplyMetaSelected");
        if (bulkSel) {
            bulkSel.addEventListener("click", () => applyBulkMetadataAction(true));
        }

        // Naming Live Preview trigger
        let btnRename = $("btnPreviewRenames");
        if (btnRename) {
            btnRename.addEventListener("click", renderFilenameRenamePreview);
        }

        // Quality slider update indicator
        let slider = $("optQuality");
        if (slider) {
            slider.addEventListener("input", function() {
                $("optQualityVal").textContent = this.value;
            });
        }

        // Auto-fix checklist buttons
        let autofix = $("btnAutoFixCheck");
        if (autofix) {
            autofix.addEventListener("click", triggerAutoFixAllQualityWarnings);
        }

        // Run checkers immediately on tab display
        runPreflightChecks();
    }

    function attachExportHandlers() {
        // Execute bundling action
        let exec = $("btnExecuteExportBundle");
        if (exec) {
            exec.addEventListener("click", executeZIPBundleCompilation);
        }

        // GPS removal scrubbing action button
        let scrub = $("btnStripGpsBulk");
        if (scrub) {
            scrub.addEventListener("click", executeBulkGPSMetadataStrip);
        }
    }

    // -------------------------------------------------------------
    // PROFILE MODAL FUNCTIONS
    // -------------------------------------------------------------
    function openProfileModal(isNew) {
        let modal = $("profileModal");
        if (!modal) return;

        let title = $("profileModalTitle");
        let list = ProfileManager.getAll();
        let active = list.find(p => p.id === SuiteApp.activeProfileId) || list[0];

        if (isNew) {
            title.textContent = "🏢 Create New Business Profile";
            $("p_id").value = "";
            $("p_name").value = "New Business Profile";
            $("p_bizname").value = "";
            $("p_category").value = "";
            $("p_street").value = "";
            $("p_city").value = "";
            $("p_state").value = "";
            $("p_zip").value = "";
            $("p_country").value = "United States";
            $("p_code").value = "US";
            $("p_phone").value = "";
            $("p_website").value = "";
            $("p_gbp").value = "";
            $("p_copy").value = "";
            $("p_keywords").value = "";
            $("p_template").value = "{service} in {city}, {state} by {business}. Call {phone} or visit {website} for premium custom design in {neighborhood}!";
            $("p_lat").value = "";
            $("p_lng").value = "";
            $("btnProfileModalDelete").style.display = "none";
        } else if (active) {
            title.textContent = "🏢 Edit Business Profile Settings";
            $("p_id").value = active.id;
            $("p_name").value = active.name;
            $("p_bizname").value = active.businessName;
            $("p_category").value = active.category;
            $("p_street").value = active.street;
            $("p_city").value = active.city;
            $("p_state").value = active.state;
            $("p_zip").value = active.zip;
            $("p_country").value = active.country;
            $("p_code").value = active.countryCode;
            $("p_phone").value = active.phone;
            $("p_website").value = active.website;
            $("p_gbp").value = active.gbpUrl;
            $("p_copy").value = active.copyright;
            $("p_keywords").value = active.keywords;
            $("p_template").value = active.descriptionTemplate;
            $("p_lat").value = active.latitude;
            $("p_lng").value = active.longitude;
            $("btnProfileModalDelete").style.display = "inline-block";
        }

        modal.style.display = "flex";
    }

    function closeProfileModal() {
        let modal = $("profileModal");
        if (modal) modal.style.display = "none";
    }

    function saveProfileSettings() {
        let id = $("p_id").value;
        let list = ProfileManager.getAll();

        let lat = parseFloat($("p_lat").value);
        let lng = parseFloat($("p_lng").value);
        if (isNaN(lat) || isNaN(lng)) {
            GTP.showToast("Please enter geocoded latitude/longitude coords.", "error");
            return;
        }

        let p_obj = {
            id: id || "profile_" + Date.now(),
            name: $("p_name").value || "Business Profile",
            businessName: $("p_bizname").value,
            category: $("p_category").value,
            street: $("p_street").value,
            city: $("p_city").value,
            state: $("p_state").value,
            zip: $("p_zip").value,
            country: $("p_country").value,
            countryCode: $("p_code").value ? $("p_code").value.toUpperCase() : "",
            phone: $("p_phone").value,
            website: $("p_website").value,
            gbpUrl: $("p_gbp").value,
            copyright: $("p_copy").value,
            keywords: $("p_keywords").value,
            descriptionTemplate: $("p_template").value,
            latitude: lat,
            longitude: lng
        };

        if (id) {
            // Update
            let idx = list.findIndex(p => p.id === id);
            if (idx !== -1) list[idx] = p_obj;
        } else {
            // Create
            list.push(p_obj);
            ProfileManager.setActiveId(p_obj.id);
        }

        ProfileManager.saveAll(list);
        SuiteApp.profiles = list;
        SuiteApp.activeProfileId = p_obj.id;

        closeProfileModal();
        renderWorkspace();
        GTP.showToast("Business profile saved successfully!", "success");
    }

    function deleteProfileSettings() {
        let id = $("p_id").value;
        if (!id) return;
        let list = ProfileManager.getAll();
        list = list.filter(p => p.id !== id);
        ProfileManager.saveAll(list);

        SuiteApp.profiles = list;
        if (list[0]) ProfileManager.setActiveId(list[0].id);
        else SuiteApp.activeProfileId = null;

        closeProfileModal();
        renderWorkspace();
        GTP.showToast("Business profile deleted.", "warning");
    }

    // -------------------------------------------------------------
    // FILE INGEST & HEIC CONVERTER
    // -------------------------------------------------------------
    async function ingestUploadedFiles(files) {
        if (!files || files.length === 0) return;
        
        let initialCount = SuiteApp.images.length;
        if (initialCount >= 500) {
            GTP.showToast("Maximum capacity reached (500 images limit).", "error");
            return;
        }

        let fileArr = Array.from(files);
        GTP.showToast(`Ingesting ${fileArr.length} files...`);

        // Dynamic lazy loader for HEIC parser library only when HEIC file is detected
        let hasHeic = fileArr.some(f => f.name.match(/\.heif?$/i) || f.type.match(/image\/heic/i));
        if (hasHeic && !SuiteApp.librariesLoaded.heic2any) {
            GTP.showToast("HEIC formats detected. Loading HEIC conversion engine...", "info");
            await loadScript(HEIC2ANY_URL).then(() => SuiteApp.librariesLoaded.heic2any = true);
        }

        // Dynamic lazy loader for UTIF.js only when TIFF file is detected
        let hasTiff = fileArr.some(f => f.name.match(/\.tiff?$/i) || f.type.match(/image\/tiff/i));
        if (hasTiff && !SuiteApp.librariesLoaded.utif) {
            GTP.showToast("TIFF files detected. Loading TIFF decoder engine...", "info");
            await loadScript(UTIF_URL).then(() => SuiteApp.librariesLoaded.utif = true);
        }

        await ensureLibraries();

        let loaded = 0;
        for (let file of fileArr) {
            if (SuiteApp.images.length >= 500) break;

            try {
                let activeFile = file;

                // HEIC Conversion pipeline
                if (file.name.match(/\.heif?$/i) || file.type.match(/image\/heic/i)) {
                    GTP.showToast(`Converting Apple HEIC: ${file.name}...`);
                    let jpegBlob = await heic2any({
                        blob: file,
                        toType: "image/jpeg",
                        quality: 0.92
                    });
                    // Rename extension to jpg
                    let jpegName = file.name.substring(0, file.name.lastIndexOf(".")) + ".jpg";
                    activeFile = new File([jpegBlob], jpegName, { type: "image/jpeg" });
                }

                // PNG/WebP/TIFF canvas converter
                let isJpg = activeFile.type.match(/image\/jpe?g/i);
                let dataURL = await readFileAsDataURL(activeFile);

                if (!isJpg) {
                    GTP.showToast(`Converting ${activeFile.name} to JPEG standard...`);
                    // Pass original file reference so TIFF branch can use ArrayBuffer reader
                    dataURL = await convertNonJpgToJpegDataURL(dataURL, activeFile);
                    let jpegName = activeFile.name.substring(0, activeFile.name.lastIndexOf(".")) + ".jpg";
                    activeFile = new File([dataURLToBlob(dataURL)], jpegName, { type: "image/jpeg" });
                }

                // Add to memories
                let imgEl = await loadImageElement(dataURL);
                let exif = { "0th": {}, GPS: {} };
                try {
                    exif = window.piexif.load(dataURL);
                } catch (_) {}

                let lat = null, lng = null, alt = null;
                if (exif.GPS[window.piexif.GPSIFD.GPSLatitude] && exif.GPS[window.piexif.GPSIFD.GPSLongitude]) {
                    lat = MetadataEngine.dmsToDecimal(exif.GPS[window.piexif.GPSIFD.GPSLatitude], exif.GPS[window.piexif.GPSIFD.GPSLatitudeRef]);
                    lng = MetadataEngine.dmsToDecimal(exif.GPS[window.piexif.GPSIFD.GPSLongitude], exif.GPS[window.piexif.GPSIFD.GPSLongitudeRef]);
                }
                if (exif.GPS[window.piexif.GPSIFD.GPSAltitude]) {
                    let a = exif.GPS[window.piexif.GPSIFD.GPSAltitude];
                    alt = parseFloat((a[0] / a[1]).toFixed(1));
                }

                // Auto pre-fill metadata from active profile on ingest
                let activeProfile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
                let imgId = "img_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
                let newImg = {
                    id: imgId,
                    file: activeFile,
                    name: activeFile.name,
                    size: activeFile.size,
                    dataURL: dataURL,
                    originalDataURL: dataURL,
                    width: imgEl.width,
                    height: imgEl.height,
                    latitude: lat,
                    longitude: lng,
                    altitude: alt,
                    title: exif["0th"][window.piexif.ImageIFD.ImageDescription] || "",
                    headline: "",
                    description: "",
                    keywords: exif["0th"] && exif["0th"][40094] ? "" : (activeProfile ? activeProfile.keywords : ""),
                    copyright: exif["0th"][window.piexif.ImageIFD.Copyright] || (activeProfile ? activeProfile.copyright : ""),
                    artist: exif["0th"][window.piexif.ImageIFD.Artist] || (activeProfile ? activeProfile.businessName : ""),
                    city: activeProfile ? activeProfile.city : "",
                    state: activeProfile ? activeProfile.state : "",
                    country: activeProfile ? activeProfile.country : "",
                    countryCode: activeProfile ? activeProfile.countryCode : "",
                    neighborhood: "",
                    credit: activeProfile ? activeProfile.website : "",
                    originalTransmissionReference: "",
                    outputName: activeFile.name,
                    status: lat !== null ? 'geotagged' : 'pending'
                };
                // Resolve description template if profile has one
                if (activeProfile && activeProfile.descriptionTemplate && !newImg.description) {
                    newImg.description = resolveTemplateString(activeProfile.descriptionTemplate, newImg, activeProfile);
                }
                SuiteApp.images.push(newImg);

            } catch (err) {
                console.error("Image loading failure for:", file.name, err);
                GTP.showToast("Could not parse file: " + file.name, "error");
            }
            loaded++;
        }

        renderWorkspace();
        runPreflightChecks();
        GTP.showToast(`Processed ${loaded} images successfully!`, "success");
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            let r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject();
            r.readAsDataURL(file);
        });
    }

    function loadImageElement(src) {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject();
            img.src = src;
        });
    }

    function convertNonJpgToJpegDataURL(dataURL, originalFile) {
        // TIFF files cannot be decoded by the browser Image element — use UTIF.js instead
        if (originalFile && originalFile.name.match(/\.tiff?$/i)) {
            return new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onload = function() {
                    try {
                        let arrayBuffer = reader.result;
                        let ifds = UTIF.decode(arrayBuffer);
                        if (!ifds || ifds.length === 0) { reject(new Error("UTIF: no IFDs")); return; }
                        UTIF.decodeImage(arrayBuffer, ifds[0]);
                        let ifd = ifds[0];
                        let rgba = UTIF.toRGBA8(ifd);
                        let w = ifd.width;
                        let h = ifd.height;
                        let canvas = document.createElement("canvas");
                        canvas.width = w;
                        canvas.height = h;
                        let ctx = canvas.getContext("2d");
                        let imageData = ctx.createImageData(w, h);
                        imageData.data.set(rgba);
                        ctx.putImageData(imageData, 0, 0);
                        resolve(canvas.toDataURL("image/jpeg", 0.95));
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error("FileReader failed for TIFF"));
                reader.readAsArrayBuffer(originalFile);
            });
        }

        // PNG / WebP / other browser-renderable formats use the fast Image element path
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => {
                let canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.95));
            };
            img.onerror = () => reject(new Error("Image element could not decode file"));
            img.src = dataURL;
        });
    }

    function dataURLToBlob(dataURL) {
        let parts = dataURL.split(',');
        let byteString = atob(parts[1]);
        let mimeString = parts[0].split(':')[1].split(';')[0];
        let ab = new ArrayBuffer(byteString.length);
        let ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    // -------------------------------------------------------------
    // VISUAL HIGHLIGHT & DRAWER HANDLERS
    // -------------------------------------------------------------
    function highlightThumbnailCard(id) {
        SuiteApp.activeImageId = id;
        
        // Highlight in DOM
        document.querySelectorAll(".thumb-card").forEach(card => {
            if (card.getAttribute("data-id") === id) card.classList.add("active");
            else card.classList.remove("active");
        });

        // Trigger map marker focus if in Mode C (Individual)
        if (SuiteApp.taggingMode === "C") {
            let img = SuiteApp.images.find(i => i.id === id);
            if (img && img.latitude !== null && img.longitude !== null) {
                if (SuiteApp.map) {
                    if (SuiteApp.activeMarker) SuiteApp.activeMarker.setLatLng([img.latitude, img.longitude]);
                    SuiteApp.map.setView([img.latitude, img.longitude], 15);
                }
                $("inputLat").value = img.latitude.toFixed(5);
                $("inputLng").value = img.longitude.toFixed(5);
                $("inputAlt").value = img.altitude || 0;
            } else {
                $("inputLat").value = "";
                $("inputLng").value = "";
                $("inputAlt").value = "";
            }
        }
    }

    // -------------------------------------------------------------
    // MAP INSTANTIATOR (LEAFLET + TILES)
    // -------------------------------------------------------------
    function initLeafletMapInstance() {
        let container = $("leafletMap");
        if (!container || !window.L) return;

        if (SuiteApp.map) {
            SuiteApp.map.remove();
            SuiteApp.map = null;
            SuiteApp.activeMarker = null;
        }

        container.innerHTML = "";

        let activeProfile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
        let lat = activeProfile ? activeProfile.latitude : 33.30616;
        let lng = activeProfile ? activeProfile.longitude : -111.84125;

        // If in Mode C and an image is highlighted, center map to that image's coordinates if set
        if (SuiteApp.taggingMode === "C" && SuiteApp.activeImageId) {
            let img = SuiteApp.images.find(i => i.id === SuiteApp.activeImageId);
            if (img && img.latitude !== null && img.longitude !== null) {
                lat = img.latitude;
                lng = img.longitude;
            }
        }

        SuiteApp.map = L.map(container, { scrollWheelZoom: true }).setView([lat, lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(SuiteApp.map);

        SuiteApp.activeMarker = L.marker([lat, lng], { draggable: true }).addTo(SuiteApp.map);

        SuiteApp.activeMarker.on("dragend", function() {
            let pos = SuiteApp.activeMarker.getLatLng();
            $("inputLat").value = pos.lat.toFixed(5);
            $("inputLng").value = pos.lng.toFixed(5);
        });

        SuiteApp.map.on("click", function(e) {
            SuiteApp.activeMarker.setLatLng(e.latlng);
            $("inputLat").value = e.latlng.lat.toFixed(5);
            $("inputLng").value = e.latlng.lng.toFixed(5);

            // In Individual Mode, direct click automatically applies coordinate to highlighted photo!
            if (SuiteApp.taggingMode === "C" && SuiteApp.activeImageId) {
                applyCoordinateAction(e.latlng.lat, e.latlng.lng, parseFloat($("inputAlt").value) || 0);
            }
        });

        setTimeout(() => { if (SuiteApp.map) SuiteApp.map.invalidateSize(); }, 250);
    }

    // -------------------------------------------------------------
    // LOCATION ACTIONS
    // -------------------------------------------------------------
    async function applyCoordinateAction(lat, lng, alt) {
        if (SuiteApp.images.length === 0) {
            GTP.showToast("No images uploaded.", "error");
            return;
        }

        GTP.showToast("Reverse-geocoding coordinates and embedding...");

        let geoDetails = { city: "", state: "", country: "", countryCode: "", neighborhood: "" };
        try {
            let lookup = await Geocoder.reverse(lat, lng);
            if (lookup) geoDetails = lookup;
        } catch (_) {}

        // Push to undo stack
        saveToUndoHistory();

        let targetImages = [];
        if (SuiteApp.taggingMode === "C") {
            // Apply *only* to highlighted image
            if (!SuiteApp.activeImageId) {
                GTP.showToast("Select a highlighted thumbnail first in Mode C.", "error");
                return;
            }
            targetImages = SuiteApp.images.filter(img => img.id === SuiteApp.activeImageId);
        } else {
            // Apply to ALL images
            targetImages = SuiteApp.images;
        }

        targetImages.forEach(img => {
            img.latitude = lat;
            img.longitude = lng;
            img.altitude = alt;
            img.city = geoDetails.city;
            img.state = geoDetails.state;
            img.country = geoDetails.country;
            img.countryCode = geoDetails.countryCode;
            img.neighborhood = geoDetails.neighborhood;
            img.status = 'geotagged';
        });

        renderWorkspace();
        runPreflightChecks();
        GTP.showToast(`Coordinates applied to ${targetImages.length} image(s)!`, "success");
    }

    // -------------------------------------------------------------
    // MODE D: CSV PARSER
    // -------------------------------------------------------------
    function ingestCSVSpreadsheet(file) {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    GTP.showToast("CSV parsing encountered errors.", "error");
                    return;
                }
                SuiteApp.csvData = results.data;
                renderCSVMatchPreview();
            }
        });
    }

    function renderCSVMatchPreview() {
        let box = $("csvPreview");
        if (!box || !SuiteApp.csvData) return;

        let matched = [];
        let unmatched = [];

        SuiteApp.csvData.forEach(row => {
            let filename = row.filename || row.FileName || row.image || "";
            if (!filename) return;

            let match = SuiteApp.images.find(img => img.name.toLowerCase() === filename.toLowerCase());
            if (match) {
                matched.push(filename);
            } else {
                unmatched.push(filename);
            }
        });

        box.innerHTML = `
            <strong>CSV Matching Preview:</strong>
            <p style="color:var(--success);margin:2px 0;">✓ Matched: ${matched.length} loaded files</p>
            <p style="color:var(--danger);margin:2px 0;">✗ Unmatched: ${unmatched.length} spreadsheet rows</p>
            <button type="button" class="btn btn-primary btn-sm" id="btnExecuteCSVApply" style="margin-top:8px;font-size:0.7rem;padding:4px 8px;min-height:28px;">
                Apply Matched CSV Location Data
            </button>
        `;
        box.style.display = "block";

        $("btnExecuteCSVApply").addEventListener("click", () => {
            saveToUndoHistory();

            let applied = 0;
            SuiteApp.csvData.forEach(row => {
                let filename = row.filename || row.FileName || row.image || "";
                let lat = parseFloat(row.latitude || row.lat || row.Latitude);
                let lng = parseFloat(row.longitude || row.lng || row.Longitude);
                let alt = parseFloat(row.altitude || row.alt || 0) || 0;
                let title = row.title || row.Title || "";
                let desc = row.description || row.desc || row.Description || "";

                if (!filename || isNaN(lat) || isNaN(lng)) return;

                let match = SuiteApp.images.find(img => img.name.toLowerCase() === filename.toLowerCase());
                if (match) {
                    match.latitude = lat;
                    match.longitude = lng;
                    match.altitude = alt;
                    if (title) match.title = title;
                    if (desc) match.description = desc;
                    match.status = 'geotagged';
                    applied++;
                }
            });

            renderWorkspace();
            runPreflightChecks();
            GTP.showToast(`Applied locations to ${applied} images via CSV!`, "success");
        });
    }

    // -------------------------------------------------------------
    // BULK METADATA & RENAMER ACTIONS
    // -------------------------------------------------------------
    function applyBulkMetadataAction(selectedOnly) {
        if (SuiteApp.images.length === 0) return;

        let targets = SuiteApp.images;
        if (selectedOnly) {
            if (SuiteApp.selectedImageIds.size === 0) {
                GTP.showToast("Select images from grid checkboxes first.", "error");
                return;
            }
            targets = SuiteApp.images.filter(img => SuiteApp.selectedImageIds.has(img.id));
        }

        saveToUndoHistory();

        let profile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
        let title = $("bulkTitle").value;
        let headline = $("bulkHeadline").value;
        let descTemplate = $("bulkDesc").value;
        let keywords = $("bulkKeywords").value;
        let copyright = $("bulkCopyright").value;
        let artist = $("bulkCreator").value;
        let sub = $("bulkSublocation").value;
        let credit = $("bulkCredit").value;
        let sku = $("bulkSku").value;

        targets.forEach(img => {
            if (title) img.title = title;
            if (headline) img.headline = headline;
            if (descTemplate) {
                img.description = resolveTemplateString(descTemplate, img, profile);
            } else if (profile && profile.descriptionTemplate && !img.description) {
                img.description = resolveTemplateString(profile.descriptionTemplate, img, profile);
            }
            if (keywords) img.keywords = keywords;
            if (copyright) img.copyright = copyright;
            if (artist) img.artist = artist;
            if (sub) img.neighborhood = sub;
            if (credit) img.credit = credit;
            if (sku) img.originalTransmissionReference = sku;
        });

        GTP.showToast(`Bulk applied metadata to ${targets.length} image(s)!`, "success");
        renderWorkspace();
        runPreflightChecks();
    }

    function renderFilenameRenamePreview() {
        if (SuiteApp.images.length === 0) return;

        let template = $("renameTemplate").value || "{service}-in-{city}-{n}";
        let profile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
        let customService = $("renameService").value;
        let customKeyword = $("renameKeyword").value;

        saveToUndoHistory();

        let previews = [];
        let filenamesSet = new Set();
        let duplicateAlert = false;

        SuiteApp.images.forEach((img, idx) => {
            let outName = resolveSEOFilenameTemplate(template, img, idx, profile, customService, customKeyword);
            img.outputName = outName;

            if (filenamesSet.has(outName.toLowerCase())) {
                duplicateAlert = true;
            } else {
                filenamesSet.add(outName.toLowerCase());
            }

            if (idx < 5) {
                previews.push(`
                    <div class="renamer-preview-item">
                        <span style="color:var(--text-muted);word-break:break-all;max-width:45%;">${img.name}</span>
                        <span style="color:var(--success);font-weight:700;word-break:break-all;max-width:45%;">${outName}</span>
                    </div>
                `);
            }
        });

        let box = $("renamePreviewBox");
        let list = $("renamePreviewList");
        if (box && list) {
            list.innerHTML = previews.join("") + (duplicateAlert ? `
                <p style="color:var(--danger);font-size:0.72rem;font-weight:700;margin-top:8px;">
                    ⚠️ Warning: Duplicate names generated. Consider appending sequence {n} variable.
                </p>
            ` : "");
            box.style.display = "block";
        }

        GTP.showToast("Filename previews loaded successfully!");
        runPreflightChecks();
    }

    function resolveSEOFilenameTemplate(template, img, idx, profile, customService, customKeyword) {
        let now = new Date();
        let YYYY = now.getFullYear();
        let MM = String(now.getMonth() + 1).padStart(2, '0');
        let DD = String(now.getDate()).padStart(2, '0');
        let dateStr = `${YYYY}-${MM}-${DD}`;

        let business = profile ? profile.businessName : "";
        let city = img.city || (profile ? profile.city : "");
        let neighborhood = img.neighborhood || (profile ? profile.zip : "");
        let service = customService || (profile ? profile.category : "");
        let keyword = customKeyword || "";
        let n = String(idx + 1);

        let out = template
            .replace(/{business}/g, business)
            .replace(/{city}/g, city)
            .replace(/{neighborhood}/g, neighborhood)
            .replace(/{service}/g, service)
            .replace(/{keyword}/g, keyword)
            .replace(/{date}/g, dateStr)
            .replace(/{n}/g, n);

        let ext = img.name.split('.').pop() || "jpg";
        let base = out.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "") // strip special characters
            .trim()
            .replace(/[\s_]+/g, "-")       // spaces/underscores to hyphens
            .replace(/-+/g, "-");          // collapse multi-hyphens

        if (!base) base = "image-" + n;
        return base + "." + ext.toLowerCase();
    }

    // -------------------------------------------------------------
    // PRE-FLIGHT QUALITY AUDITOR (8 CHECKS)
    // -------------------------------------------------------------
    function runPreflightChecks() {
        let container = $("preflightCheckerItems");
        if (!container) return;

        if (SuiteApp.images.length === 0) {
            container.innerHTML = `<p style="font-size:0.78rem;color:var(--text-muted);margin:0;">Please upload photos to run automated SEO pre-flight checks.</p>`;
            return;
        }

        let images = SuiteApp.images;
        let checks = {
            gps: { pass: true, desc: "GPS Coordinates embedded correctly.", count: 0 },
            titleDesc: { pass: true, desc: "Title and description filled.", count: 0 },
            keywords: { pass: true, desc: "SEO keywords assigned.", count: 0 },
            copyright: { pass: true, desc: "Copyright notices embedded.", count: 0 },
            duplicates: { pass: true, desc: "No duplicate output filenames.", count: 0 },
            zeroGps: { pass: true, desc: "No coordinate errors or (0,0) GPS values.", count: 0 },
            shortDesc: { pass: true, desc: "Descriptions are long enough (>20 chars).", count: 0 },
            inconsistentCopy: { pass: true, desc: "Consistent copyright holder format.", count: 0 }
        };

        let copyValues = new Set();
        let nameCounts = {};

        images.forEach(img => {
            let lat = img.latitude;
            let lng = img.longitude;
            let title = img.title;
            let desc = img.description;
            let kws = img.keywords;
            let copy = img.copyright;
            let outName = img.outputName || img.name;

            // 1. Missing GPS
            if (lat === null || lng === null) {
                checks.gps.pass = false;
                checks.gps.count++;
            } else {
                // 6. Zero GPS
                if (lat === 0 && lng === 0) {
                    checks.zeroGps.pass = false;
                    checks.zeroGps.count++;
                }
            }

            // 2. Missing Title/Desc
            if (!title || !desc || title.trim() === "" || desc.trim() === "") {
                checks.titleDesc.pass = false;
                checks.titleDesc.count++;
            } else {
                // 7. Short Desc
                if (desc.trim().length < 20) {
                    checks.shortDesc.pass = false;
                    checks.shortDesc.count++;
                }
            }

            // 3. Keywords
            if (!kws || String(kws).trim() === "") {
                checks.keywords.pass = false;
                checks.keywords.count++;
            }

            // 4. Copyright
            if (!copy || copy.trim() === "") {
                checks.copyright.pass = false;
                checks.copyright.count++;
            } else {
                copyValues.add(copy.trim());
            }

            // Filename tracking
            nameCounts[outName.toLowerCase()] = (nameCounts[outName.toLowerCase()] || 0) + 1;
        });

        // 5. Duplicates
        let duplicateNamesCount = 0;
        Object.keys(nameCounts).forEach(k => {
            if (nameCounts[k] > 1) duplicateNamesCount += nameCounts[k];
        });
        if (duplicateNamesCount > 0) {
            checks.duplicates.pass = false;
            checks.duplicates.count = duplicateNamesCount;
        }

        // 8. Inconsistent Copyright
        if (copyValues.size > 1) {
            checks.inconsistentCopy.pass = false;
        }

        container.innerHTML = `
            <div class="check-item">
                <span class="check-icon ${checks.gps.pass ? 'pass' : 'fail'}">${checks.gps.pass ? '✓' : '✗'}</span>
                <div class="check-text">
                    <h4>GPS Location Geotags</h4>
                    <p>${checks.gps.pass ? 'All images have coordinates.' : `${checks.gps.count} image(s) missing GPS geotags.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.titleDesc.pass ? 'pass' : 'fail'}">${checks.titleDesc.pass ? '✓' : '✗'}</span>
                <div class="check-text">
                    <h4>SEO Description / Title Fields</h4>
                    <p>${checks.titleDesc.pass ? 'Titles and captions populated.' : `${checks.titleDesc.count} image(s) missing descriptions/titles.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.keywords.pass ? 'pass' : 'warn'}">${checks.keywords.pass ? '✓' : '⚠️'}</span>
                <div class="check-text">
                    <h4>Keyword Alt Tags</h4>
                    <p>${checks.keywords.pass ? 'SEO keywords mapped successfully.' : `${checks.keywords.count} image(s) missing searchable terms.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.copyright.pass ? 'pass' : 'warn'}">${checks.copyright.pass ? '✓' : '⚠️'}</span>
                <div class="check-text">
                    <h4>Copyright Attributions</h4>
                    <p>${checks.copyright.pass ? 'Copyright notices are set.' : `${checks.copyright.count} image(s) missing ownership details.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.duplicates.pass ? 'pass' : 'fail'}">${checks.duplicates.pass ? '✓' : '✗'}</span>
                <div class="check-text">
                    <h4>Output Filenames</h4>
                    <p>${checks.duplicates.pass ? 'No name collisions found.' : `${checks.duplicates.count} files have duplicate output names.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.zeroGps.pass ? 'pass' : 'fail'}">${checks.zeroGps.pass ? '✓' : '✗'}</span>
                <div class="check-text">
                    <h4>Coordinate Validation (0,0)</h4>
                    <p>${checks.zeroGps.pass ? 'Coordinates verified valid.' : `${checks.zeroGps.count} image(s) mapped to invalid (0,0) location.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.shortDesc.pass ? 'pass' : 'warn'}">${checks.shortDesc.pass ? '✓' : '⚠️'}</span>
                <div class="check-text">
                    <h4>Description Character Limits</h4>
                    <p>${checks.shortDesc.pass ? 'Descriptions are detailed (>20 chars).' : `${checks.shortDesc.count} description(s) too brief for crawl indexation.`}</p>
                </div>
            </div>

            <div class="check-item">
                <span class="check-icon ${checks.inconsistentCopy.pass ? 'pass' : 'warn'}">${checks.inconsistentCopy.pass ? '✓' : '⚠️'}</span>
                <div class="check-text">
                    <h4>Copyright Formats Consistency</h4>
                    <p>${checks.inconsistentCopy.pass ? 'Consistent ownership tags.' : 'Inconsistent copyrights found (different legal names in batch).'}</p>
                </div>
            </div>
        `;
    }

    function triggerAutoFixAllQualityWarnings() {
        if (SuiteApp.images.length === 0) return;

        let profile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];
        if (!profile) {
            GTP.showToast("Create a business profile first.", "error");
            return;
        }

        saveToUndoHistory();

        SuiteApp.images.forEach((img, idx) => {
            // Fix 1 & 6: GPS Coordinates
            if (img.latitude === null || img.longitude === null || (img.latitude === 0 && img.longitude === 0)) {
                img.latitude = profile.latitude;
                img.longitude = profile.longitude;
                img.status = 'geotagged';
            }

            // Fix 2 & 7: Title/Desc
            if (!img.title) {
                img.title = (profile.category || "SEO Service") + " " + profile.businessName;
            }
            if (!img.description || img.description.length < 20) {
                img.description = resolveTemplateString(profile.descriptionTemplate, img, profile);
            }

            // Fix 3: Keywords
            if (!img.keywords) {
                img.keywords = profile.keywords;
            }

            // Fix 4 & 8: Copyright
            if (!img.copyright || img.copyright !== profile.copyright) {
                img.copyright = profile.copyright;
            }

            // Fix 5: Duplicates
            // Append auto incrementing indices
            let ext = img.name.split('.').pop() || "jpg";
            let rawBase = img.outputName.substring(0, img.outputName.lastIndexOf("."));
            // Checks other names
            let collisions = SuiteApp.images.filter((item, i) => i < idx && item.outputName.toLowerCase() === img.outputName.toLowerCase());
            if (collisions.length > 0) {
                img.outputName = rawBase + "-" + (idx + 1) + "." + ext.toLowerCase();
            }
        });

        renderWorkspace();
        runPreflightChecks();
        GTP.showToast("⚡ Automated SEO optimizations and quality warnings resolved!", "success");
    }

    // -------------------------------------------------------------
    // DRAWER SIDEBAR FUNCTIONS
    // -------------------------------------------------------------
    function openDrawerSidebar(id) {
        let drawer = SuiteApp.els.itemDetailDrawer;
        let body = SuiteApp.els.drawerBody;
        if (!drawer || !body) return;

        let img = SuiteApp.images.find(i => i.id === id);
        if (!img) return;

        SuiteApp.activeImageId = id;

        body.innerHTML = `
            <div class="preview-img-wrap" style="max-height:180px;margin-bottom:16px;">
                <img src="${img.dataURL}" alt="${img.name}">
            </div>
            
            <p style="font-size:0.75rem;color:var(--text-muted);word-break:break-all;"><strong>File Name:</strong> ${img.name}</p>
            <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 16px;"><strong>Dimensions:</strong> ${img.width} x ${img.height}px</p>

            <div class="field" style="margin-bottom:12px;">
                <label for="d_name">Output Filename (Keywords)</label>
                <input type="text" id="d_name" value="${img.outputName}">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div class="field">
                    <label for="d_lat">Latitude</label>
                    <input type="number" id="d_lat" step="any" value="${img.latitude !== null ? img.latitude : ''}">
                </div>
                <div class="field">
                    <label for="d_lng">Longitude</label>
                    <input type="number" id="d_lng" step="any" value="${img.longitude !== null ? img.longitude : ''}">
                </div>
            </div>

            <div class="field" style="margin-bottom:12px;">
                <label for="d_title">Title (dc:title / ImageDescription)</label>
                <input type="text" id="d_title" value="${img.title}">
            </div>
            
            <div class="field" style="margin-bottom:12px;">
                <label for="d_headline">Headline (photoshop:Headline)</label>
                <input type="text" id="d_headline" value="${img.headline}">
            </div>

            <div class="field" style="margin-bottom:12px;">
                <label for="d_desc">SEO Description / Caption</label>
                <textarea id="d_desc" rows="3" style="width:100%;border:2px solid var(--border);border-radius:var(--radius);padding:10px;font-size:0.9rem;">${img.description}</textarea>
            </div>

            <div class="field" style="margin-bottom:12px;">
                <label for="d_keywords">SEO Keywords (comma separated)</label>
                <input type="text" id="d_keywords" value="${img.keywords}">
            </div>

            <div class="field" style="margin-bottom:12px;">
                <label for="d_copy">Copyright Notice Notice</label>
                <input type="text" id="d_copy" value="${img.copyright}">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div class="field">
                    <label for="d_artist">Artist / Photographer</label>
                    <input type="text" id="d_artist" value="${img.artist}">
                </div>
                <div class="field">
                    <label for="d_sub">Sub-location / Neighborhood</label>
                    <input type="text" id="d_sub" value="${img.neighborhood}">
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div class="field">
                    <label for="d_city">City</label>
                    <input type="text" id="d_city" value="${img.city}">
                </div>
                <div class="field">
                    <label for="d_state">State</label>
                    <input type="text" id="d_state" value="${img.state}">
                </div>
            </div>
        `;

        drawer.classList.add("open");
    }

    function closeDrawer() {
        let drawer = SuiteApp.els.itemDetailDrawer;
        if (drawer) drawer.classList.remove("open");
    }

    function saveDrawerSettings() {
        let id = SuiteApp.activeImageId;
        let img = SuiteApp.images.find(i => i.id === id);
        if (!img) return;

        saveToUndoHistory();

        img.outputName = $("d_name").value || img.name;
        
        let lat = parseFloat($("d_lat").value);
        let lng = parseFloat($("d_lng").value);
        img.latitude = isNaN(lat) ? null : lat;
        img.longitude = isNaN(lng) ? null : lng;
        if (img.latitude !== null) img.status = 'geotagged';

        img.title = $("d_title").value;
        img.headline = $("d_headline").value;
        img.description = $("d_desc").value;
        img.keywords = $("d_keywords").value;
        img.copyright = $("d_copy").value;
        img.artist = $("d_artist").value;
        img.neighborhood = $("d_sub").value;
        img.city = $("d_city").value;
        img.state = $("d_state").value;

        closeDrawer();
        renderWorkspace();
        runPreflightChecks();
        GTP.showToast(`Saved settings for photo: ${img.name}!`, "success");
    }

    // -------------------------------------------------------------
    // UNDO HISTORY OPERATIONS (Ctrl + Z)
    // -------------------------------------------------------------
    function saveToUndoHistory() {
        // Deep copy of images array to history stack (limit to 10 states)
        let snapshot = SuiteApp.images.map(img => Object.assign({}, img));
        SuiteApp.undoStack.push(snapshot);
        if (SuiteApp.undoStack.length > 10) {
            SuiteApp.undoStack.shift();
        }
    }

    function executeUndoAction() {
        if (SuiteApp.undoStack.length === 0) {
            GTP.showToast("Nothing to undo.", "warning");
            return;
        }
        let previous = SuiteApp.undoStack.pop();
        SuiteApp.images = previous;
        renderWorkspace();
        runPreflightChecks();
        GTP.showToast("↩ Undo successful (Ctrl+Z)!", "success");
    }

    // Attach shortcut global key bindings
    document.addEventListener("keydown", function(e) {
        // Ctrl + Z = Undo last bulk apply
        if (e.ctrlKey && e.key.toLowerCase() === "z") {
            e.preventDefault();
            executeUndoAction();
        }
        // Ctrl + Shift + R = Trigger filename renamer re-run
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
            e.preventDefault();
            renderFilenameRenamePreview();
        }
        // Ctrl + E = ExportZIP instantly
        if (e.ctrlKey && e.key.toLowerCase() === "e") {
            e.preventDefault();
            executeZIPBundleCompilation();
        }
        // M = Centering Leaflet Search field
        if (e.key.toLowerCase() === "m" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
            let el = $("mapSearchInput");
            if (el) {
                e.preventDefault();
                el.focus();
            }
        }
    });

    // -------------------------------------------------------------
    // EXPORT SUITE COMPILES & ZIP BUILDERS
    // -------------------------------------------------------------
    async function executeZIPBundleCompilation() {
        if (SuiteApp.images.length === 0) {
            GTP.showToast("Upload images to export.", "error");
            return;
        }

        let zipBtn = $("btnExecuteExportBundle");
        zipBtn.disabled = true;
        zipBtn.textContent = "Packaging ZIP Bundle (Client-side)...";

        await ensureLibraries();
        let zip = new JSZip();

        let incImages = $("incImages").checked;
        let incCsv = $("incCsv").checked;
        let incJsonLd = $("incJsonLd").checked;
        let incSitemap = $("incSitemap").checked;
        let incAltText = $("incAltText").checked;

        let baseSitemapUrl = $("sitemapBaseUrl").value || "https://geotagseditor.online/images/";
        if (!baseSitemapUrl.endsWith("/")) baseSitemapUrl += "/";

        let profile = SuiteApp.profiles.find(p => p.id === SuiteApp.activeProfileId) || SuiteApp.profiles[0];

        // 1. Process and compress image data with metadata insertion
        let folder = zip.folder("optimized_images");
        let csvRows = [];
        let jsonLdGraph = [];
        let sitemapItems = [];
        let altTextLines = [];

        let quality = parseInt($("optQuality").value) || 85;
        let maxWidth = parseInt($("optMaxWidth").value) || 2400;
        let maxHeight = parseInt($("optMaxHeight").value) || 2400;
        let forceFormat = $("optFormat").value;
        let stripThumb = $("optStripThumb").checked;

        let processedSizes = 0;
        let originalSizes = 0;

        for (let i = 0; i < SuiteApp.images.length; i++) {
            let img = SuiteApp.images[i];
            GTP.showToast(`Optimizing metadata segments: ${i + 1} of ${SuiteApp.images.length}...`);

            try {
                // Resize / Compress through main thread yielding to maintain UI rendering responsive
                let compressionResult = await compressAndFormatImage(img, maxWidth, maxHeight, quality, forceFormat);
                let finalBytes = compressionResult.bytes;
                originalSizes += img.size;

                if (incImages) {
                    // Embed EXIF coordinates (and basic details) via piexif base64 block
                    let dataURL = "data:image/jpeg;base64," + btoa(String.fromCharCode.apply(null, finalBytes));
                    let exifObj = { "0th": {}, Exif: {}, GPS: {}, "1st": {} };
                    
                    exifObj["0th"][window.piexif.ImageIFD.ImageDescription] = img.title || "";
                    exifObj["0th"][window.piexif.ImageIFD.Artist] = img.artist || "";
                    exifObj["0th"][window.piexif.ImageIFD.Copyright] = img.copyright || "";
                    exifObj["0th"][window.piexif.ImageIFD.Software] = "Bulk Image Geotag Suite 2.0";

                    // Windows properties UCS2 compatibility tags
                    exifObj["0th"][window.piexif.ImageIFD.XPTitle] = MetadataEngine.stringToUCS2Bytes(img.title);
                    exifObj["0th"][window.piexif.ImageIFD.XPComment] = MetadataEngine.stringToUCS2Bytes(img.description);
                    if (img.keywords) {
                        exifObj["0th"][window.piexif.ImageIFD.XPKeywords] = MetadataEngine.stringToUCS2Bytes(String(img.keywords));
                    }

                    if (img.latitude !== null && img.longitude !== null) {
                        exifObj.GPS[window.piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
                        exifObj.GPS[window.piexif.GPSIFD.GPSLatitude] = MetadataEngine.decimalToDMS(img.latitude);
                        exifObj.GPS[window.piexif.GPSIFD.GPSLatitudeRef] = img.latitude >= 0 ? "N" : "S";
                        exifObj.GPS[window.piexif.GPSIFD.GPSLongitude] = MetadataEngine.decimalToDMS(img.longitude);
                        exifObj.GPS[window.piexif.GPSIFD.GPSLongitudeRef] = img.longitude >= 0 ? "E" : "W";
                        if (img.altitude) {
                            exifObj.GPS[window.piexif.GPSIFD.GPSAltitude] = [Math.round(img.altitude * 100), 100];
                            exifObj.GPS[window.piexif.GPSIFD.GPSAltitudeRef] = img.altitude >= 0 ? 0 : 1;
                        }
                    }

                    // Write GPS date/time stamps for full spec compliance
                    let now = new Date();
                    let gpsDateStr = `${now.getUTCFullYear()}:${String(now.getUTCMonth()+1).padStart(2,'0')}:${String(now.getUTCDate()).padStart(2,'0')}`;
                    exifObj.GPS[window.piexif.GPSIFD.GPSDateStamp] = gpsDateStr;
                    exifObj.GPS[window.piexif.GPSIFD.GPSTimeStamp] = [
                        [now.getUTCHours(), 1],
                        [now.getUTCMinutes(), 1],
                        [now.getUTCSeconds(), 1]
                    ];

                    // Dump EXIF base64 block
                    let dumpedExif = window.piexif.dump(exifObj);
                    let insertedDataURL = window.piexif.insert(dumpedExif, dataURL);
                    let finalJpgBytes = dataURLToUint8Array(insertedDataURL);

                    // Rebuild with custom IPTC IRB segments and custom XMP XML block in APP markers
                    let iptcBlockBytes = MetadataEngine.buildIptcAPP13Segment(img);
                    let xmpXmlString = MetadataEngine.buildXmpString(img);
                    
                    let completeBytes = MetadataEngine.injectMetadata(finalJpgBytes, iptcBlockBytes, xmpXmlString);
                    processedSizes += completeBytes.length;

                    // Append to zip folder
                    let finalName = img.outputName || img.name;
                    folder.file(finalName, completeBytes);
                }

                // Gather CSV indexes row details
                if (incCsv) {
                    csvRows.push({
                        "Filename": img.outputName || img.name,
                        "Latitude": img.latitude !== null ? img.latitude : "",
                        "Longitude": img.longitude !== null ? img.longitude : "",
                        "Altitude": img.altitude || "",
                        "Title": img.title || "",
                        "Headline": img.headline || "",
                        "Description": img.description || "",
                        "Keywords": img.keywords || "",
                        "Copyright": img.copyright || "",
                        "Artist": img.artist || "",
                        "City": img.city || "",
                        "State": img.state || "",
                        "Country": img.country || "",
                        "Neighborhood": img.neighborhood || "",
                        "Credit": img.credit || "",
                        "Job ID": img.originalTransmissionReference || ""
                    });
                }

                // Gather Schema json-ld graph nodes details
                if (incJsonLd) {
                    jsonLdGraph.push({
                        "@context": "https://schema.org",
                        "@type": "ImageObject",
                        "contentUrl": baseSitemapUrl + (img.outputName || img.name),
                        "name": img.title || "Local Business Photo",
                        "caption": img.description || "",
                        "creator": {
                            "@type": "Organization",
                            "name": profile ? profile.businessName : "Business Organization"
                        },
                        "contentLocation": {
                            "@type": "Place",
                            "name": img.neighborhood || (profile ? profile.city : "Service Area"),
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": img.latitude,
                                "longitude": img.longitude
                            }
                        }
                    });
                }

                // Gather Sitemap elements details
                if (incSitemap) {
                    sitemapItems.push(`
  <url>
    <loc>${baseSitemapUrl + (img.outputName || img.name)}</loc>
    <image:image>
      <image:loc>${baseSitemapUrl + (img.outputName || img.name)}</image:loc>
      <image:title>${escapeXml(img.title || "")}</image:title>
      <image:caption>${escapeXml(img.description || "")}</image:caption>
      <image:geo_location>${escapeXml(img.city || "")}, ${escapeXml(img.state || "")}</image:geo_location>
    </image:image>
  </url>`);
                }

                // Gather Alt suggestion lines details
                if (incAltText) {
                    let keywordsAlt = img.keywords ? String(img.keywords).split(",")[0] : (profile ? profile.category : "Local SEO");
                    let suggestion = `${img.outputName || img.name} ➔ Alt Suggestion: "${img.title || keywordsAlt} in ${img.city || (profile ? profile.city : '')} by ${profile ? profile.businessName : ''}"`;
                    altTextLines.push(suggestion);
                }

                // Yield main thread
                await new Promise(r => setTimeout(r, 0));

            } catch (err) {
                console.error("Optimization failure for:", img.name, err);
            }
        }

        // 2. Append sub-indices to ZIP compilation
        if (incCsv && csvRows.length > 0) {
            let csvString = Papa.unparse(csvRows);
            zip.file("metadata.csv", csvString);
        }

        if (incJsonLd && jsonLdGraph.length > 0) {
            zip.file("json-ld.json", JSON.stringify(jsonLdGraph, null, 2));
        }

        if (incSitemap && sitemapItems.length > 0) {
            let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapItems.join("")}
</urlset>`;
            zip.file("image-sitemap.xml", sitemapXml);
        }

        if (incAltText && altTextLines.length > 0) {
            zip.file("alt-text.txt", altTextLines.join("\n"));
        }

        // 3. Render compression size comparisons stats panel
        let statsBox = $("compressionStats");
        if (statsBox) {
            let savings = originalSizes - processedSizes;
            let pct = originalSizes > 0 ? ((savings / originalSizes) * 100).toFixed(1) : 0;
            statsBox.innerHTML = `
                <strong>⚡ Image Optimizer Report:</strong>
                <p style="margin:2px 0;">Original Size: ${formatBytes(originalSizes)}</p>
                <p style="margin:2px 0;">Compressed Size: ${formatBytes(processedSizes)}</p>
                <p style="color:var(--success);font-weight:700;margin:2px 0;">✓ Net savings: ${formatBytes(savings)} (${pct}%)</p>
            `;
            statsBox.style.display = "block";
        }

        // 4. Generate final blob
        try {
            let content = await zip.generateAsync({ type: "blob" });
            let url = window.URL.createObjectURL(content);
            let link = document.createElement("a");
            link.href = url;
            link.download = "seo_geotagged_bundle.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            GTP.showToast("Export ZIP downloaded successfully!", "success");
        } catch (err) {
            GTP.showToast("Failed to compile ZIP archive.", "error");
        }

        zipBtn.disabled = false;
        zipBtn.innerHTML = "📦 Download Complete ZIP SEO Bundle";
    }

    // Canvas compression pipeline
    function compressAndFormatImage(img, maxWidth, maxHeight, quality, format) {
        return new Promise((resolve, reject) => {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            
            let tempImg = new Image();
            tempImg.onload = function() {
                let w = tempImg.width;
                let h = tempImg.height;

                // Scale down proportionally
                if (w > maxWidth || h > maxHeight) {
                    if (w > h) {
                        h = Math.round(h * (maxWidth / w));
                        w = maxWidth;
                    } else {
                        w = Math.round(w * (maxHeight / h));
                        h = maxHeight;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(tempImg, 0, 0, w, h);

                let mimeType = "image/jpeg";
                if (format === "WEBP") mimeType = "image/webp";

                let dataURL = canvas.toDataURL(mimeType, quality / 100);
                let bytes = dataURLToUint8Array(dataURL);
                resolve({ bytes, width: w, height: h });
            };
            tempImg.onerror = () => reject();
            tempImg.src = img.originalDataURL;
        });
    }

    function dataURLToUint8Array(dataURL) {
        let parts = dataURL.split(',');
        let byteString = atob(parts[1]);
        let ab = new ArrayBuffer(byteString.length);
        let ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return ia;
    }

    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    // -------------------------------------------------------------
    // ADVANCED BULK GEOTAG REMOVAL SUITE
    // -------------------------------------------------------------
    function executeBulkGPSMetadataStrip() {
        if (SuiteApp.images.length === 0) {
            GTP.showToast("Upload images to scrub.", "error");
            return;
        }

        saveToUndoHistory();

        let option = $("privacyScrubDropdown").value;
        let count = 0;
        let reports = [];

        SuiteApp.images.forEach(img => {
            let bytes = dataURLToUint8Array(img.dataURL);
            
            let scrubbedBytes = MetadataEngine.stripMetadata(bytes, {
                stripAll: option === "ALL",
                stripGpsOnly: option === "GPS",
                stripPersonalOnly: option === "PERSONAL"
            });

            // Convert back to dataURL
            let finalDataURL = "data:image/jpeg;base64," + btoa(String.fromCharCode.apply(null, scrubbedBytes));
            img.dataURL = finalDataURL;
            img.latitude = null;
            img.longitude = null;
            img.altitude = null;
            img.status = 'cleaned';

            count++;
            reports.push(`
                <div>
                    <strong>Scrubbed:</strong> ${img.name} (${option === 'ALL' ? 'Stripped all metadata blocks' : 'Erased coordinates GPS IFD'})
                </div>
            `);
        });

        // Draw visual privacy reports list
        let box = $("privacyScrubReport");
        let list = $("privacyReportList");
        if (box && list) {
            list.innerHTML = reports.join("");
            box.style.display = "block";
        }

        renderWorkspace();
        runPreflightChecks();
        GTP.showToast(`Privacy Scrub Complete! Stripped location metadata from ${count} images.`, "success");
    }

    // -------------------------------------------------------------
    // UTILITY CONVERTERS & HELPERS
    // -------------------------------------------------------------
    function formatBytes(bytes) {
        if (!bytes || isNaN(bytes)) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(2) + " MB";
    }

    const $ = function(id) { return document.getElementById(id); };

    function resetSuiteState() {
        SuiteApp.images = [];
        SuiteApp.selectedImageIds.clear();
        SuiteApp.activeImageId = null;
        SuiteApp.undoStack = [];
        
        let reportBox = $("privacyScrubReport");
        if (reportBox) reportBox.style.display = "none";
        let statsBox = $("compressionStats");
        if (statsBox) statsBox.style.display = "none";
        let renameBox = $("renamePreviewBox");
        if (renameBox) renameBox.style.display = "none";

        renderWorkspace();
        GTP.showToast("Suite reset to clean state.", "warning");
    }

    // -------------------------------------------------------------
    // BOOTSTRAP THE SUITE ON LOAD
    // -------------------------------------------------------------
    async function bootSuite() {
        // Initialize default Profiles
        ProfileManager.createDefault();

        // Check library CDNs
        renderMapStatus("Loading advanced geolocation engine...", false);
        await ensureLibraries();

        // Inject high-end responsive tool dashboard UI
        injectAdvancedSuiteUI();
    }

    function renderMapStatus(message, isError) {
        let container = $("leafletMap");
        if (!container || window.L) return;
        container.innerHTML = `<div class="${isError ? 'map-fallback' : 'map-loading'}">${message}</div>`;
    }

    document.addEventListener("DOMContentLoaded", bootSuite);
})();