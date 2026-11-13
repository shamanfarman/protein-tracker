# Daily Protein Tracker: offline installable app

This is the original tracker, converted into a Progressive Web App (PWA). Your existing food entries, favourites, calorie/protein totals, exercise check-ins and gym bro reactions remain.

## Publish for free with GitHub Pages

1. Sign in to https://github.com/new and create a new **public** repository named `protein-tracker` (choose no README or template).
2. Open the repository, choose **Add file → Upload files**, and upload **the contents of this ZIP** (not the ZIP itself). Keep `index.html`, `app.js`, `styles.css`, `manifest.webmanifest` and `service-worker.js` at the root, and the four image files inside an `icons` folder.
3. Commit the files to the `main` branch.
4. Open the repository **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, `main`, `/(root)`, then **Save**.
5. Once Pages has deployed, your tracker address will usually be:
   `https://shamanfarman.github.io/protein-tracker/`
   (using your connected GitHub account, `shamanfarman`; the address becomes active only after Pages has deployed).
6. Open that URL in **Chrome on Android**, load the page once while online, then use **Chrome menu (⋮) → Install app** or **Add to Home screen**. Some browsers may offer an in-page Install app button.
7. Launch from the new icon and test in aeroplane mode. Food and exercise entries save automatically on each tap and survive closing the app.

Note: GitHub Pages requires a publicly accessible repository on a GitHub Free account. The source code is public, **but your entries are NOT published** and are not written to the repository.

## Moving history from an earlier HTML version

- If you used `daily_protein_tracker_with_saving.html`, open it **in the same browser/viewer where the entries were made**. Use **Backup JSON** (or **Save updated HTML**). Then in the new PWA select **Restore / import history** and pick that file. Prior saved-HTML files with an embedded backup also work.
- If you only have the old plain `daily_protein_tracker_gym_bro.html`, its browser storage cannot automatically travel to the new HTTPS website. Open the updated saving version in the same browser/storage context and export its data. A viewer that never retained entries cannot recover lost data.
- The import merges dates, replacing the same dates in the PWA; other dates are retained. It also imports the custom food order and exercise check-ins.

## Data and privacy

- All tracking data is saved in your device/browser's `localStorage`; the PWA uses a service worker only to cache the **app files** offline.
- Opening the app on another browser, phone, or laptop does **not** synchronise data. Use the JSON backup/restore controls to transfer it.
- Clearing browser/site data, resetting the browser, deleting an installed app, or some storage-cleanup operations can remove locally saved entries. Download JSON backups periodically and store them safely elsewhere.
- The **Protect local storage** button requests persistent browser storage where supported; this is not a substitute for backup.
- The committed `index.html` contains an **empty** backup (`"items": {}`). Never upload a saved HTML file containing your personal history in place of `index.html`.
- A normal `file://` preview will not install or offer offline caching. The PWA must be opened from HTTPS or `localhost`.

## Updating the website

Edit or replace `index.html`, `app.js`, `styles.css`, icons as needed. If changing the app shell, increment `CACHE_NAME` in `service-worker.js` (e.g. `daily-protein-tracker-shell-v2`) to refresh cached files when users next go online. Stored data survives ordinary code updates as long as the URL origin and storage keys remain the same.

## Files

- `index.html` - original tracker markup plus app/backup controls
- `styles.css` - original styling and responsive enhancements
- `app.js` - food/exercise tracking and local backup/restore
- `manifest.webmanifest` - install configuration
- `service-worker.js` - offline app shell caching
- `icons/` - Android and Apple home screen icons (including maskable icon)
