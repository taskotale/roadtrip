/* Road trip routes — mobile-first static site.
   A route holds the shared day-by-day itinerary plus the options for doing it.
   Data lives in data/manifest.json + data/routes/*.json. No build step. */
(function () {
  'use strict';

  var PALETTE = ['#1b6b4a', '#c05621', '#2b6cb0', '#7c3a8f', '#a3143a', '#0f7a86', '#8a6d1f', '#4a5568'];
  var PLACEHOLDER = 'assets/placeholder.svg';

  var routes = [];
  var current = null;        // route being shown
  var currentOpt = null;     // option selected within it
  var map = null;
  var layers = { segments: [], stops: [], pois: [] };
  var fullBounds = null;
  var cameFromRoute = false; // so "Go back" on the costs page behaves

  var el = {};
  ['view-home', 'view-route', 'view-costs', 'route-list', 'route-title', 'route-intro',
   'must-see', 'block-mustsee', 'route-proscons', 'block-proscons',
   'watch-outs', 'block-watch', 'skipped-list', 'block-skipped',
   'option-switch', 'option-detail', 'block-options',
   'day-list', 'map-hint', 'reset-map', 'map-wrap', 'map',
   'costs-summary', 'block-costs', 'costs-page', 'costs-back', 'costs-topbar-title',
   'lightbox', 'lb-img', 'lb-cap', 'lb-close', 'lb-prev', 'lb-next', 'lb-dots',
   'error-banner'
  ].forEach(function (id) {
    el[id.replace(/-(\w)/g, function (_, c) { return c.toUpperCase(); })] = document.getElementById(id);
  });

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

  function moneyRange(values, currency) {
    var nums = values.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!nums.length) return null;
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
    return lo === hi ? money(lo, currency) : money(lo, currency) + ' – ' + money(hi, currency);
  }

  function costColumns(costs) { return (costs && costs.columns) || []; }

  function costHeadline(costs) {
    if (!costs) return null;
    var totals = costs.totals || {};
    return moneyRange(costColumns(costs).map(function (c) { return totals[c.key]; }), costs.currency);
  }

  function isCoord(c) {
    return Array.isArray(c) && c.length >= 2 &&
      typeof c[0] === 'number' && typeof c[1] === 'number' &&
      isFinite(c[0]) && isFinite(c[1]);
  }

  function showError(msg) {
    el.errorBanner.textContent = msg;
    el.errorBanner.hidden = false;
  }

  function elem(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chip(text, cls) { return elem('span', 'stat-chip' + (cls ? ' ' + cls : ''), text); }

  function imgEl(src, alt, cls) {
    var img = document.createElement('img');
    if (cls) img.className = cls;
    img.src = src || PLACEHOLDER;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = PLACEHOLDER;
    });
    return img;
  }

  /* A point of interest may carry several photos. Older data has a single
     "photo" string; both shapes come back as the same list. */
  function poiPhotos(poi) {
    if (!poi) return [];
    if (Array.isArray(poi.photos) && poi.photos.length) {
      return poi.photos.map(function (p) {
        return typeof p === 'string'
          ? { src: p, caption: poi.caption || '' }
          : { src: p.src, caption: p.caption || poi.caption || '' };
      }).filter(function (p) { return p.src; });
    }
    return poi.photo ? [{ src: poi.photo, caption: poi.caption || '' }] : [];
  }

  function dayRoute(day) {
    var override = currentOpt && currentOpt.dayRoutes && currentOpt.dayRoutes[String(day.day)];
    if (Array.isArray(override) && override.filter(isCoord).length >= 2) return override.filter(isCoord);
    if (Array.isArray(day.route) && day.route.filter(isCoord).length >= 2) return day.route.filter(isCoord);
    return null;
  }

  function dayLine(day) {
    var real = dayRoute(day);
    if (real) return { pts: real, real: true };
    var pts = [];
    if (day.from && isCoord(day.from.coords)) pts.push(day.from.coords);
    if (day.to && isCoord(day.to.coords)) pts.push(day.to.coords);
    return { pts: pts, real: false };
  }

  function isBaseDay(day) {
    var f = day.from && day.from.name, t = day.to && day.to.name;
    return !!(f && t && f === t);
  }

  function flagsFor(day) {
    if (!currentOpt || !currentOpt.flags) return [];
    return currentOpt.flags[String(day.day)] || [];
  }

  function routeHash(routeId, optId) {
    return '#/route/' + encodeURIComponent(routeId) + (optId ? '/' + encodeURIComponent(optId) : '');
  }

  /* ---------------- photo viewer ---------------- */

  var lb = { items: [], i: 0, open: false };

  function openLightbox(items, index) {
    if (!items || !items.length) return;
    lb.items = items;
    lb.i = Math.max(0, Math.min(index || 0, items.length - 1));
    lb.open = true;
    el.lightbox.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () { el.lightbox.classList.add('show'); });
    paintLightbox();
    el.lbClose.focus();
  }

  function paintLightbox() {
    var item = lb.items[lb.i] || {};
    el.lbImg.src = item.src || PLACEHOLDER;
    el.lbImg.alt = item.caption || '';
    el.lbCap.textContent = item.caption || '';
    el.lbCap.hidden = !item.caption;

    var many = lb.items.length > 1;
    el.lbPrev.hidden = !many;
    el.lbNext.hidden = !many;
    el.lbDots.hidden = !many;
    el.lbDots.innerHTML = '';
    if (many) {
      lb.items.forEach(function (_, i) {
        var d = elem('span', 'lb-dot' + (i === lb.i ? ' on' : ''));
        el.lbDots.appendChild(d);
      });
    }
  }

  function stepLightbox(delta) {
    if (!lb.items.length) return;
    lb.i = (lb.i + delta + lb.items.length) % lb.items.length;
    paintLightbox();
  }

  function closeLightbox() {
    lb.open = false;
    el.lightbox.classList.remove('show');
    document.body.classList.remove('modal-open');
    setTimeout(function () {
      if (!el.lightbox.classList.contains('show')) {
        el.lightbox.hidden = true;
        el.lbImg.removeAttribute('src');
      }
    }, 220);
  }

  /* ---------------- map sizing ---------------- */

  var mapSize = 'full';
  var dayFocused = false;
  var lastScrollY = 0;
  var resizeTimer = null;
  var sizeLockUntil = 0;
  var sizeLockTimer = null;

  function mapHeights() {
    var vh = window.innerHeight;
    return {
      full: Math.round(Math.max(200, Math.min(vh * 0.40, 420))),
      focus: Math.round(Math.max(165, Math.min(vh * 0.28, 320))),
      mini: Math.round(Math.max(96, Math.min(vh * 0.15, 150)))
    };
  }

  var SIZE_ORDER = ['full', 'focus', 'mini'];

  /* The spacer is a constant height so nothing below ever jumps, which means a
     shorter map would leave a bare band above the content until the page has
     scrolled far enough to cover it. So never shrink further than the current
     scroll position hides. */
  function largestShrinkAllowed(y) {
    var h = mapHeights();
    if (y >= h.full - h.mini) return 'mini';
    if (y >= h.full - h.focus) return 'focus';
    return 'full';
  }

  function applyMapSize(name, instant) {
    var h = mapHeights();
    var cap = largestShrinkAllowed(window.scrollY);
    if (SIZE_ORDER.indexOf(name) > SIZE_ORDER.indexOf(cap)) name = cap;
    if (name === mapSize && !instant) return;
    mapSize = name;
    document.documentElement.style.setProperty('--map-h', h[name] + 'px');
    el.mapWrap.classList.toggle('no-anim', !!instant);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      el.mapWrap.classList.remove('no-anim');
      if (map) map.invalidateSize({ animate: false });
    }, instant ? 20 : 280);
  }

  /* Opening a day or tapping "Whole route" kicks off a smooth scroll, and the
     scroll events it generates would otherwise immediately shrink the map again.
     Ignore scroll-driven resizing for a moment afterwards — but release straight
     away on a wheel or touch, because that is the reader actually taking over. */
  function lockMapSize(ms) {
    clearTimeout(sizeLockTimer);
    sizeLockUntil = Date.now() + (ms || 2500);
    sizeLockTimer = setTimeout(releaseMapLock, ms || 2500);
  }

  function releaseMapLock() {
    clearTimeout(sizeLockTimer);
    if (!sizeLockUntil) return;
    sizeLockUntil = 0;
    lastScrollY = window.scrollY;
    /* The programmatic scroll has landed — settle on the size we wanted, now
       that the scroll position allows it. */
    applyMapSize(restingMapSize());
  }

  function restingMapSize() { return dayFocused ? 'focus' : 'full'; }

  function onScroll() {
    if (el.viewRoute.hidden) return;
    if (Date.now() < sizeLockUntil) { lastScrollY = window.scrollY; return; }
    var y = window.scrollY;
    var dy = y - lastScrollY;
    if (Math.abs(dy) < 6) return;
    applyMapSize(dy > 0 ? 'mini' : restingMapSize());
    lastScrollY = y;
  }

  function syncMapSpacer() {
    var h = mapHeights();
    var root = document.documentElement.style;
    root.setProperty('--map-zone', h.full + 'px');
    root.setProperty('--map-focus', h.focus + 'px');
  }

  /* ---------------- data ---------------- */

  function loadData() {
    return fetch('data/manifest.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('manifest ' + r.status);
        return r.json();
      })
      .then(function (manifest) {
        var files = (manifest && manifest.routes) || [];
        return Promise.all(files.map(function (f) {
          return fetch('data/' + f, { cache: 'no-cache' })
            .then(function (r) {
              if (!r.ok) throw new Error(f + ' ' + r.status);
              return r.json();
            })
            .catch(function (err) { console.error('Could not load route', f, err); return null; });
        }));
      })
      .then(function (loaded) {
        routes = loaded.filter(Boolean);
        if (!routes.length) throw new Error('no routes loaded');
      });
  }

  function findRoute(id) {
    for (var i = 0; i < routes.length; i++) if (routes[i].id === id) return routes[i];
    return null;
  }

  function findOption(route, id) {
    var opts = (route && route.options) || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].id === id) return opts[i];
    return opts[0] || null;
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    el.routeList.innerHTML = '';
    if (!routes.length) {
      el.routeList.appendChild(elem('p', 'empty', 'No routes yet.'));
      return;
    }
    routes.forEach(function (route) {
      var a = document.createElement('a');
      a.className = 'route-card';
      a.href = routeHash(route.id);

      if (route.hero) {
        var media = elem('div', 'route-media');
        media.appendChild(imgEl(route.hero, route.name));
        a.appendChild(media);
      }

      var body = elem('div', 'route-card-body');
      body.appendChild(elem('h2', null, route.name || route.id));
      if (route.subtitle) body.appendChild(elem('p', 'route-sub', route.subtitle));

      var t = route.totals || {};
      var stats = elem('div', 'option-stats');
      if (t.days) stats.appendChild(chip(t.days + ' days'));
      if (num(t.miles)) stats.appendChild(chip(num(t.miles) + ' miles'));
      if (t.party) stats.appendChild(chip(t.party + ' people'));
      if (route.season) stats.appendChild(chip(route.season));
      if (stats.children.length) body.appendChild(stats);

      var n = (route.options || []).length;
      if (n) body.appendChild(elem('p', 'route-ways', n + (n === 1 ? ' way to do it' : ' ways to do it')));

      a.appendChild(body);
      el.routeList.appendChild(a);
    });
  }

  /* ---------------- route ---------------- */

  function renderRoute(route, opt) {
    var sameRoute = current && current.id === route.id;
    current = route;
    currentOpt = opt;

    el.routeTitle.textContent = route.name || route.id;
    document.title = (route.name || 'Road trip') + ' · Road Trip Options';

    if (!sameRoute) {
      renderIntro(route);
      renderMustSee(route);
      renderRouteProsCons(route);
      renderSkipped(route);
    }
    renderWatchOuts(route);
    renderOptionSwitch(route);
    renderOptionDetail(opt);
    renderDays(route);
    renderCostsSummary(route, opt);
    buildMap(route);
  }

  function renderIntro(route) {
    var box = el.routeIntro;
    box.innerHTML = '';
    box.appendChild(elem('h1', null, route.name || route.id));
    if (route.subtitle) box.appendChild(elem('p', 'route-sub', route.subtitle));
    if (route.summary) box.appendChild(elem('p', 'summary-text', route.summary));

    var t = route.totals || {};
    var stats = elem('div', 'option-stats');
    if (t.days) stats.appendChild(chip(t.days + ' days'));
    if (num(t.miles)) stats.appendChild(chip(num(t.miles) + ' miles'));
    if (t.avgMilesPerDay) stats.appendChild(chip(t.avgMilesPerDay + ' mi/day average'));
    if (t.party) stats.appendChild(chip(t.party + ' people'));
    if (stats.children.length) box.appendChild(stats);
    if (route.startEnd) box.appendChild(elem('p', 'route-startend', 'Starts and ends at ' + route.startEnd));
  }

  function renderMustSee(route) {
    var list = route.mustSee || [];
    el.blockMustsee.hidden = !list.length;
    el.mustSee.innerHTML = '';
    list.forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mustsee-card';
      card.appendChild(imgEl(item.photo, item.name));
      var body = elem('div', 'mustsee-body');
      if (item.day) body.appendChild(elem('span', 'mustsee-day', 'Day ' + item.day));
      body.appendChild(elem('span', 'mustsee-name', item.name || ''));
      if (item.why) body.appendChild(elem('span', 'mustsee-why', item.why));
      card.appendChild(body);
      card.addEventListener('click', function () { if (item.day) openDay(item.day); });
      el.mustSee.appendChild(card);
    });
  }

  function renderRouteProsCons(route) {
    var has = (route.pros && route.pros.length) || (route.cons && route.cons.length);
    el.blockProscons.hidden = !has;
    if (!has) return;
    el.routeProscons.innerHTML = '';
    [['pros', 'What makes it good'], ['cons', 'The catch']].forEach(function (pair) {
      var list = route[pair[0]];
      if (!list || !list.length) return;
      var col = elem('div', 'pc-col pc-' + pair[0]);
      col.appendChild(elem('p', 'pc-head', pair[1]));
      var ul = elem('ul');
      list.forEach(function (item) { ul.appendChild(elem('li', null, item)); });
      col.appendChild(ul);
      el.routeProscons.appendChild(col);
    });
  }

  function renderWatchOuts(route) {
    var list = (route.watchOuts || []).filter(function (w) {
      return !w.only || (currentOpt && w.only === currentOpt.id);
    });
    el.blockWatch.hidden = !list.length;
    el.watchOuts.innerHTML = '';
    list.forEach(function (w) {
      var item = elem('div', 'watch-item');
      item.appendChild(elem('p', 'watch-title', w.title || ''));
      item.appendChild(elem('p', 'watch-text', w.text || ''));
      if (w.only) item.appendChild(elem('span', 'watch-tag', currentOpt.name + ' only'));
      el.watchOuts.appendChild(item);
    });
  }

  function renderSkipped(route) {
    var list = route.notConsidered || [];
    el.blockSkipped.hidden = !list.length;
    el.skippedList.innerHTML = '';
    list.forEach(function (s) {
      var row = elem('div', 'skipped-item');
      row.appendChild(elem('p', 'skipped-place', s.place || ''));
      row.appendChild(elem('p', 'skipped-reason', s.reason || ''));
      el.skippedList.appendChild(row);
    });
  }

  function renderOptionSwitch(route) {
    var opts = route.options || [];
    el.blockOptions.hidden = opts.length === 0;
    el.optionSwitch.innerHTML = '';
    if (opts.length < 2) return;
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'switch-btn' + (o.id === currentOpt.id ? ' on' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(o.id === currentOpt.id));
      b.appendChild(elem('span', 'switch-name', o.name));
      if (o.tagline) b.appendChild(elem('span', 'switch-tag', o.tagline));
      b.addEventListener('click', function () {
        if (o.id === currentOpt.id) return;
        location.hash = routeHash(route.id, o.id);
      });
      el.optionSwitch.appendChild(b);
    });
  }

  function renderOptionDetail(opt) {
    var box = el.optionDetail;
    box.innerHTML = '';
    if (!opt) return;

    if (opt.summary) box.appendChild(elem('p', 'option-summary-text', opt.summary));

    if (opt.vehicle) {
      var v = elem('div', 'vehicle-box');
      v.appendChild(elem('p', 'vehicle-label', 'Vehicle'));
      v.appendChild(elem('p', 'vehicle-type', opt.vehicle.type || ''));
      if (opt.vehicle.detail) v.appendChild(elem('p', 'vehicle-detail', opt.vehicle.detail));
      if (opt.vehicle.notes) v.appendChild(elem('p', 'vehicle-notes', opt.vehicle.notes));
      box.appendChild(v);
    }

    if ((opt.pros && opt.pros.length) || (opt.cons && opt.cons.length)) {
      var pc = elem('div', 'proscons');
      [['pros', 'In its favour'], ['cons', 'Against it']].forEach(function (pair) {
        var list = opt[pair[0]];
        if (!list || !list.length) return;
        var col = elem('div', 'pc-col pc-' + pair[0]);
        col.appendChild(elem('p', 'pc-head', pair[1]));
        var ul = elem('ul');
        list.forEach(function (i) { ul.appendChild(elem('li', null, i)); });
        col.appendChild(ul);
        pc.appendChild(col);
      });
      box.appendChild(pc);
    }
  }

  function renderDays(route) {
    el.dayList.innerHTML = '';
    var list = route.days || [];
    el.mapHint.hidden = list.length === 0;

    list.forEach(function (day, i) {
      var dayNum = day.day || i + 1;
      var card = elem('article', 'day-card');
      card.style.setProperty('--day-color', color(i));
      card.id = 'day-' + dayNum;

      var head = elem('div', 'day-head');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', 'false');

      var base = isBaseDay(day);
      var fromName = (day.from && day.from.name) || '';
      var toName = (day.to && day.to.name) || '';
      var routeText = base ? ('Based in ' + (toName || fromName)) : (fromName + ' → ' + toName);
      head.setAttribute('aria-label', 'Day ' + dayNum + ': ' + routeText);
      card.setAttribute('aria-controls', 'day-' + dayNum);

      head.appendChild(elem('span', 'day-num', String(dayNum)));

      var txt = elem('span', 'day-head-text');
      txt.appendChild(elem('span', 'day-label', 'Day ' + dayNum));

      var routeEl = elem('span', 'day-route');
      if (base) routeEl.textContent = routeText;
      else {
        routeEl.appendChild(document.createTextNode(fromName + ' '));
        routeEl.appendChild(elem('span', 'arrow', '→'));
        routeEl.appendChild(document.createTextNode(' ' + toName));
      }
      txt.appendChild(routeEl);

      if (day.headline) txt.appendChild(elem('span', 'day-headline', day.headline));

      var meta = elem('span', 'day-meta');
      if (day.miles) meta.appendChild(elem('span', null, num(day.miles) + ' mi'));
      else meta.appendChild(elem('span', null, base ? 'No driving' : 'Local driving only'));
      if (day.driveTime) meta.appendChild(elem('span', null, day.driveTime));
      if (typeof day.elevation === 'number') meta.appendChild(elem('span', null, num(day.elevation) + ' ft'));
      if (day.freezingNight) meta.appendChild(elem('span', 'freeze', 'Freezing night'));
      txt.appendChild(meta);

      head.appendChild(txt);

      var chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chev.setAttribute('class', 'day-chevron');
      chev.setAttribute('viewBox', '0 0 24 24');
      chev.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M6 9l6 6 6-6');
      chev.appendChild(p);
      head.appendChild(chev);
      card.appendChild(head);

      /* All photos for the day, flattened once — used by the strip and the viewer. */
      var pois = (day.pois || []).filter(function (x) { return x && (x.name || poiPhotos(x).length); });
      var allShots = [];
      pois.forEach(function (poiItem) {
        var shots = poiPhotos(poiItem);
        shots.forEach(function (ph, k) {
          var parts = [];
          if (poiItem.name) parts.push(poiItem.name + (shots.length > 1 ? ' (' + (k + 1) + ' of ' + shots.length + ')' : ''));
          if (ph.caption) parts.push(ph.caption);
          allShots.push({ src: ph.src, caption: parts.join(' — ') });
        });
      });

      /* Strip of covers, visible while the card is closed so photos are findable. */
      var covers = pois.map(function (poiItem) { return poiPhotos(poiItem)[0]; }).filter(Boolean);
      if (covers.length) {
        var strip = elem('div', 'day-strip');
        covers.slice(0, 3).forEach(function (ph) {
          strip.appendChild(imgEl(ph.src, '', 'strip-img'));
        });
        card.appendChild(strip);
      }

      var body = elem('div', 'day-body');
      if (day.notes) body.appendChild(elem('p', 'day-highlights', day.notes));

      flagsFor(day).forEach(function (flag) {
        var f = elem('p', 'day-flag flag-' + (flag.type || 'note'));
        f.appendChild(elem('strong', null, flag.label || ''));
        f.appendChild(document.createTextNode(' ' + (flag.text || '')));
        body.appendChild(f);
      });

      if (day.activities && day.activities.length) {
        var act = elem('div', 'day-activities');
        act.appendChild(elem('p', 'act-head', 'On the day'));
        var ul = elem('ul');
        day.activities.forEach(function (a) { ul.appendChild(elem('li', null, a)); });
        act.appendChild(ul);
        body.appendChild(act);
      }

      if (pois.length) {
        var grid = elem('div', 'poi-grid');
        var shotIndex = 0;
        pois.forEach(function (poiItem) {
          var shots = poiPhotos(poiItem);
          var myStart = shotIndex;
          shotIndex += shots.length;

          var fig = elem('figure', 'poi');
          var thumb = elem('div', 'poi-thumb');
          thumb.appendChild(imgEl(shots.length ? shots[0].src : null, poiItem.name));
          if (shots.length > 1) {
            thumb.appendChild(elem('span', 'poi-count', shots.length + ' photos'));
          }
          if (shots.length) {
            thumb.classList.add('tappable');
            thumb.addEventListener('click', function (e) {
              e.stopPropagation();
              openLightbox(allShots, myStart);
            });
          }
          fig.appendChild(thumb);

          if (poiItem.name || poiItem.caption) {
            var cap = elem('figcaption');
            if (poiItem.name) cap.appendChild(elem('strong', null, poiItem.name));
            if (poiItem.caption) cap.appendChild(document.createTextNode(poiItem.caption));
            fig.appendChild(cap);
          }
          grid.appendChild(fig);
        });
        body.appendChild(grid);
      }

      card.appendChild(body);

      function setOpen(open) {
        card.classList.toggle('open', open);
        head.setAttribute('aria-expanded', String(open));
        if (open) {
          focusDay(dayNum);
          var box = card.getBoundingClientRect();
          var mapBottom = el.mapWrap.getBoundingClientRect().bottom;
          if (box.top < mapBottom || box.top > window.innerHeight - 80) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          resetMapView();
        }
      }

      /* Tap anywhere on a closed card to open it. Once open, only the header
         closes it, so reading the text does not collapse the card. */
      card.addEventListener('click', function (e) {
        if (e.target.closest('.poi-thumb')) return;
        var open = card.classList.contains('open');
        if (!open) setOpen(true);
        else if (e.target.closest('.day-head')) setOpen(false);
      });
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(!card.classList.contains('open'));
        }
      });

      el.dayList.appendChild(card);
    });
  }

  /* ---------------- costs ---------------- */

  function renderCostsSummary(route, opt) {
    var costs = opt && opt.costs;
    el.blockCosts.hidden = !costs;
    el.costsSummary.innerHTML = '';
    if (!costs) return;

    var card = elem('div', 'costs-card');
    card.appendChild(elem('p', 'costs-card-label', 'What it costs'));
    card.appendChild(elem('p', 'costs-card-opt', opt.name + ', all six of us, everything in'));

    var head = costHeadline(costs);
    if (head) card.appendChild(elem('p', 'costs-card-total', head));
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'costs-cta';
    btn.textContent = 'Costs';
    btn.addEventListener('click', function () {
      cameFromRoute = true;
      location.hash = routeHash(route.id, opt.id) + '/costs';
    });
    card.appendChild(btn);
    card.appendChild(elem('p', 'costs-card-note', 'Full breakdown and both options side by side.'));

    el.costsSummary.appendChild(card);
  }

  function costTable(costs) {
    var cols = costColumns(costs);
    var cur = costs.currency || 'USD';
    var totals = costs.totals || {};
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
      cols.forEach(function (c) { top.appendChild(elem('span', 'amt', money(line[c.key], cur) || '—')); });
      row.appendChild(top);
      if (line.basis) row.appendChild(elem('p', 'cost-basis', line.basis));
      table.appendChild(row);
    });

    if ((costs.lines || []).length) {
      var tr = elem('div', 'cost-row cost-row-total');
      var tTop = elem('div', 'cost-row-top');
      tTop.appendChild(elem('span', 'cat', 'Total'));
      cols.forEach(function (c) { tTop.appendChild(elem('span', 'amt', money(totals[c.key], cur) || '—')); });
      tr.appendChild(tTop);
      table.appendChild(tr);
    }
    return table;
  }

  function renderCostsPage(route, selectedOpt) {
    el.costsTopbarTitle.textContent = 'Costs · ' + (route.name || '');
    document.title = 'Costs · ' + (route.name || 'Road trip');

    var page = el.costsPage;
    page.innerHTML = '';

    page.appendChild(elem('h1', 'costs-h1', 'What it costs'));
    var t = route.totals || {};
    page.appendChild(elem('p', 'costs-intro',
      'Everything for ' + (t.party || 'the group') + ' people over ' + (t.days || '') +
      ' days, flights included. These are estimates, not quotes.'));

    /* Side-by-side comparison of the headline numbers. */
    var opts = (route.options || []).filter(function (o) { return o.costs; });
    if (opts.length > 1) {
      var cmp = elem('div', 'cost-compare');
      opts.forEach(function (o) {
        var cell = elem('div', 'cmp-cell' + (o.id === selectedOpt.id ? ' on' : ''));
        cell.appendChild(elem('p', 'cmp-name', o.name));
        cell.appendChild(elem('p', 'cmp-total', costHeadline(o.costs) || ''));
        cmp.appendChild(cell);
      });
      page.appendChild(cmp);

      var lowOf = function (o) {
        var tt = o.costs.totals || {};
        return Math.min.apply(null, costColumns(o.costs).map(function (c) { return tt[c.key]; }));
      };
      var lows = opts.map(lowOf);
      var gap = Math.max.apply(null, lows) - Math.min.apply(null, lows);
      if (gap > 0) {
        var cheapest = opts.reduce(function (a, b) { return lowOf(a) <= lowOf(b) ? a : b; });
        page.appendChild(elem('p', 'cost-gap',
          'Compared like for like at the cheaper end, the ' + cheapest.name.toLowerCase() +
          ' saves about ' + money(gap, cheapest.costs.currency) + ' overall.'));
      }
    }

    opts.forEach(function (o) {
      var sec = elem('section', 'cost-section' + (o.id === selectedOpt.id ? ' on' : ''));
      var h = elem('div', 'cost-section-head');
      h.appendChild(elem('h2', null, o.name));
      if (o.tagline) h.appendChild(elem('p', 'cost-section-tag', o.tagline));
      sec.appendChild(h);
      sec.appendChild(costTable(o.costs));
      if (o.costs.notes) sec.appendChild(elem('p', 'cost-notes', o.costs.notes));
      page.appendChild(sec);
    });

    var savers = route.moneySavers || [];
    if (savers.length) {
      var sv = elem('section', 'savers');
      sv.appendChild(elem('h2', 'savers-head', 'Ways to spend less'));
      savers.forEach(function (s) {
        var row = elem('div', 'saver');
        var top = elem('p', 'saver-top');
        top.appendChild(elem('span', 'saver-item', s.item || ''));
        if (s.amount) top.appendChild(elem('span', 'saver-amount', s.amount));
        row.appendChild(top);
        if (s.detail) row.appendChild(elem('p', 'saver-detail', s.detail));
        sv.appendChild(row);
      });
      page.appendChild(sv);
    }

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'costs-back-bottom';
    back.textContent = '← Go back to the trip';
    back.addEventListener('click', goBackFromCosts);
    page.appendChild(back);
  }

  function goBackFromCosts() {
    if (cameFromRoute && history.length > 1) history.back();
    else if (current) location.hash = routeHash(current.id, currentOpt && currentOpt.id);
    else location.hash = '#/';
  }

  /* ---------------- map ---------------- */

  function buildMap(route) {
    if (typeof L === 'undefined') {
      showError('Map library did not load — check your connection.');
      return;
    }
    if (!map) {
      map = L.map('map', { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    }

    clearLayers();

    var allPts = [];
    var days = route.days || [];

    days.forEach(function (day, i) {
      var dayNum = day.day || i + 1;
      var line = dayLine(day);
      if (line.pts.length < 2 || isBaseDay(day)) return;
      var poly = L.polyline(line.pts, {
        color: color(i), weight: 4, opacity: 0.55,
        dashArray: line.real ? null : '7,7', lineCap: 'round', lineJoin: 'round'
      }).addTo(map);
      poly._dayNum = dayNum;
      poly.on('click', function () { openDay(dayNum); });
      layers.segments.push(poly);
      allPts = allPts.concat(line.pts);
    });

    var stops = [], byKey = {};
    var keyOf = function (c) { return c[0].toFixed(3) + ',' + c[1].toFixed(3); };

    var first = days[0];
    if (first && first.from && isCoord(first.from.coords)) {
      var k0 = keyOf(first.from.coords);
      byKey[k0] = { start: true, coords: first.from.coords, name: first.from.name, days: [] };
      stops.push(byKey[k0]);
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
          iconSize: [22, 22], iconAnchor: [11, 11]
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
    setTimeout(function () { map.invalidateSize(); resetMapView(true); }, 60);
  }

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

  function focusDay(dayNum) {
    if (!map || !current) return;
    dayFocused = true;
    lockMapSize();
    applyMapSize('focus');

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
    (current.days || []).forEach(function (d, i) { if ((d.day || i + 1) === dayNum) day = d; });

    if (day) {
      var pts = dayLine(day).pts.slice();
      (day.pois || []).forEach(function (poiItem) {
        if (!isCoord(poiItem.coords)) return;
        pts.push(poiItem.coords);
        var shots = poiPhotos(poiItem);
        var m = L.marker(poiItem.coords, {
          icon: L.divIcon({ className: 'poi-marker', html: '<div></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
          keyboard: false
        }).addTo(map);
        var html = '<strong>' + escapeHtml(poiItem.name || '') + '</strong>';
        if (poiItem.caption) html += escapeHtml(poiItem.caption);
        if (shots.length) html += '<img src="' + escapeHtml(shots[0].src) + '" alt="">';
        m.bindPopup(html);
        layers.pois.push(m);
      });
      if (day.to && isCoord(day.to.coords)) pts.push(day.to.coords);
      if (pts.length) {
        setTimeout(function () {
          map.flyToBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 11, duration: 0.6 });
        }, 300);
      }
    }

    el.resetMap.hidden = false;

    Array.prototype.forEach.call(el.dayList.children, function (card) {
      if (card.id !== 'day-' + dayNum) {
        card.classList.remove('open');
        var h = card.querySelector('.day-head');
        if (h) h.setAttribute('aria-expanded', 'false');
      }
      card.classList.toggle('active', card.id === 'day-' + dayNum);
    });
  }

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
    dayFocused = false;
    if (!map) return;
    if (!instant) lockMapSize();
    applyMapSize('full', instant);
    layers.segments.forEach(function (poly) { poly.setStyle({ opacity: 0.55, weight: 4 }); });
    layers.stops.forEach(function (m) { m.setOpacity(1); });
    clearPois();
    var go = function () {
      if (fullBounds && fullBounds.isValid()) {
        if (instant) map.fitBounds(fullBounds, { padding: [30, 30] });
        else map.flyToBounds(fullBounds, { padding: [30, 30], duration: 0.6 });
      } else {
        map.setView([36.5, -113.5], 6);
      }
    };
    instant ? go() : setTimeout(go, 300);
    el.resetMap.hidden = true;
    Array.prototype.forEach.call(el.dayList.children, function (card) { card.classList.remove('active'); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- routing ---------------- */

  function show(view) {
    el.viewHome.hidden = view !== 'home';
    el.viewRoute.hidden = view !== 'route';
    el.viewCosts.hidden = view !== 'costs';
  }

  function router() {
    var hash = location.hash || '#/';
    if (lb.open) closeLightbox();

    var m = hash.match(/^#\/route\/([^/]+)(?:\/([^/]+))?(?:\/(costs))?/);
    if (!m) {
      show('home');
      current = null;
      currentOpt = null;
      document.title = 'Road Trip Options';
      window.scrollTo(0, 0);
      return;
    }

    var rt = findRoute(decodeURIComponent(m[1]));
    if (!rt) { location.hash = '#/'; return; }
    var optId = m[2] && m[2] !== 'costs' ? decodeURIComponent(m[2]) : null;
    var isCosts = m[3] === 'costs' || m[2] === 'costs';
    var opt = findOption(rt, optId);

    if (isCosts) {
      if (!current || current.id !== rt.id || !currentOpt || currentOpt.id !== opt.id) {
        current = rt; currentOpt = opt;
      }
      renderCostsPage(rt, opt);
      show('costs');
      window.scrollTo(0, 0);
      return;
    }

    var switchingOption = current && current.id === rt.id && currentOpt && opt && currentOpt.id !== opt.id;
    var leavingCosts = !el.viewCosts.hidden;
    show('route');

    if (!current || current.id !== rt.id || !currentOpt || currentOpt.id !== opt.id) {
      var keep = switchingOption ? window.scrollY : 0;
      renderRoute(rt, opt);
      syncMapSpacer();
      applyMapSize(restingMapSize(), true);
      if (switchingOption) window.scrollTo(0, keep);
      else window.scrollTo(0, 0);
    } else if (map) {
      setTimeout(function () { map.invalidateSize(); }, 60);
      if (leavingCosts) applyMapSize(restingMapSize(), true);
    }
    lastScrollY = window.scrollY;
  }

  /* ---------------- init ---------------- */

  el.resetMap.addEventListener('click', function () {
    Array.prototype.forEach.call(el.dayList.children, function (card) {
      card.classList.remove('open');
      var h = card.querySelector('.day-head');
      if (h) h.setAttribute('aria-expanded', 'false');
    });
    resetMapView();
  });

  el.costsBack.addEventListener('click', goBackFromCosts);

  el.lbClose.addEventListener('click', closeLightbox);
  el.lbPrev.addEventListener('click', function (e) { e.stopPropagation(); stepLightbox(-1); });
  el.lbNext.addEventListener('click', function (e) { e.stopPropagation(); stepLightbox(1); });
  el.lightbox.addEventListener('click', function (e) {
    if (e.target === el.lightbox || e.target.classList.contains('lb-figure')) closeLightbox();
  });

  var touchX = null;
  el.lightbox.addEventListener('touchstart', function (e) {
    touchX = e.changedTouches[0].clientX;
  }, { passive: true });
  el.lightbox.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) stepLightbox(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (!lb.open) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', releaseMapLock, { passive: true });
  window.addEventListener('touchmove', releaseMapLock, { passive: true });
  window.addEventListener('resize', function () {
    syncMapSpacer();
    applyMapSize(mapSize, true);
  });
  window.addEventListener('hashchange', router);

  loadData()
    .then(function () {
      renderHome();
      syncMapSpacer();
      router();
    })
    .catch(function (err) {
      console.error(err);
      el.routeList.innerHTML = '';
      showError('Could not load the trip data. If you opened this file directly, run a local web server instead.');
    });
})();
