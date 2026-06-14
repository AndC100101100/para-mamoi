/* =========================================================
   constellation.js — Tres Meses page
   - Renders a starry sky on #sky canvas
   - Places 3 "memory stars" on points of a parametric heart curve
   - Clicking a star lights its 1/3 arc of the heart and reveals
     a memory card. When all 3 are clicked, a shooting star
     streaks, the final message fades in, and cancion.mp3 fades in.
   ========================================================= */

(function () {
  'use strict';

  /* ── Edit these to swap copy/photos ───────────────────── */
  var MEMORIES = [
    {
      month: 'Mes Uno',
      title: 'El comienzo',
      text: 'Este día nos quedamos hasta la madrugada hablando de todo, tratando de resolver el mundo y de todos los miedos que se te presentaban con tu vida nueva. Despues de conversar tanto, no me pude evitar la emoción de pedirte que fueras mi novia, a las 12:52 de la madrugada de un 14 de marzo',
      photo: 'photos/star1.jpeg'
    },
    {
      month: 'Mes Dos',
      title: 'Creciendo juntos',
      text: 'De el día que celebramos en abril tenemos algunas fotos pero, quedan privadas JAJAJ teamo tanto mi cielo, no habría nadie más con quien querría experimentar todo esto por primer vez. La emoción de verte, siempre que siento que se me sale el cocoro del pecho yendo rumbo a Cartago, verte de lejos después de un rato de no tenerte cerca. Es todo tan sobreestimulante y a la misma vez tan hermoso, solo tu me causas tales sensaciones tan hermosas',
      photo: 'photos/star2.JPG'
    },
    {
      month: 'Mes Tres',
      title: 'Aquí, ahora',
      text: 'Hoy estamos acá cielo, y mis días más bellos se resumen en pensar en ti, en todo lo que hemos vivido y en lo que hemos disfrutado incluso cuando la vida se pone dura. Hoy después de tres meses sigo siendo el novio más orgulloso. Estoy feliz y perdidamente enamorado de mi cushurrumi. Las salidas a comernos alguito rico, los shakes tapa arterias de la Pops, las vueltas en el centro de Cartago, todo es perfecto cuando estoy contigo.',
      photo: 'photos/star3.jpeg'
    }
  ];

  /* ── DOM ──────────────────────────────────────────────── */
  var canvas = document.getElementById('sky');
  var ctx = canvas.getContext('2d');
  var progressLabel = document.getElementById('skyProgress');
  var card = document.getElementById('memoryCard');
  var cardClose = document.getElementById('memoryClose');
  var cardPhotoWrap = document.querySelector('.memory-photo-wrap');
  var cardPhoto = document.getElementById('memoryPhoto');
  var cardMonth = document.getElementById('memoryMonth');
  var cardTitle = document.getElementById('memoryTitle');
  var cardText = document.getElementById('memoryText');
  var finalOverlay = document.getElementById('finalOverlay');
  var finalClose = document.getElementById('finalClose');
  var audio = document.getElementById('loveSong');

  /* ── State ────────────────────────────────────────────── */
  var width = 0, height = 0, dpr = window.devicePixelRatio || 1;
  var bgStars = [];                  // tiny twinkling stars
  var memoryStars = [];              // the 3 clickable ones
  var heartScale = 1, heartCx = 0, heartCy = 0;
  var shootingStar = null;
  var finalTriggered = false;

  /* ── Heart curve helpers ──────────────────────────────── */
  // Standard parametric heart. y is flipped so the heart sits upright on canvas.
  function heartPoint(t) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x: heartCx + x * heartScale, y: heartCy + y * heartScale };
  }

  // Three star anchor angles, evenly spaced around the curve
  var STAR_ANGLES = [-Math.PI / 3, Math.PI / 3, Math.PI];

  // Each star "owns" the arc from its angle to the next star's angle (clockwise)
  function arcRangeFor(i) {
    var a = STAR_ANGLES[i];
    var b = STAR_ANGLES[(i + 1) % STAR_ANGLES.length];
    // Walk forward in t, wrapping past 2π if needed
    if (b <= a) b += Math.PI * 2;
    return { from: a, to: b };
  }

  /* ── Sizing ───────────────────────────────────────────── */
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Heart fits within ~58% of the shorter viewport dimension
    var shorter = Math.min(width, height);
    heartScale = (shorter * 0.58) / 34; // curve y-range ≈ 34 units tall
    heartCx = width / 2;
    heartCy = height / 2 + heartScale * 2; // nudge down slightly for visual center

    // Recompute memory-star canvas positions
    memoryStars.forEach(function (s, i) {
      var p = heartPoint(STAR_ANGLES[i]);
      s.x = p.x;
      s.y = p.y;
    });
  }

  /* ── Initial population ───────────────────────────────── */
  function makeBgStars() {
    var density = Math.floor((width * height) / 6000);
    bgStars = [];
    for (var i = 0; i < density; i++) {
      bgStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  function makeMemoryStars() {
    memoryStars = MEMORIES.map(function (mem, i) {
      return {
        index: i,
        memory: mem,
        x: 0, y: 0,
        r: 7,
        clicked: false,
        arcProgress: 0,   // 0..1, fills in after click
        pulse: Math.random() * Math.PI * 2
      };
    });
  }

  /* ── Drawing ──────────────────────────────────────────── */
  function drawBgStars(time) {
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var a = s.baseAlpha + Math.sin(time * 0.001 * s.speed + s.twinkle) * 0.25;
      a = Math.max(0, Math.min(1, a));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 240, 255, ' + a + ')';
      ctx.fill();
    }
  }

  function drawHeartArc(star, i) {
    if (star.arcProgress <= 0) return;
    var range = arcRangeFor(i);
    var steps = 80;
    var endT = range.from + (range.to - range.from) * star.arcProgress;

    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255, 150, 200, 0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(255, 200, 230, 0.95)';

    ctx.beginPath();
    for (var k = 0; k <= steps; k++) {
      var t = range.from + (endT - range.from) * (k / steps);
      var p = heartPoint(t);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawMemoryStar(star, time) {
    var pulse = (Math.sin(time * 0.003 + star.pulse) + 1) * 0.5; // 0..1
    var glowR = star.r + 12 + pulse * 6;
    var coreAlpha = star.clicked ? 1 : (0.75 + pulse * 0.25);

    // Outer glow
    var grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
    grad.addColorStop(0, 'rgba(255, 200, 230, ' + (0.55 * coreAlpha) + ')');
    grad.addColorStop(1, 'rgba(255, 200, 230, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + coreAlpha + ')';
    ctx.fill();

    // Four-point sparkle cross
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.6 * coreAlpha) + ')';
    ctx.lineWidth = 1;
    var spike = star.r + 6 + pulse * 3;
    ctx.beginPath();
    ctx.moveTo(-spike, 0); ctx.lineTo(spike, 0);
    ctx.moveTo(0, -spike); ctx.lineTo(0, spike);
    ctx.stroke();
    ctx.restore();
  }

  function drawShootingStar() {
    if (!shootingStar) return;
    var s = shootingStar;
    var dx = s.x2 - s.x1;
    var dy = s.y2 - s.y1;
    var headX = s.x1 + dx * s.t;
    var headY = s.y1 + dy * s.t;
    var tailX = s.x1 + dx * Math.max(0, s.t - 0.25);
    var tailY = s.y1 + dy * Math.max(0, s.t - 0.25);

    var grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
    grad.addColorStop(0, 'rgba(255, 220, 240, 0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255, 200, 230, 1)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Animation loop ───────────────────────────────────── */
  function tick(time) {
    ctx.clearRect(0, 0, width, height);

    drawBgStars(time);

    memoryStars.forEach(function (s, i) {
      if (s.clicked && s.arcProgress < 1) {
        s.arcProgress = Math.min(1, s.arcProgress + 0.012);
      }
      drawHeartArc(s, i);
    });

    memoryStars.forEach(function (s) { drawMemoryStar(s, time); });

    if (shootingStar) {
      shootingStar.t += 0.018;
      if (shootingStar.t >= 1.25) shootingStar = null;
      else drawShootingStar();
    }

    requestAnimationFrame(tick);
  }

  /* ── Interactions ─────────────────────────────────────── */
  function hitTest(px, py) {
    for (var i = 0; i < memoryStars.length; i++) {
      var s = memoryStars[i];
      var dx = px - s.x, dy = py - s.y;
      var r = s.r + 18; // generous hit radius
      if (dx * dx + dy * dy <= r * r) return s;
    }
    return null;
  }

  function onPointer(e) {
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
    var py = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY) - rect.top;
    var hit = hitTest(px, py);
    if (hit) {
      // If the finale overlay is up, dismiss it so she can see the memory she clicked
      if (finalOverlay.classList.contains('is-visible')) closeFinal();
      revealMemory(hit);
    }
  }

  function onMove(e) {
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left;
    var py = e.clientY - rect.top;
    canvas.style.cursor = hitTest(px, py) ? 'pointer' : 'default';
  }

  function revealMemory(star) {
    var alreadyClicked = star.clicked;
    star.clicked = true;

    // Populate the card
    cardMonth.textContent = star.memory.month;
    cardTitle.textContent = star.memory.title;
    cardText.textContent = star.memory.text;

    // Photo with graceful fallback
    cardPhotoWrap.classList.remove('empty');
    cardPhoto.alt = star.memory.title;
    cardPhoto.onerror = function () { cardPhotoWrap.classList.add('empty'); };
    cardPhoto.src = star.memory.photo;

    card.classList.add('is-open');

    updateProgress();

    if (!alreadyClicked && memoryStars.every(function (s) { return s.clicked; })) {
      // Wait until arcs finish drawing before the finale
      setTimeout(triggerFinale, 1400);
    }
  }

  function updateProgress() {
    var done = memoryStars.filter(function (s) { return s.clicked; }).length;
    progressLabel.textContent = done + ' / ' + memoryStars.length;
  }

  function closeCard() {
    card.classList.remove('is-open');
  }

  function closeFinal() {
    finalOverlay.classList.remove('is-visible');
    finalOverlay.setAttribute('aria-hidden', 'true');
  }

  /* ── Finale ───────────────────────────────────────────── */
  function triggerFinale() {
    if (finalTriggered) return;
    finalTriggered = true;

    // Shooting star streaks diagonally across
    shootingStar = {
      x1: width * 0.1,
      y1: height * 0.15,
      x2: width * 0.9,
      y2: height * 0.55,
      t: 0
    };

    // Reveal final message after the streak begins
    setTimeout(function () {
      finalOverlay.classList.add('is-visible');
      finalOverlay.setAttribute('aria-hidden', 'false');
    }, 700);

    // Fade in audio
    if (audio) {
      audio.volume = 0;
      var playPromise = audio.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () { /* autoplay blocked, ignore */ });
      var step = 0;
      var fade = setInterval(function () {
        step += 0.02;
        if (step >= 0.6) { audio.volume = 0.6; clearInterval(fade); }
        else { audio.volume = step; }
      }, 120);
    }
  }

  /* ── Wire-up ──────────────────────────────────────────── */
  function init() {
    resize();
    makeBgStars();
    makeMemoryStars();
    resize(); // re-place stars after they exist

    canvas.addEventListener('click', onPointer);
    canvas.addEventListener('touchstart', onPointer, { passive: true });
    canvas.addEventListener('mousemove', onMove);
    cardClose.addEventListener('click', closeCard);
    finalClose.addEventListener('click', closeFinal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (finalOverlay.classList.contains('is-visible')) closeFinal();
        else closeCard();
      }
    });

    window.addEventListener('resize', function () {
      resize();
      makeBgStars();
    });

    updateProgress();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
