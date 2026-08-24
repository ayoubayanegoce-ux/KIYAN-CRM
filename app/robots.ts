import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kiyan-crm.vercel.app";

/** فقط صفحة الهبوط العامة قابلة للأرشفة — كل شيء آخر إما محمي بجلسة Clerk أو رابط خاص يُشارَك يدوياً (عروض الأسعار، الدفع، النماذج). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/api/", "/billing", "/pay/", "/proposals/", "/forms/", "/reports/", "/leads/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
