# Charliejobs setup (about 15 minutes)

You'll end up with: a Google Sheet called **Charliejobs** (all the data), a small Apps Script that guards it with PINs, and a web app on the iPad's home screen.

## 1. The Google Sheet and script
1. In Google Sheets, create a new blank sheet and name it **Charliejobs**.
2. **Extensions → Apps Script**. Delete everything in the editor and paste in the contents of `Code.gs`.
3. **Project Settings (gear icon)** → set the time zone to **Australia/Melbourne** (this decides when "today" rolls over for daily limits).
4. In `setup()` near the top, replace both `CHANGE_ME` values with PINs of 6–12 digits (one for Charlie, a different one for you). Pick the function `setup` in the toolbar and press **Run**. Approve the permissions (it only asks for access to this one sheet).
5. Change both PINs back to `CHANGE_ME` and save, so no PIN is left in the code. Only salted hashes are kept, in Script Properties.
6. Check the sheet: it now has **Jobs**, **Log** and **Settings** tabs, with a few starter jobs.

## 2. Publish the backend
1. **Deploy → New deployment → Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. (The PIN is what protects it. Anonymous access is needed so the iPad doesn't need a Google login.)
3. Copy the **Web app URL** (ends in `/exec`).

Whenever you edit `Code.gs` later: **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The URL stays the same.

## 3. Host the app
1. Open `index.html` in a text editor and replace `PASTE_YOUR_WEB_APP_URL_HERE` with the URL from step 2.
2. Upload the files (`index.html`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png`) to any HTTPS static host. Easiest: drag the folder onto **app.netlify.com/drop**. Cloudflare Pages and GitHub Pages also work. You don't need to upload `Code.gs` or `appsscript.json`.

## 4. On the iPad
1. Open the hosted address in **Safari**.
2. **Share → Add to Home Screen**.
3. Open it from the home screen and enter Charlie's PIN once. The iPad remembers it.

## Using it
- Charlie taps a job → confirms → confetti, and the iPhone fills up.
- **Parents** button (top right) + your PIN: add/edit/hide jobs, set how many times a day a job counts, void a mistaken entry, and change the goal or name.
- The Sheet is the source of truth. You can read it, chart it or edit it directly.

## Security notes
- Job amounts are read from the sheet by the server, so the app can't be tricked into paying more.
- Each job has a per-day limit and a double-tap guard, enforced server-side.
- 5 wrong PINs locks the backend for 10 minutes (this applies to everyone, so keep the PIN to yourselves).
- Don't share the Google Sheet with Charlie's Google account. Anyone with edit access to the sheet can change the data directly.
- Anyone who knows the app address can open the page, but without a PIN they see nothing.
