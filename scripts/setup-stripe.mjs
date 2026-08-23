// سكربت إعداد مؤقت (يُشغَّل مرة واحدة يدوياً، وليس جزءاً من تدفق التطبيق):
// ينشئ منتجات/أسعار الاشتراك الثلاثة ونقطة استقبال الويب هوك في Stripe،
// ثم يكتب معرّفات الأسعار وسر الويب هوك مباشرة في .env.local. لا يحتوي
// على أي مفتاح مُضمَّن في الكود — يقرأ STRIPE_SECRET_KEY من .env.local
// نفسه. يمكن حذف هذا الملف بأمان بعد التشغيل الأول.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
  return lines;
}

const envLines = loadEnvLocal();

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("❌ STRIPE_SECRET_KEY غير موجود في .env.local");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });

const PLANS = [
  { key: "STARTER", name: "Starter Plan", amount: 4900 },
  { key: "PRO", name: "Pro Plan", amount: 14900 },
  { key: "ENTERPRISE", name: "Enterprise Plan", amount: 29900 },
];

const WEBHOOK_URL = "https://kiyan-crm.vercel.app/api/webhooks/stripe";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

async function findExistingProductByName(name) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  return products.data.find((p) => p.name === name) ?? null;
}

async function ensurePlan(plan) {
  let product = await findExistingProductByName(plan.name);
  if (!product) {
    product = await stripe.products.create({ name: plan.name });
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = existingPrices.data.find(
    (p) => p.unit_amount === plan.amount && p.currency === "usd" && p.recurring?.interval === "month"
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "usd",
      recurring: { interval: "month" },
    });
    await stripe.products.update(product.id, { default_price: price.id });
  }

  return { product, price };
}

async function ensureWebhook() {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((e) => e.url === WEBHOOK_URL);
  if (match) {
    console.warn(
      `⚠️ نقطة استقبال ويب هوك موجودة مسبقاً لهذا الرابط (${match.id}). Stripe لا يُعيد عرض الـ secret بعد إنشائه — إن لم يكن STRIPE_WEBHOOK_SECRET محفوظاً بالفعل من عملية إنشاء سابقة، احذف نقطة الاستقبال هذه من لوحة Stripe وأعد تشغيل السكربت لتوليد secret جديد.`
    );
    return null;
  }

  return stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
  });
}

function upsertEnvVar(lines, key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const newLine = `${key}=${value}`;
  if (idx >= 0) lines[idx] = newLine;
  else lines.push(newLine);
}

async function main() {
  console.log("🚀 إعداد منتجات وأسعار Stripe...\n");

  const results = {};
  for (const plan of PLANS) {
    const { product, price } = await ensurePlan(plan);
    results[plan.key] = { productId: product.id, priceId: price.id };
    console.log(`✅ ${plan.name}: product=${product.id} price=${price.id} ($${plan.amount / 100}/mo)`);
  }

  console.log(`\n🔗 إعداد نقطة استقبال الويب هوك (${WEBHOOK_URL})...`);
  const endpoint = await ensureWebhook();

  upsertEnvVar(envLines, "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID", results.STARTER.priceId);
  upsertEnvVar(envLines, "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID", results.PRO.priceId);
  upsertEnvVar(envLines, "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID", results.ENTERPRISE.priceId);
  if (endpoint) {
    upsertEnvVar(envLines, "STRIPE_WEBHOOK_SECRET", endpoint.secret);
    console.log(`✅ Webhook endpoint: ${endpoint.id} → ${endpoint.url}`);
  }

  writeFileSync(envPath, envLines.join("\n"));

  console.log("\n📋 القيم النهائية المحفوظة في .env.local:");
  console.log(`NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=${results.STARTER.priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=${results.PRO.priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=${results.ENTERPRISE.priceId}`);
  console.log(
    endpoint
      ? `STRIPE_WEBHOOK_SECRET=${endpoint.secret}`
      : "STRIPE_WEBHOOK_SECRET=<لم يتغيّر — راجع التحذير أعلاه بخصوص نقطة الاستقبال الموجودة مسبقاً>"
  );
}

main().catch((err) => {
  console.error("❌ فشل السكربت:", err);
  process.exit(1);
});
