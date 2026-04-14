/* =========================================================
   album.js — lightbox + jar of reasons (vanilla JS, no jQuery)
   ========================================================= */

/* ── Reasons ── edit freely ───────────────────────────── */
var reasons = [
  'Por cómo me haces sentir en casa aunque estemos lejos.',
  'Por esa risa tuya que me alegra el día sin importar nada más.',
  'Porque me escuchas de verdad, y eso vale más de lo que crees amor.',
  'Por lo genuina que eres en todo lo que haces y en todo lo que eres.',
  'Porque me has enseñado que el amor bonito sí existe, y que ser amado plenamente por ti es el sueño más hermoso.',
  'Por la manera tan especial en que cuidas a las personas que quieres.',
  'Porque contigo los momentos más simples se vuelven memorables.',
  'Por esos ojos que me derriten cada vez que los veo.',
  'Porque me haces querer ser mejor persona cada día.',
  'Por cada mensajito tuyo que llega justo cuando más lo necesito.',
  'Porque la distancia nunca ha podido con lo nuestro. Porque lo que viene es incluso más bonito.',
  'Por todas las noches que hemos hablado sin querer colgar.',
  'Porque en ti encontré un lugar seguro donde ser yo mismo.',
  'Por lo mucho que me enseñas simplemente siendo tú.',
  'Por este mes, y por la vida que nos queda juntos por delante.'
];

document.addEventListener('DOMContentLoaded', function () {

  /* ======================================================
     LIGHTBOX
     ====================================================== */
  var lightbox   = document.getElementById('lightbox');
  var lbImg      = document.getElementById('lbImg');
  var lbCaption  = document.getElementById('lbCaption');
  var lbClose    = document.getElementById('lbClose');
  var lbPrev     = document.getElementById('lbPrev');
  var lbNext     = document.getElementById('lbNext');

  var loadedPols = [];   // polaroid elements whose image actually loaded
  var lbIndex    = 0;
  var lbOpen     = false;

  /* Collect every polaroid that has a fully-loaded image */
  function getLoaded() {
    var all = document.querySelectorAll('.polaroid');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var img = all[i].querySelector('img');
      if (img && img.complete && img.naturalWidth > 0) {
        out.push(all[i]);
      }
    }
    return out;
  }

  function renderLb() {
    var pol     = loadedPols[lbIndex];
    var img     = pol.querySelector('img');
    var caption = pol.querySelector('.caption');
    lbImg.src          = img.src;
    lbImg.alt          = img.alt || '';
    lbCaption.textContent = caption ? caption.textContent : '';
    var many = loadedPols.length > 1;
    lbPrev.style.display = many ? '' : 'none';
    lbNext.style.display = many ? '' : 'none';
  }

  function openLb(pol) {
    loadedPols = getLoaded();
    lbIndex = loadedPols.indexOf(pol);
    if (lbIndex === -1) return;
    renderLb();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbOpen = true;
    lbClose.focus();
  }

  function closeLb() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbOpen = false;
  }

  function prevLb() {
    lbIndex = (lbIndex - 1 + loadedPols.length) % loadedPols.length;
    renderLb();
  }

  function nextLb() {
    lbIndex = (lbIndex + 1) % loadedPols.length;
    renderLb();
  }

  /* Attach click to every polaroid */
  var polaroids = document.querySelectorAll('.polaroid');
  for (var p = 0; p < polaroids.length; p++) {
    (function (pol) {
      pol.addEventListener('click', function () {
        var img = pol.querySelector('img');
        if (!img || !img.complete || img.naturalWidth === 0) return;
        openLb(pol);
      });
    })(polaroids[p]);
  }

  lbClose.addEventListener('click', closeLb);

  lbPrev.addEventListener('click', function () { prevLb(); });
  lbNext.addEventListener('click', function () { nextLb(); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLb();
  });

  document.addEventListener('keydown', function (e) {
    if (!lbOpen) return;
    if (e.key === 'Escape')     closeLb();
    if (e.key === 'ArrowLeft')  prevLb();
    if (e.key === 'ArrowRight') nextLb();
  });

  /* ======================================================
     JAR OF REASONS
     ====================================================== */
  var jarBtn      = document.getElementById('jarBtn');
  var noteCard    = document.getElementById('noteCard');
  var noteText    = document.getElementById('noteText');
  var noteCounter = document.getElementById('noteCounter');

  var remaining = [];

  function refill() {
    remaining = reasons.slice();
    /* Fisher-Yates shuffle */
    for (var i = remaining.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = remaining[i]; remaining[i] = remaining[j]; remaining[j] = t;
    }
  }

  function drawNote() {
    if (remaining.length === 0) refill();
    var text  = remaining.pop();
    var shown = reasons.length - remaining.length;

    /* Restart shake animation */
    jarBtn.classList.remove('shake');
    void jarBtn.offsetWidth;           /* force reflow */
    jarBtn.classList.add('shake');
    setTimeout(function () { jarBtn.classList.remove('shake'); }, 500);

    /* Fade out → swap text → fade in */
    noteCard.classList.remove('visible');
    setTimeout(function () {
      noteText.textContent    = text;
      noteCounter.textContent = shown + ' de ' + reasons.length;
      noteCard.classList.add('visible');
    }, 180);
  }

  refill();
  jarBtn.addEventListener('click', drawNote);

});
