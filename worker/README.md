# CCloud API proxy for GitHub Pages

The API endpoints return JSON when opened directly, but browser JavaScript cannot read them unless the API servers send CORS permission headers. GitHub Pages is static hosting, so it cannot add those headers or proxy requests itself.

This small Cloudflare Worker is an optional bridge. It forwards only the CCloud catalog routes needed by the web UI, allows the GitHub Pages origin (plus localhost for testing), and tries the primary/helper API hosts. It does **not** proxy video files. Use it only with an API you are permitted to access.

## Deploy the Worker

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Choose **Create application → Create Worker**.
3. Give it a name such as `ccloud-api-proxy`, then choose **Deploy**.
4. Open **Edit code**, replace the starter code with the contents of `worker/ccloud-api-proxy.js`, then choose **Deploy** again.
5. Copy the Worker URL shown by Cloudflare. It looks like `https://ccloud-api-proxy.<your-account>.workers.dev`.

## Connect GitHub Pages to the Worker

1. Open `web/proxy-config.js` in the `copilot/web-version` branch.
2. Replace the empty `PROXY_BASE` value with your Worker URL, keeping the quotes and omitting a final slash. For example:
   `const PROXY_BASE = 'https://ccloud-api-proxy.your-account.workers.dev';`
3. Commit the change to the Pages publishing branch and wait for GitHub Pages to redeploy.
4. Open `https://azer1la.github.io/CCloud-Web/` and hard-refresh (`Ctrl+Shift+R`).

The `PROXY_BASE` setting is intentionally blank in the repository: a Cloudflare account is required to deploy the Worker, and its URL is unique to your account. The API key is already public in the original Android client; this Worker does not make it secret.

## If it still fails

Check the browser Network panel for a request to your `workers.dev` URL. A JSON `502` means the Worker could not get JSON from any upstream host. A `403` means the request origin was not allowed. The Worker does not make an unavailable upstream API available, and it cannot fix API errors or grant permission to access the service.
