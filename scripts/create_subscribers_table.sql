-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates the subscribers table for the Aletheia daily digest

create table if not exists subscribers (
  id                uuid        default gen_random_uuid() primary key,
  email             text        unique not null,
  subscribed_at     timestamptz default now(),
  confirmed         boolean     default true,
  unsubscribe_token text        unique default gen_random_uuid()::text,
  last_sent_at      timestamptz
);

alter table subscribers enable row level security;

-- Anyone (anon) can insert their own email to subscribe
create policy "public_can_subscribe" on subscribers
  for insert with check (true);

-- Prevent anon from reading other people's emails
create policy "no_public_read" on subscribers
  for select using (false);

-- RPC for unsubscribe — deletes by token so no auth needed
create or replace function public.unsubscribe(p_token text)
returns void language sql security definer as $$
  delete from subscribers where unsubscribe_token = p_token;
$$;
