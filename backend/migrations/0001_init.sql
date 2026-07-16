-- Harvest initial schema (Neon)
-- Run: psql $DATABASE_URL -f migrations/0001_init.sql
-- Requires PostGIS. Auth users live in neon_auth."user" (Neon Auth), not Supabase auth.users.
--
-- Note: Row Level Security policies that used auth.uid() are omitted here.
-- The Go API enforces authorization; the DB role is a trusted server connection.

create extension if not exists postgis;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- App profile row; id matches neon_auth."user".id when using Neon Auth.
create table if not exists public.users (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  is_business boolean not null default false,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type listing_category as enum (
    'PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type listing_status as enum (
    'ACTIVE', 'RESERVED', 'PICKED_UP', 'EXPIRED', 'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category listing_category not null,
  photos text[] not null default '{}',
  quantity text,
  suggested_donation text,
  status listing_status not null default 'ACTIVE',
  pickup_window_start timestamptz not null,
  pickup_window_end timestamptz not null,
  -- true_location is the exact pin (only ever read server-side / by the reserving user post-confirmation)
  true_location geography(Point, 4326) not null,
  -- display_location is jittered ~100m for public feed privacy
  display_location geography(Point, 4326) not null,
  reserved_by uuid references public.users(id) on delete set null,
  reserved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_window_valid check (pickup_window_end > pickup_window_start)
);

create index if not exists listings_display_location_gix on public.listings using gist (display_location);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_owner_idx on public.listings (owner_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  reviewee_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

do $$ begin
  create type report_reason as enum (
    'SPOILED_OR_UNSAFE', 'MISLEADING', 'NO_SHOW', 'INAPPROPRIATE', 'OTHER'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reason report_reason not null,
  details text,
  reported_listing_id uuid references public.listings(id) on delete set null,
  reported_user_id uuid references public.users(id) on delete set null,
  reporter_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Keep users.rating_* in sync when a review is added
create or replace function public.apply_review() returns trigger as $$
begin
  update public.users
    set rating_sum = rating_sum + new.rating,
        rating_count = rating_count + 1,
        updated_at = now()
    where id = new.reviewee_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_apply_review on public.reviews;
create trigger trg_apply_review after insert on public.reviews
  for each row execute function public.apply_review();
