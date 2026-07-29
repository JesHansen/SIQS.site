/* SIQS.NET — benchmark chart interaction. Vanilla JS, no dependencies.
   Adds a crosshair + tooltip over the log-scaled line chart, reveals it on
   scroll, and draws the line in. Geometry mirrors scripts that generated the
   static SVG in index.html; the chart is fully readable with JS disabled. */
(function () {
  "use strict";

  var svg = document.querySelector(".benchplot");
  if (!svg) return;

  var fig = svg.closest(".benchfig") || svg.parentNode;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- scales (must match the generated SVG) ---- */
  var PL = 54, PR = 706, PT = 16, PB = 314, DMIN = 11, DMAX = 90;
  var LOGMIN = Math.log10(0.1), LOGMAX = Math.log10(500);
  function xs(d) { return PL + (d - DMIN) / (DMAX - DMIN) * (PR - PL); }
  function ys(t) { return PB - (Math.log10(t) - LOGMIN) / (LOGMAX - LOGMIN) * (PB - PT); }

  var PTS = [[11,0.2],[12,0.2],[13,0.4],[14,0.4],[15,0.4],[16,0.4],[17,0.4],[18,0.5],[19,0.4],[20,0.4],[21,0.4],[22,0.4],[23,0.4],[24,0.4],[25,0.4],[26,0.4],[27,0.4],[28,0.5],[29,0.5],[30,0.5],[31,0.5],[32,0.5],[33,0.5],[34,0.5],[35,0.5],[36,0.5],[37,0.5],[38,0.6],[39,0.6],[40,0.6],[41,0.6],[42,0.7],[43,0.8],[44,1.2],[45,1],[46,1.6],[47,2.8],[48,1.7],[49,1.7],[50,1.7],[51,1.8],[52,1.9],[53,1.8],[54,2],[55,2.1],[56,2.1],[57,2.3],[58,2.4],[59,3.1],[60,3.2],[61,3.5],[62,3.3],[63,4],[64,5],[65,5.2],[66,6.5],[67,7.2],[68,7.5],[69,8.4],[70,9.6],[71,11],[72,12.2],[73,13.4],[74,15.2],[75,19.9],[76,23.9],[77,27.5],[78,29.2],[79,33.8],[80,39.6],[81,44.1],[82,82.7],[83,62.5],[84,81.4],[85,72],[86,119],[87,186.8],[88,161.6],[89,203.4],[90,331.6]];

  function fmt(t) {
    if (t < 60) return t.toFixed(1) + " s";
    var m = Math.floor(t / 60), s = Math.round(t - m * 60);
    if (s === 60) { m += 1; s = 0; }
    return m + " m " + s + " s";
  }

  /* ---- draw-on + reveal ---- */
  var line = svg.querySelector(".bench-line");
  if (line && !reduceMotion) {
    try {
      var len = line.getTotalLength();
      svg.style.setProperty("--len", len.toFixed(1));
    } catch (e) {}
  }
  if (reduceMotion || !("IntersectionObserver" in window)) {
    svg.classList.add("in");
  } else {
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); o.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    obs.observe(svg);
  }

  /* ---- crosshair + tooltip ---- */
  var cursor = svg.querySelector(".bench-cursor");
  var cline = svg.querySelector(".cursor-line");
  var cdot = svg.querySelector(".cursor-dot");
  var hit = svg.querySelector(".bench-hit");
  if (!cursor || !hit) return;

  var tip = document.createElement("div");
  tip.className = "bench-tip";
  tip.setAttribute("role", "status");
  tip.setAttribute("aria-live", "polite");
  fig.appendChild(tip);

  function nearest(clientX) {
    var p = svg.createSVGPoint();
    p.x = clientX; p.y = 0;
    var loc = p.matrixTransform(svg.getScreenCTM().inverse());
    var d = Math.round(DMIN + (loc.x - PL) / (PR - PL) * (DMAX - DMIN));
    if (d < DMIN) d = DMIN;
    if (d > DMAX) d = DMAX;
    return PTS[d - DMIN];
  }

  function show(pt) {
    var d = pt[0], t = pt[1];
    var cx = xs(d), cy = ys(t);
    cline.setAttribute("x1", cx); cline.setAttribute("x2", cx);
    cdot.setAttribute("cx", cx); cdot.setAttribute("cy", cy);
    cursor.classList.add("on");

    // place the HTML tooltip over the point, in figure-relative coords
    var sp = svg.createSVGPoint(); sp.x = cx; sp.y = cy;
    var scr = sp.matrixTransform(svg.getScreenCTM());
    var fr = fig.getBoundingClientRect();
    tip.style.left = (scr.x - fr.left) + "px";
    tip.style.top = (scr.y - fr.top) + "px";
    tip.innerHTML = '<span class="t-d">C' + d + '</span><span class="t-sep">·</span>' + fmt(t);
    tip.classList.add("on");
  }

  function hide() {
    cursor.classList.remove("on");
    tip.classList.remove("on");
  }

  hit.addEventListener("pointermove", function (e) { show(nearest(e.clientX)); });
  hit.addEventListener("pointerdown", function (e) { show(nearest(e.clientX)); });
  hit.addEventListener("pointerleave", hide);
})();
