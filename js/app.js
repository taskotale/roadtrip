/* Road trip options — mobile-first static site.
   Data lives in data/manifest.json + data/options/*.json. No build step. */
(function () {
  'use strict';

  var PALETTE = ['#1b6b4a', '#c05621', '#2b6cb0', '#7c3a8f', '#a3143a', '#0f7a86', '#8a6d1f', '#4a5568'];
  var PLACEHOLDER = 'assets/placeholder.svg';

  var options = [];          // loaded option objects
  var current = null;        // option currently shown
  var map = null;
  var layers = { segments: [], stops: [], pois: [] };
  var fullBounds = null;

  var el = {
    home: document.getElementById('view-home'),
    option: document.getElementById('view-option'),
    list: document.getElementById('option-list'),
    intro: document.getElementById('trip-intro'),
    title: document.getElementById('option-title'),
    summary: document.getElementById('option-summary'),
    days: document.getElementById('day-list'),
    hint: document.getElementById('map-hint'),
    resetMap: document.getElementById('reset-map'),
    costsBtn: document.getElementById('costs-btn'),
    costsTotal: document.getElementById('costs-btn-total'),
    costsSheet: document.getElementById('costs-sheet'),
    costsBackdrop: document.getElementById('costs-backdrop'),
    costsBody: document.getElementById('costs-body'),
    costsClose: document.getElementById('costs-close'),
    error: document.getElementById('error-banner')
  };

  /* ---------------- helpers ---------------- */

  function color(i) { return PALETTE[i % PALETTE.length]; }

  function num(n) {
    return typeof n === 'number' && isFinite(n) ? n.toLocaleString('en-US') : null;
  }

  function money(v, currency) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    try {
      return v.toLocaleString('en-US', {
        style: 'currency', currency: currency || 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      });
    } catch (e) {
      return '$' + Math.round(v).toLocaleString('en-US');
    }
  }

  /* "$7,127" when both ends match, "$7,127 – $7,922" when they differ. */
  function moneyRange(values, currency) {
    var nums = values.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!nums.length) return null;
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
    return lo === hi ? money(lo, currency) : money(lo, currency) + ' – ' + money(hi, currency);
  }

  /* Short form for the floating button: "$7.1k – $7.9k". The sheet shows exact figures. */
  function moneyShort(v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    if (v < 1000) return '$' + Math.round(v);
    var k = v / 1000;
    return '$' + (k < 10 ? k.toFixed(1) : Math.round(k)) + 'k';
  }

  function moneyRangeShort(values) {
    var nums = values.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!nums.length) return null;
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
    return lo === hi ? moneyShort(lo) : moneyShort(lo) + '–' + moneyShort(hi);
  }

  /* Column values for one cost line, in the option's column order. */
  function lineValues(line, columns) {
    return columns.map(function (c) { return line[c.key]; });
  }

  function costColumns(costs) {
    return (costs && costs.columns) || [];
  }

  function costHeadline(costs) {
    if (!costs) return null;
    var cols = costColumns(costs);
    var totals = costs.totals || {};
    return moneyRange(cols.map(function (c) { return totals[c.key]; }), costs.currency);
  }

  function isCoord(c) {
    return Array.isArray(c) && c.length >= 2 &&
      typeof c[0] === 'number' && typeof c[1] === 'number' &&
      isFinite(c[0]) && isFinite(c[1]);
  }

  function showError(msg) {
    el.error.textContent = msg;
    el.error.hidden = false;
  }

  function elem(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chip(text, cls) {
    var s = elem('span', 'stat-chip' + (cls ? ' ' + cls : ''), text);
    return s;
  }

  /* A day's line: explicit route if present, else from -> pois -> to. */
  function dayLine(day) {
    if (Array.isArray(day.route) && day.route.filter(isCoord).length >= 2) {
      return { pts: day.route.filter(isCoord), real: true };
    }
    var pts = [];
    if (day.from && isCoord(day.from.coords)) pts.push(day.from.coords);
    (day.pois || []).forEach(function (p) { if (isCoord(p.coords)) pts.push(p.coords); });
    if (day.to && isCoord(day.to.coords)) pts.push(day.to.coords);
    return { pts: pts, real: false };
  }

  /* A day that starts and ends in the same place — no leg to draw. */
  function isBaseDay(day) {
    var f = day.from && day.from.name, t = day.to && day.to.name;
    return !!(f && t && f === t);
  }

  /* ---------------- data ---------------- */

  function loadData() {
    return fetch('data/manifest.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('manifest ' + r.status);
        return r.json();
      })
      .then(function (manifest) {
        if (manifest && manifest.intro) renderIntro(manifest.intro);
        var files = (manifest && manifest.options) || [];
        return Promise.all(files.map(function (f) {
          return fetch('data/' + f, { cache: 'no-cache' })
            .then(function (r) {
              if (!r.ok) throw new Error(f + ' ' + r.status);
              return r.json();
            })
            .catch(function (err) {
              console.error('Could not load option', f, err);
              return null;
            });
        }));
      })
      .then(function (loaded) {
        options = loaded.filter(Boolean);
        if (!options.length) throw new Error('no options loaded');
      });
  }

  function findOption(id) {
    for (var i = 0; i < options.length; i++) if (options[i].id === id) return options[i];
    return null;
  }

  /* ---------------- home ---------------- */

  function renderIntro(intro) {
    if (!el.intro) return;
    el.intro.innerHTML = '';
    if (intro.title) el.intro.appendChild(elem('h1', null, intro.title));
    if (intro.subtitle) el.intro.appendChild(elem('p', 'lede', intro.subtitle));
    if (intro.stats && intro.stats.length) {
      var row = elem('div', 'option-stats');
      intro.stats.forEach(function (s) { row.appendChild(chip(s)); });
      el.intro.appendChild(row);
    }
  }

  function renderHome() {
    el.list.innerHTML = '';
    if (!options.length) {
      el.list.appendChild(elem('p', 'empty', 'No options yet.'));
      return;
    }
    options.forEach(function (opt) {
      var a = document.createElement('a');
      a.className = 'option-card';
      a.href = '#/option/' + encodeURIComponent(opt.id);

      a.appendChild(elem('h2', null, opt.name || opt.id));
      if (opt.tagline) a.appendChild(elem('p', 'option-tagline', opt.tagline));

      var head = costHeadline(opt.costs);
      if (head) {
        var priceRow = elem('div', 'option-price');
        priceRow.appendChild(elem('span', 'price-amount', head));
        var pp = perPersonText(opt.costs);
        if (pp) priceRow.appendChild(elem('span', 'price-per', pp));
        a.appendChild(priceRow);
      }

      if (opt.summary) a.appendChild(elem('p', 'option-sub', opt.summary));

      if (opt.vehicle && opt.vehicle.type) {
        a.appendChild(elem('p', 'option-vehicle', opt.vehicle.type));
      }

      el.list.appendChild(a);
    });
  }

  function perPersonText(costs) {
    if (!costs || !costs.perPerson) return null;
    var cols = costColumns(costs);
    var r = moneyRange(cols.map(function (c) { return costs.perPerson[c.key]; }), costs.currency);
    return r ? r + ' each' : null;
  }

  /* ---------------- detail ---------------- */

  function renderOption(opt) {
    current = opt;
    el.title.textContent = opt.name || opt.id;
    document.title = (opt.name || 'Road trip') + ' · Road Trip Options';

    el.summary.innerHTML = '';
    el.summary.appendChild(elem('h1', null, opt.name || opt.id));
    if (opt.tagline) el.summary.appendChild(elem('p', 'option-tagline', opt.tagline));
    if (opt.summary) el.summary.appendChild(elem('p', 'summary-text', opt.summary));

    var t = opt.totals || {};
    var stats = elem('div', 'option-stats');
    var days = t.days || (opt.days ? opt.days.length : null);
    if (days) stats.appendChild(chip(days + ' days'));
    if (num(t.miles)) stats.appendChild(chip(num(t.miles) + ' mi'));
    if (t.party) stats.appendChild(chip(t.party + ' people'));
    if (stats.children.length) el.summary.appendChild(stats);

    if (opt.vehicle) el.summary.appendChild(vehicleBlock(opt.vehicle));
    if ((opt.pros && opt.pros.length) || (opt.cons && opt.cons.length)) {
      el.summary.appendChild(prosConsBlock(opt));
    }

    renderDays(opt);
    renderCosts(opt);
    buildMap(opt);
  }

  function vehicleBlock(v) {
    var box = elem('div', 'vehicle-box');
    box.appendChild(elem('p', 'vehicle-label', 'Vehicle'));
    box.appendChild(elem('p', 'vehicle-type', v.type || ''));
    if (v.detail) box.appendChild(elem('p', 'vehicle-detail', v.detail));
    if (v.notes) box.appendChild(elem('p', 'vehicle-notes', v.notes));
    return box;
  }

  function prosConsBlock(opt) {
    var wrap = elem('div', 'proscons');
    [['pros', 'Works in your favour'], ['cons', 'The catch']].forEach(function (pair) {
      var list = opt[pair[0]];
      if (!list || !list.length) return;
      var col = elem('div', 'pc-col pc-' + pair[0]);
      col.appendChild(elem('p', 'pc-head', pair[1]));
      var ul = elem('ul');
      list.forEach(function (item) { ul.appendChild(elem('li', null, item)); });
      col.appendChild(ul);
      wrap.appendChild(col);
    });
    return wrap;
  }

  function renderDays(opt) {
    el.days.innerHTML = '';
    var list = opt.days || [];
    el.hint.hidden = list.length === 0;

    list.forEach(function (day, i) {
      var dayNum = day.day || i + 1;
      var card = elem('article', 'day-card');
      card.style.setProperty('--day-color', color(i));
      card.id = 'day-' + dayNum;

      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'day-head';
      head.setAttribute('aria-expanded', 'false');

      var base = isBaseDay(day);
      var fromName = (day.from && day.from.name) || '';
      var toName = (day.to && day.to.name) || '';
      var routeText = base ? ('Based in ' + (toName || fromName)) : (fromName + ' → ' + toName);
      head.setAttribute('aria-label', 'Day ' + dayNum + ': ' + routeText);

      head.appendChild(elem('span', 'day-num', String(dayNum)));

      var txt = elem('span', 'day-head-text');
      txt.appendChild(elem('span', 'day-label', 'Day ' + dayNum));

      var route = elem('span', 'day-route');
      if (base) {
        route.textContent = routeText;
      } else {
        route.appendChild(document.createTextNode(fromName + ' '));
        route.appendChild(elem('span', 'arrow', '→'));
        route.appendChild(document.createTextNode(' ' + toName));
      }
      txt.appendChild(route);

      if (day.headline) txt.appendChild(elem('span', 'day-headline', day.headline));

      var meta = elem('span', 'day-meta');
      if (day.miles) meta.appendChild(elem('span', null, num(day.miles) + ' mi'));
      else meta.appendChild(elem('span', null, base ? 'No driving' : 'Local driving only'));
      if (day.driveTime) meta.appendChild(elem('span', null, day.driveTime));
      if (typeof day.elevation === 'number') {
        meta.appendChild(elem('span', null, num(day.elevation) + ' ft'));
      }
      if (day.freezingNight) {
        meta.appendChild(elem('span', 'freeze', 'Freezing night'));
      }
      if (meta.children.length) txt.appendChild(meta);

      head.appendChild(txt);

      var chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chev.setAttribute('class', 'day-chevron');
      chev.setAttribute('viewBox', '0 0 24 24');
      chev.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M6 9l6 6 6-6');
      chev.appendChild(path);
      head.appendChild(chev);

      card.appendChild(head);

      /* ---- body ---- */
      var body = elem('div', 'day-body');

      if (day.notes) body.appendChild(elem('p', 'day-highlights', day.notes));

      (day.flags || []).forEach(function (flag) {
        var f = elem('p', 'day-flag flag-' + (flag.type || 'note'));
        f.appendChild(elem('strong', null, flag.label || ''));
        f.appendChild(document.createTextNode(' ' + (flag.text || '')));
        body.appendChild(f);
      });

      if (day.note) body.appendChild(elem('p', 'day-note', day.note));

      if (day.activities && day.activities.length) {
        var act = elem('div', 'day-activities');
        act.appendChild(elem('p', 'act-head', 'On the day'));
        var ul = elem('ul');
        day.activities.forEach(function (a) { ul.appendChild(elem('li', null, a)); });
        act.appendChild(ul);
        body.appendChild(act);
      }

      var pois = (day.pois || []).filter(function (p) { return p && (p.photo || p.name); });
      if (pois.length) {
        var grid = elem('div', 'poi-grid');
        pois.forEach(function (poi) {
          var fig = elem('figure', 'poi');
          var img = document.createElement('img');
          img.src = poi.photo || PLACEHOLDER;
          img.alt = poi.name || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.addEventListener('error', function onErr() {
            img.removeEventListener('error', onErr);
            img.src = PLACEHOLDER;
          });
          fig.appendChild(img);
          if (poi.name || poi.caption) {
            var cap = elem('figcaption');
            if (poi.name) cap.appendChild(elem('strong', null, poi.name));
            if (poi.caption) cap.appendChild(document.createTextNode(poi.caption));
            fig.appendChild(cap);
          }
          grid.appendChild(fig);
        });
        body.appendChild(grid);
      }

      card.appendChild(body);

      head.addEventListener('click', function () {
        var opening = !card.classList.contains('open');
        card.classList.toggle('open', opening);
        head.setAttribute('aria-expanded', String(opening));
        if (opening) {
          focusDay(dayNum);
          /* Only scroll if the card is tucked behind the sticky map or below
             the fold — scrolling a card the user can already see is jarring. */
          var box = card.getBoundingClientRect();
          var mapBottom = document.querySelector('.map-wrap').getBoundingClientRect().bottom;
          if (box.top < mapBottom || box.top > window.innerHeight - 80) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          resetMapView();
        }
      });

      el.days.appendChild(card);
    });
  }

  /* ---------------- map ---------------- */

  function buildMap(opt) {
    if (typeof L === 'undefined') {
      showError('Map library did not load — check your connection.');
      return;
    }
    if (!map) {
      map = L.map('map', {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true
      });
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    }

    clearLayers();

    var allPts = [];
    var days = opt.days || [];

    days.forEach(function (day, i) {
      var dayNum = day.day || i + 1;
      var line = dayLine(day);
      if (line.pts.length < 2 || isBaseDay(day)) return;

      var poly = L.polyline(line.pts, {
        color: color(i),
        weight: 4,
        opacity: 0.55,
        dashArray: line.real ? null : '7,7',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      poly._dayNum = dayNum;
      poly.on('click', function () { openDay(dayNum); });
      layers.segments.push(poly);
      allPts = allPts.concat(line.pts);
    });

    /* Markers: the start, then each distinct overnight stop numbered in the
       order you reach it. Consecutive days at one place share a marker, so the
       numbers run 1, 2, 3 rather than skipping the days you stay put. */
    var stops = [];
    var byKey = {};
    var keyOf = function (c) { return c[0].toFixed(3) + ',' + c[1].toFixed(3); };

    var first = days[0];
    if (first && first.from && isCoord(first.from.coords)) {
      byKey[keyOf(first.from.coords)] = { start: true, coords: first.from.coords,
        name: first.from.name, days: [] };
      stops.push(byKey[keyOf(first.from.coords)]);
    }
    days.forEach(function (day, i) {
      if (!day.to || !isCoord(day.to.coords)) return;
      var k = keyOf(day.to.coords);
      if (!byKey[k]) {
        byKey[k] = { coords: day.to.coords, name: day.to.name, days: [] };
        stops.push(byKey[k]);
      }
      byKey[k].days.push(day.day || i + 1);
      allPts.push(day.to.coords);
    });

    var n = 0;
    stops.forEach(function (stop) {
      var label = stop.start ? 'S' : String(++n);
      var m = L.marker(stop.coords, {
        icon: L.divIcon({
          className: 'stop-marker',
          html: '<div' + (stop.start ? ' class="start"' : '') + '>' + label + '</div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        }),
        keyboard: false
      }).addTo(map);
      m.bindPopup('<strong>' + escapeHtml(stop.name || '') + '</strong>' +
        (stop.start ? 'Start and finish' : nightsLabel(stop.days)));
      m._dayNums = stop.days;
      layers.stops.push(m);
      allPts.push(stop.coords);
    });

    fullBounds = allPts.length ? L.latLngBounds(allPts) : null;
    setTimeout(function () {
      map.invalidateSize();
      resetMapView(true);
    }, 60);
  }

  /* "Night 4" / "Nights 5–6" / "Nights 1, 3" */
  function nightsLabel(dayNums) {
    if (!dayNums || !dayNums.length) return '';
    var runs = [], run = [dayNums[0]];
    for (var i = 1; i < dayNums.length; i++) {
      if (dayNums[i] === dayNums[i - 1] + 1) run.push(dayNums[i]);
      else { runs.push(run); run = [dayNums[i]]; }
    }
    runs.push(run);
    var parts = runs.map(function (r) {
      return r.length > 1 ? r[0] + '–' + r[r.length - 1] : String(r[0]);
    });
    return (dayNums.length > 1 ? 'Nights ' : 'Night ') + parts.join(', ');
  }

  function clearLayers() {
    ['segments', 'stops', 'pois'].forEach(function (k) {
      layers[k].forEach(function (l) { if (map) map.removeLayer(l); });
      layers[k] = [];
    });
  }

  function clearPois() {
    layers.pois.forEach(function (l) { map.removeLayer(l); });
    layers.pois = [];
  }

  /* Highlight one day: bold its line, dim the rest, zoom to it, show its POIs. */
  function focusDay(dayNum) {
    if (!map || !current) return;

    layers.segments.forEach(function (poly) {
      var on = poly._dayNum === dayNum;
      poly.setStyle({ opacity: on ? 0.95 : 0.18, weight: on ? 6 : 3 });
      if (on) poly.bringToFront();
    });
    layers.stops.forEach(function (m) {
      var on = !m._dayNums || !m._dayNums.length || m._dayNums.indexOf(dayNum) !== -1;
      m.setOpacity(on ? 1 : 0.35);
    });

    clearPois();
    var day = null;
    (current.days || []).forEach(function (d, i) {
      if ((d.day || i + 1) === dayNum) day = d;
    });

    if (day) {
      var pts = dayLine(day).pts.slice();
      (day.pois || []).forEach(function (poi) {
        if (!isCoord(poi.coords)) return;
        pts.push(poi.coords);
        var m = L.marker(poi.coords, {
          icon: L.divIcon({ className: 'poi-marker', html: '<div></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
          keyboard: false
        }).addTo(map);
        var html = '<strong>' + escapeHtml(poi.name || '') + '</strong>';
        if (poi.caption) html += escapeHtml(poi.caption);
        if (poi.photo) html += '<img src="' + escapeHtml(poi.photo) + '" alt="">';
        m.bindPopup(html);
        layers.pois.push(m);
      });
      if (day.to && isCoord(day.to.coords)) pts.push(day.to.coords);

      if (pts.length) {
        map.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 11, duration: 0.6 });
      }
    }

    el.resetMap.hidden = false;

    Array.prototype.forEach.call(el.days.children, function (card) {
      if (card.id !== 'day-' + dayNum) {
        card.classList.remove('open');
        var h = card.querySelector('.day-head');
        if (h) h.setAttribute('aria-expanded', 'false');
      }
      card.classList.toggle('active', card.id === 'day-' + dayNum);
    });
  }

  /* Open a day from a map tap: expand its card and scroll to it. */
  function openDay(dayNum) {
    var card = document.getElementById('day-' + dayNum);
    if (!card) return;
    if (!card.classList.contains('open')) {
      card.classList.add('open');
      var h = card.querySelector('.day-head');
      if (h) h.setAttribute('aria-expanded', 'true');
    }
    focusDay(dayNum);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetMapView(instant) {
    if (!map) return;
    layers.segments.forEach(function (poly) { poly.setStyle({ opacity: 0.55, weight: 4 }); });
    layers.stops.forEach(function (m) { m.setOpacity(1); });
    clearPois();
    if (fullBounds && fullBounds.isValid()) {
      if (instant) map.fitBounds(fullBounds, { padding: [30, 30] });
      else map.flyToBounds(fullBounds, { padding: [30, 30], duration: 0.6 });
    } else {
      map.setView([36.5, -113.5], 6);
    }
    el.resetMap.hidden = true;
    Array.prototype.forEach.call(el.days.children, function (card) { card.classList.remove('active'); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- costs ---------------- */

  function renderCosts(opt) {
    var costs = opt.costs;
    var headline = costHeadline(costs);
    if (!headline) { el.costsBtn.hidden = true; return; }

    var cols = costColumns(costs);
    var cur = costs.currency || 'USD';
    var totals = costs.totals || {};
    el.costsTotal.textContent =
      moneyRangeShort(cols.map(function (c) { return totals[c.key]; })) || headline;
    el.costsBtn.hidden = false;

    el.costsBody.innerHTML = '';
    el.costsBody.appendChild(elem('p', 'cost-total', headline));

    var subBits = [];
    var pp = perPersonText(costs);
    if (pp) subBits.push(pp);
    if (costs.party) subBits.push('split ' + costs.party + ' ways');
    el.costsBody.appendChild(elem('p', 'cost-total-sub', subBits.join(' · ')));

    /* Column headers, only when there is more than one scenario to compare. */
    var table = elem('div', 'cost-table' + (cols.length > 1 ? ' cols-' + cols.length : ''));
    if (cols.length > 1) {
      var hdr = elem('div', 'cost-row cost-header');
      var hdrTop = elem('div', 'cost-row-top');
      hdrTop.appendChild(elem('span', 'cat', ''));
      cols.forEach(function (c) { hdrTop.appendChild(elem('span', 'amt', c.label)); });
      hdr.appendChild(hdrTop);
      table.appendChild(hdr);
    }

    (costs.lines || []).forEach(function (line) {
      var row = elem('div', 'cost-row');
      var top = elem('div', 'cost-row-top');
      top.appendChild(elem('span', 'cat', line.item || ''));
      lineValues(line, cols).forEach(function (v) {
        top.appendChild(elem('span', 'amt', money(v, cur) || '—'));
      });
      row.appendChild(top);
      if (line.basis) row.appendChild(elem('p', 'cost-basis', line.basis));
      table.appendChild(row);
    });

    if ((costs.lines || []).length) {
      var totalRow = elem('div', 'cost-row cost-row-total');
      var tTop = elem('div', 'cost-row-top');
      tTop.appendChild(elem('span', 'cat', 'Total'));
      cols.forEach(function (c) {
        tTop.appendChild(elem('span', 'amt', money((costs.totals || {})[c.key], cur) || '—'));
      });
      totalRow.appendChild(tTop);
      table.appendChild(totalRow);

      if (costs.perPerson) {
        var ppRow = elem('div', 'cost-row cost-row-pp');
        var pTop = elem('div', 'cost-row-top');
        pTop.appendChild(elem('span', 'cat', 'Each' + (costs.party ? ' (of ' + costs.party + ')' : '')));
        cols.forEach(function (c) {
          pTop.appendChild(elem('span', 'amt', money(costs.perPerson[c.key], cur) || '—'));
        });
        ppRow.appendChild(pTop);
        table.appendChild(ppRow);
      }
    }

    el.costsBody.appendChild(table);

    if (costs.notes) el.costsBody.appendChild(elem('p', 'cost-notes', costs.notes));
  }

  function openCosts() {
    el.costsBackdrop.hidden = false;
    el.costsSheet.hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(function () {
      el.costsBackdrop.classList.add('show');
      el.costsSheet.classList.add('show');
    });
    el.costsBtn.setAttribute('aria-expanded', 'true');
    el.costsClose.focus();
  }

  function closeCosts() {
    el.costsBackdrop.classList.remove('show');
    el.costsSheet.classList.remove('show');
    el.costsBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sheet-open');
    setTimeout(function () {
      if (!el.costsSheet.classList.contains('show')) {
        el.costsSheet.hidden = true;
        el.costsBackdrop.hidden = true;
      }
    }, 280);
  }

  function costsOpen() { return el.costsSheet.classList.contains('show'); }

  /* ---------------- routing ---------------- */

  function route() {
    var hash = location.hash || '#/';
    var m = hash.match(/^#\/option\/(.+)$/);
    if (costsOpen()) closeCosts();

    if (m) {
      var id = decodeURIComponent(m[1]);
      var opt = findOption(id);
      if (!opt) { location.hash = '#/'; return; }
      el.home.hidden = true;
      el.option.hidden = false;
      window.scrollTo(0, 0);
      if (!current || current.id !== opt.id) renderOption(opt);
      else if (map) setTimeout(function () { map.invalidateSize(); }, 60);
    } else {
      el.option.hidden = true;
      el.home.hidden = false;
      current = null;
      document.title = 'Road Trip Options';
      window.scrollTo(0, 0);
    }
  }

  /* ---------------- init ---------------- */

  el.resetMap.addEventListener('click', function () {
    Array.prototype.forEach.call(el.days.children, function (card) {
      card.classList.remove('open');
      var h = card.querySelector('.day-head');
      if (h) h.setAttribute('aria-expanded', 'false');
    });
    resetMapView();
  });
  el.costsBtn.addEventListener('click', function () { costsOpen() ? closeCosts() : openCosts(); });
  el.costsClose.addEventListener('click', closeCosts);
  el.costsBackdrop.addEventListener('click', closeCosts);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && costsOpen()) closeCosts();
  });
  window.addEventListener('hashchange', route);

  loadData()
    .then(function () {
      renderHome();
      route();
    })
    .catch(function (err) {
      console.error(err);
      el.list.innerHTML = '';
      showError('Could not load the trip data. If you opened this file directly, run a local web server instead.');
    });
})();
