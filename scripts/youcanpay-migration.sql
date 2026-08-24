-- Run this once against the project's Supabase database (SQL editor or `psql`)
-- to switch billing from Stripe to YouCanPay. Not auto-applied — the Supabase
-- MCP connection in this environment points at a different project than
-- NEXT_PUBLIC_SUPABASE_URL in .env.local, so this couldn't be run for you.

alter table org_settings
  add column if not exists plan_expires_at timestamptz,
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id;

alter table deals
  add column if not exists youcanpay_order_id text,
  drop column if exists stripe_checkout_url,
  drop column if exists stripe_checkout_session_id;

create table if not exists payment_orders (
  order_id text primary key,
  org_id text not null,
  kind text not null check (kind in ('subscription', 'deal')),
  deal_id uuid references deals(id),
  plan text,
  amount text not null,
  currency text not null,
  token text,
  transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists payment_orders_org_id_idx on payment_orders(org_id);
