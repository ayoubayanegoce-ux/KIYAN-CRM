import { GoogleGenAI } from "@google/genai";
import type { CrmStats } from "@/lib/analytics";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function qualifyLead(name: string, email: string, company: string) {
  try {
    const prompt = `
أنت وكيل ذكاء اصطناعي متخصص في تقييم وفرز العملاء المحتملين لشركات B2B.
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

export type OutreachSettings = {
  tone?: AITone;
  language?: AILanguage;
  valueProposition?: string;
};

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

  try {
    const prompt = `
أنت خبير تسويق ومبيعات B2B متخصص في كتابة رسائل التواصل البارد (Cold Outreach) الاحترافية.

اكتب بريداً إلكترونياً تسويقياً مخصصاً للعميل المحتمل التالي:
- الاسم: ${name}
- الشركة: ${company || "غير محدد"}
- مستوى الاهتمام المقدَّر: ${intent || "cold"}
${valueProposition ? `\nنبذة عن شركتنا (ادمج قيمتنا المقترحة بشكل طبيعي ضمن الرسالة):\n${valueProposition}\n` : ""}
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