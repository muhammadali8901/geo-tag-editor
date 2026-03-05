/* ============================================
   GeoTagPro — Geo Tag Editor Tool Logic
   ============================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  let originalDataURL = null;
  let modifiedDataURL = null;
  let currentFileName = 'image.jpg';
  let map = null;
  let marker = null;

  const els = {};
  function cacheEls() {
    ['dropZone','fileInput','previewArea','previewImg','fileName','fileSize',
     'removeBtn','metaBody','latInput','lngInput','applyBtn','removeGpsBtn',
     'downloadBtn','resultBanner','resultText','mapContainer',
     'tabUpload','tabEdit','tabDownload','editSection','downloadSection','uploadSection'
    ].forEach(id => { els[id] = $(id); });
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  function dmsToDecimal(dms, ref) {
    if (!dms || dms.length < 3) return null;
    const d = dms[0][0] / dms[0][1];
    const m = dms[1][0] / dms[1][1];
    const s = dms[2][0] / dms[2][1];
    let dd = d + m / 60 + s / 3600;
    if (ref === 'S' || ref === 'W') dd = -dd;
    return parseFloat(dd.toFixed(7));
  }

  function decimalToDMS(dd) {
    const abs = Math.abs(dd);
    const d = Math.floor(abs);
    const mFull = (abs - d) * 60;
    const m = Math.floor(mFull);
    const s = Math.round((mFull - m) * 60 * 10000);
    return [[d, 1], [m, 1], [s, 10000]];
  }

  function setTab(active) {
    ['tabUpload', 'tabEdit', 'tabDownload'].forEach(t => {
      if (els[t]) els[t].classList.remove('active', 'completed');
    });
    if (active === 'upload') {
      els.tabUpload.classList.add('active');
      els.uploadSection.classList.remove('hidden');
      els.editSection.classList.add('hidden');
      els.downloadSection.classList.add('hidden');
    } else if (active === 'edit') {
      els.tabUpload.classList.add('completed');
      els.tabEdit.classList.add('active');
      els.uploadSection.classList.add('hidden');
      els.editSection.classList.remove('hidden');
      els.downloadSection.classList.add('hidden');
    } else if (active === 'download') {
      els.tabUpload.classList.add('completed');
      els.tabEdit.classList.add('completed');
      els.tabDownload.classList.add('active');
      els.uploadSection.classList.add('hidden');
      els.editSection.classList.add('hidden');
      els.downloadSection.classList.remove('hidden');
    }
  }

  function showResult(msg, type) {
    els.resultBanner.className = 'result-banner ' + type;
    els.resultText.textContent = msg;
  }

  function hideResult() {
    els.resultBanner.className = 'result-banner';
    els.resultBanner.style.display = 'none';
  }

  function initMap(lat, lng) {
    if (!els.mapContainer) return;
    if (map) { map.remove(); map = null; marker = null; }

    map = L.map(els.mapContainer, { scrollWheelZoom: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', function () {
      const pos = marker.getLatLng();
      els.latInput.value = pos.lat.toFixed(7);
      els.lngInput.value = pos.lng.toFixed(7);
      validateCoords();
    });

    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      els.latInput.value = e.latlng.lat.toFixed(7);
      els.lngInput.value = e.latlng.lng.toFixed(7);
      validateCoords();
    });

    setTimeout(() => map.invalidateSize(), 200);
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
      GTP.showToast('Please upload a JPEG/JPG image file.');
      return;
    }
    currentFileName = file.name;
    modifiedDataURL = null;
    hideResult();

    const reader = new FileReader();
    reader.onload = function (e) {
      originalDataURL = e.target.result;
      els.previewImg.src = originalDataURL;
      els.fileName.textContent = file.name;
      els.fileSize.textContent = formatBytes(file.size);
      els.previewArea.classList.add('visible');
      els.dropZone.style.display = 'none';

      readExif(originalDataURL);
      setTab('edit');
      if (map) setTimeout(() => map.invalidateSize(), 300);
    };
    reader.readAsDataURL(file);
  }

  function readExif(dataURL) {
    let lat = 0, lng = 0, hasGPS = false;
    const rows = [];
    try {
      const exif = piexif.load(dataURL);

      const zeroth = exif['0th'] || {};
      if (zeroth[piexif.ImageIFD.Make]) rows.push(['Camera Make', zeroth[piexif.ImageIFD.Make]]);
      if (zeroth[piexif.ImageIFD.Model]) rows.push(['Camera Model', zeroth[piexif.ImageIFD.Model]]);
      if (zeroth[piexif.ImageIFD.Software]) rows.push(['Software', zeroth[piexif.ImageIFD.Software]]);
      if (zeroth[piexif.ImageIFD.DateTime]) rows.push(['Date/Time', zeroth[piexif.ImageIFD.DateTime]]);

      const exifData = exif['Exif'] || {};
      if (exifData[piexif.ExifIFD.PixelXDimension]) rows.push(['Width', exifData[piexif.ExifIFD.PixelXDimension] + 'px']);
      if (exifData[piexif.ExifIFD.PixelYDimension]) rows.push(['Height', exifData[piexif.ExifIFD.PixelYDimension] + 'px']);

      const gps = exif['GPS'] || {};
      if (gps[piexif.GPSIFD.GPSLatitude] && gps[piexif.GPSIFD.GPSLongitude]) {
        lat = dmsToDecimal(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef]);
        lng = dmsToDecimal(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef]);
        if (lat !== null && lng !== null) {
          hasGPS = true;
          rows.push(['GPS Latitude', lat]);
          rows.push(['GPS Longitude', lng]);
        }
      }
      if (gps[piexif.GPSIFD.GPSAltitude]) {
        const alt = gps[piexif.GPSIFD.GPSAltitude];
        rows.push(['GPS Altitude', (alt[0] / alt[1]).toFixed(1) + ' m']);
      }
    } catch (_) {}

    if (rows.length === 0) rows.push(['EXIF Data', 'No EXIF metadata found']);

    els.metaBody.innerHTML = rows.map(r =>
      `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`
    ).join('');

    if (hasGPS) {
      els.latInput.value = lat;
      els.lngInput.value = lng;
    } else {
      els.latInput.value = '';
      els.lngInput.value = '';
    }

    initMap(hasGPS ? lat : 40.7128, hasGPS ? lng : -74.0060);
    validateCoords();
  }

  function validateCoords() {
    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);
    const valid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    els.applyBtn.disabled = !valid;
    return valid;
  }

  function applyGPS() {
    if (!originalDataURL) { GTP.showToast('Upload an image first.'); return; }
    if (!validateCoords()) { GTP.showToast('Enter valid coordinates.'); return; }

    const lat = parseFloat(els.latInput.value);
    const lng = parseFloat(els.lngInput.value);

    try {
      let exif;
      try { exif = piexif.load(originalDataURL); }
      catch (_) { exif = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {} }; }

      exif['GPS'][piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
      exif['GPS'][piexif.GPSIFD.GPSLatitude] = decimalToDMS(lat);
      exif['GPS'][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
      exif['GPS'][piexif.GPSIFD.GPSLongitude] = decimalToDMS(lng);
      exif['GPS'][piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';

      const bytes = piexif.dump(exif);
      modifiedDataURL = piexif.insert(bytes, originalDataURL);

      showResult('GPS coordinates applied successfully! Latitude: ' + lat + ', Longitude: ' + lng, 'success');
      setTab('download');
      $('dlPreviewImg').src = modifiedDataURL;
      GTP.showToast('GPS metadata saved!');
    } catch (err) {
      console.error(err);
      showResult('Error writing EXIF data: ' + err.message, 'error');
      GTP.showToast('Failed to write EXIF data.');
    }
  }

  function removeGPS() {
    if (!originalDataURL) { GTP.showToast('Upload an image first.'); return; }

    try {
      let exif;
      try { exif = piexif.load(originalDataURL); }
      catch (_) { GTP.showToast('No EXIF data to remove.'); return; }

      exif['GPS'] = {};
      const bytes = piexif.dump(exif);
      modifiedDataURL = piexif.insert(bytes, originalDataURL);

      els.latInput.value = '';
      els.lngInput.value = '';
      showResult('GPS geotag removed successfully.', 'success');
      setTab('download');
      $('dlPreviewImg').src = modifiedDataURL;
      GTP.showToast('GPS metadata removed!');
    } catch (err) {
      console.error(err);
      showResult('Error removing EXIF data: ' + err.message, 'error');
    }
  }

  function downloadImage() {
    const data = modifiedDataURL || originalDataURL;
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    const dot = currentFileName.lastIndexOf('.');
    const base = dot > 0 ? currentFileName.substring(0, dot) : currentFileName;
    a.download = base + '_geotagged.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    GTP.showToast('Download started!');
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
    if (map) { map.remove(); map = null; marker = null; }
  }

  function init() {
    cacheEls();
    if (!els.dropZone) return;

    ['dragenter', 'dragover'].forEach(evt =>
      els.dropZone.addEventListener(evt, function (e) { e.preventDefault(); els.dropZone.classList.add('drag-over'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
      els.dropZone.addEventListener(evt, function () { els.dropZone.classList.remove('drag-over'); })
    );
    els.dropZone.addEventListener('drop', function (e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
    els.fileInput.addEventListener('change', function () { handleFile(this.files[0]); });
    els.removeBtn.addEventListener('click', resetTool);
    els.applyBtn.addEventListener('click', applyGPS);
    els.removeGpsBtn.addEventListener('click', removeGPS);
    els.downloadBtn.addEventListener('click', downloadImage);

    els.latInput.addEventListener('input', function () { validateCoords(); updateMapMarker(); });
    els.lngInput.addEventListener('input', function () { validateCoords(); updateMapMarker(); });

    els.tabUpload.addEventListener('click', function () { if (originalDataURL) return; setTab('upload'); });
    els.tabEdit.addEventListener('click', function () { if (originalDataURL) setTab('edit'); });
    els.tabDownload.addEventListener('click', function () { if (modifiedDataURL) setTab('download'); });

    setTab('upload');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
