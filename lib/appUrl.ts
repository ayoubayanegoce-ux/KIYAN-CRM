import { headers } from "next/headers";

/**
 * Resolves the app's public base URL (no trailing slash). Prefers an
 * explicit NEXT_PUBLIC_APP_URL override (useful for a custom domain);
 * otherwise derives it from the current request's Host header so share
 * links/embed codes work correctly out of the box on any deployment.
 * Must be called from a Server Component, Server Action, or Route
 * Handler (an active request context) — returns "" outside of one.
 */
export async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return "";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  } catch {
    return "";
  }
}
