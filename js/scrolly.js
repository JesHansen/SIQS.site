/* SIQS.NET — scrollytelling engine for the deep dive.
   Each .scene pins a canvas stage while caption "beats" scroll past. Scene
   progress s ∈ [0, K-1] drives a pure render(s) function per scene, so the
   graphic morphs continuously with the reader. Scroll-linked (not autonomous),
   so it is welcome even under reduced-motion; we simply skip idle repaints. */
(function () {
  "use strict";

  /* ---------- small math + draw helpers ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { return x * x * (3 - 2 * x); }
  // map x from [a,b] → [0,1], smoothed
  function seg(a, b, x) { return smooth(clamp((x - a) / (b - a), 0, 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

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
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* =====================================================================
     Scene: the sieve marking multiples, survivors lighting up
     ===================================================================== */
  function makeSieve() {
    var COLS = 20, ROWS = 10, N = COLS * ROWS, GAP = 4;
    var FB = [3, 5, 7, 11, 13, 17], LOG = FB.map(Math.log);
    var roots = [1, 2, 3, 5, 8, 4];             // fixed → stable illustration
    var acc = new Float32Array(N), thr = 0;
    (function () {
      for (var i = 0; i < FB.length; i++)
        for (var x = roots[i]; x < N; x += FB[i]) acc[x] += LOG[i];
      var s = Array.prototype.slice.call(acc).sort(function (a, b) { return b - a; });
      thr = s[9] + 0.001;                        // ~10 survivors
    })();

    return function (ctx, w, h, s, C) {
      ctx.clearRect(0, 0, w, h);
      var cw = (w - GAP * (COLS - 1)) / COLS;
      var chh = (h - GAP * (ROWS - 1)) / ROWS;
      var appear = seg(0, 0.6, s);
      var stampP = clamp((s - 0.5) / 1.6, 0, 1);   // fraction of FB stamped
      var primesDone = stampP * FB.length;
      var scanY = seg(2.0, 2.85, s) * h;
      var maxAcc = thr * 1.15;

      // recompute partial accumulation
      var a = new Float32Array(N);
      for (var i = 0; i < FB.length; i++) {
        var f = i < Math.floor(primesDone) ? 1 : (i === Math.floor(primesDone) ? primesDone % 1 : 0);
        if (f <= 0) continue;
        var hits = [], x;
        for (x = roots[i]; x < N; x += FB[i]) hits.push(x);
        var upto = Math.floor(hits.length * f + 1e-4);
        for (var k = 0; k < upto; k++) a[hits[k]] += LOG[i];
      }

      for (var idx = 0; idx < N; idx++) {
        var c = idx % COLS, r = (idx / COLS) | 0;
        var px = c * (cw + GAP), py = r * (chh + GAP);
        var av = appear * Math.min(1, 0.35 + 0.65 * (idx % 7) / 6); // stagger-in
        rrect(ctx, px, py, cw, chh, 2);
        ctx.fillStyle = hexA(C.paper3, av);
        ctx.fill();
        if (a[idx] > 0) {
          rrect(ctx, px, py, cw, chh, 2);
          ctx.fillStyle = hexA(C.dim, 0.12 + Math.min(a[idx] / maxAcc, 1) * 0.42);
          ctx.fill();
        }
        // survivor
        var passed = py + chh / 2 <= scanY;
        if (s > 2.0 && acc[idx] >= thr && passed) {
          var glow = seg(2.0, 2.9, s);
          ctx.save();
          ctx.shadowColor = hexA(C.accent, 0.7); ctx.shadowBlur = 12;
          rrect(ctx, px + 0.5, py + 0.5, cw - 1, chh - 1, 2);
          ctx.fillStyle = hexA(C.accent, 0.9 * glow); ctx.fill();
          ctx.restore();
        }
      }
      // current prime outline while stamping
      if (s > 0.5 && s < 2.0) {
        var pi = Math.min(Math.floor(primesDone), FB.length - 1);
        for (var xx = roots[pi]; xx < N; xx += FB[pi]) {
          var cc = xx % COLS, rr = (xx / COLS) | 0;
          rrect(ctx, cc * (cw + GAP), rr * (chh + GAP), cw, chh, 2);
          ctx.strokeStyle = hexA(C.accent, 0.85); ctx.lineWidth = 1.4; ctx.stroke();
        }
      }
      // scan line
      if (s >= 2.0 && s < 2.9) {
        ctx.strokeStyle = hexA(C.accent, 0.6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();
      }
    };
  }

  /* =====================================================================
     Scene: large-prime partials pairing on a graph, a cycle cancelling
     ===================================================================== */
  function makeGraph() {
    // Node 0 = "1"; nodes 1..6 = large primes ℓ.
    // y biased toward the top of the canvas so the figure clears the caption card
    var nodes = [
      { x: 0.50, y: 0.41, label: "1" },
      { x: 0.22, y: 0.25, label: "ℓ₁" },
      { x: 0.50, y: 0.16, label: "ℓ₂" },
      { x: 0.80, y: 0.27, label: "ℓ₃" },
      { x: 0.82, y: 0.57, label: "ℓ₄" },
      { x: 0.50, y: 0.65, label: "ℓ₅" },
      { x: 0.20, y: 0.57, label: "ℓ₆" }
    ];
    // edges: [a,b, kind]  kind 0 single-prime(to 1), 1 pairing, 2 2LP, cycle flag
    var singles = [[0, 2], [0, 2]];               // two partials sharing ℓ₂
    var twolp = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]];  // outer ring
    var cycle = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]];  // the whole ring is a cycle

    return function (ctx, w, h, s, C) {
      ctx.clearRect(0, 0, w, h);
      var R = Math.min(w, h) * 0.052;
      function P(n) { return [nodes[n].x * w, nodes[n].y * h]; }
      function edge(aI, bI, col, lw, alpha, bow) {
        var A = P(aI), B = P(bI);
        ctx.strokeStyle = hexA(col, alpha); ctx.lineWidth = lw;
        ctx.beginPath();
        if (bow) {                                 // curve parallel edges apart
          var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
          var dx = B[1] - A[1], dy = A[0] - B[0], L = Math.hypot(dx, dy) || 1;
          ctx.moveTo(A[0], A[1]);
          ctx.quadraticCurveTo(mx + dx / L * bow, my + dy / L * bow, B[0], B[1]);
        } else { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
        ctx.stroke();
      }

      var aSingles = seg(0.0, 0.8, s);
      var aPair = seg(0.8, 1.5, s);
      var a2lp = seg(1.6, 2.4, s);
      var aCycle = seg(2.4, 3.0, s);

      // 2LP ring edges
      for (var i = 0; i < twolp.length; i++) {
        var prog = clamp(a2lp * twolp.length - i, 0, 1);
        if (prog > 0) edge(twolp[i][0], twolp[i][1], C.rule, 1.5, prog * (aCycle > 0 ? 0.4 : 0.8), 0);
      }
      // cycle highlight (steady — scroll-linked, no idle animation)
      if (aCycle > 0) {
        for (var c = 0; c < cycle.length; c++)
          edge(cycle[c][0], cycle[c][1], C.accent, 2.6, aCycle, 0);
      }
      // single-prime partials (two edges to ℓ₂, bowed apart)
      if (aSingles > 0 && aCycle < 0.5) {
        edge(0, 2, C.accent, 1.8, aSingles * (1 - aCycle), 16);
        edge(0, 2, C.accent, 1.8, aSingles * (1 - aCycle), -16);
        if (aPair > 0) {                            // pairing halo on shared prime
          var Q = P(2);
          ctx.beginPath(); ctx.arc(Q[0], Q[1], R * 1.9, 0, 7);
          ctx.strokeStyle = hexA(C.accent, aPair * 0.7); ctx.lineWidth = 1.4; ctx.stroke();
        }
      }
      // nodes
      for (var n = 0; n < nodes.length; n++) {
        var pt = P(n), on = n === 0 ? aSingles : (n <= 6 ? Math.max(aSingles * (n === 2 ? 1 : 0), a2lp) : 0);
        on = clamp(on + (aCycle > 0 && n >= 1 ? aCycle : 0), 0, 1);
        if (on <= 0.01) continue;
        ctx.beginPath(); ctx.arc(pt[0], pt[1], R, 0, 7);
        ctx.fillStyle = hexA(C.paper2, on);
        ctx.fill();
        ctx.strokeStyle = hexA(n === 0 ? C.dim : C.accent, on); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = hexA(C.ink, on);
        ctx.font = "600 " + (R * 0.95).toFixed(0) + "px 'EB Garamond', serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(nodes[n].label, pt[0], pt[1] + 1);
      }
    };
  }

  /* =====================================================================
     Scene: GF(2) matrix rows XOR to zero — a dependency
     ===================================================================== */
  function makeMatrix() {
    var ROWS = 6, COLS = 11;
    // rows of bits; rows 0,2,4 form a dependency (their XOR = 0).
    var M = [
      [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
      [0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0],
      [1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0],
      [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
      [0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1]
    ];
    // make row4 = row0 XOR row2 so {0,2,4} is an exact dependency
    for (var c = 0; c < COLS; c++) M[4][c] = M[0][c] ^ M[2][c];
    var dep = [0, 2, 4];

    return function (ctx, w, h, s, C) {
      ctx.clearRect(0, 0, w, h);
      var pad = 6;
      var gw = (w - pad) / COLS;
      var rowsShown = ROWS;                       // 5 relation rows + 1 result row
      var gh = (h - pad) / (rowsShown + 0.6);
      var cell = Math.min(gw, gh) * 0.86;
      var ox = (w - COLS * gw) / 2 + (gw - cell) / 2;

      var appear = seg(0, 0.8, s);
      var pick = seg(0.9, 1.7, s);
      var xorP = clamp((s - 1.8) / 0.9, 0, 1);     // columns resolved
      var done = seg(2.7, 3.0, s);

      function drawBit(r, c, bit, alpha, tint) {
        var x = ox + c * gw, y = pad + r * gh;
        rrect(ctx, x, y, cell, cell, 2);
        ctx.fillStyle = hexA(tint || C.paper3, alpha);
        ctx.fill();
        if (bit) {
          ctx.fillStyle = hexA(tint === C.accent ? C.paper : C.ink, alpha * 0.9);
          ctx.font = (cell * 0.72).toFixed(0) + "px 'JetBrains Mono', monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("1", x + cell / 2, y + cell / 2 + 1);
        }
      }

      for (var r = 0; r < 5; r++) {
        var isDep = dep.indexOf(r) >= 0;
        var a = appear * Math.min(1, 0.4 + 0.6 * (r + 1) / 5);
        var tint = (isDep && pick > 0) ? C.accent : C.paper3;
        var dim = (!isDep && pick > 0) ? (1 - pick * 0.7) : 1;
        for (var c = 0; c < COLS; c++)
          drawBit(r, c, M[r][c], a * dim * (tint === C.accent ? Math.max(0.5, pick) : 1), tint);
      }
      // result row (XOR of dep rows), resolving column by column
      if (xorP > 0) {
        var ry = pad + 5.4 * gh;
        var reveal = Math.floor(xorP * COLS + 0.001);
        for (var cc = 0; cc < COLS; cc++) {
          var val = (M[0][cc] ^ M[2][cc] ^ M[4][cc]);   // = 0 by construction
          var x = ox + cc * gw;
          rrect(ctx, x, ry, cell, cell, 2);
          if (cc < reveal) {
            ctx.fillStyle = hexA(C.accent, 0.16 + done * 0.1);
            ctx.fill();
            ctx.strokeStyle = hexA(C.accent, 0.5); ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = hexA(C.accent, 0.95);
            ctx.font = (cell * 0.72).toFixed(0) + "px 'JetBrains Mono', monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(val), x + cell / 2, ry + cell / 2 + 1);
          } else {
            ctx.fillStyle = hexA(C.paper3, 0.5); ctx.fill();
          }
        }
        // label
        ctx.fillStyle = hexA(C.dim, 0.9);
        ctx.font = "500 " + (cell * 0.62).toFixed(0) + "px 'JetBrains Mono', monospace";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        if (done > 0.3) {
          ctx.fillStyle = hexA(C.accent, done);
          ctx.textAlign = "center";
          ctx.fillText("⊕ = 0   → dependency", w / 2, ry + cell + gh * 0.5);
        }
      }
    };
  }

  /* =====================================================================
     Scene: the gcd splitting N into p · q
     ===================================================================== */
  function makeGcd() {
    var Nstr = "8381…9603", p = "123 456 789 012 419", q = "678 901 234 567 937";
    return function (ctx, w, h, s, C) {
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      var aCong = seg(0.0, 0.7, s);
      var aGcd = seg(0.8, 1.5, s);
      var aSplit = seg(1.7, 2.4, s);
      var aFactors = seg(2.2, 3.0, s);

      // congruence rises to the top as we progress
      var congY = lerp(h * 0.42, h * 0.13, seg(0.8, 2.0, s));
      ctx.globalAlpha = aCong;
      ctx.fillStyle = C.ink;
      ctx.font = "italic 600 " + Math.min(w * 0.085, 40).toFixed(0) + "px 'EB Garamond', serif";
      var congParts = ["X", "² ≡ ", "Y", "² (mod N)"];
      ctx.fillText("X² ≡ Y²  (mod N)", cx, congY);
      ctx.globalAlpha = 1;

      // gcd expressions
      if (aGcd > 0 && aSplit < 0.6) {
        ctx.globalAlpha = aGcd * (1 - aSplit);
        ctx.fillStyle = C.accent;
        ctx.font = Math.min(w * 0.048, 21).toFixed(0) + "px 'JetBrains Mono', monospace";
        ctx.fillText("gcd( X − Y ,  N )     gcd( X + Y ,  N )", cx, h * 0.32);
        ctx.globalAlpha = 1;
      }

      // split tree: N node → p, q
      if (aSplit > 0) {
        var nodeY = h * 0.26, leafY = h * 0.60;
        var lx = w * 0.27, rx = w * 0.73;
        // edges
        ctx.strokeStyle = hexA(C.accent, aSplit); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx, nodeY + 16); ctx.lineTo(lx, leafY - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, nodeY + 16); ctx.lineTo(rx, leafY - 22); ctx.stroke();

        // N node
        ctx.fillStyle = hexA(C.ink, aSplit);
        ctx.font = "600 " + Math.min(w * 0.06, 26).toFixed(0) + "px 'EB Garamond', serif";
        ctx.fillText("N", cx, nodeY);
        ctx.fillStyle = hexA(C.dim, aSplit);
        ctx.font = Math.min(w * 0.032, 13).toFixed(0) + "px 'JetBrains Mono', monospace";
        ctx.fillText("= " + Nstr, cx, nodeY + 20);

        // factor leaves
        function leaf(x, label, val) {
          ctx.globalAlpha = aFactors;
          rrect(ctx, x - w * 0.2, leafY - 20, w * 0.4, 44, 8);
          ctx.fillStyle = hexA(C.accent, 0.12); ctx.fill();
          ctx.strokeStyle = hexA(C.accent, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = C.accent;
          ctx.font = "600 " + Math.min(w * 0.045, 18).toFixed(0) + "px 'EB Garamond', serif";
          ctx.fillText(label, x, leafY - 4);
          ctx.fillStyle = hexA(C.ink, 0.85);
          ctx.font = Math.min(w * 0.03, 12).toFixed(0) + "px 'JetBrains Mono', monospace";
          ctx.fillText(val, x, leafY + 12);
          ctx.globalAlpha = 1;
        }
        leaf(lx, "p", p);
        leaf(rx, "q", q);
      }
    };
  }

  var FACTORIES = { sieve: makeSieve, graph: makeGraph, matrix: makeMatrix, gcd: makeGcd };

  /* ---------- controller ---------- */
  var C = {};
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    ["ink", "ink-dim", "ink-faint", "accent", "accent-deep", "paper", "paper-2", "paper-3", "rule"]
      .forEach(function (k) { C[k.replace("ink-", "").replace("accent-", "")] = s.getPropertyValue("--" + k).trim(); });
    C.ink = s.getPropertyValue("--ink").trim();
    C.dim = s.getPropertyValue("--ink-faint").trim();
    C.accent = s.getPropertyValue("--accent").trim();
    C.paper = s.getPropertyValue("--paper").trim();
    C.paper2 = s.getPropertyValue("--paper-2").trim();
    C.paper3 = s.getPropertyValue("--paper-3").trim();
    C.rule = s.getPropertyValue("--rule").trim();
  }
  readColors();
  new MutationObserver(readColors).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme"] });

  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene[data-scene]"));
  var live = [];
  scenes.forEach(function (scene) {
    var canvas = scene.querySelector("canvas");
    var factory = FACTORIES[scene.getAttribute("data-scene")];
    if (!canvas || !factory) return;
    var ctx = canvas.getContext("2d");
    var render = factory();
    var beats = Array.prototype.slice.call(scene.querySelectorAll(".beat"));
    var K = beats.length;
    var dpr = 1, w = 0, hh = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || 600;
      hh = Math.min(w * 0.58, window.innerHeight * 0.46);
      canvas.style.height = hh + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    live.push({ scene: scene, ctx: ctx, render: render, beats: beats, K: K,
      resize: resize, w: function () { return w; }, h: function () { return hh; } });
  });

  function progressOf(item) {
    var rect = item.scene.getBoundingClientRect();
    var vh = window.innerHeight;
    var span = rect.height - vh;
    var p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
    return p * (item.K - 1);
  }

  var raf = null;
  function paint() {
    raf = null;
    for (var i = 0; i < live.length; i++) {
      var it = live[i];
      var rect = it.scene.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > window.innerHeight + 40) continue;
      var s = progressOf(it);
      it.render(it.ctx, it.w(), it.h(), s, C);
      var active = clamp(Math.round(s), 0, it.K - 1);
      for (var b = 0; b < it.beats.length; b++)
        it.beats[b].classList.toggle("active", b === active);
    }
  }
  function request() {
    if (!raf) raf = requestAnimationFrame(paint);
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", function () {
    live.forEach(function (it) { it.resize(); });
    request();
  });
  request();
})();
