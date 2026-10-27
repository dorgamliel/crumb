// Tells Bishulim (the recipes app that links here) that someone opened Crumb, so its admin
// page can show who reads the magazine. It is fire-and-forget: Crumb never waits on it and
// never shows a failure.
//
// Who the visitor is comes from, in order: Bishulim's own session cookie, when the browser
// sends it across sites; the token on the link from Bishulim, kept here after the first
// click; otherwise only this browser's random visitor id.
//
// Crumb has no configuration of its own: the link from Bishulim also carries Bishulim's
// address ("api"), kept like the token. Until a browser has followed that link once,
// nothing is reported from it.

const VISITOR_KEY = "crumb:v2:visitor";
const TOKEN_KEY = "crumb:v2:bishulim";
const API_KEY = "crumb:v2:bishulim-api";

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

/** Only an https origin (or a local one, for development) is accepted as the report address. */
function apiOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return u.protocol === "https:" || (local && u.protocol === "http:") ? u.origin : null;
  } catch {
    return null;
  }
}

/** Keeps the link's token and address and removes them from the address bar, so a copied link does not carry them. */
function takeLinkParams(): { k: string | null; api: string | null } {
  const url = new URL(location.href);
  const token = url.searchParams.get("k");
  const api = apiOrigin(url.searchParams.get("api"));
  if (url.searchParams.get("from") === "bishulim" || token || url.searchParams.has("api")) {
    for (const p of ["from", "k", "api"]) url.searchParams.delete(p);
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  if (token) storageSet(TOKEN_KEY, token);
  if (api) storageSet(API_KEY, api);
  return { k: token ?? storageGet(TOKEN_KEY), api: api ?? apiOrigin(storageGet(API_KEY)) };
}

export function reportVisit() {
  const { k, api } = takeLinkParams();
  if (!api) return;
  fetch(`${api}/api/crumb/visit`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitor: visitorId(), ...(k ? { k } : {}) }),
  }).catch(() => {});
}
