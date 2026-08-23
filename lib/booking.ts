import { supabase } from "@/lib/supabase";

/**
 * Reads the org's booking link (Cal.com/Calendly) directly — lib-layer,
 * no Clerk auth() dependency, so it also works from unauthenticated
 * send paths (Auto-Pilot, the webhook-triggered sequence step).
 */
export async function getBookingUrl(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("org_settings")
    .select("booking_url")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching booking_url:", error);
    return null;
  }
  return data?.booking_url?.trim() || null;
}

export function bookingCtaText(bookingUrl: string | null): string {
  return bookingUrl ? `\n\n📅 احجز موعداً مباشرة: ${bookingUrl}` : "";
}

export function bookingCtaHtml(bookingUrl: string | null): string {
  if (!bookingUrl) return "";
  return `<div style="margin-top:20px"><a href="${bookingUrl}" style="background:#2563eb;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-family:sans-serif">📅 احجز موعداً مباشرة</a></div>`;
}
