# Piyare Mobile Telecom — production setup

## Important
This package preserves the existing v5.1/v5.2 architecture: static multipage frontend, Cloudflare Worker proxy, Google Apps Script, Google Sheets and Google Drive.

## 1. Create the Google Sheet
Create one empty Google Sheet and copy its spreadsheet ID.

## 2. Create two Google Drive folders
- `PMT-Media` — public-view only for website images.
- `PMT-Backups` — PRIVATE. Never enable public link sharing.

Copy both folder IDs.

## 3. Apps Script
The backend is a multi-file Apps Script project. Do **not** deploy only `backend/Code.gs`.

Add the existing backend files to the same Apps Script project, in this order:
1. `backend/Code.gs`
2. `backend/Code_v52_patch.gs`
3. `backend/Code_v52_routes.gs`
4. `backend/ZZ_HardDelete.gs`
5. `backend/ZZ_ProductFix.gs`

`ZZ_ProductFix.gs` is the final product-system override. It keeps the existing authentication, Sheets/Drive storage and API architecture while fixing the product schema, five-image limit, image settings, variants, public product contract, structured errors and permanent product deletion.

Run this function once from Apps Script:

`setupPMT("SPREADSHEET_ID","MEDIA_FOLDER_ID","BACKUP_FOLDER_ID","owner","YOUR_STRONG_PASSWORD","Owner")`

Use a strong unique password of at least 10 characters. Do not put it into the website.

The function creates the required sheets automatically. Existing product rows and Drive files are preserved.

## 4. Deploy API
Deploy → New deployment → Web app.
- Execute as: Me
- Access: Anyone

Copy the `/exec` URL. The Cloudflare Worker already proxies the browser-facing `/api` route to this server-side URL.

## 5. Website API URL
The public website uses `/api`; do not hard-code the Apps Script URL into frontend files.

## 6. Static hosting
The repository uses the existing Cloudflare Worker configuration. `wrangler.jsonc` serves `./public` as the asset directory and `worker.js` handles `/api` and `/img`.

Current repository canonical/live URL recorded by the existing product pages:
`https://piyare-mobile-telecom.sadab-notes-backup.workers.dev`

Do not change the domain, route structure or deployment configuration unless a production bug requires it.

## 7. Security checklist before launch
- Keep the backup folder private.
- Keep spreadsheet sharing restricted to the owner/staff who need it.
- Do not publish the Apps Script source.
- Do not put Drive IDs, Sheet IDs, passwords or WhatsApp API keys in frontend JS.
- Use HTTPS hosting.
- Change the owner password after initial setup.
- Create staff accounts from Control Room instead of sharing the owner password.
- Test login, logout, session expiry, upload, backup and restore before accepting real orders.

## WhatsApp automation
The control room records notification events. Actual automated WhatsApp messages require a WhatsApp Business API/provider account. Store credentials only in Apps Script Properties and call the provider from Apps Script. Never put provider tokens in HTML/JS.

## 8. Automatic backups and low-stock alerts
After `setupPMT(...)`, run `installProductionTriggers()` once in Apps Script. This creates:
- daily private Drive backup
- low-stock check every 6 hours

Optional owner email alerts use Script Property `PMT_ALERT_EMAIL`.

Optional WhatsApp automation uses `PMT_WA_WEBHOOK_URL` as a server-side webhook. The provider/API credentials must stay server-side.
