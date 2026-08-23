import { readFile } from "fs/promises";
import path from "path";

const FALLBACK_CONTEXT =
  "أنت تساعد فريق مبيعات B2B عام. حافظ على نبرة احترافية ومحايدة، ولا تدّعِ أي معلومات محددة عن شركة أو منتج غير معروف لديك.";

let cachedContext: string | null = null;

/**
 * Reads CRM_CONTEXT.md from the project root and returns it for injection
 * as system context into Gemini prompts. Falls back to a safe, generic
 * context (never hallucinated company claims) if the file is missing or
 * fails to read — never throws. Cached per warm server instance since the
 * file only changes on redeploy.
 */
export async function getCrmContext(): Promise<string> {
  if (cachedContext !== null) return cachedContext;

  try {
    const filePath = path.join(process.cwd(), "CRM_CONTEXT.md");
    const content = (await readFile(filePath, "utf-8")).trim();
    cachedContext = content || FALLBACK_CONTEXT;
  } catch (error) {
    console.error("تعذّرت قراءة CRM_CONTEXT.md، سيُستخدم سياق افتراضي آمن:", error);
    cachedContext = FALLBACK_CONTEXT;
  }

  return cachedContext;
}
