// Tells Bishulim (the recipes app that links here) that someone opened Crumb, so its admin
// page can show who reads the magazine. It is fire-and-forget: Crumb never waits on it and
// never shows a failure.
//
// Who the visitor is comes from, in order: Bishulim's own session cookie, when the browser
// sends it across sites; the token on the link from Bishulim, kept here after the first
// click; otherwise only this browser's random visitor id.

/** The Bishulim API origin. Empty turns reporting off. */
const BISHULIM_API = "";

const VISITOR_KEY = "crumb:v2:visitor";
const TOKEN_KEY = "crumb:v2:bishulim";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or storage blocked: the id lives for this page load only */
  }
}

function visitorId(): string {
  const existing = storageGet(VISITOR_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  storageSet(VISITOR_KEY, id);
  return id;
}

/** Keeps the link token and removes it from the address bar, so a copied link does not carry it. */
function takeLinkToken(): string | null {
  const url = new URL(location.href);
  const token = url.searchParams.get("k");
  if (url.searchParams.get("from") === "bishulim" || token) {
    url.searchParams.delete("k");
    url.searchParams.delete("from");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  if (token) storageSet(TOKEN_KEY, token);
  return token ?? storageGet(TOKEN_KEY);
}

export function reportVisit(api: string = BISHULIM_API) {
  const k = takeLinkToken();
  if (!api) return;
  fetch(`${api}/api/crumb/visit`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitor: visitorId(), ...(k ? { k } : {}) }),
  }).catch(() => {});
}
