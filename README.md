# siqs.net

The source for **[siqs.net](https://siqs.net)** — the website for
[**SIQS.NET**](https://github.com/JesHansen/siqs.net), an open-source implementation of the
self-initializing quadratic sieve in modern C# and .NET.

This repository contains only the static showcase site. The factorization workbench itself —
the C# / .NET source code, CLI, Blazor web UI, and distributed sieving — lives in the
[JesHansen/siqs.net](https://github.com/JesHansen/siqs.net) repository.

## About the site

It's a single static page, hand-written in plain HTML and CSS with **no build step and no
dependencies**. It's served via [GitHub Pages](https://pages.github.com/) at
<https://siqs.net> and supports both light and dark themes.

| File | Purpose |
| --- | --- |
| `index.html` | The showcase page. |
| `404.html` | Custom not-found page. |
| `css/style.css` | All styling (plain CSS, light + dark). |
| `CNAME` | Binds the site to the `siqs.net` custom domain. |
| `.nojekyll` | Serves the files as-is, skipping Jekyll processing. |

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
