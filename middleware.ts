import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // تخطي الملفات الثابتة والداخلية
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // تشغيل الوسيط دائماً لمسارات الـ API
    '/(api|trpc)(.*)',
  ],
};