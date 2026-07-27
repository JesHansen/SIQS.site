# siqs.net — showcase website

The static marketing / showcase site for [**SIQS.NET**](https://github.com/JesHansen/siqs.net),
an open-source self-initializing quadratic sieve implemented in modern C# and .NET.

Served via **GitHub Pages** at <https://siqs.net>.

## Contents

| File | Purpose |
| --- | --- |
| `index.html` | The single-page showcase site. |
| `404.html` | Custom not-found page. |
| `css/style.css` | All styling (plain CSS, no build step, light + dark). |
| `CNAME` | Tells GitHub Pages to serve the site at `siqs.net`. |
| `.nojekyll` | Disables Jekyll processing — the site is plain static HTML. |

No build tooling is required. Editing the HTML/CSS and pushing to the default branch redeploys the site.

## Publishing (one-time setup)

1. Create a **new** GitHub repository (name it anything *except* `siqs.net`, since that name is
   already taken by the source-code repo — e.g. `siqs.net-site`).
2. Push this directory to it:
   ```bash
   git remote add origin https://github.com/JesHansen/<repo-name>.git
   git push -u origin main
   ```
3. In the repo's **Settings → Pages**, set the source to **Deploy from a branch**, branch `main`,
   folder `/ (root)`.
4. Under **Settings → Pages → Custom domain**, confirm `siqs.net` (the `CNAME` file already sets it).
5. At your DNS registrar, point the apex domain at GitHub Pages:
   ```
   A     185.199.108.153
   A     185.199.109.153
   A     185.199.110.153
   A     185.199.111.153
   AAAA  2606:50c0:8000::153
   AAAA  2606:50c0:8001::153
   AAAA  2606:50c0:8002::153
   AAAA  2606:50c0:8003::153
   ```
   Optionally add `CNAME  www  jeshansen.github.io.` for the `www` subdomain.
6. Once DNS resolves, tick **Enforce HTTPS** in Settings → Pages.

## Local preview

Any static file server works, for example:

```bash
python -m http.server 8080
# then open http://localhost:8080
```
