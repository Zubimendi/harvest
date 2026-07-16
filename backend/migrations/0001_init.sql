-- Harvest initial schema
-- Run via Supabase SQL editor, or `psql $DATABASE_URL -f migrations/0001_init.sql`
-- Requires PostGIS (enabled by default on Supabase projects).

create extension if not exists postgis;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- Users mirror Supabase's auth.users (id shared 1:1 with auth.users.id).
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  is_business boolean not null default false,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type listing_category as enum (
  'PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'
);

create type listing_status as enum (
  'ACTIVE', 'RESERVED', 'PICKED_UP', 'EXPIRED', 'CANCELLED'
);

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

create type report_reason as enum (
  'SPOILED_OR_UNSAFE', 'MISLEADING', 'NO_SHOW', 'INAPPROPRIATE', 'OTHER'
);

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

-- Row Level Security
alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- Public read of profiles & active listings; writes restricted to the owner.
create policy users_select_all on public.users for select using (true);
create policy users_update_own on public.users for update using (auth.uid() = id);

create policy listings_select_active_or_own on public.listings for select
  using (status = 'ACTIVE' or owner_id = auth.uid() or reserved_by = auth.uid());
create policy listings_insert_own on public.listings for insert
  with check (owner_id = auth.uid());
create policy listings_update_own_or_reserver on public.listings for update
  using (owner_id = auth.uid() or reserved_by = auth.uid());

create policy conversations_select_participant on public.conversations for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  ));

create policy messages_select_participant on public.messages for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  ));
create policy messages_insert_participant on public.messages for insert
  with check (sender_id = auth.uid());

create policy reviews_select_all on public.reviews for select using (true);
create policy reviews_insert_own on public.reviews for insert with check (reviewer_id = auth.uid());

create policy reports_insert_own on public.reports for insert with check (reporter_id = auth.uid());
