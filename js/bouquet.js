/* =========================================================
   bouquet.js — Cinco Meses page ("Ramo de razones")
   - Tray of 5 flowers (one per month), each tied to a reason + photo
   - Tap a flower (or drag it into the vase) to plant it
   - Each planted flower grows in the vase and drops a handwritten
     gift-tag (with a little taped photo) onto the stack. Tap a tag
     to bring it to the front.
   - When all 5 are planted, a ribbon bow ties on the vase, petals
     rain, a final handwritten card tilts in, and Quiero.mp3 fades in.
   Pure vanilla JS — no jQuery, matching js/album.js.
   ========================================================= */

(function () {
  'use strict';

  /* ── Edit these to swap copy/photos ──────────────────────────
     One entry per month. `photo` defaults to an existing gallery
     image so the page looks complete right away — swap for your
     own shots anytime (missing files just hide the photo). ----- */
  var FLOWERS = [
    {
      month: 'Mes Uno',
      text: 'Pareciera hace tanto que nos amamos, y desde que me diste ese si, ahora no puedo pasar un dia mas sin ti en mi vida',
      photo: 'photos/4.jpeg',
      petal: '#ff6f91', center: '#ffd166'
    },
    {
      month: 'Mes Dos',
      text: 'Por esas primeras veces contigo mi cielo, que marcan la diferencia, y por todas las que vendrán.',
      photo: 'photos/star2.JPG',
      petal: '#ff9bb3', center: '#ffe08a'
    },
    {
      month: 'Mes Tres',
      text: 'Por este primer cumpleaños con el regalo mas bello que me ha dado la vida.',
      photo: 'photos/mayo.jpeg',
      petal: '#c86dd7', center: '#ffd166'
    },
    {
      month: 'Mes Cuatro',
      text: 'Por esas salidas especiales que no tienen comparación con la niña mía.',
      photo: 'photos/junio.jpeg',
      petal: '#ff7eb3', center: '#ffe08a'
    },
    {
      month: 'Mes Cinco',
      text: 'Por este mes, y por la vida entera que nos queda juntos.',
      photo: 'photos/julio.jpeg',
      petal: '#ff5c8c', center: '#ffd166'
    }
  ];

  /* Fan angles (deg) for the stems inside the vase, left → right */
  var STEM_ANGLES = [-30, -15, 0, 15, 30];

  /* ── DOM ─────────────────────────────────────────────────── */
  var tray = document.getElementById('tray');
  var stage = document.querySelector('.stage');
  var vaseFlowers = document.getElementById('vaseFlowers');
  var vaseZone = document.getElementById('vaseZone');
  var tagStack = document.getElementById('tagStack');
  var ribbon = document.getElementById('ribbon');
  var heroHint = document.getElementById('heroHint');
  var finalCard = document.getElementById('finalCard');
  var finalClose = document.getElementById('finalClose');
  var petalLayer = document.getElementById('petalLayer');
  var audio = document.getElementById('loveSong');

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var plantedCount = 0;
  var finalTriggered = false;

  /* ── SVG builders ────────────────────────────────────────── */
  // A 5-petal flower head centered on (50,50) in a 0..100 box.
  function flowerHeadSVG(petal, center) {
    var petals = '';
    for (var i = 0; i < 5; i++) {
      petals +=
        '<ellipse cx="50" cy="30" rx="14" ry="20" fill="' + petal + '" ' +
        'transform="rotate(' + (i * 72) + ' 50 50)"/>';
    }
    return '<g class="flower-head">' + petals +
      '<circle cx="50" cy="50" r="10" fill="' + center + '"/></g>';
  }

  // Tray flower: head only, roughly centered in the box.
  function trayFlowerMarkup(f) {
    return '<svg viewBox="0 0 100 92" aria-hidden="true">' +
      '<g transform="translate(0,6)">' + flowerHeadSVG(f.petal, f.center) + '</g></svg>';
  }

  // Planted flower: stem + leaf, head seated on top of the stem.
  function stemMarkup(f) {
    return '<svg viewBox="0 0 100 250" aria-hidden="true">' +
      // stem rises from the vase (y=250) up into the flower head (y≈86)
      '<path d="M50 250 C 45 180 45 130 50 86" stroke="#4b9d5c" ' +
      'stroke-width="6" fill="none" stroke-linecap="round"/>' +
      // a leaf
      '<path d="M50 175 C 28 164 20 176 22 196 C 40 196 49 186 50 175 Z" fill="#57bd6d"/>' +
      // head: shift down so its lower petals overlap the stem top
      '<g transform="translate(0,36)">' + flowerHeadSVG(f.petal, f.center) + '</g></svg>';
  }

  function bowMarkup() {
    return '<svg viewBox="0 0 150 90" aria-hidden="true">' +
      '<path d="M75 45 C 40 10 8 20 12 45 C 8 70 40 80 75 45 Z" fill="#e05a86"/>' +
      '<path d="M75 45 C 110 10 142 20 138 45 C 142 70 110 80 75 45 Z" fill="#e05a86"/>' +
      '<path d="M70 48 C 60 78 52 86 44 90 L 58 90 C 66 78 72 62 74 52 Z" fill="#c94874"/>' +
      '<path d="M80 48 C 90 78 98 86 106 90 L 92 90 C 84 78 78 62 76 52 Z" fill="#c94874"/>' +
      '<circle cx="75" cy="45" r="12" fill="#ff7aa2"/></svg>';
  }

  /* ── Build the tray ──────────────────────────────────────── */
  FLOWERS.forEach(function (f, i) {
    var btn = document.createElement('button');
    btn.className = 'tray-flower';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Plantar flor de ' + f.month);
    btn.innerHTML = trayFlowerMarkup(f) + '<span class="tray-label">' + f.month + '</span>';
    tray.appendChild(btn);
    attachPlantHandlers(btn, i);
  });
  ribbon.innerHTML = bowMarkup();
  updateHint();

  /* ── Planting ────────────────────────────────────────────── */
  function plant(index, btn) {
    if (btn.classList.contains('is-planted')) return;
    btn.classList.add('is-planted');
    btn.disabled = true;

    var f = FLOWERS[index];

    // Grow a stem in the vase
    var stem = document.createElement('div');
    stem.className = 'vase-flower';
    stem.style.setProperty('--angle', STEM_ANGLES[plantedCount] + 'deg');
    stem.style.zIndex = String(10 - plantedCount);
    stem.innerHTML = stemMarkup(f);
    vaseFlowers.appendChild(stem);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { stem.classList.add('grown'); });
    });

    // Drop a handwritten gift-tag onto the stack
    addTag(f, plantedCount);

    plantedCount++;
    updateHint();

    if (plantedCount === FLOWERS.length && !finalTriggered) {
      setTimeout(triggerFinale, 1200);
    }
  }

  function addTag(f, i) {
    // clear the placeholder hint on the first tag
    var hint = tagStack.querySelector('.garland-hint');
    if (hint) hint.remove();

    var hang = document.createElement('div');
    hang.className = 'tag-hang';

    var tag = document.createElement('div');
    tag.className = 'gift-tag';
    // desync the sway so they don't swing in lockstep
    tag.style.setProperty('--sway-delay', (i * -0.7) + 's');

    var photo = '<div class="tag-photo-wrap">' +
      '<img class="tag-photo" alt="' + f.month + '"></div>';

    tag.innerHTML = photo +
      '<p class="tag-month">' + f.month + '</p>' +
      '<p class="tag-text">' + f.text + '</p>';

    hang.appendChild(tag);
    tagStack.appendChild(hang);

    // load photo with graceful fallback
    var wrap = tag.querySelector('.tag-photo-wrap');
    var img = tag.querySelector('.tag-photo');
    img.onerror = function () { wrap.classList.add('empty'); };
    img.src = f.photo;

    // drop it in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hang.classList.add('in'); });
    });

    // tap a tag to hold it still and enlarge it for a closer read
    tag.addEventListener('click', function () { tag.classList.toggle('zoom'); });
  }

  function updateHint() {
    if (!heroHint) return;
    var left = FLOWERS.length - plantedCount;
    if (left === FLOWERS.length) heroHint.textContent = 'toca o arrastra cada flor hasta el florero…';
    else if (left > 0) heroHint.textContent = 'faltan ' + left + (left === 1 ? ' flor…' : ' flores…');
    else heroHint.textContent = 'nuestro ramo está listo 🎀';
  }

  /* ── Tap + drag handling ─────────────────────────────────── */
  function attachPlantHandlers(btn, index) {
    var dragging = false, moved = false, ghost = null;
    var startX = 0, startY = 0;

    function onDown(e) {
      if (btn.classList.contains('is-planted')) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      if (btn.setPointerCapture && e.pointerId != null) {
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        moved = true;
        ghost = makeGhost(btn);
      }
      if (moved && ghost) {
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        vaseZone.classList.toggle('drop-hot', overVase(e.clientX, e.clientY));
      }
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      vaseZone.classList.remove('drop-hot');
      if (ghost) { ghost.remove(); ghost = null; }
      if (!moved || overVase(e.clientX, e.clientY)) plant(index, btn);
    }

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', function () {
      dragging = false;
      vaseZone.classList.remove('drop-hot');
      if (ghost) { ghost.remove(); ghost = null; }
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plant(index, btn); }
    });
  }

  function makeGhost(btn) {
    var g = document.createElement('div');
    g.className = 'flower-ghost';
    g.innerHTML = btn.querySelector('svg').outerHTML;
    document.body.appendChild(g);
    return g;
  }

  function overVase(x, y) {
    var r = vaseZone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  /* ── Finale ──────────────────────────────────────────────── */
  function triggerFinale() {
    if (finalTriggered) return;
    finalTriggered = true;

    ribbon.classList.add('tied');
    if (stage) stage.classList.add('done'); // hide the emptied tray → bouquet centers
    if (!reduceMotion) rainPetals();

    setTimeout(function () {
      finalCard.classList.add('is-visible');
      finalCard.setAttribute('aria-hidden', 'false');
    }, 700);

    if (audio) {
      audio.volume = 0;
      var playPromise = audio.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
      var step = 0;
      var fade = setInterval(function () {
        step += 0.02;
        if (step >= 0.6) { audio.volume = 0.6; clearInterval(fade); }
        else { audio.volume = step; }
      }, 120);
    }
  }

  function rainPetals() {
    var colors = FLOWERS.map(function (f) { return f.petal; });
    var count = 46;
    for (var i = 0; i < count; i++) {
      (function (i) {
        var p = document.createElement('span');
        p.className = 'petal';
        p.style.left = (Math.random() * 100) + 'vw';
        p.style.background = colors[i % colors.length];
        var dur = 4 + Math.random() * 4;
        var delay = Math.random() * 3;
        p.style.animationDuration = dur + 's';
        p.style.animationDelay = delay + 's';
        p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
        petalLayer.appendChild(p);
        setTimeout(function () { p.remove(); }, (dur + delay) * 1000 + 200);
      })(i);
    }
  }

  /* ── Wire-up ─────────────────────────────────────────────── */
  finalClose.addEventListener('click', function () {
    finalCard.classList.remove('is-visible');
    finalCard.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && finalCard.classList.contains('is-visible')) {
      finalCard.classList.remove('is-visible');
      finalCard.setAttribute('aria-hidden', 'true');
    }
  });
})();
