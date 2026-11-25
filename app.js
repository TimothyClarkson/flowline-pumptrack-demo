(() => {
  const RATE_LOW = 400, RATE_HIGH = 600;
  const $ = (s, r = document) => r.querySelector(s);
  const nzd = n => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n);
  const round = (n, to) => Math.round(n / to) * to;
  const state = { address: '', area: 0, surface: 'Asphalt', low: 0, high: 0, layer: null };

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
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, opacity: .8 }).addTo(map);
  map.on('focus click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  map.attributionControl.addAttribution('Geocoding © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');

  const drawn = new L.FeatureGroup().addTo(map);
  const shapeStyle = { color: '#d9ff5b', weight: 3, fillColor: '#d9ff5b', fillOpacity: .25 };
  let pin = null, drawer = null, editor = null, areaLabel = null;

  const drawBtn = $('#drawBtn'), editBtn = $('#editBtn'), resetBtn = $('#resetBtn'), hint = $('#mapHint');

  function startDraw() {
    if (editor) stopEdit();
    if (drawer && drawer.enabled()) { drawer.disable(); return; }
    clearShape(true);
    drawer = new L.Draw.Polygon(map, { allowIntersection: false, showArea: false, shapeOptions: shapeStyle, guidelineDistance: 12,
      icon: new L.DivIcon({ iconSize: new L.Point(12, 12), className: 'leaflet-div-icon leaflet-editing-icon' }) });
    drawer.enable();
    drawBtn.classList.add('on'); drawBtn.innerHTML = '<span>✕</span> Cancel';
    hint.innerHTML = 'Click to add corners · click the <b>first point</b> to finish';
  }
  map.on(L.Draw.Event.DRAWSTOP, () => { drawBtn.classList.remove('on'); drawBtn.innerHTML = '<span>✎</span> Draw area'; });
  map.on(L.Draw.Event.CREATED, e => { drawn.addLayer(e.layer); setShape(e.layer); });

  function setShape(layer) {
    state.layer = layer; layer.setStyle && layer.setStyle(shapeStyle);
    editBtn.disabled = false; resetBtn.disabled = false;
    hint.innerHTML = 'Looks good? Choose a surface. Use <b>Edit</b> to drag corners.';
    recalc();
  }
  function stopEdit() { if (editor) { editor.save(); editor.disable(); editor = null; } editBtn.classList.remove('on'); editBtn.innerHTML = '<span>⤧</span> Edit'; recalc(); }
  editBtn.onclick = () => {
    if (!state.layer) return;
    if (editor) { stopEdit(); hint.innerHTML = 'Saved. Adjust the surface or book a site visit.'; return; }
    editor = new L.EditToolbar.Edit(map, { featureGroup: drawn, selectedPathOptions: { ...shapeStyle, dashArray: '6 6', maintainColor: true } });
    editor.enable();
    editBtn.classList.add('on'); editBtn.innerHTML = '<span>✓</span> Done';
    hint.innerHTML = 'Drag the white corners · drag a midpoint to add one · press <b>Done</b>';
  };
  map.on('draw:editvertex draw:editmove', () => recalc());
  function clearShape(silent) {
    if (editor) { editor.disable(); editor = null; editBtn.classList.remove('on'); editBtn.innerHTML = '<span>⤧</span> Edit'; }
    drawn.clearLayers(); state.layer = null; if (areaLabel) { map.removeLayer(areaLabel); areaLabel = null; }
    editBtn.disabled = true; resetBtn.disabled = true;
    if (!silent) { hint.innerHTML = 'Cleared. Tap <b>Draw area</b> to start again.'; }
    recalc();
  }
  drawBtn.onclick = startDraw;
  resetBtn.onclick = () => { if (drawer) drawer.disable(); clearShape(); };

  /* ---------- geometry + estimate ---------- */
  function currentLatLngs() {
    if (!state.layer) return null;
    let ll = state.layer.getLatLngs(); while (Array.isArray(ll[0])) ll = ll[0];
    return ll.length >= 3 ? ll : null;
  }
  function category(a) {
    if (a < 200) return ['Skills strip', 'Small footprint — suits a learn-to-ride strip or modular starter. Most pump tracks need 200 m²+.'];
    if (a < 450) return ['School / compact', 'A tidy single loop with rollers and two berms — ideal for a school or neighbourhood park.'];
    if (a < 1000) return ['Community track', 'Room for a main loop plus a beginner line, so mixed ages can ride together.'];
    if (a < 1800) return ['Regional track', 'Multiple interconnected lines with progression from beginner to advanced.'];
    return ['Destination track', 'Event-capable layout with advanced lines, spectator areas and staging.'];
  }
  function recalc() {
    const ll = currentLatLngs();
    if (!ll) { state.area = 0; render(); return; }
    const ring = ll.map(p => [p.lng, p.lat]); ring.push(ring[0]);
    const poly = turf.polygon([ring]);
    state.area = Math.round(turf.area(poly));
    const [w, s, e, n] = turf.bbox(poly);
    const wM = turf.distance([w, (s + n) / 2], [e, (s + n) / 2], { units: 'meters' });
    const hM = turf.distance([(w + e) / 2, s], [(w + e) / 2, n], { units: 'meters' });
    state.dims = `≈ ${Math.round(Math.max(wM, hM))} × ${Math.round(Math.min(wM, hM))} m`;
    const c = turf.centroid(poly).geometry.coordinates;
    const txt = `${state.area.toLocaleString('en-NZ')} m²`;
    if (!areaLabel) areaLabel = L.tooltip({ permanent: true, direction: 'center', className: 'area-label' }).setLatLng([c[1], c[0]]).setContent(txt).addTo(map);
    else areaLabel.setLatLng([c[1], c[0]]).setContent(txt);
    render();
  }
  let animFrom = { area: 0, low: 0, high: 0 };
  function tween(el, from, to, fmt) {
    const t0 = performance.now(), d = 650;
    const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function render() {
    const has = state.area > 0;
    $('#estEmpty').hidden = has; $('#estFilled').hidden = !has;
    if (!has) { state.low = state.high = 0; updateSummary(); return; }
    const a = state.area;
    state.low = round(a * RATE_LOW, 1000); state.high = round(a * RATE_HIGH, 1000);
    tween($('#outArea'), animFrom.area, a, v => Math.round(v).toLocaleString('en-NZ'));
    tween($('#outLow'), animFrom.low, state.low, v => nzd(round(v, 100)));
    tween($('#outHigh'), animFrom.high, state.high, v => nzd(round(v, 100)));
    animFrom = { area: a, low: state.low, high: state.high };
    $('#outSurface').textContent = state.surface;
    $('#outLen').textContent = `≈ ${round(a / 7, 5)}–${round(a / 5, 5)} m`;
    $('#outDims').textContent = state.dims;
    const [cat, note] = category(a);
    $('#outCat').textContent = cat; $('#outNote').textContent = note;
    $('#outRiders').textContent = `${Math.max(2, Math.round(a / 70))}–${Math.max(3, Math.round(a / 40))}`;
    $('#rangeFill').style.width = Math.min(100, 12 + a / 25) + '%';
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
    hint.innerHTML = 'Found it. Tap <b>Draw area</b> and outline the track footprint.';
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
    const pts = []; const rx = 17, ry = 11; const mLat = 111320, mLon = 111320 * Math.cos(c[0] * Math.PI / 180);
    for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; pts.push([c[0] + (ry * Math.sin(t)) / mLat, c[1] + (rx * Math.cos(t)) / mLon]); }
    const layer = L.polygon(pts, shapeStyle); drawn.addLayer(layer);
    map.flyTo(c, 19, { duration: 1.4 });
    setShape(layer);
  };

  /* ---------- booking ---------- */
  function rangeText() { return state.area ? `${nzd(state.low)} – ${nzd(state.high)} excl. GST` : ''; }
  function updateSummary() {
    const set = (k, v) => { const el = document.querySelector(`[data-sum="${k}"]`); if (el) el.textContent = v; };
    set('address', state.address || 'Not set yet');
    set('area', state.area ? `${state.area.toLocaleString('en-NZ')} m²` : '—');
    set('surface', state.area ? state.surface : '—');
    set('range', rangeText() || '—');
  }
  function prefill() {
    const f = $('#bookForm');
    const put = (el, v) => { if (v) { el.value = v; el.classList.add('prefilled'); } };
    put($('#fAddress'), state.address); put($('#fArea'), state.area ? String(state.area) : '');
    $('#fSurface').value = state.surface; $('#fSurface').classList.add('prefilled');
    put($('#fEstimate'), rangeText());
    $('#summaryCard').classList.remove('flash'); void $('#summaryCard').offsetWidth; $('#summaryCard').classList.add('flash');
    setTimeout(() => f.querySelector('[name=name]').focus({ preventScroll: true }), 900);
  }
  $('#bookCta').onclick = prefill;
  const d = new Date(); d.setDate(d.getDate() + 7); $('#fDate').min = new Date().toISOString().slice(0, 10); $('#fDate').value = d.toISOString().slice(0, 10);
  $('#fArea').oninput = e => { const a = parseInt(e.target.value.replace(/\D/g, ''), 10); $('#fEstimate').value = a ? `${nzd(round(a * RATE_LOW, 1000))} – ${nzd(round(a * RATE_HIGH, 1000))} excl. GST` : ''; };
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
  $('#againBtn').onclick = () => { $('#bookForm').reset(); $('#bookSuccess').hidden = true; document.querySelectorAll('.prefilled,.invalid').forEach(x => x.classList.remove('prefilled', 'invalid')); };
  render();
})();
