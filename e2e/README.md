# End-to-end tests

Browser tests (Playwright) that drive the real web app against the real API.

```bash
# 1. Start the stack (empty database) - e.g. docker compose with DEMO_DATA=false
# 2. Run the journey
cd e2e
npm install
npx playwright install chromium
BASE_URL=http://localhost:3000 API_URL=http://localhost:8080 npm run test:journey
```

`tests/journey.spec.js` needs an **empty** database: it performs first-time
setup itself. `tests/screenshots.spec.js` captures the README screenshots from a
stack started with `DEMO_DATA=true` (`CAPTURE_SCREENSHOTS=1 npm run screenshots`).

CI runs both automatically (see `.github/workflows/ci.yml`).
