/* SIQS.NET — shared site behaviour. Vanilla JS, no dependencies.
   Theme toggle, scroll-reveal, nav state, figure parallax, reading progress.
   All motion honours prefers-reduced-motion. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme toggle (default dark; choice persisted) ---------- */
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("siqs-theme", t); } catch (e) {}
  }
  var toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ---------- Sticky-header shadow on scroll ---------- */
  var header = document.querySelector("header.site");
  function onScrollHeader() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Reading-progress bar (article pages) ---------- */
  var progress = document.querySelector(".progress");
  if (progress) {
    var progressTick = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progress.style.width = pct + "%";
    };
    progressTick();
    window.addEventListener("scroll", progressTick, { passive: true });
    window.addEventListener("resize", progressTick);
  }

  /* ---------- Scroll-reveal via IntersectionObserver ---------- */
  var revealTargets = document.querySelectorAll(".reveal, .reveal-line, .pipeline, .ladder .rung");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach(function (el) { revObserver.observe(el); });
  }

  /* ---------- Active section in nav (landing) ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    var secObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var id = e.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { secObserver.observe(s); });
  }

  /* ---------- Subtle figure parallax ---------- */
  if (!reduceMotion) {
    var parallax = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (parallax.length) {
      var ticking = false;
      var apply = function () {
        var vh = window.innerHeight;
        parallax.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var mid = r.top + r.height / 2;
          var delta = (mid - vh / 2) / vh;           /* -0.5 .. 0.5 */
          var amt = parseFloat(el.getAttribute("data-parallax")) || 14;
          el.style.transform = "translate3d(0," + (-delta * amt).toFixed(2) + "px,0)";
        });
        ticking = false;
      };
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; requestAnimationFrame(apply); }
      }, { passive: true });
      window.addEventListener("resize", apply);
      apply();
    }
  }

  /* ---------- Current year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
