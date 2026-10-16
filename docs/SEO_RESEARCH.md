# SEO implementation notes

## Findings verified on 2026-10-16

- The live production `robots.txt` and sitemap were returning `http://localhost:3000` URLs because the public-site environment variable had no production value. The apex domain `https://kaamset.online` redirects to `https://www.kaamset.online`, so the latter is the canonical origin.
- The live public routes returned server-rendered HTML, but lacked canonical links and `og:url` metadata.
- Google says a sitemap helps URL discovery but submission does not guarantee crawling or indexing. A site owner can request re-crawling in Search Console; it can take days or weeks and inclusion is not guaranteed.
- Google recommends accurate, concise and distinct titles for pages. Organization structured data has no required properties; only relevant, accurate facts should be provided.

## Official sources

- Google: Request recrawling — https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Google: Build and submit a sitemap — https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google: Title links — https://developers.google.com/search/docs/appearance/title-link
- Google: Organization structured data — https://developers.google.com/search/docs/appearance/structured-data/organization
