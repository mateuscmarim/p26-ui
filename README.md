# Credentials Panel

Vanilla JS frontend for the Parallel26 credentials tracker. Talks to the Spring Boot backend's `/api/credentials/**` endpoints with Bearer auth.

## Local dev

```bash
# install dev deps once
npm install

# run unit tests
npm test
```

The panel is served two ways:

1. **Dev (same-origin via Spring Boot):** `python build.py --copy-to-static`
   copies `dist/index.html` to `java/parallel26/src/main/resources/static/credentials/index.html`.
   Then `mvn spring-boot:run` from `java/parallel26/` and open
   `http://localhost:8080/credentials/`.

2. **Prod (external static host):** `python build.py` produces
   `dist/index.html`. Deploy that single file anywhere (S3 + CloudFront,
   Vercel, etc.) and configure the panel to call the API origin via
   `deploy-header.js` (`settings.apiBase`). The Spring side must whitelist
   the panel origin via `p26.credentials.cors.allowed-origins`.

## Build

`python build.py` concatenates `js/*.js` (in dependency order defined in
`build.py`) into a single inline IIFE inside `index.html`, prepends
`deploy-header.js`, inlines `css/styles.css`, minifies via esbuild.
`--no-minify` skips the esbuild step. `--copy-to-static` additionally
copies the result into the Spring static folder.

## Tests

Vitest + jsdom. Tests live in `tests/` and exercise pure logic
(`format.js`), the `$.ajax`-mocked API client (`api.js`), the auth flow
(`auth.js`), and the SideBySideReview component (`components.js`).
