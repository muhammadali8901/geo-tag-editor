/* ============================================
   Geo Tags Editor — Geo Tag Editor Tool Logic
   ============================================ */

// Load universal protection first
(function() {
    var script = document.createElement('script');
    script.src = '/js/universal-protection.js';
    script.async = true;
    document.head.appendChild(script);
})();

(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const PIEXIF_URL = 'https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js';
  const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const MAX_IMAGES = 20;

  let uploadedImages = [];
  let map = null;
  let marker = null;
  let piexifPromise = null;
  let leafletPromise = null;
  let jszipPromise = null;

  const els = {};

  function cacheEls() {
    [
      'dropZone', 'fileInput', 'previewArea', 'removeBtn', 'metaBody', 'latInput', 
      'lngInput', 'applyBtn', 'removeGpsBtn', 'downloadBtn', 'resultBanner', 
      'resultText', 'mapContainer', 'tabUpload', 'tabEdit', 'tabDownload', 
      'editSection', 'downloadSection', 'uploadSection', 'imagesPreviewContainer',
      'processedImagesContainer', 'uploadedImagesPreview', 'addMoreBtn'
    ].forEach(function (id) {
      els[id] = $(id);
      console.log('Element cached:', id, els[id]); // Debug log
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function dmsToDecimal(dms, ref) {
    if (!dms || dms.length < 3) return null;
    const d = dms[0][0] / dms[0][1];
    const m = dms[1][0] / dms[1][1];
    const s = dms[2][0] / dms[2][1];
    let decimal = d + m / 60 + s / 3600;
    if (ref === 'S' || ref === 'W') decimal = -decimal;
    return parseFloat(decimal.toFixed(7));
  }

  function decimalToDMS(decimal) {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60 * 10000);
    return [[degrees, 1], [minutes, 1], [seconds, 10000]];
  }

  function loadScript(src, test) {
    return new Promise(function (resolve, reject) {
      if (test()) {
        resolve();
        return;
      }

      var existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(script);
    });
  }

  function loadStyle(href, id) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensurePiexif() {
    if (window.piexif) return Promise.resolve();
    if (!piexifPromise) {
      piexifPromise = loadScript(PIEXIF_URL, function () { return !!window.piexif; });
    }
    return piexifPromise;
  }

  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletPromise) {
      loadStyle(LEAFLET_CSS_URL, 'leaflet-runtime-css');
      leafletPromise = loadScript(LEAFLET_JS_URL, function () { return !!window.L; });
    }
    return leafletPromise;
  }

  function ensureJSZip() {
    if (window.JSZip) return Promise.resolve();
    if (!jszipPromise) {
      jszipPromise = loadScript(JSZIP_URL, function () { return !!window.JSZip; });
    }
    return jszipPromise;
  }

  function setTab(active) {
    ['tabUpload', 'tabEdit', 'tabDownload'].forEach(function (id) {
      if (els[id]) {
        els[id].classList.remove('active', 'completed');
        els[id].setAttribute('aria-selected', 'false');
        els[id].setAttribute('tabindex', '-1');
      }
    });

    if (active === 'upload') {
      els.tabUpload.classList.add('active');
      els.tabUpload.setAttribute('aria-selected', 'true');
      els.tabUpload.setAttribute('tabindex', '0');
      els.uploadSection.classList.remove('hidden');
      els.uploadSection.removeAttribute('hidden');
      els.editSection.classList.add('hidden');
      els.editSection.setAttribute('hidden', '');
      els.downloadSection.classList.add('hidden');
      els.downloadSection.setAttribute('hidden', '');
      return;
    }

    if (active === 'edit') {
      els.tabUpload.classList.add('completed');
      els.tabEdit.classList.add('active');
      els.tabEdit.setAttribute('aria-selected', 'true');
      els.tabEdit.setAttribute('tabindex', '0');
      els.uploadSection.classList.add('hidden');
      els.uploadSection.setAttribute('hidden', '');
      els.editSection.classList.remove('hidden');
      els.editSection.removeAttribute('hidden');
      els.downloadSection.classList.add('hidden');
      els.downloadSection.setAttribute('hidden', '');
      return;
    }

    els.tabUpload.classList.add('completed');
    els.tabEdit.classList.add('completed');
    els.tabDownload.classList.add('active');
    els.tabDownload.setAttribute('aria-selected', 'true');
    els.tabDownload.setAttribute('tabindex', '0');
    els.uploadSection.classList.add('hidden');
    els.uploadSection.setAttribute('hidden', '');
    els.editSection.classList.add('hidden');
    els.editSection.setAttribute('hidden', '');
    els.downloadSection.classList.remove('hidden');
    els.downloadSection.removeAttribute('hidden');
  }

  function showResult(message, type) {
    els.resultBanner.className = 'result-banner ' + type;
    els.resultBanner.removeAttribute('hidden');
    els.resultText.textContent = message;
  }

  function hideResult() {
    els.resultBanner.className = 'result-banner';
    els.resultBanner.setAttribute('hidden', '');
    els.resultText.textContent = '';
  }

  function renderMapStatus(message, isError) {
    if (!els.mapContainer || window.L) return;
    els.mapContainer.innerHTML = '<div class="' + (isError ? 'map-fallback' : 'map-loading') + '">' + message + '</div>';
  }

  function initMap(lat, lng) {
    if (!els.mapContainer || !window.L) return;
    if (map) {
      map.remove();
      map = null;
      marker = null;
    }

    els.mapContainer.innerHTML = '';
    map = L.map(els.mapContainer, { scrollWheelZoom: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', function () {
      var position = marker.getLatLng();
      els.latInput.value = position.lat.toFixed(7);
      els.lngInput.value = position.lng.toFixed(7);
      validateCoords();
    });

    map.on('click', function (event) {
      marker.setLatLng(event.latlng);
      els.latInput.value = event.latlng.lat.toFixed(7);
      els.lngInput.value = event.latlng.lng.toFixed(7);
      validateCoords();
    });

    setTimeout(function () {
      if (map) map.invalidateSize();
    }, 200);
  }

  function initMapAsync(lat, lng) {
    renderMapStatus('Loading map...', false);
    ensureLeaflet()
      .then(function () {
        initMap(lat, lng);
      })
      .catch(function () {
        renderMapStatus('Map failed to load. You can still edit coordinates manually.', true);
      });
  }

  function updateMapMarker() {
    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);
    if (isNaN(lat) || isNaN(lng) || !map || !marker) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], map.getZoom());
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).filter(function(file) {
      return file.type.match(/image\/jpe?g/i);
    });

    if (newFiles.length === 0) {
      GTP.showToast('Please upload JPEG or JPG images only.');
      return;
    }

    if (uploadedImages.length >= MAX_IMAGES) {
      GTP.showToast('You can only upload up to ' + MAX_IMAGES + ' images.');
      return;
    }

    const availableSlots = MAX_IMAGES - uploadedImages.length;
    const filesToAdd = newFiles.slice(0, availableSlots);
    if (newFiles.length > availableSlots) {
      GTP.showToast('Only first ' + availableSlots + ' images added to reach limit of ' + MAX_IMAGES + '.');
    }

  ensurePiexif()
    .then(function () {
      if (files.length > 0) {
        var file = files[0];
        var reader = new FileReader();
        
        reader.onload = function() {
          var img = new Image();
          img.onload = function() {
            uploadedImages = [{
              name: file.name,
              dataURL: reader.result,
              originalDataURL: reader.result,
              action: 'uploaded',
              img: img
            }];
            
            // Auto-switch to edit tab after upload
            setTab('edit');
            readExifFromFirstImage();
            
            GTP.showToast('Image uploaded successfully. GPS editing tab is now active.', 'success');
          };
          img.src = reader.result;
        };
        
        reader.readAsDataURL(file);
      } else {
        // If no image uploaded, still show edit tab
        setTab('edit');
        GTP.showToast('Please upload an image to edit GPS coordinates.', 'warning');
      }
    })
    .catch(function () {
      showResult('Could not load the EXIF editor. Please check your connection and try again.', 'error');
    });
}

  function updateUploadPreview() {
    if (uploadedImages.length === 0) {
      els.uploadedImagesPreview.style.display = 'none';
      els.addMoreBtn.style.display = 'none';
      els.dropZone.style.display = '';
      return;
    }

    els.dropZone.style.display = 'none';
    els.uploadedImagesPreview.style.display = 'block';
    
    let statusHTML = '<p style="font-size:.9rem;font-weight:600;margin-bottom:12px">' + uploadedImages.length + ' image(s) uploaded</p>';
    
    statusHTML += uploadedImages.map(function(img, idx) {
      return '<div style="display:flex;align-items:center;gap:12px;padding:8px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:8px">' +
        '<svg class="icon" style="width:20px;height:20px;color:var(--success)"><use href="/images/icons.svg#icon-check"></use></svg>' +
        '<span style="font-size:.88rem">' + img.name + ' (' + formatBytes(img.size) + ')</span>' +
        '</div>';
    }).join('');

    if (uploadedImages.length >= MAX_IMAGES) {
      statusHTML += '<p style="font-size:.85rem;color:var(--text-muted);margin-top:12px;padding:10px;background:var(--info-bg);border-radius:var(--radius-sm);border:1px solid var(--border)">✓ Maximum ' + MAX_IMAGES + ' images uploaded. Remove images to upload different ones.</p>';
    }

    els.uploadedImagesPreview.innerHTML = statusHTML;

    if (uploadedImages.length < MAX_IMAGES) {
      els.addMoreBtn.style.display = 'inline-flex';
    } else {
      els.addMoreBtn.style.display = 'none';
    }

    updateImagesPreview();
  }

  function updateImagesPreview() {
    if (uploadedImages.length === 0) return;

    console.log('Updating image preview for', uploadedImages.length, 'images'); // Debug log

    els.imagesPreviewContainer.innerHTML = uploadedImages.map(function(img, idx) {
      console.log('Processing image:', img.name, 'dataURL length:', img.dataURL ? img.dataURL.length : 'undefined'); // Debug log
      return '<div style="margin-bottom:20px">' +
        '<div class="preview-img-wrap">' +
        '<img src="' + img.dataURL + '" alt="Image ' + (idx + 1) + ' preview" style="max-height:250px" onerror="console.log(\'Image load error\'); this.style.display=\'none\'">' +
        '</div>' +
        '<div style="margin-top:8px">' +
        '<strong style="font-size:.9rem">' + img.name + '</strong>' +
        '<span style="font-size:.82rem;color:var(--text-muted);margin-left:8px">' + formatBytes(img.size) + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function readExifFromFirstImage() {
    if (uploadedImages.length === 0) return;

    console.log('Reading EXIF from first image'); // Debug log

    let lat = 40.7128;
    let lng = -74.0060;
    let hasGPS = false;
    const rows = [];

    try {
      const exif = piexif.load(uploadedImages[0].dataURL);
      const zeroth = exif['0th'] || {};
      const exifData = exif.Exif || {};
      const gps = exif.GPS || {};

      console.log('EXIF data loaded:', exif); // Debug log
      console.log('GPS data:', gps); // Debug log

      if (zeroth[piexif.ImageIFD.Make]) rows.push(['Camera Make', zeroth[piexif.ImageIFD.Make]]);
      if (zeroth[piexif.ImageIFD.Model]) rows.push(['Camera Model', zeroth[piexif.ImageIFD.Model]]);
      if (zeroth[piexif.ImageIFD.Software]) rows.push(['Software', zeroth[piexif.ImageIFD.Software]]);
      if (zeroth[piexif.ImageIFD.DateTime]) rows.push(['Date/Time', zeroth[piexif.ImageIFD.DateTime]]);
      if (exifData[piexif.ExifIFD.PixelXDimension]) rows.push(['Width', exifData[piexif.ExifIFD.PixelXDimension] + 'px']);
      if (exifData[piexif.ExifIFD.PixelYDimension]) rows.push(['Height', exifData[piexif.ExifIFD.PixelYDimension] + 'px']);

      if (gps[piexif.GPSIFD.GPSLatitude] && gps[piexif.GPSIFD.GPSLongitude]) {
        const parsedLat = dmsToDecimal(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef]);
        const parsedLng = dmsToDecimal(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef]);
        if (parsedLat !== null && parsedLng !== null) {
          lat = parsedLat;
          lng = parsedLng;
          hasGPS = true;
          rows.push(['GPS Latitude', lat]);
          rows.push(['GPS Longitude', lng]);
          console.log('GPS found:', lat, lng); // Debug log
        }
      } else {
        console.log('No GPS data found in image'); // Debug log
      }

      if (gps[piexif.GPSIFD.GPSAltitude]) {
        const altitude = gps[piexif.GPSIFD.GPSAltitude];
        rows.push(['GPS Altitude', (altitude[0] / altitude[1]).toFixed(1) + ' m']);
      }
    } catch (_) {
      rows.push(['EXIF Data', 'No EXIF metadata found']);
    }

    if (!rows.length) rows.push(['EXIF Data', 'No EXIF metadata found']);

    els.metaBody.innerHTML = rows.map(function (row) {
      return '<tr><th scope="row">' + row[0] + '</th><td>' + row[1] + '</td></tr>';
    }).join('');

    els.latInput.value = hasGPS ? lat : '';
    els.lngInput.value = hasGPS ? lng : '';
    
    console.log('Setting inputs:', hasGPS, lat, lng); // Debug log
    console.log('latInput element:', els.latInput); // Debug log
    console.log('lngInput element:', els.lngInput); // Debug log
    console.log('latInput value after setting:', els.latInput ? els.latInput.value : 'undefined'); // Debug log
    console.log('lngInput value after setting:', els.lngInput ? els.lngInput.value : 'undefined'); // Debug log

    initMapAsync(lat, lng);
    validateCoords();
  }

  function validateCoords() {
    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);
    const isValid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    els.applyBtn.disabled = !isValid;
    
    console.log('Validating coords:', lat, lng, 'isValid:', isValid); // Debug log
    console.log('latInput value:', els.latInput ? els.latInput.value : 'undefined'); // Debug log
    console.log('lngInput value:', els.lngInput ? els.lngInput.value : 'undefined'); // Debug log
    return isValid;
  }

  function applyGPS() {
    if (uploadedImages.length === 0) {
      GTP.showToast('Upload images first.');
      return;
    }

    if (!validateCoords()) {
      showResult('Please enter both Latitude and Longitude.', 'error');
      return;
    }

    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);

    showResult('Processing images... Applying coordinates...', 'success');

    setTimeout(function() {
      try {
        uploadedImages.forEach(function(img) {
          let exif;
          try {
            exif = piexif.load(img.dataURL);
          } catch (_) {
            exif = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} };
          }

          exif.GPS[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
          exif.GPS[piexif.GPSIFD.GPSLatitude] = decimalToDMS(lat);
          exif.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
          exif.GPS[piexif.GPSIFD.GPSLongitude] = decimalToDMS(lng);
          exif.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';

          img.modifiedDataURL = piexif.insert(piexif.dump(exif), img.dataURL);
          img.action = 'geotagged';
        });

        showResult('GPS coordinates applied successfully. Latitude: ' + lat + ', Longitude: ' + lng + '.', 'success');
        displayProcessedImages();
        GTP.showToast('GPS metadata saved successfully.');
        
        // Auto-switch to download tab after processing
        setTimeout(function() {
          setTab('download');
          updateDownloadPreview();
        }, 1000);
      } catch (error) {
        showResult('Error writing EXIF data. Please try another image.', 'error');
        GTP.showToast('Failed to write EXIF data.');
      }
    }, 100);
  }

  function updateDownloadPreview() {
    if (uploadedImages.length === 0) return;
    
    const img = uploadedImages[0];
    const dataURL = img.modifiedDataURL || img.dataURL;
    const previewImg = $('dlPreviewImg');
    
    if (previewImg && dataURL) {
      previewImg.src = dataURL;
    }
  }

  function displayProcessedImages() {
    els.processedImagesContainer.style.display = 'block';
    els.processedImagesContainer.innerHTML = '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:16px">Processed Images</h3>' +
      uploadedImages.map(function(img, idx) {
        const dataURL = img.modifiedDataURL || img.dataURL;
        return '<div style="margin-bottom:24px;padding:20px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">' +
          '<div class="preview-img-wrap" style="margin-bottom:12px">' +
          '<img src="' + dataURL + '" alt="Processed image ' + (idx + 1) + '" style="max-height:250px">' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<strong style="font-size:.9rem">' + img.name + '</strong>' +
          '<button class="btn btn-success btn-sm download-single-btn" data-index="' + idx + '">' +
          '<svg class="icon"><use href="/images/icons.svg#icon-download"></use></svg> Download Processed Image' +
          '</button>' +
          '</div>' +
          '</div>';
      }).join('');

    document.querySelectorAll('.download-single-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        downloadSingleImage(idx);
      });
    });
    
    // Update main download button text based on count
    if (els.downloadBtn) {
      if (uploadedImages.length > 1) {
        els.downloadBtn.innerHTML = '<svg class="icon"><use href="/images/icons.svg#icon-download"></use></svg> Download All Processed Images';
      } else {
        els.downloadBtn.innerHTML = '<svg class="icon"><use href="/images/icons.svg#icon-download"></use></svg> Download Processed Image';
      }
    }
  }

  function downloadSingleImage(idx) {
    if (!uploadedImages[idx]) return;
    const img = uploadedImages[idx];
    const data = img.modifiedDataURL || img.dataURL;

    const link = document.createElement('a');
    const dotIndex = img.name.lastIndexOf('.');
    const baseName = dotIndex > 0 ? img.name.substring(0, dotIndex) : img.name;
    const suffix = img.action === 'cleaned' ? '_cleaned.jpg' : '_geotagged.jpg';

    link.href = data;
    link.download = baseName + suffix;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    GTP.showToast('Download started for ' + img.name);
  }

  function removeGPS() {
    if (uploadedImages.length === 0) {
      GTP.showToast('Upload images first.');
      return;
    }

    try {
      uploadedImages.forEach(function(img) {
        let exif;
        try {
          exif = piexif.load(img.dataURL);
        } catch (_) {
          return;
        }

        exif.GPS = {};
        img.modifiedDataURL = piexif.insert(piexif.dump(exif), img.dataURL);
        img.action = 'cleaned';
      });

      els.latInput.value = '';
      els.lngInput.value = '';
      showResult('GPS geotag removed successfully from all images.', 'success');
      displayProcessedImages();
      GTP.showToast('GPS metadata removed from all images.');
    } catch (_) {
      showResult('Error removing GPS metadata. Please try another image.', 'error');
    }
  }

  function resetTool() {
    uploadedImages = [];
    els.fileInput.value = '';
    els.latInput.value = '';
    els.lngInput.value = '';
    els.metaBody.innerHTML = '';
    els.processedImagesContainer.style.display = 'none';
    els.processedImagesContainer.innerHTML = '';
    hideResult();
    updateUploadPreview();
    setTab('upload');
    renderMapStatus('Upload images to load the interactive map.', false);
    if (map) {
      map.remove();
      map = null;
      marker = null;
    }
  }

  function init() {
    cacheEls();
    if (!els.dropZone) return;

    els.resultBanner.setAttribute('hidden', '');
    els.resultBanner.setAttribute('aria-live', 'polite');
    els.fileInput.setAttribute('aria-label', 'Upload JPEG images');
    renderMapStatus('Upload images to load the interactive map.', false);

    ['dragenter', 'dragover'].forEach(function (eventName) {
      els.dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        els.dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(function (eventName) {
      els.dropZone.addEventListener(eventName, function () {
        els.dropZone.classList.remove('drag-over');
      });
    });

    els.dropZone.addEventListener('drop', function (event) {
      event.preventDefault();
      handleFiles(event.dataTransfer.files);
    });

    els.fileInput.addEventListener('change', function () {
      handleFiles(this.files);
    });

    els.addMoreBtn.addEventListener('click', function() {
      els.fileInput.click();
    });

    els.removeBtn.addEventListener('click', resetTool);
    els.applyBtn.addEventListener('click', applyGPS);
    els.removeGpsBtn.addEventListener('click', removeGPS);

    els.latInput.addEventListener('input', function () {
      validateCoords();
      updateMapMarker();
    });

    els.lngInput.addEventListener('input', function () {
      validateCoords();
      updateMapMarker();
    });

    els.tabUpload.addEventListener('click', function () {
      setTab('upload');
    });

    els.tabEdit.addEventListener('click', function () {
      if (uploadedImages.length > 0) {
        readExifFromFirstImage();
        setTab('edit');
      } else {
        setTab('edit');
        showResult('Please upload an image first to edit GPS coordinates.', 'warning');
      }
    });

    els.downloadBtn.addEventListener('click', function() {
      if (uploadedImages.length === 0) return;
      
      if (uploadedImages.length === 1) {
        downloadSingleImage(0);
        return;
      }
      
      showResult('Preparing download...', 'success');
      GTP.showToast('Bundling images into ZIP...');
      
      ensureJSZip()
        .then(function() {
          var zip = new JSZip();
          var imgFolder = zip.folder("processed_images");
          
          uploadedImages.forEach(function(img) {
            var dataURL = img.modifiedDataURL || img.dataURL;
            var base64Data = dataURL.split(',')[1];
            var dotIndex = img.name.lastIndexOf('.');
            var baseName = dotIndex > 0 ? img.name.substring(0, dotIndex) : img.name;
            var suffix = img.action === 'cleaned' ? '_cleaned.jpg' : '_geotagged.jpg';
            var fileName = baseName + suffix;
            
            imgFolder.file(fileName, base64Data, {base64: true});
          });
          
          zip.generateAsync({type:"blob"})
            .then(function(content) {
              var url = window.URL.createObjectURL(content);
              var link = document.createElement('a');
              link.href = url;
              link.download = "processed_images.zip";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              hideResult();
            })
            .catch(function(err) {
              showResult('Error creating ZIP file.', 'error');
            });
        })
        .catch(function() {
          showResult('Error loading JSZip. Downloading individually...', 'warning');
          uploadedImages.forEach(function(_, idx) {
            setTimeout(function() { downloadSingleImage(idx); }, idx * 500);
          });
        });
    });

    setTab('upload');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
