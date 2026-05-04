-- WealthPlanrAI — Migration 004
-- Adds Stripe billing fields to profiles table

alter table profiles
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status    text default 'trialing',
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists plan                   text default 'free';

create index if not exists idx_profiles_stripe_customer on profiles (stripe_customer_id);
