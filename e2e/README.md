# Rosellea end-to-end tests

Playwright tests covering the critical paths: splash logo, bottom nav,
article publish + full render, PDF book upload/open/translate, likes &
comments persistence, search/filters, and profile content.

## Run locally

```bash
# one-time
bun run test:e2e:install

# set credentials for a real, already-registered Rosellea user
export TEST_USER_EMAIL="you@example.com"
export TEST_USER_PASSWORD="••••••••"

# run all tests (auto-starts `bun run dev` on :8080)
bun run test:e2e

# headed / interactive
bun run test:e2e:ui
```

If `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` are not set, auth-gated
specs are skipped and only the splash test runs.

## CI

`.github/workflows/e2e.yml` runs on every push/PR. Add these repo
secrets in GitHub → Settings → Secrets and variables → Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `LOVABLE_API_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

The HTML report is uploaded as the `playwright-report` artifact.

## Notes

- Realtime likes/comments are validated via single-context reload
  (action persists → state still present after `page.reload()`).
- The mobile bottom-nav spec uses Playwright's iPhone 13 device
  profile (project `mobile`, matched by filename).
- `e2e/fixtures/sample.pdf` is a tiny valid PDF used for book upload.