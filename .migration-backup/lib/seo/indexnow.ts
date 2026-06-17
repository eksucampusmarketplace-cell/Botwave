/**
 * IndexNow protocol helpers.
 *
 * IndexNow is a free, no-login protocol that lets a site notify Bing,
 * Yandex, Seznam, Naver, and the entire Bing-umbrella (Yahoo,
 * DuckDuckGo, Ecosia, Swisscows, AOL — they all ride Bing's index) the
 * moment a URL is added or updated. One HTTP POST per URL, no account
 * required.
 *
 * Spec: https://www.indexnow.org/documentation
 *
 * How it works:
 *   1. Generate a stable random key (the constant below).
 *   2. Host that key at /<KEY>.txt on our domain so IndexNow can verify
 *      we own the site (file: public/<INDEXNOW_KEY>.txt).
 *   3. POST { host, key, keyLocation, urlList } to api.indexnow.org.
 *
 * NOTE: the key MUST stay stable — changing it invalidates verification
 * and IndexNow will refuse our pings until the new key.txt is crawled.
 */

/** Stable IndexNow key. Hex, 32 chars, no special characters. */
export const INDEXNOW_KEY = 'b7e9c1a2f4d8e0b1a3c5d7e9f1b3a5c7';

export const INDEXNOW_KEY_LOCATION = `https://www.botwave.online/${INDEXNOW_KEY}.txt`;

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

const HOST = 'www.botwave.online';

export interface IndexNowResult {
  ok: boolean;
  status: number;
  submittedCount: number;
  error?: string;
}

/**
 * Submit a batch of URLs (up to 10,000) to IndexNow.
 *
 * Returns the upstream HTTP status code. 200 / 202 mean accepted.
 * 400 = bad request format, 403 = key/keyLocation mismatch,
 * 422 = invalid URL list, 429 = rate-limited.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return { ok: false, status: 0, submittedCount: 0, error: 'no urls' };
  }
  if (urls.length > 10000) {
    return { ok: false, status: 0, submittedCount: 0, error: 'max 10,000 urls per batch' };
  }
  const invalid = urls.find(u => !u.startsWith(`https://${HOST}/`));
  if (invalid) {
    return {
      ok: false,
      status: 0,
      submittedCount: 0,
      error: `all URLs must start with https://${HOST}/ — got ${invalid}`,
    };
  }

  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    return {
      ok: res.status === 200 || res.status === 202,
      status: res.status,
      submittedCount: urls.length,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      submittedCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Convenience: submit a single URL.
 */
export async function submitOneToIndexNow(url: string): Promise<IndexNowResult> {
  return submitToIndexNow([url]);
}
