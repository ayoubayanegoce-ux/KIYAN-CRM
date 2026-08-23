import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily instantiated singleton — same lazy-null pattern used elsewhere for optional integrations.
 * Returns null (never throws) when STRIPE_SECRET_KEY isn't configured yet, so
 * callers decide how to surface that (a thrown error for user-triggered
 * actions, a silent skip for background jobs).
 */
export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  if (!client) {
    client = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
  }
  return client;
}
