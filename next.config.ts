import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // يضمن تضمين CRM_CONTEXT.md فعلياً داخل حزمة دوال Vercel الخادمة عند النشر
  // (بدونه، Vercel قد لا يتتبّع اعتماديةً على ملف جذري غير مستورَد مباشرة بالكود).
  outputFileTracingIncludes: {
    "/*": ["./CRM_CONTEXT.md"],
  },
};

export default nextConfig;
