# ARL CMS (local staging)

This directory contains the local source, API/worker, and release pipeline for the
ARL developer pack. The public website is built from an approved release, while
editing happens in `local/ARL_Content.json` during local development.

Run `pnpm run cms:dev` after `pnpm run build`. Open `http://localhost:8787`.
The local-only identities are `editor`, `publisher`, `admin`, and `inquiries`.
Use `X-ARL-User` in API requests or the local CMS panel. These identities are
disabled when `ARL_MODE=production`.

The local CMS has an inquiry inbox. Select `Xử lý liên hệ` to view, filter,
assign, change status, and add internal notes; `Admin` can also delete a test
inquiry. `Editor` and `Publisher` cannot read the private inbox. The contact
form first stores each accepted submission in `cms-data/arl.sqlite`, then the
local sync worker mirrors it to `cms-data/ARL_Inquiries.local.json` and its
activity history to `cms-data/ARL_Inquiry_Activities.local.json`. These files
contain personal information: keep them private and use test data only.

The server stores SQLite and immutable releases in `cms-data/`, which is ignored
by Git. Never expose this folder from a static web server. Production requires a
Google service account, Google OAuth client ID, publisher allowlist and HTTPS;
see `DEPLOYMENT.md`.

For the separate Zally My Drive image test, use `start-drive-staging.ps1` only
after adding its printed redirect URI to the **new** Drive OAuth client. It uses
the copied Content Sheet, refuses an occupied port, and does not restart another
CMS instance. Google Drive authorization and a real upload still require a
manual end-to-end test before production.

For the deployment checklist and pending ARL confirmations, read
[`DEPLOYMENT.md`](DEPLOYMENT.md). Test coverage and open production UAT items are
tracked in [`UAT.md`](UAT.md). The Google Sheets menu source is
`google-sheets-menu.gs`; it opens the authenticated CMS rather than placing
service credentials in Apps Script.
