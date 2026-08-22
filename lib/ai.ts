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

أرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{"ai_score": 85, "ai_intent": "hot"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    };
  } catch (error) {
    console.error("AI Qualification Error:", error);
    return { ai_score: 0, ai_intent: "cold" };
  }
}

export async function generateOutreachEmail(
  name: string,
  company: string | null,
  intent: string | null
) {
  try {
    const prompt = `
Tu es un expert en prospection commerciale B2B (Sales Development Representative).
Rédige un e-mail de prospection (cold outreach) professionnel et personnalisé en FRANÇAIS pour le prospect suivant :
- Nom: ${name}
- Entreprise: ${company || "non spécifiée"}
- Niveau d'intérêt estimé: ${intent || "cold"}

Exigences :
- Langue: français professionnel uniquement.
- Ton: courtois, direct, sans exagération marketing.
- Longueur: entre 100 et 180 mots pour le corps du message.
- Doit inclure un objet (subject) accrocheur et court.
- Se termine par un appel à l'action clair (ex: proposer un court appel de 15 minutes).
- Signature: "L'équipe commerciale".

Retourne uniquement un JSON de cette forme :
{"subject": "...", "body": "..."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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