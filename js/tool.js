/* ============================================
   GeoTagPro — Geo Tag Editor Tool Logic
   ============================================ */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const PIEXIF_URL = 'https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js';
  const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

  let originalDataURL = null;
  let modifiedDataURL = null;
  let currentFileName = 'image.jpg';
  let map = null;
  let marker = null;
  let piexifPromise = null;
  let leafletPromise = null;

  const els = {};

  function cacheEls() {
    [
      'dropZone', 'fileInput', 'previewArea', 'previewImg', 'fileName', 'fileSize',
      'removeBtn', 'metaBody', 'latInput', 'lngInput', 'applyBtn', 'removeGpsBtn',
      'downloadBtn', 'resultBanner', 'resultText', 'mapContainer', 'tabUpload',
      'tabEdit', 'tabDownload', 'editSection', 'downloadSection', 'uploadSection'
    ].forEach(function (id) {
      els[id] = $(id);
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

  function handleFile(file) {
    if (!file) return;
    if (!file.type.match(/image\/jpe?g/i)) {
      GTP.showToast('Please upload a JPEG or JPG image file.');
      return;
    }

    currentFileName = file.name;
    modifiedDataURL = null;
    hideResult();
    renderMapStatus('Loading image metadata tools...', false);

    ensurePiexif()
      .then(function () {
        const reader = new FileReader();
        reader.onload = function (event) {
          originalDataURL = event.target.result;
          els.previewImg.src = originalDataURL;
          els.previewImg.width = 1200;
          els.previewImg.height = 900;
          els.fileName.textContent = file.name;
          els.fileSize.textContent = formatBytes(file.size);
          els.previewArea.classList.add('visible');
          els.dropZone.style.display = 'none';

          readExif(originalDataURL);
          setTab('edit');
        };
        reader.readAsDataURL(file);
      })
      .catch(function () {
        showResult('Could not load the EXIF editor. Please check your connection and try again.', 'error');
      });
  }

  function readExif(dataURL) {
    let lat = 40.7128;
    let lng = -74.0060;
    let hasGPS = false;
    const rows = [];

    try {
      const exif = piexif.load(dataURL);
      const zeroth = exif['0th'] || {};
      const exifData = exif.Exif || {};
      const gps = exif.GPS || {};

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
        }
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

    initMapAsync(lat, lng);
    validateCoords();
  }

  function validateCoords() {
    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);
    const isValid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    els.applyBtn.disabled = !isValid;
    return isValid;
  }

  function applyGPS() {
    if (!originalDataURL) {
      GTP.showToast('Upload an image first.');
      return;
    }

    if (!validateCoords()) {
      GTP.showToast('Enter valid coordinates.');
      return;
    }

    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);

    try {
      let exif;
      try {
        exif = piexif.load(originalDataURL);
      } catch (_) {
        exif = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} };
      }

      exif.GPS[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
      exif.GPS[piexif.GPSIFD.GPSLatitude] = decimalToDMS(lat);
      exif.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
      exif.GPS[piexif.GPSIFD.GPSLongitude] = decimalToDMS(lng);
      exif.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';

      modifiedDataURL = piexif.insert(piexif.dump(exif), originalDataURL);
      showResult('GPS coordinates applied successfully. Latitude: ' + lat + ', Longitude: ' + lng + '.', 'success');
      setTab('download');
      $('dlPreviewImg').src = modifiedDataURL;
      $('dlPreviewImg').width = 1200;
      $('dlPreviewImg').height = 900;
      GTP.showToast('GPS metadata saved.');
    } catch (error) {
      showResult('Error writing EXIF data. Please try another image.', 'error');
      GTP.showToast('Failed to write EXIF data.');
    }
  }

  function removeGPS() {
    if (!originalDataURL) {
      GTP.showToast('Upload an image first.');
      return;
    }

    try {
      let exif;
      try {
        exif = piexif.load(originalDataURL);
      } catch (_) {
        GTP.showToast('No EXIF data to remove.');
        return;
      }

      exif.GPS = {};
      modifiedDataURL = piexif.insert(piexif.dump(exif), originalDataURL);
      els.latInput.value = '';
      els.lngInput.value = '';
      showResult('GPS geotag removed successfully.', 'success');
      setTab('download');
      $('dlPreviewImg').src = modifiedDataURL;
      $('dlPreviewImg').width = 1200;
      $('dlPreviewImg').height = 900;
      GTP.showToast('GPS metadata removed.');
    } catch (_) {
      showResult('Error removing GPS metadata. Please try another image.', 'error');
    }
  }

  function downloadImage() {
    const data = modifiedDataURL || originalDataURL;
    if (!data) return;

    const link = document.createElement('a');
    const dotIndex = currentFileName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? currentFileName.substring(0, dotIndex) : currentFileName;

    link.href = data;
    link.download = baseName + '_geotagged.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    GTP.showToast('Download started.');
  }

  function resetTool() {
    originalDataURL = null;
    modifiedDataURL = null;
    els.previewArea.classList.remove('visible');
    els.dropZone.style.display = '';
    els.fileInput.value = '';
    els.latInput.value = '';
    els.lngInput.value = '';
    els.metaBody.innerHTML = '';
    hideResult();
    setTab('upload');
    renderMapStatus('Upload an image to load the interactive map.', false);
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
    els.fileInput.setAttribute('aria-label', 'Upload a JPEG image');
    renderMapStatus('Upload an image to load the interactive map.', false);

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
      handleFile(event.dataTransfer.files[0]);
    });

    els.fileInput.addEventListener('change', function () {
      handleFile(this.files[0]);
    });

    els.removeBtn.addEventListener('click', resetTool);
    els.applyBtn.addEventListener('click', applyGPS);
    els.removeGpsBtn.addEventListener('click', removeGPS);
    els.downloadBtn.addEventListener('click', downloadImage);

    els.latInput.addEventListener('input', function () {
      validateCoords();
      updateMapMarker();
    });

    els.lngInput.addEventListener('input', function () {
      validateCoords();
      updateMapMarker();
    });

    els.tabUpload.addEventListener('click', function () {
      if (!originalDataURL) setTab('upload');
    });

    els.tabEdit.addEventListener('click', function () {
      if (originalDataURL) setTab('edit');
    });

    els.tabDownload.addEventListener('click', function () {
      if (modifiedDataURL) setTab('download');
    });

    setTab('upload');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
