const RAW_BASE = import.meta.env.BASE_URL || '/';
const NORMALIZED_BASE = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;

/**
 * Resolves a public asset path (e.g. `/sequences/1/ezgif-frame-001.jpg` or `/images/...`)
 * against Vite's configured `BASE_URL` so both root local dev (`/`) and GitHub Pages
 * subpath hosting (`/inventive-sports/`) work without broken URLs.
 */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }
  if (NORMALIZED_BASE !== '/' && path.startsWith(NORMALIZED_BASE)) {
    return path;
  }
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${NORMALIZED_BASE}${clean}`;
}

/**
 * Strips the configured Vite base path prefix from `window.location.pathname`
 * so client-side routes always resolve to `/`, `/about`, `/sports/cricket`, etc.
 */
export function stripBasePath(pathname: string): string {
  const baseNoSlash =
    NORMALIZED_BASE === '/' ? '' : NORMALIZED_BASE.slice(0, -1);
  if (baseNoSlash && pathname.startsWith(baseNoSlash)) {
    const rest = pathname.slice(baseNoSlash.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname || '/';
}

/**
 * Prepends the configured Vite base path prefix when updating browser history.
 */
export function withBasePath(route: string): string {
  if (!route) return NORMALIZED_BASE;
  const baseNoSlash =
    NORMALIZED_BASE === '/' ? '' : NORMALIZED_BASE.slice(0, -1);
  if (!baseNoSlash) return route;
  if (route.startsWith(baseNoSlash)) return route;
  const clean = route.startsWith('/') ? route : `/${route}`;
  return `${baseNoSlash}${clean}`;
}
