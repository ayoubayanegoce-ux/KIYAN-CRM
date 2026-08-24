# B2B CRM AI Architecture & Guidelines

## Tech Stack
- **Framework**: Next.js 16.3+ (App Router, Server Actions, Server Components)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons
- **Auth & Multi-tenancy**: Clerk v7 (`@clerk/nextjs` with Organizations & `auth()`)
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js`) with RLS
- **AI Agent**: Google GenAI (`@google/genai`, model: `gemini-3.6-flash`)
- **Payments**: YouCanPay (`lib/youcanpay.ts`), tokenize + embedded `yp.js` form (no hosted redirect); payment confirmation is webhook-driven (`app/api/webhooks/youcanpay`) against an internal `payment_orders` idempotency ledger, never trusted from the payment page alone

## Database Schema (Supabase)
- **leads**: `id` (uuid), `org_id` (text), `name` (text), `email` (text), `company` (text), `status` (text), `ai_score` (int), `ai_intent` (text: 'hot'|'warm'|'cold'), `created_at` (timestamptz)
- **deals**: `id` (uuid), `org_id` (text), `lead_id` (uuid, fk leads.id), `title` (text), `value` (numeric), `stage` (text: 'discovery'|'proposal'|'negotiation'|'won'|'lost'), `created_at` (timestamptz)

## Existing Project Structure
- `lib/supabase.ts`: Supabase client initialization.
- `lib/ai.ts`: AI functions (`qualifyLead`).
- `app/actions/leads.ts`: Server actions for leads CRUD with Clerk `orgId` isolation.
- `app/page.tsx`: Main dashboard UI.
- `.env.local`: Contains Clerk, Supabase, and Gemini credentials.

## Development Rules
- Always enforce multi-tenancy: filter every Supabase query by `org_id` using Clerk's `const { orgId } = await auth();`.
- Use Next.js Server Actions with `revalidatePath("/")` for data mutations.
- Keep UI modern, dark-themed (Tailwind `slate-900`/`slate-950`), and responsive.