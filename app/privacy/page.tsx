import Link from "next/link";

export const metadata = { title: "سياسة الخصوصية — KIYAN CRM" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition">
          ← العودة إلى الرئيسية
        </Link>
        <h1 className="text-2xl font-bold">سياسة الخصوصية</h1>
        <p className="text-xs text-slate-500">آخر تحديث: {new Date().getFullYear()}</p>

        <div className="space-y-5 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">1. البيانات التي نجمعها</h2>
            <p>
              بيانات حسابك (عبر Clerk)، بيانات عملائك المحتملين التي تُدخلها أو تستوردها (الاسم، البريد
              الإلكتروني، الشركة)، وبيانات الاستخدام التقنية اللازمة لتشغيل الخدمة.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">2. عزل بيانات المنظمات (Multi-Tenancy)</h2>
            <p>
              كل منظمة (Organization) لها بياناتها الخاصة معزولة تماماً عن باقي المستأجرين على مستوى قاعدة
              البيانات — بما في ذلك سياق الذكاء الاصطناعي، العملاء، الصفقات، وسجل النشاط.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">3. مشاركة البيانات مع أطراف ثالثة</h2>
            <p>
              نستخدم مزوّدين موثوقين لتشغيل الخدمة فقط: Clerk (المصادقة)، Supabase (قاعدة البيانات)، Google
              Gemini (الذكاء الاصطناعي)، Resend (البريد الإلكتروني)، Telegram (الإشعارات الفورية)، وStripe
              (الفوترة). لا
              نبيع بياناتك لأي طرف ثالث.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">4. الذكاء الاصطناعي والبيانات</h2>
            <p>
              تُرسَل بيانات العميل (الاسم، الشركة) إلى Google Gemini لغرض التقييم والإثراء وتوليد الرسائل فقط،
              ولا تُستخدَم لتدريب نماذج عامة خارج هذا الغرض.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">5. الاحتفاظ بالبيانات وحذفها</h2>
            <p>
              تُحتفَظ ببياناتك طالما حسابك نشطاً. يمكنك طلب حذف حسابك وبياناته بالكامل في أي وقت بالتواصل معنا.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">6. أمان البيانات</h2>
            <p>
              تُطبَّق سياسات عزل على مستوى الصفوف (Row Level Security) وتشفير في النقل، ولا تُخزَّن أي مفاتيح
              أو أسرار API داخل قاعدة البيانات أو الواجهة — تبقى محصورة في متغيرات البيئة الخادمية فقط.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
