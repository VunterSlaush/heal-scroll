const TRACKING_PARAM = /^(utm_[^=]*|fbclid|gclid|mc_cid|mc_eid|ref|ref_src)=/i;

/**
 * Normalize a URL for dedupe: https, lowercase host without `www.`,
 * no fragment, no tracking params, no trailing slash.
 * String-based on purpose — React Native's `URL` implementation is incomplete.
 */
export function canonicalUrl(raw: string): string {
  let url = raw.trim().replace(/^http:\/\//i, 'https://');

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) url = url.slice(0, hashIndex);

  const queryIndex = url.indexOf('?');
  let base = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : url.slice(queryIndex + 1);

  base = base.replace(
    /^(https:\/\/)([^/]+)/i,
    (_, scheme: string, host: string) => scheme + host.toLowerCase().replace(/^www\./, ''),
  );
  base = base.replace(/\/+$/, '');

  const keptParams = query.split('&').filter((p) => p && !TRACKING_PARAM.test(p));
  return keptParams.length > 0 ? `${base}?${keptParams.join('&')}` : base;
}
