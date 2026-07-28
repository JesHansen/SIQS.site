# siqs.net

The source for **[siqs.net](https://siqs.net)** — the website for
[**SIQS.NET**](https://github.com/JesHansen/siqs.net), an open-source implementation of the
self-initializing quadratic sieve in modern C# and .NET.

This repository contains only the static showcase site. The factorization workbench itself —
the C# / .NET source code, CLI, Blazor web UI, and distributed sieving — lives in the
[JesHansen/siqs.net](https://github.com/JesHansen/siqs.net) repository.

## About the site

Two hand-written static pages — an editorial landing page and a long-form deep dive — with
**no build step and no third-party requests at runtime**. Styling is plain CSS; behaviour is a
little vanilla JavaScript (theme toggle, scroll-reveal, a live hero animation, and the deep
dive's scrollytelling). Fonts are self-hosted `woff2` subsets. It's served via
[GitHub Pages](https://pages.github.com/) at <https://siqs.net>, is dark-first with a warm-paper
light mode (toggle persists per visitor), and honours `prefers-reduced-motion`.

| File / folder | Purpose |
| --- | --- |
| `index.html` | The landing page — hero with a live sieve animation, benchmarks, pipeline, workbench gallery. |
| `how-it-works.html` | The deep dive — a typeset walkthrough with four pinned scrollytelling scenes (MathJax for equations). |
| `appendix.html` | Reference appendix — worked explanations of Tonelli–Shanks, Block Lanczos, CRT, quadratic residues, and Gray codes (MathJax). |
| `404.html` | Custom not-found page. |
| `css/style.css` | The design system — tokens, editorial layout, motion primitives (light + dark). |
| `css/fonts.css` | `@font-face` declarations for the self-hosted fonts. |
| `fonts/` | Self-hosted `woff2` subsets: EB Garamond (display), Inter (body), JetBrains Mono (code). |
| `js/site.js` | Shared behaviour: theme toggle, scroll-reveal, nav state, figure parallax, reading progress. |
| `js/hero-sieve.js` | The landing hero's live sieve `<canvas>` animation. |
| `js/scrolly.js` | The deep dive's scrollytelling engine and its four scene renderers. |
| `img/` | Screenshots of the terminal UI and the Blazor workbench. |
| `CNAME` | Binds the site to the `siqs.net` custom domain. |
| `.nojekyll` | Serves the files as-is, skipping Jekyll processing. |

The only runtime third-party asset is MathJax (loaded from a CDN on the deep-dive page) to
typeset the equations.

### Fonts

The `woff2` files under `fonts/` are the `latin` + `latin-ext` subsets pulled from Google Fonts
and vendored so the site makes no external font requests. All three families are under the SIL
Open Font License. `css/fonts.css` is generated to point at these local files; regenerate it if
you swap the subsets.

## Working on it locally

Because it's just static files, any local web server works — for example:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

Edit the HTML or CSS, and pushing to `main` redeploys the site automatically.

## License and credits

The quadratic sieve implementation that this site showcases owes an enormous debt to
[msieve](https://github.com/radii/msieve) and [YAFU](https://github.com/bbuhrow/yafu). See the
[main SIQS.NET repository](https://github.com/JesHansen/siqs.net) for the full acknowledgements.
