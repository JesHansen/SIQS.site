/* SIQS.NET — hero "marginalia" sieve.
   A live, quietly looping miniature of the real thing: an interval of cells,
   factor-base primes stamp their arithmetic progressions with log-weights,
   a scan lights up the smooth survivors, hold, fade, repeat.
   Honours prefers-reduced-motion (draws one settled frame, then stops). */
(function () {
  "use strict";

  var canvas = document.getElementById("sieve-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var COLS = 22, ROWS = 12, N = COLS * ROWS, GAP = 3;

  // Small factor base. A cell at index x gets += log(p) when x ≡ root (mod p).
  var FB = [3, 5, 7, 11, 13, 17, 19, 23];
  var LOG = FB.map(function (p) { return Math.log(p); });

  /* ---------- theme colours (re-read on toggle) ---------- */
  var C = {};
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    C.dim = s.getPropertyValue("--ink-faint").trim();
    C.accent = s.getPropertyValue("--accent").trim();
    C.paper3 = s.getPropertyValue("--paper-3").trim();
  }
  readColors();
  new MutationObserver(readColors).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- geometry ---------- */
  var cw = 0, chh = 0, dpr = 1, cellW = 0, cellH = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth || 360;
    cellW = (cw - GAP * (COLS - 1)) / COLS;
    cellH = Math.max(9, cellW * 0.72);
    chh = cellH * ROWS + GAP * (ROWS - 1);
    canvas.style.height = chh + "px";
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(chh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function cellXY(idx) {
    var c = idx % COLS, r = (idx / COLS) | 0;
    return [c * (cellW + GAP), r * (cellH + GAP)];
  }

  /* ---------- state ---------- */
  var acc = new Float32Array(N);       // accumulated log per cell
  var survivor = new Uint8Array(N);    // finalised survivor flag
  var lit = new Float32Array(N);       // survivor glow 0..1
  var roots = [], progFrac = new Float32Array(FB.length), currentPrime = 0, threshold = 0;

  function newRun() {
    acc.fill(0); survivor.fill(0); lit.fill(0); progFrac.fill(0); currentPrime = 0;
    roots = FB.map(function (p) { return Math.floor(Math.random() * p); });
    // Pick a threshold giving ~6–12 survivors from the fully-stamped interval.
    var finalAcc = new Float32Array(N);
    for (var i = 0; i < FB.length; i++)
      for (var x = roots[i]; x < N; x += FB[i]) finalAcc[x] += LOG[i];
    var sorted = Array.prototype.slice.call(finalAcc).sort(function (a, b) { return b - a; });
    var target = 8 + Math.floor(Math.random() * 5);
    threshold = sorted[Math.min(target, N - 1)] + 0.001;
  }

  // Recompute accumulation from how far each prime has been stamped.
  function recompute() {
    acc.fill(0);
    for (var i = 0; i < FB.length; i++) {
      var f = i < currentPrime ? 1 : (i === currentPrime ? progFrac[i] : 0);
      if (f <= 0) continue;
      var hits = [], x;
      for (x = roots[i]; x < N; x += FB[i]) hits.push(x);
      var upto = Math.floor(hits.length * f + 1e-4);
      for (var h = 0; h < upto; h++) acc[hits[h]] += LOG[i];
    }
  }
  function easeLit() {
    for (var i = 0; i < N; i++) lit[i] += ((survivor[i] ? 1 : 0) - lit[i]) * 0.18;
  }

  /* ---------- drawing ---------- */
  function hexA(hex, a) {
    hex = (hex || "").trim();
    var r, g, b;
    if (hex[0] === "#" && hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
    } else if (hex[0] === "#" && hex.length >= 7) {
      r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16);
    } else { return hex; }
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function draw(sweepPrime, sweepAlpha, scanY) {
    ctx.clearRect(0, 0, cw, chh);
    var maxAcc = threshold * 1.1;
    for (var idx = 0; idx < N; idx++) {
      var p = cellXY(idx), x = p[0], y = p[1], a = acc[idx];
      roundRect(x, y, cellW, cellH, 2);
      ctx.fillStyle = C.paper3; ctx.fill();
      if (a > 0) {
        roundRect(x, y, cellW, cellH, 2);
        ctx.fillStyle = hexA(C.dim, 0.12 + Math.min(a / maxAcc, 1) * 0.4); ctx.fill();
      }
      if (lit[idx] > 0.01) {
        var g = lit[idx];
        ctx.save();
        ctx.shadowColor = hexA(C.accent, 0.7 * g);
        ctx.shadowBlur = 10 * g;
        roundRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1, 2);
        ctx.fillStyle = hexA(C.accent, 0.85 * g); ctx.fill();
        ctx.restore();
      }
    }
    if (sweepPrime && sweepAlpha > 0.01) {
      var pi = FB.indexOf(sweepPrime);
      for (var xx = roots[pi]; xx < N; xx += sweepPrime) {
        var q = cellXY(xx);
        roundRect(q[0], q[1], cellW, cellH, 2);
        ctx.strokeStyle = hexA(C.accent, 0.9 * sweepAlpha);
        ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    if (scanY != null) {
      ctx.fillStyle = hexA(C.accent, 0.13);
      ctx.fillRect(0, scanY - cellH, cw, cellH * 1.2);
      ctx.strokeStyle = hexA(C.accent, 0.6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(cw, scanY); ctx.stroke();
    }
  }

  /* ---------- timeline ---------- */
  var PER_PRIME = 320, SCAN = 950, HOLD = 1600, FADE = 750;
  var SIEVE = FB.length * PER_PRIME;
  var raf = null, t0 = 0;

  function frame(now) {
    if (!t0) t0 = now;
    var t = now - t0;

    if (t < SIEVE) {
      var i = Math.floor(t / PER_PRIME);
      var local = (t - i * PER_PRIME) / PER_PRIME;
      currentPrime = i; progFrac[i] = local; recompute();
      draw(FB[i], Math.sin(local * Math.PI), null);
    } else if (t < SIEVE + SCAN) {
      currentPrime = FB.length; for (var k = 0; k < FB.length; k++) progFrac[k] = 1; recompute();
      var scanY = ((t - SIEVE) / SCAN) * chh;
      for (var idx = 0; idx < N; idx++)
        if (acc[idx] >= threshold && cellXY(idx)[1] + cellH / 2 <= scanY) survivor[idx] = 1;
      easeLit(); draw(null, 0, scanY);
    } else if (t < SIEVE + SCAN + HOLD) {
      for (var m = 0; m < N; m++) if (acc[m] >= threshold) survivor[m] = 1;
      easeLit(); draw(null, 0, null);
    } else if (t < SIEVE + SCAN + HOLD + FADE) {
      for (var n = 0; n < N; n++) { acc[n] *= 0.985; lit[n] *= 0.9; }
      draw(null, 0, null);
    } else {
      newRun(); t0 = now; draw(null, 0, null);
    }
    raf = requestAnimationFrame(frame);
  }

  function staticFrame() {
    newRun();
    currentPrime = FB.length; progFrac.fill(1); recompute();
    for (var k = 0; k < N; k++) if (acc[k] >= threshold) { survivor[k] = 1; lit[k] = 1; }
    draw(null, 0, null);
  }

  function start() {
    resize();
    if (reduce) { staticFrame(); return; }
    newRun(); t0 = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }

  /* pause offscreen */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { cancelAnimationFrame(raf); raf = null; }
        else if (!reduce && !raf) { t0 = 0; raf = requestAnimationFrame(frame); }
      });
    }, { threshold: 0.05 }).observe(canvas);
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduce) staticFrame(); }, 150);
  });

  start();
})();
