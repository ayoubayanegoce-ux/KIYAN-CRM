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
export type SequenceChannel = "email" | "linkedin" | "whatsapp";

export type SequenceStep = {
  step: 1 | 2 | 3;
  label: SequenceStepLabel;
  channel: SequenceChannel;
  delayDays: number;
  subject: string;
  body: string;
};

export const SEQUENCE_STEP_LABELS_AR: Record<SequenceStepLabel, string> = {
  initial_pitch: "الطرح الأولي",
  value_followup: "متابعة القيمة المضافة",
  breakup: "رسالة الختام",
};

export const SEQUENCE_CHANNEL_LABELS_AR: Record<SequenceChannel, string> = {
  email: "بريد إلكتروني",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

/** بادئة عنوان مهام التسلسل المُجدوَلة تلقائياً — تُستخدم لتمييزها عن مهام المتابعة اليدوية العادية. */
export const SEQUENCE_TASK_PREFIX = "📧 ";

const SEQUENCE_STEP_META: {
  label: SequenceStepLabel;
  channel: SequenceChannel;
  delayDays: number;
  instructionsAr: string;
}[] = [
  {
    label: "initial_pitch",
    channel: "email",
    delayDays: 0,
    instructionsAr:
      "رسالة بريد إلكتروني للطرح الأولي (Initial Pitch) — تعريف مختصر بنا وبقيمتنا المقترحة، ودعوة واضحة لمكالمة قصيرة. subject = عنوان البريد، body = نص البريد كاملاً.",
  },
  {
    label: "value_followup",
    channel: "linkedin",
    delayDays: 3,
    instructionsAr:
      "رسالة تواصل عبر LinkedIn (مهمة تذكير للمندوب، تُرسَل بعد 3 أيام من عدم الرد على البريد) — قصيرة جداً (لا تتجاوز 300 حرف)، شخصية، تضيف زاوية أو قيمة جديدة دون تكرار البريد الأول. subject = عنوان مختصر للمهمة (مثال: 'تواصل LinkedIn')، body = نص رسالة LinkedIn المقترحة فعلياً لإرسالها.",
  },
  {
    label: "breakup",
    channel: "whatsapp",
    delayDays: 7,
    instructionsAr:
      "رسالة WhatsApp موجزة جداً (مهمة تذكير للمندوب، تُرسَل بعد 7 أيام من عدم الرد) — سؤال مباشر واحد وقصير جداً (لا تتجاوز 200 حرف)، تفتح الباب للرد دون ضغط. subject = عنوان مختصر للمهمة (مثال: 'متابعة WhatsApp')، body = نص رسالة WhatsApp المقترحة فعلياً.",
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
      channel: meta.channel,
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
      channel: meta.channel,
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

export type ObjectionHandling = {
  objection: string;
  response: string;
};

export type SalesBattlecard = {
  pitchHook: string;
  callScript: string;
  objections: ObjectionHandling[];
};

const EMPTY_BATTLECARD: SalesBattlecard = { pitchHook: "", callScript: "", objections: [] };

/**
 * يُعِدّ المندوب لمكالمة باردة: جملة افتتاحية، سيناريو اتصال كامل (~دقيقتان)،
 * ومصفوفة تعامل مع أشهر 4 اعتراضات (السعر، ضيق الوقت، منافس موجود، الميزانية)
 * بترتيب ثابت حتى تبقى الواجهة قابلة للتوقع بغض النظر عن مخرجات النموذج.
 */
export async function generateSalesBattlecard(
  name: string,
  company: string | null,
  intent: string | null,
  settings?: OutreachSettings
): Promise<SalesBattlecard> {
  const tone = settings?.tone ?? DEFAULT_TONE;
  const language = settings?.language ?? DEFAULT_LANGUAGE;
  const valueProposition = settings?.valueProposition?.trim();
  const companyContext = settings?.companyContext?.trim();

  try {
    const prompt = `
أنت مدرّب مبيعات B2B خبير يُعِدّ مندوب مبيعات لمكالمة باردة مع عميل محتمل.
${companyContext ? `\nسياق عملنا:\n${companyContext}\n` : ""}${
      valueProposition ? `\nنبذة عن شركتنا:\n${valueProposition}\n` : ""
    }${enrichmentPromptBlock(settings)}
العميل المستهدف:
- الاسم: ${name}
- الشركة: ${company || "غير محدد"}
- مستوى الاهتمام المقدَّر: ${intent || "cold"}

المطلوب:
1. جملة افتتاحية جذابة (pitch_hook) لا تتجاوز 20 كلمة، تُستخدَم في أول 10 ثوانٍ من المكالمة.
2. سيناريو اتصال كامل مدته دقيقتان تقريباً (call_script) يشمل: الافتتاحية، طرح القيمة المقترحة، سؤال تأهيلي واحد، ودعوة واضحة لحجز موعد — نص متصل جاهز للقراءة أثناء المكالمة.
3. مصفوفة تعامل مع أشهر 4 اعتراضات (objections) بالترتيب التالي بالضبط: السعر مرتفع جداً، ضيق الوقت حالياً، لدينا حل/منافس بالفعل، لا توجد ميزانية. لكل اعتراض رد مقنع وقصير (2-3 جمل) لا يبدو دفاعياً.

متطلبات اللغة والنبرة: ${LANGUAGE_NAMES[language]}، بنبرة ${TONE_DESCRIPTIONS[tone]}.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل، بـ4 عناصر بالضبط في objections بنفس الترتيب:
{"pitch_hook": "...", "call_script": "...", "objections": [{"objection": "...", "response": "..."}, {"objection": "...", "response": "..."}, {"objection": "...", "response": "..."}, {"objection": "...", "response": "..."}]}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    const rawObjections = Array.isArray(data.objections) ? data.objections : [];

    return {
      pitchHook: typeof data.pitch_hook === "string" ? data.pitch_hook : "",
      callScript: typeof data.call_script === "string" ? data.call_script : "",
      objections: rawObjections
        .slice(0, 4)
        .map((o: { objection?: unknown; response?: unknown }) => ({
          objection: typeof o?.objection === "string" ? o.objection : "",
          response: typeof o?.response === "string" ? o.response : "",
        })),
    };
  } catch (error) {
    console.error("AI Battlecard Generation Error:", error);
    return EMPTY_BATTLECARD;
  }
}

export type ProposalItem = {
  description: string;
  amount: number;
};

export type ProposalContent = {
  items: ProposalItem[];
  terms: string;
  validityDays: number;
};

const EMPTY_PROPOSAL: ProposalContent = { items: [], terms: "", validityDays: 15 };

/** يقترح بنود عرض سعر تجاري تُجمِّع تقريباً قيمة الصفقة المستهدَفة، بناءً على سياق الشركة وقطاع العميل. */
export async function generateProposalItems(
  dealTitle: string,
  dealValue: number,
  companyContext?: string,
  enrichedData?: CompanyProfile | null
): Promise<ProposalContent> {
  try {
    const prompt = `
أنت خبير تسعير B2B تُعِدّ عرض سعر تجاري (Devis) احترافي.
${companyContext ? `\nسياق عملنا:\n${companyContext}\n` : ""}
الصفقة:
- العنوان: ${dealTitle}
- القيمة الإجمالية المستهدفة: ${dealValue}
${enrichedData?.industry ? `- قطاع العميل: ${enrichedData.industry}\n` : ""}${
      enrichedData?.companyModel ? `- حجم/نموذج العميل: ${enrichedData.companyModel}\n` : ""
    }
المطلوب:
1. بنود خدمة مقترحة (items) تُجمِّع في مجموعها القيمة الإجمالية أعلاه تقريباً — 3 إلى 5 بنود واقعية ومنطقية لهذا النوع من الصفقات.
2. شروط تجارية موجزة (terms) — مدة الصلاحية، طريقة الدفع المقترحة، وملاحظة قانونية بسيطة.
3. عدد أيام صلاحية العرض (validity_days) — رقم منطقي بين 7 و30.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"items": [{"description": "...", "amount": 1000}], "terms": "...", "validity_days": 15}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    const rawItems = Array.isArray(data.items) ? data.items : [];

    return {
      items: rawItems
        .slice(0, 6)
        .map((i: { description?: unknown; amount?: unknown }) => ({
          description: typeof i?.description === "string" ? i.description : "",
          amount: typeof i?.amount === "number" ? i.amount : 0,
        }))
        .filter((i: ProposalItem) => i.description),
      terms: typeof data.terms === "string" ? data.terms : "",
      validityDays: typeof data.validity_days === "number" ? data.validity_days : 15,
    };
  } catch (error) {
    console.error("AI Proposal Generation Error:", error);
    return EMPTY_PROPOSAL;
  }
}

export type SuggestedReplyType = "confirm_meeting" | "clarify_pricing" | "negotiate";

export type SuggestedReply = {
  type: SuggestedReplyType;
  subject: string;
  body: string;
};

export const SUGGESTED_REPLY_LABELS_AR: Record<SuggestedReplyType, string> = {
  confirm_meeting: "تأكيد موعد",
  clarify_pricing: "توضيح الأسعار",
  negotiate: "رد تفاوضي",
};

const SUGGESTED_REPLY_TYPES: SuggestedReplyType[] = ["confirm_meeting", "clarify_pricing", "negotiate"];

/** يحلّل رداً وارداً فعلياً من عميل ويقترح 3 مسودات رد بزوايا مختلفة، قابلة للتعديل قبل الإرسال. */
export async function generateSuggestedReplies(
  inboundMessage: string,
  leadName: string,
  settings?: OutreachSettings & { bookingUrl?: string | null }
): Promise<SuggestedReply[]> {
  const tone = settings?.tone ?? DEFAULT_TONE;
  const language = settings?.language ?? DEFAULT_LANGUAGE;
  const companyContext = settings?.companyContext?.trim();
  const valueProposition = settings?.valueProposition?.trim();
  const bookingUrl = settings?.bookingUrl?.trim();

  const fallback = (): SuggestedReply[] =>
    SUGGESTED_REPLY_TYPES.map((type) => ({ type, subject: "", body: "تعذّر توليد الرد، حاول مرة أخرى." }));

  try {
    const prompt = `
أنت مندوب مبيعات B2B محترف يرد على استفسار وارد من عميل محتمل.
${companyContext ? `\nسياق عملنا:\n${companyContext}\n` : ""}${
      valueProposition ? `\nنبذة عن شركتنا:\n${valueProposition}\n` : ""
    }
رسالة العميل الواردة (من ${leadName}):
"""
${inboundMessage.slice(0, 2000)}
"""

المطلوب: 3 مسودات رد مستقلة بالترتيب التالي بالضبط:
1. رد لتأكيد موعد ودعوة صريحة لحجزه${bookingUrl ? ` عبر هذا الرابط: ${bookingUrl}` : ""}.
2. رد يوضّح الأسعار أو نموذج التسعير بشكل عام دون أرقام مختلقة (اطلب توضيح الاحتياج إن لزم لتحديد السعر بدقة).
3. رد تفاوضي مخصص يعالج فحوى الرسالة الواردة مباشرة بناءً على ما ورد فيها فعلياً.

متطلبات كل رد: لغة الرد بالكامل ${LANGUAGE_NAMES[language]}، نبرة ${TONE_DESCRIPTIONS[tone]}، عنوان (subject) قصير مناسب للرد على البريد، ومتن (body) بين 40 و100 كلمة.

أرجع النتيجة بصيغة JSON فقط بهذا الشكل، بنفس الترتيب (3 عناصر بالضبط):
{"replies": [{"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}]}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    const rawReplies = Array.isArray(data.replies) ? data.replies : [];

    return SUGGESTED_REPLY_TYPES.map((type, idx) => ({
      type,
      subject: typeof rawReplies[idx]?.subject === "string" ? rawReplies[idx].subject : "",
      body: typeof rawReplies[idx]?.body === "string" ? rawReplies[idx].body : "",
    }));
  } catch (error) {
    console.error("AI Suggested Replies Error:", error);
    return fallback();
  }
}

export type ProspectCandidate = {
  companyName: string;
  estimatedEmail: string;
  location: string;
  suggestedTitle: string;
  suggestedContactName: string;
  notes: string;
};

/**
 * يُولِّد شركات مستهدَفة توضيحية (محاكاة) بناءً على قطاع ومنطقة — وليس بحثاً
 * حقيقياً في بيانات فعلية (لا تكامل مع أي مصدر بيانات شركات خارجي في هذا
 * المشروع). كل الحقول تقديرية ويجب التحقق منها يدوياً قبل أي تواصل فعلي —
 * هذا التحذير يظهر أيضاً في الواجهة، وليس فقط هنا.
 */
export async function findProspectCandidates(industry: string, location: string): Promise<ProspectCandidate[]> {
  try {
    const prompt = `
أنت مساعد بحث عن عملاء B2B محتملين. المستخدم يبحث عن شركات في القطاع/النشاط التالي: "${industry}"، في المنطقة/المدينة: "${location}".

هذه بيانات توضيحية (Simulation) وليست بحثاً حقيقياً في مصدر بيانات فعلي — لا تدّعِ معرفة شركات حقيقية بأسماء وعناوين بريد مؤكدة. أنشئ 6 أمثلة واقعية ومعقولة لأنواع شركات قد توجد فعلاً في هذا القطاع والمنطقة (أسماء تقديرية واقعية الشكل)، مع بريد إلكتروني تقديري بصيغة معقولة (لا تستخدم أسماء نطاقات لشركات حقيقية معروفة).

لكل شركة تقديرية أرجع:
- company_name: اسم شركة تقديري واقعي الشكل
- estimated_email: بريد تقديري بصيغة contact@domaine.com معقولة
- location: المدينة/الدولة
- suggested_title: المنصب الأنسب للتواصل معه في هذا النوع من الشركات (مثال: Directeur Commercial)
- suggested_contact_name: اسم شخص تقديري واقعي لهذا المنصب
- notes: جملة واحدة عن سبب كون هذا النوع من الشركات عميلاً محتملاً جيداً

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"candidates": [{"company_name": "...", "estimated_email": "...", "location": "...", "suggested_title": "...", "suggested_contact_name": "...", "notes": "..."}]}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    const rawCandidates = Array.isArray(data.candidates) ? data.candidates : [];

    return rawCandidates.slice(0, 8).map(
      (c: {
        company_name?: unknown;
        estimated_email?: unknown;
        location?: unknown;
        suggested_title?: unknown;
        suggested_contact_name?: unknown;
        notes?: unknown;
      }) => ({
        companyName: typeof c?.company_name === "string" ? c.company_name : "",
        estimatedEmail: typeof c?.estimated_email === "string" ? c.estimated_email : "",
        location: typeof c?.location === "string" ? c.location : location,
        suggestedTitle: typeof c?.suggested_title === "string" ? c.suggested_title : "",
        suggestedContactName: typeof c?.suggested_contact_name === "string" ? c.suggested_contact_name : "",
        notes: typeof c?.notes === "string" ? c.notes : "",
      })
    ).filter((c: ProspectCandidate) => c.companyName);
  } catch (error) {
    console.error("AI Prospect Finder Error:", error);
    return [];
  }
}