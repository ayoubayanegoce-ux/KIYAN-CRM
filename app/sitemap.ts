import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kiyan-crm.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: appUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
