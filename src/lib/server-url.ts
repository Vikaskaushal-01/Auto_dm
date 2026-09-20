/**
 * Resolves the canonical public base URL of the deployment.
 * Supports:
 * 1. VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL (automatically injected by Vercel)
 * 2. Explicit WEBHOOK_BASE_URL (when using a custom domain or tunnel)
 * 3. Fallback to request URL origin or NEXTAUTH_URL or http://localhost:3000
 */
export function getLiveBaseUrl(requestUrl?: string): string {
  const vercelDomain =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

  if (vercelDomain) {
    return `https://${vercelDomain}`;
  }

  if (process.env.WEBHOOK_BASE_URL && !process.env.WEBHOOK_BASE_URL.includes("localhost")) {
    try {
      // Only the origin: a value like https://x.app/api/webhooks/meta must not be doubled up.
      return new URL(process.env.WEBHOOK_BASE_URL.trim().replace(/^["']|["']$/g, "")).origin;
    } catch {
      // fall through to the other sources
    }
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // ignore invalid URLs
    }
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  return process.env.WEBHOOK_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * Resolves the Meta OAuth redirect callback URI.
 * On Vercel, automatically uses the production Vercel domain.
 * On local dev, respects META_REDIRECT_URI or localhost.
 */
export function getMetaRedirectUri(requestUrl?: string): string {
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI;
  }

  const vercelDomain =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

  if (vercelDomain) {
    return `https://${vercelDomain}/api/auth/meta/callback`;
  }

  const base = getLiveBaseUrl(requestUrl);
  return `${base}/api/auth/meta/callback`;
}
