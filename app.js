(() => {
  const RATE_LOW = 400, RATE_HIGH = 600;
  const $ = (s, r = document) => r.querySelector(s);
  const nzd = n => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n);
  const round = (n, to) => Math.round(n / to) * to;
  const state = { address: '', length: 0, area: 0, segments: 0, surface: 'Asphalt', low: 0, high: 0 };

  /* ---------- nav / reveal ---------- */
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
  $('#navToggle').onclick = () => nav.classList.toggle('open');
  document.querySelectorAll('#navLinks a').forEach(a => a.onclick = () => nav.classList.remove('open'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 6) * 60 + 'ms'; io.observe(el); });

  const toastEl = $('#toast'); let tt;
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('show'), 3200); };

  /* ---------- map ---------- */
  if (!window.L) { $('#map').innerHTML = '<p style="padding:24px;color:#fff">Map failed to load. Please refresh.</p>'; return; }
  const CHCH = [-43.5321, 172.6362];
  const map = L.map('map', { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(CHCH, 13);
  L.control.zoom({ position: innerWidth < 700 ? 'bottomright' : 'topright' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, opacity: .8 }).addTo(map);
  map.on('focus click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  map.attributionControl.addAttribution('Geocoding © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');

  // deep link from area pages: ?lat=&lng=&place=
  const qs = new URLSearchParams(location.search);
  const qLat = parseFloat(qs.get('lat')), qLng = parseFloat(qs.get('lng'));
  const groups = { track: new L.FeatureGroup(), fill: new L.FeatureGroup() };
  const bands = new L.FeatureGroup().addTo(map);   // surfaced band preview for track mode
  const lineStyle = { color: '#d9ff5b', weight: 2, opacity: .95, dashArray: '4 6' };
  const bandStyle = { color: '#d9ff5b', weight: 1, fillColor: '#d9ff5b', fillOpacity: .55, interactive: false };
  const fillStyle = { color: '#d9ff5b', weight: 3, fillColor: '#d9ff5b', fillOpacity: .35 };
  state.mode = 'track'; state.width = 1.5;
  groups.track.addTo(map);
  const active = () => groups[state.mode];
  let pin = null, drawer = null, editor = null, lenLabel = null;

  const drawBtn = $('#drawBtn'), finishBtn = $('#finishBtn'), editBtn = $('#editBtn'), resetBtn = $('#resetBtn'), hint = $('#mapHint');
  const drawLabel = () => state.mode === 'track'
    ? (active().getLayers().length ? '<span>＋</span> Add line' : '<span>✎</span> Draw track')
    : (active().getLayers().length ? '<span>＋</span> Add area' : '<span>✎</span> Draw area');
  const idleHint = () => state.mode === 'track'
    ? 'Tap <b>Draw track</b> and click along the riding line · press <b>Finish</b> (or double-click) to end · end on the start to close a loop'
    : 'Tap <b>Draw area</b> and click around the whole area to surface · click the <b>first point</b> to finish';

  function startDraw() {
    if (editor) stopEdit();
    if (drawer && drawer.enabled()) { drawer.disable(); return; }
    const icon = new L.DivIcon({ iconSize: new L.Point(12, 12), className: 'leaflet-div-icon leaflet-editing-icon' });
    drawer = state.mode === 'track'
      ? new L.Draw.Polyline(map, { shapeOptions: lineStyle, guidelineDistance: 10, showLength: true, metric: true, icon })
      : new L.Draw.Polygon(map, { allowIntersection: false, showArea: false, shapeOptions: fillStyle, guidelineDistance: 12, icon });
    drawer.enable();
    drawBtn.classList.add('on'); drawBtn.innerHTML = '<span>✕</span> Cancel';
    finishBtn.hidden = state.mode !== 'track';
    hint.innerHTML = state.mode === 'track'
      ? 'Click along the riding line · press <b>Finish</b> or double-click to end · end on the start to close a loop'
      : 'Click around the area · click the <b>first point</b> to finish';
  }
  finishBtn.onclick = () => { if (drawer && drawer.enabled() && drawer.completeShape) { if ((drawer._markers || []).length >= 2) drawer.completeShape(); else toast('Add at least two points first.'); } };
  map.on(L.Draw.Event.DRAWSTOP, () => { drawBtn.classList.remove('on'); drawBtn.innerHTML = drawLabel(); finishBtn.hidden = true; });
  map.on(L.Draw.Event.CREATED, e => { if (state.mode === 'track') snapLoop(e.layer); active().addLayer(e.layer); afterChange(); });

  function snapLoop(layer) {
    const ll = layer.getLatLngs();
    if (ll.length > 2 && ll[0].distanceTo(ll[ll.length - 1]) < 3) { ll[ll.length - 1] = ll[0]; layer.setLatLngs(ll); }
  }
  function syncButtons() {
    const n = active().getLayers().length;
    editBtn.disabled = !n; resetBtn.disabled = !n; drawBtn.innerHTML = drawLabel();
  }
  function afterChange() {
    syncButtons();
    if (active().getLayers().length) hint.innerHTML = state.mode === 'track'
      ? 'Track drawn. <b>Add line</b> for more segments, adjust the width, or <b>Edit</b> to drag points.'
      : 'Area drawn. <b>Add area</b> for another patch, or <b>Edit</b> to drag corners.';
    recalc();
  }
  function stopEdit() { if (editor) { editor.save(); editor.disable(); editor = null; } editBtn.classList.remove('on'); editBtn.innerHTML = '<span>⤧</span> Edit'; recalc(); }
  editBtn.onclick = () => {
    if (!active().getLayers().length) return;
    if (editor) { stopEdit(); hint.innerHTML = 'Saved. Adjust the surface or book a site visit.'; return; }
    if (drawer && drawer.enabled()) drawer.disable();
    const sty = state.mode === 'track' ? { ...lineStyle, dashArray: null } : { ...fillStyle, dashArray: '6 6' };
    editor = new L.EditToolbar.Edit(map, { featureGroup: active(), selectedPathOptions: { ...sty, maintainColor: true } });
    editor.enable();
    editBtn.classList.add('on'); editBtn.innerHTML = '<span>✓</span> Done';
    hint.innerHTML = 'Drag the white points · drag a midpoint to add one · press <b>Done</b>';
  };
  map.on('draw:editvertex draw:editmove', () => recalc());
  function endInteractions() {
    if (drawer && drawer.enabled()) drawer.disable();
    if (editor) { editor.save(); editor.disable(); editor = null; editBtn.classList.remove('on'); editBtn.innerHTML = '<span>⤧</span> Edit'; }
  }
  function clearShape(silent) {
    endInteractions();
    active().clearLayers(); bands.clearLayers();
    syncButtons();
    if (!silent) hint.innerHTML = 'Cleared. ' + idleHint();
    recalc();
  }
  drawBtn.onclick = startDraw;
  resetBtn.onclick = () => clearShape();

  if (!isNaN(qLat) && !isNaN(qLng)) {
    const place = (qs.get('place') || '').slice(0, 60);
    map.setView([qLat, qLng], 15);
    pin = L.circleMarker([qLat, qLng], { radius: 7, color: '#fff', weight: 2, fillColor: '#5be3b0', fillOpacity: 1 }).addTo(map);
    if (place) { state.address = place + ', Canterbury'; document.getElementById('addrInput').value = state.address; }
    hint.innerHTML = 'Centred on <b>' + (place ? place.replace(/[<>&]/g, '') : 'your area') + '</b>. Search your exact site, then ' + idleHint().replace(/^Tap/, 'tap');
  }

  /* ---------- build type + width ---------- */
  const widthRow = $('#widthRow'), widthIn = $('#widthIn'), widthOut = $('#widthOut');
  function setWidthFill() { const k = (state.width - 0.5) / 1.5 * 100; widthIn.style.setProperty('--k', k + '%'); }
  widthIn.oninput = () => { state.width = Math.round(parseFloat(widthIn.value) * 10) / 10; widthOut.textContent = state.width.toFixed(1) + ' m'; setWidthFill(); recalc(); };
  setWidthFill();
  document.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => {
    if (b.dataset.m === state.mode) return;
    endInteractions();
    document.querySelectorAll('#modeSeg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    map.removeLayer(active()); state.mode = b.dataset.m; active().addTo(map);
    widthRow.classList.toggle('collapsed', state.mode !== 'track');
    $('#modeNote').textContent = state.mode === 'track' ? 'Only the riding line is surfaced: length × width.' : 'The whole drawn area is surfaced, including the infield.';
    syncButtons(); hint.innerHTML = active().getLayers().length ? 'Switched build type — showing your ' + (state.mode === 'track' ? 'track line.' : 'fill-in area.') : idleHint();
    recalc();
  });

  /* ---------- geometry + estimate ---------- */
  function category(len) {
    if (len < 60) return ['Skills strip', 'A short line — suits a learn-to-ride strip or modular starter. Most pump tracks start around 60 m of track.'];
    if (len < 150) return ['School / compact', 'A tidy single loop with rollers and two berms — ideal for a school or neighbourhood park.'];
    if (len < 300) return ['Community track', 'Enough line for a main loop plus a beginner line, so mixed ages can ride together.'];
    if (len < 500) return ['Regional track', 'Multiple interconnected lines with progression from beginner to advanced.'];
    return ['Destination track', 'Event-capable layout with advanced lines, spectator areas and staging.'];
  }
  function catArea(a) {
    if (a < 200) return ['Compact pad', 'A small sealed pad — suits a skills area or a compact school track with a sealed infield.'];
    if (a < 600) return ['School / compact', 'A fully sealed compact track — easy to sweep and great for scooters and balance bikes.'];
    if (a < 1500) return ['Community track', 'A fully surfaced community track with room for multiple lines and a sealed infield.'];
    return ['Destination track', 'A large fully surfaced area — space for advanced lines, events and spectator zones.'];
  }
  function setLabel(at, txt) {
    if (!at) { if (lenLabel) { map.removeLayer(lenLabel); lenLabel = null; } return; }
    if (!lenLabel) lenLabel = L.tooltip({ permanent: true, direction: 'top', offset: [0, -8], className: 'area-label' }).setLatLng(at).setContent(txt).addTo(map);
    else lenLabel.setLatLng(at).setContent(txt);
  }
  function recalc() {
    bands.clearLayers();
    state.length = 0; state.area = 0; state.segments = 0;
    if (state.mode === 'track') {
      const layers = groups.track.getLayers().filter(l => l.getLatLngs().length >= 2);
      let len = 0;
      layers.forEach(l => {
        const line = turf.lineString(l.getLatLngs().map(p => [p.lng, p.lat]));
        len += turf.length(line, { units: 'kilometers' }) * 1000;
        try { L.geoJSON(turf.buffer(line, state.width / 2, { units: 'meters', steps: 8 }), { style: () => bandStyle, interactive: false }).addTo(bands); } catch (e) {}
      });
      bands.bringToBack();
      state.length = Math.round(len); state.area = Math.round(len * state.width); state.segments = layers.length;
      if (layers.length) { const ll = layers[layers.length - 1].getLatLngs(); setLabel(ll[Math.floor(ll.length / 2)], `${state.length.toLocaleString('en-NZ')} m · ${state.area.toLocaleString('en-NZ')} m²`); } else setLabel(null);
    } else {
      const layers = groups.fill.getLayers();
      let area = 0, c = null;
      layers.forEach(l => {
        let ll = l.getLatLngs(); while (Array.isArray(ll[0])) ll = ll[0];
        if (ll.length < 3) return;
        const ring = ll.map(p => [p.lng, p.lat]); ring.push(ring[0]);
        const poly = turf.polygon([ring]); area += turf.area(poly);
        const cc = turf.centroid(poly).geometry.coordinates; c = [cc[1], cc[0]];
      });
      state.area = Math.round(area); state.segments = layers.length;
      setLabel(state.area ? c : null, `${state.area.toLocaleString('en-NZ')} m²`);
    }
    render();
  }
  let animFrom = { main: 0, low: 0, high: 0 };
  function tween(el, from, to, fmt) {
    const t0 = performance.now(), d = 650;
    const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function render() {
    const has = state.area > 0;
    $('#estEmpty').hidden = has; $('#estFilled').hidden = !has;
    $('#emptyText').textContent = state.mode === 'track' ? 'Draw the track line on the map to see your estimate.' : 'Draw the area to surface on the map to see your estimate.';
    if (!has) { state.low = state.high = 0; animFrom.main = 0; updateSummary(); return; }
    const a = state.area, len = state.length, track = state.mode === 'track';
    state.low = round(a * RATE_LOW, 1000); state.high = round(a * RATE_HIGH, 1000);
    const main = track ? len : a;
    $('#mainLbl').textContent = track ? 'Track length' : 'Surfaced area';
    $('#mainUnit').textContent = track ? 'm' : 'm²';
    tween($('#outMain'), animFrom.main, main, v => Math.round(v).toLocaleString('en-NZ'));
    tween($('#outLow'), animFrom.low, state.low, v => nzd(round(v, 100)));
    tween($('#outHigh'), animFrom.high, state.high, v => nzd(round(v, 100)));
    animFrom = { main, low: state.low, high: state.high };
    $('#outSurface').textContent = state.surface;
    $('#outCalc').textContent = track ? `${len.toLocaleString('en-NZ')} m × ${state.width.toFixed(1)} m = ${a.toLocaleString('en-NZ')} m² surfaced` : 'Whole area surfaced (fill in)';
    $('#outBuild').textContent = track ? 'Track only' : 'Fill in';
    $('#outWidthLbl').textContent = track ? 'Track width' : 'Areas drawn';
    $('#outWidth').textContent = track ? `${state.width.toFixed(1)} m` : String(state.segments);
    $('#outAreaLbl').textContent = track ? 'Surfaced area' : 'Approx. track line';
    $('#outArea').textContent = track ? `${a.toLocaleString('en-NZ')} m²` : `≈ ${round(a / 5, 5)}–${round(a / 3.5, 5)} m`;
    const [cat, note] = track ? category(len) : catArea(a);
    $('#outCat').textContent = cat; $('#outNote').textContent = note;
    const rl = track ? len : a / 4;
    $('#outRiders').textContent = `${Math.max(2, Math.round(rl / 25))}–${Math.max(3, Math.round(rl / 15))}`;
    $('#rangeFill').style.width = Math.min(100, 10 + a / 10) + '%';
    updateSummary();
  }

  /* ---------- surface ---------- */
  document.querySelectorAll('#surfaceSeg button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#surfaceSeg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    state.surface = b.dataset.s; $('#fSurface').value = state.surface; render();
  });

  /* ---------- geocoding (Nominatim, on submit only per usage policy) ---------- */
  const form = $('#addrForm'), input = $('#addrInput'), results = $('#addrResults');
  let lastQ = '', busy = false;
  form.onsubmit = async ev => {
    ev.preventDefault();
    const q = input.value.trim(); if (!q || busy) return;
    busy = true; $('#addrBtn').textContent = '…';
    try {
      const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
        q, format: 'jsonv2', limit: 6, countrycodes: 'nz', addressdetails: 1,
        viewbox: '170.4,-41.9,174.2,-45.1', bounded: 0, 'accept-language': 'en'
      });
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      let data = await r.json();
      // prefer Canterbury results
      data.sort((a, b) => (/Canterbury/.test(b.display_name) - /Canterbury/.test(a.display_name)));
      lastQ = q; showResults(data);
    } catch (e) { toast('Address search is unavailable right now — pan the map to your site instead.'); }
    finally { busy = false; $('#addrBtn').textContent = 'Find'; }
  };
  function showResults(data) {
    results.innerHTML = '';
    if (!data.length) { results.innerHTML = '<li><b>No matches.</b><small>Try a street, suburb, school or park name.</small></li>'; results.classList.add('show'); return; }
    data.forEach(d => {
      const li = document.createElement('li'); const parts = d.display_name.split(', ');
      li.innerHTML = `<b>${esc(niceAddr(d))}</b><small>${esc(parts.slice(-4).join(', '))}</small>`;
      li.onclick = () => choose(d); results.appendChild(li);
    });
    results.classList.add('show');
    if (data.length === 1) choose(data[0]);
  }
  function choose(d) {
    results.classList.remove('show');
    const lat = +d.lat, lon = +d.lon;
    state.address = niceAddr(d);
    input.value = state.address;
    if (pin) map.removeLayer(pin);
    pin = L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#5be3b0', fillOpacity: 1 }).addTo(map);
    map.flyTo([lat, lon], 18, { duration: 1.6 });
    hint.innerHTML = 'Found it. ' + idleHint();
    drawBtn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 600, iterations: 2, delay: 1600 });
    updateSummary();
  }
  function niceAddr(d) {
    const a = d.address || {};
    const num = a.house_number ? a.house_number + ' ' : '';
    const parts = [d.name, a.road ? num + a.road : '', a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county];
    const out = []; parts.forEach(x => { if (x && !out.includes(x) && !/Community$/.test(x)) out.push(x); });
    return out.length ? out.join(', ') : d.display_name.split(', ').slice(0, 3).join(', ');
  }
  document.addEventListener('click', e => { if (!form.contains(e.target)) results.classList.remove('show'); });
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- sample site ---------- */
  $('#sampleBtn').onclick = () => {
    const c = [-43.5309, 172.6195]; // Hagley Park North (illustrative)
    state.address = 'Hagley Park, Christchurch Central City (sample)'; input.value = state.address;
    clearShape(true);
    const mLat = 111320, mLon = 111320 * Math.cos(c[0] * Math.PI / 180);
    const pt = (x, y) => [c[0] + y / mLat, c[1] + x / mLon];
    const loop = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2; loop.push(pt(19 * Math.cos(t), 12 * Math.sin(t))); }
    if (state.mode === 'track') {
      groups.track.addLayer(L.polyline(loop, lineStyle));
      groups.track.addLayer(L.polyline([pt(-19, 0), pt(-6, 4), pt(6, -4), pt(19, 0)], lineStyle));
    } else {
      groups.fill.addLayer(L.polygon(loop.slice(0, -1), fillStyle));
    }
    map.flyTo(c, 19, { duration: 1.4 });
    afterChange();
  };

  /* ---------- booking ---------- */
  function rangeText() { return state.area ? `${nzd(state.low)} – ${nzd(state.high)} excl. GST` : ''; }
  const rangeFor = a => a ? `${nzd(round(a * RATE_LOW, 1000))} – ${nzd(round(a * RATE_HIGH, 1000))} excl. GST` : '';
  function updateSummary() {
    const set = (k, v) => { const el = document.querySelector(`[data-sum="${k}"]`); if (el) el.textContent = v; };
    set('address', state.address || 'Not set yet');
    set('build', state.mode === 'track' ? 'Track only' : 'Fill in');
    set('length', state.area ? (state.mode === 'track' ? `${state.length.toLocaleString('en-NZ')} m × ${state.width.toFixed(1)} m wide` : 'Whole area') : '—');
    set('area', state.area ? `${state.area.toLocaleString('en-NZ')} m²` : '—');
    set('surface', state.area ? state.surface : '—');
    set('range', rangeText() || '—');
  }
  function prefill() {
    const f = $('#bookForm');
    const put = (el, v) => { if (v) { el.value = v; el.classList.add('prefilled'); } };
    put($('#fAddress'), state.address); $('#fBuild').value = state.mode === 'track' ? 'Track only' : 'Fill in'; $('#fBuild').classList.add('prefilled'); syncFormBuild();
    put($('#fLength'), state.mode === 'track' && state.length ? String(state.length) : ''); put($('#fWidth'), state.mode === 'track' ? state.width.toFixed(1) : ''); put($('#fArea'), state.area ? String(state.area) : '');
    $('#fSurface').value = state.surface; $('#fSurface').classList.add('prefilled');
    put($('#fEstimate'), rangeText());
    $('#summaryCard').classList.remove('flash'); void $('#summaryCard').offsetWidth; $('#summaryCard').classList.add('flash');
    setTimeout(() => f.querySelector('[name=name]').focus({ preventScroll: true }), 900);
  }
  $('#bookCta').onclick = prefill;
  const d = new Date(); d.setDate(d.getDate() + 7); $('#fDate').min = new Date().toISOString().slice(0, 10); $('#fDate').value = d.toISOString().slice(0, 10);
  function formTrackCalc() { const l = parseFloat($('#fLength').value) || 0, w = parseFloat($('#fWidth').value) || 0; const a = Math.round(l * w); if (l && w) { $('#fArea').value = a; $('#fEstimate').value = rangeFor(a); } }
  function syncFormBuild() { const t = $('#fBuild').value === 'Track only'; $('#fLength').disabled = !t; $('#fWidth').disabled = !t; if (!t) { $('#fLength').value = ''; $('#fWidth').value = ''; } }
  $('#fBuild').onchange = () => { syncFormBuild(); formTrackCalc(); };
  $('#fLength').oninput = formTrackCalc; $('#fWidth').oninput = formTrackCalc;
  $('#fArea').oninput = e => { const a = parseInt(e.target.value.replace(/\D/g, ''), 10); $('#fEstimate').value = rangeFor(a); };
  $('#bookForm').onsubmit = e => {
    e.preventDefault();
    const f = e.target; let ok = true;
    ['name', 'org', 'email'].forEach(n => {
      const el = f.elements[n]; const bad = !el.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
      el.classList.toggle('invalid', bad); if (bad) ok = false;
    });
    if (!ok) { toast('Please add your name, organisation and a valid email.'); return; }
    const first = f.elements.name.value.trim().split(' ')[0];
    const dt = f.elements.date.value ? new Date(f.elements.date.value + 'T00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }) : 'a time that suits';
    $('#successText').textContent = `Thanks ${first} — we'll confirm a visit${f.elements.address.value ? ' to ' + f.elements.address.value : ''} around ${dt}. (Demo only: nothing was sent or stored.)`;
    $('#bookSuccess').hidden = false;
  };
  $('#againBtn').onclick = () => { $('#bookForm').reset(); $('#bookSuccess').hidden = true; document.querySelectorAll('.prefilled,.invalid').forEach(x => x.classList.remove('prefilled', 'invalid')); syncFormBuild(); };
  render();
})();
