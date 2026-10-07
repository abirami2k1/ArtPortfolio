# Abislovescape — Art Portfolio

Art portfolio of Abirami Saravanan, built with Next.js (static export) and deployed to GitHub Pages at
https://abirami2k1.github.io/ArtPortfolio/

Work portfolio: https://abirami2k1sr.github.io/Portfolio/

## Develop

```bash
npm install
npm run dev
```

## Update artworks

- Panel images live in `public/art/art-N.webp` (converted from the `ArtPics/` originals).
- Titles/categories are in `src/data/artworks.js`; the first 8 entries are what mobile shows.
- Contact links are in `src/data/links.js`.

## Deploy

Push to `main`; `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.
In the repo settings, set **Pages → Source** to **GitHub Actions** once.
