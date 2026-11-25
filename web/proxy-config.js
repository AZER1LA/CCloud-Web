// Optional same-origin bridge for the CCloud API.
// After deploying worker/ccloud-api-proxy.js, paste its workers.dev URL below,
// for example: https://ccloud-api-proxy.your-account.workers.dev
(() => {
  'use strict';

  const PROXY_BASE = 'https://ccloud-api-proxy.thealirezahabibi-b14.workers.dev';
  const API_HOSTS = new Set([
    'https://server-hi-speed-iran.info',
    'https://hostinnegar.com',
    'https://windowsdiba.info'
  ]);
  if (!PROXY_BASE) {
    console.info('CCloud: API proxy is not configured; direct API requests will be used.');
    return;
  }

  const proxyBase = PROXY_BASE.replace(/\/+$/, '');
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const parsed = new URL(requestUrl, window.location.href);
    if (API_HOSTS.has(parsed.origin)) {
      const target = `${proxyBase}${parsed.pathname}${parsed.search}`;
      return nativeFetch(target, init);
    }
    return nativeFetch(input, init);
  };
})();
