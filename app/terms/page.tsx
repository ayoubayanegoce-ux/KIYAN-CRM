import Link from "next/link";

export const metadata = { title: "الشروط والأحكام — KIYAN CRM" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition">
          ← العودة إلى الرئيسية
        </Link>
        <h1 className="text-2xl font-bold">الشروط والأحكام</h1>
        <p className="text-xs text-slate-500">آخر تحديث: {new Date().getFullYear()}</p>

        <div className="space-y-5 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">1. قبول الشروط</h2>
            <p>
              باستخدامك لمنصة KIYAN CRM (&quot;الخدمة&quot;)، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم
              توافق عليها، يُرجى عدم استخدام الخدمة.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">2. وصف الخدمة</h2>
            <p>
              KIYAN CRM منصة إدارة علاقات عملاء (CRM) مدعومة بالذكاء الاصطناعي، تتيح تأهيل العملاء المحتملين،
              إثراء بيانات الشركات، وأتمتة التواصل التسويقي عبر البريد الإلكتروني وواتساب.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">3. الاشتراكات والفوترة</h2>
            <p>
              تُقدَّم بعض الميزات ضمن خطط اشتراك مدفوعة تُفوتَر شهرياً عبر Stripe. يمكن إلغاء الاشتراك في أي وقت
              من بوابة إدارة الفواتير؛ لا تُرَد المبالغ عن الفترة الجارية عند الإلغاء ما لم يُذكَر خلاف ذلك.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">4. مسؤولية المستخدم</h2>
            <p>
              أنت مسؤول عن دقة البيانات التي تُدخلها إلى المنصة، وعن التزامك بقوانين حماية البيانات والتسويق
              المعمول بها في نطاق عملك (مثل GDPR ولوائح مكافحة البريد المزعج) عند استخدام أدوات التواصل التلقائي.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">5. حدود المسؤولية</h2>
            <p>
              مخرجات الذكاء الاصطناعي (التقييمات، الإثراء، الرسائل المُولَّدة) هي تقديرات اجتهادية ولا تُشكّل
              نصيحة تجارية أو قانونية مؤكَّدة. تُقدَّم الخدمة &quot;كما هي&quot; دون أي ضمانات صريحة أو ضمنية.
            </p>
          </section>
          <section>
            <h2 className="text-slate-200 font-semibold mb-1.5">6. التعديلات</h2>
            <p>قد تُحدَّث هذه الشروط من وقت لآخر. استمرارك في استخدام الخدمة بعد أي تعديل يُعدّ موافقة عليه.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
