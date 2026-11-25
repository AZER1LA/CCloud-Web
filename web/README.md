# CCloud Web

A responsive browser-based companion to the CCloud Android app. The original Android application remains unchanged; the web client lives at the repository root and can be deployed as a static site (including GitHub Pages).

## Run locally

Open `index.html` in a browser or serve the repository root with any static file server, for example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy with GitHub Pages

In the repository settings, open **Pages**, select the `copilot/web-version` branch and `/ (root)` as the publishing source, and save. For a permanent deployment, merge this branch into the configured Pages branch and select that branch instead.

## Features

- Responsive movie and series catalog with genre, type, and sort filters
- Catalog search, title details, and season/episode browsing
- Browser video playback for sources supported by the browser
- Favorites saved in local browser storage
- Keyboard shortcut `/` to focus search

## API and playback notes

The web client uses the same catalog API and public client key as the Android app. Browser requests only work if the API host permits cross-origin (CORS) access from the deployed site; if it does not, the catalog will show a connection error. A server-side proxy can be added if the API operator authorizes that deployment. Some stream formats or hosts may not play in every browser, and playback is limited to content you have permission to access.

Because this is a static public client, its API key is visible to anyone visiting the site. Do not treat it as a secret or add private credentials to the frontend.
