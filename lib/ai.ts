import { GoogleGenAI } from "@google/genai";
import type { CrmStats } from "@/lib/analytics";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function qualifyLead(name: string, email: string, company: string, context?: string) {
  try {
    const prompt = `
أنت وكيل ذكاء اصطناعي متخصص في تقييم وفرز العملاء المحتملين لشركات B2B.
${context ? `سياق شركتنا (استخدمه لتقييم مدى ملاءمة هذا العميل لملفنا التجاري):\n${context}\n` : ""}
قم بتحليل بيانات العميل التالية:
- الاسم: ${name}
- البريد الإلكتروني: ${email}
- الشركة: ${company || "غير محدد"}

المطلوب:
1. تقييم مدى جدية وجودة العميل بنتيجة رقمية من 0 إلى 100 (ai_score).
2. تصنيف نية الشراء والاهتمام (ai_intent) كإحدى القيم الثلاث فقط: "hot" أو "warm" أو "cold".
3. سبب موجز جداً (جملة واحدة) يوضح أبرز نقطة قوة تبرر هذا التقييم (reasoning).

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"ai_score": 85, "ai_intent": "hot", "reasoning": "..."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    return {
      ai_score: typeof data.ai_score === "number" ? data.ai_score : 50,
      ai_intent: ["hot", "warm", "cold"].includes(data.ai_intent) ? data.ai_intent : "cold",
      reasoning: typeof data.reasoning === "string" ? data.reasoning : "",
    };
  } catch (error) {
    console.error("AI Qualification Error:", error);
    return { ai_score: 0, ai_intent: "cold", reasoning: "" };
  }
}

export type AITone = "professionnel" | "amical" | "direct" | "negociation";
export type AILanguage = "fr" | "en" | "ar";

export type CompanyProfile = {
  industry: string;
  companyModel: string;
  painPoints: string;
  growthOpportunities: string;
  icebreaker: string;
};

export type OutreachSettings = {
  tone?: AITone;
  language?: AILanguage;
  valueProposition?: string;
  /** سياق الشركة المقروء من CRM_CONTEXT.md، يُحقن كسياق أساسي إضافي */
  companyContext?: string;
  /** ملف إثراء شركة العميل (enrichCompanyProfile) — يُستخدم لتخصيص الرسالة إن توفّر */
  enrichedData?: CompanyProfile | null;
};

function enrichmentPromptBlock(settings?: OutreachSettings): string {
  const data = settings?.enrichedData;
  if (!data) return "";

  const { industry, companyModel, painPoints, growthOpportunities, icebreaker } = data;
  if (!industry && !companyModel && !painPoints && !growthOpportunities && !icebreaker) return "";

  return (
    `\nمعلومات إضافية عن شركة العميل (استخدمها لتخصيص الرسالة وجعلها أكثر دقة وملاءمة):\n` +
    (industry ? `- القطاع: ${industry}\n` : "") +
    (companyModel ? `- النموذج/الحجم: ${companyModel}\n` : "") +
    (painPoints ? `- أبرز التحديات المتوقعة: ${painPoints}\n` : "") +
    (growthOpportunities ? `- فرص النمو المحتملة: ${growthOpportunities}\n` : "") +
    (icebreaker ? `- خطاف محادثة مقترح (يمكنك استخدامه أو تكييفه كافتتاحية للرسالة): ${icebreaker}\n` : "")
  );
}

const TONE_DESCRIPTIONS: Record<AITone, string> = {
  professionnel: "احترافية ومهذبة (Professionnel)",
  amical: "ودية ودافئة مع الحفاظ على المصداقية (Amical)",
  direct: "مباشرة وتجارية وواضحة الهدف (Direct & Commercial)",
  negociation: "موجّهة نحو التفاوض، تبرز القيمة وتفتح الباب لنقاش الشروط (Négociation)",
};

const LANGUAGE_NAMES: Record<AILanguage, string> = {
  fr: "الفرنسية (français)",
  en: "الإنجليزية (English)",
  ar: "العربية",
};

const DEFAULT_TONE: AITone = "professionnel";
const DEFAULT_LANGUAGE: AILanguage = "fr";

export async function generateOutreachEmail(
  name: string,
  company: string | null,
  intent: string | null,
  settings?: OutreachSettings
) {
  const tone = settings?.tone ?? DEFAULT_TONE;
  const language = settings?.language ?? DEFAULT_LANGUAGE;
  const valueProposition = settings?.valueProposition?.trim();
  const companyContext = settings?.companyContext?.trim();

  try {
    const prompt = `
أنت خبير تسويق ومبيعات B2B متخصص في كتابة رسائل التواصل البارد (Cold Outreach) الاحترافية.
${companyContext ? `\nسياق عملنا (Company Context):\n${companyContext}\n` : ""}
اكتب بريداً إلكترونياً تسويقياً مخصصاً للعميل المحتمل التالي:
- الاسم: ${name}
- الشركة: ${company || "غير محدد"}
- مستوى الاهتمام المقدَّر: ${intent || "cold"}
${valueProposition ? `\nنبذة عن شركتنا (ادمج قيمتنا المقترحة بشكل طبيعي ضمن الرسالة):\n${valueProposition}\n` : ""}${enrichmentPromptBlock(settings)}
متطلبات الكتابة:
- لغة الرسالة (العنوان والمتن بالكامل): ${LANGUAGE_NAMES[language]} فقط.
- نبرة الرسالة: ${TONE_DESCRIPTIONS[tone]}.
- طول المتن: بين 100 و180 كلمة.
- يتضمن عنوان (subject) جذاب وقصير.
- خاتمة بدعوة واضحة لاتخاذ إجراء (مثل حجز مكالمة قصيرة 15 دقيقة).
- توقيع مناسب لختام رسالة تجارية بنفس لغة الرسالة.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"subject": "...", "body": "..."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    return {
      subject: typeof data.subject === "string" ? data.subject : "",
      body: typeof data.body === "string" ? data.body : "",
    };
  } catch (error) {
    console.error("AI Outreach Generation Error:", error);
    return {
      subject: "",
      body: "Une erreur est survenue lors de la génération de l'e-mail. Veuillez réessayer.",
    };
  }
}

export type SequenceStepLabel = "initial_pitch" | "value_followup" | "breakup";

export type SequenceStep = {
  step: 1 | 2 | 3;
  label: SequenceStepLabel;
  delayDays: number;
  subject: string;
  body: string;
};

export const SEQUENCE_STEP_LABELS_AR: Record<SequenceStepLabel, string> = {
  initial_pitch: "الطرح الأولي",
  value_followup: "متابعة القيمة المضافة",
  breakup: "رسالة الختام",
};

/** بادئة عنوان مهام التسلسل المُجدوَلة تلقائياً — تُستخدم لتمييزها عن مهام المتابعة اليدوية العادية. */
export const SEQUENCE_TASK_PREFIX = "📧 ";

const SEQUENCE_STEP_META: { label: SequenceStepLabel; delayDays: number; instructionsAr: string }[] = [
  {
    label: "initial_pitch",
    delayDays: 0,
    instructionsAr:
      "رسالة الطرح الأولي (Initial Pitch) — تعريف مختصر بنا وبقيمتنا المقترحة، ودعوة واضحة لمكالمة قصيرة.",
  },
  {
    label: "value_followup",
    delayDays: 3,
    instructionsAr:
      "رسالة متابعة قيمة مضافة (Value Follow-up)، تُرسَل بعد 3 أيام من عدم الرد — أضف زاوية جديدة أو معلومة/حالة دراسة سريعة (quick case study) ذات صلة، بدون تكرار الرسالة الأولى.",
  },
  {
    label: "breakup",
    delayDays: 7,
    instructionsAr:
      "رسالة ختام سريعة (Break-up / Quick Question)، تُرسَل بعد 7 أيام من عدم الرد — قصيرة جداً، سؤال مباشر واحد، تفتح الباب للرد دون ضغط.",
  },
];

/**
 * يولّد تسلسل متابعة من 3 رسائل بريد إلكتروني متتالية (طرح أولي، متابعة قيمة
 * مضافة بعد 3 أيام، ختام سريع بعد 7 أيام)، مبنية على نفس سياق الشركة/النبرة/
 * اللغة المستخدَمة في generateOutreachEmail.
 */
export async function generateSequenceSteps(
  name: string,
  company: string | null,
  intent: string | null,
  settings?: OutreachSettings
): Promise<SequenceStep[]> {
  const tone = settings?.tone ?? DEFAULT_TONE;
  const language = settings?.language ?? DEFAULT_LANGUAGE;
  const valueProposition = settings?.valueProposition?.trim();
  const companyContext = settings?.companyContext?.trim();

  const fallbackSteps = (): SequenceStep[] =>
    SEQUENCE_STEP_META.map((meta, idx) => ({
      step: (idx + 1) as 1 | 2 | 3,
      label: meta.label,
      delayDays: meta.delayDays,
      subject: "",
      body: "تعذّر توليد هذه الرسالة، حاول مرة أخرى.",
    }));

  try {
    const prompt = `
أنت خبير مبيعات B2B متخصص في بناء تسلسلات متابعة (Follow-up Sequences) فعّالة عبر البريد الإلكتروني.
${companyContext ? `\nسياق عملنا (Company Context):\n${companyContext}\n` : ""}${
      valueProposition ? `\nنبذة عن شركتنا:\n${valueProposition}\n` : ""
    }${enrichmentPromptBlock(settings)}
اكتب تسلسل متابعة من 3 رسائل بريد إلكتروني مستقلة للعميل المحتمل التالي، بالترتيب:
- الاسم: ${name}
- الشركة: ${company || "غير محدد"}
- مستوى الاهتمام المقدَّر: ${intent || "cold"}

الرسائل المطلوبة بالترتيب:
1. ${SEQUENCE_STEP_META[0].instructionsAr}
2. ${SEQUENCE_STEP_META[1].instructionsAr}
3. ${SEQUENCE_STEP_META[2].instructionsAr}

متطلبات كل رسالة:
- لغة الرسالة (العنوان والمتن): ${LANGUAGE_NAMES[language]} فقط.
- نبرة الرسالة: ${TONE_DESCRIPTIONS[tone]}.
- مختصرة (لا تتجاوز 120 كلمة)، ولا تكرر نص الرسالة السابقة.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل، بنفس الترتيب (3 عناصر بالضبط):
{"steps": [{"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}]}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    const rawSteps = Array.isArray(data.steps) ? data.steps : [];

    return SEQUENCE_STEP_META.map((meta, idx) => ({
      step: (idx + 1) as 1 | 2 | 3,
      label: meta.label,
      delayDays: meta.delayDays,
      subject: typeof rawSteps[idx]?.subject === "string" ? rawSteps[idx].subject : "",
      body: typeof rawSteps[idx]?.body === "string" ? rawSteps[idx].body : "",
    }));
  } catch (error) {
    console.error("AI Sequence Generation Error:", error);
    return fallbackSteps();
  }
}

export async function generateSalesInsight(stats: CrmStats) {
  try {
    const prompt = `
أنت محلل مبيعات B2B خبير يساعد فريق مبيعات على قراءة أداء الـ CRM الخاص بهم.
المؤشرات الحالية لخط المبيعات:
- إجمالي قيمة الصفقات النشطة (Pipeline Value، بدون الصفقات الخاسرة): ${stats.totalPipelineValue}
- عدد الصفقات الكلي: ${stats.totalDealsCount} (مربوحة: ${stats.wonDealsCount}, خاسرة: ${stats.lostDealsCount})
- متوسط قيمة الصفقة: ${stats.averageDealValue.toFixed(2)}
- توزيع الصفقات حسب المرحلة: ${JSON.stringify(stats.dealsByStage)}
- عدد العملاء المحتملين الكلي: ${stats.totalLeadsCount}, منهم بتصنيف "hot": ${stats.hotLeadsCount}
- نسبة التحويل (صفقات مربوحة / إجمالي الصفقات): ${stats.conversionRate.toFixed(1)}%

المطلوب:
1. ملخص تحليلي موجز (3-4 جمل) باللغة العربية عن الوضع الحالي لخط المبيعات، يوضح نقاط القوة والضعف الظاهرة في الأرقام.
2. اقتراح إجراء عملي واحد محدد وقابل للتنفيذ فوراً لزيادة المبيعات (nextAction)، باللغة العربية.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"summary": "...", "nextAction": "..."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    return {
      summary: typeof data.summary === "string" ? data.summary : "",
      nextAction: typeof data.nextAction === "string" ? data.nextAction : "",
    };
  } catch (error) {
    console.error("AI Sales Insight Error:", error);
    return {
      summary: "تعذر إنشاء التحليل الذكي حالياً. حاول مرة أخرى لاحقاً.",
      nextAction: "",
    };
  }
}

const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  industry: "",
  companyModel: "",
  painPoints: "",
  growthOpportunities: "",
  icebreaker: "",
};

/**
 * يحلل شركة العميل المحتمل بالاعتماد على اسمها (وملاحظات اختيارية) لتقدير
 * قطاعها، نموذج عملها/حجمها، تحدياتها وفرص نموها المتوقعة، وخطاف محادثة
 * مخصَّص لفتح الحوار. تقدير اجتهادي من Gemini وليس بيانات مؤكَّدة — لهذا نطلب
 * صراحة تجنّب اختلاق أرقام أو حقائق دقيقة غير موثوقة، ونعرضه في الواجهة
 * كـ "تقدير بالذكاء الاصطناعي".
 */
export async function enrichCompanyProfile(
  companyName: string,
  notes?: string
): Promise<CompanyProfile> {
  if (!companyName.trim()) {
    return EMPTY_COMPANY_PROFILE;
  }

  try {
    const prompt = `
أنت محلل أعمال B2B خبير في تصنيف الشركات وتحليل نشاطها التجاري وفرصها.
حلّل الشركة التالية:
- اسم الشركة: ${companyName}
${notes ? `- ملاحظات إضافية عنها: ${notes}\n` : ""}
المطلوب:
1. القطاع/المجال الأرجح لهذه الشركة (industry) — مثل SaaS أو E-commerce أو Logistics أو Retail أو تقنية مالية، إلخ.
2. النموذج/الحجم التقديري (company_model) — تصنيف موجز مثل "B2B SME" أو "Enterprise" أو "Agency" أو "Startup" أو "غير معروف" إن تعذّر التقدير.
3. أبرز التحديات المتوقعة (pain_points) — جملة أو جملتان عن أبرز نقاط الألم التي يُحتمل أن تواجهها شركة بهذا الحجم/القطاع.
4. فرص النمو المحتملة (growth_opportunities) — جملة أو جملتان عن فرص تطوّر أو توسّع محتملة قد تهمّها.
5. خطاف محادثة مخصَّص (icebreaker) — جملة افتتاحية واحدة قصيرة وطبيعية يمكن استخدامها لفتح رسالة تواصل بارد مع هذه الشركة تحديداً.

مهم: إن لم تكن الشركة معروفة لديك بثقة، اجتهد بتقدير معقول بناءً على اسمها وأي ملاحظات مرفقة فقط، ولا تختلق حقائق محددة (أرقاماً مالية، تواريخ تأسيس، أسماء أشخاص) غير موثوقة.

أرجع النتيجة بصيغة JSON نظيفة ومهيكلة فقط بهذا الشكل:
{"industry": "...", "company_model": "...", "pain_points": "...", "growth_opportunities": "...", "icebreaker": "..."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    return {
      industry: typeof data.industry === "string" ? data.industry : "",
      companyModel: typeof data.company_model === "string" ? data.company_model : "",
      painPoints: typeof data.pain_points === "string" ? data.pain_points : "",
      growthOpportunities:
        typeof data.growth_opportunities === "string" ? data.growth_opportunities : "",
      icebreaker: typeof data.icebreaker === "string" ? data.icebreaker : "",
    };
  } catch (error) {
    console.error("AI Company Enrichment Error:", error);
    return EMPTY_COMPANY_PROFILE;
  }
}