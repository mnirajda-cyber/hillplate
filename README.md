# Hillplate

University of Arkansas campus meal and macro tracker. Independent of ChatGPT.

## Free hosting

Cloudflare Workers serves the website and API; D1 stores private accounts, sessions, diaries and goals. GitHub Actions checks official campus menus daily after 6 AM America/Chicago, preloads available upcoming days and publishes only public menu data to GitHub Pages. Cloudflare checks that feed hourly. Saved verified foods stay usable when the official source is unavailable. Menu dates are never substituted and unknown nutrition is never invented.

This source is prepared but has not yet been published. Free service quotas apply. Scheduled GitHub jobs can be delayed, and GitHub can disable schedules in inactive public repositories. Source blocking or human-verification challenges require review; the updater never bypasses them.

## Deploy

1. Run `npm ci`, `npm run build`, `npm test`.
2. Authorize official Wrangler and create a D1 database: `npx wrangler d1 create hillplate --config wrangler.free.jsonc`.
3. Put the returned database ID in wrangler.free.jsonc. Set APP_ORIGIN to the exact assigned HTTPS origin and MENU_FEED_URL to your GitHub Pages menus.json address.
4. Apply cloud/schema.sql to the remote D1 database. Run `node cloud/seed.mjs`, then apply .runtime/public-menu-seed.sql to import public campus foods only.
5. Set a random private OWNER_SETUP_KEY of at least 32 characters with Wrangler secret storage. Never commit this value. Deploy using `npm run deploy`.
6. Enable GitHub Pages with GitHub Actions as the source. Run the campus menu workflow and verify its result. A blocked source must remain reported honestly.
7. Verify the published health endpoint, headers, authentication, account isolation and diary persistence. Create the first owner account yourself using the private setup key. Download a backup from the local app, then import it into your online account. Free-plan imports currently allow up to 500 entries per file.

Private databases, backups, credentials and local tool state are excluded from source. Local account passwords and diaries are not uploaded automatically. Passwords use salted scrypt; sessions use hashed random tokens and Secure HttpOnly cookies; mutations require same-origin requests. The new cloud backend has dedicated regression tests; existing local security tests do not by themselves certify a cloud deployment. Keep the free plan selected and do not enable paid add-ons.
