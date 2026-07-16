-- Harvest demo seed data
-- Demo neighbor id must match mobile/lib/demo.ts DEMO_USER_ID

begin;

-- Auth identities (Neon Auth)
insert into neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
values
  ('11111111-1111-1111-1111-111111111111', 'Alex Neighbor', 'alex@harvest.demo', true, null, now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Maya Baker', 'maya@harvest.demo', true, null, now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Green Grocer Co', 'hello@greengrocer.demo', true, null, now(), now())
on conflict (id) do nothing;

-- App profiles
insert into public.users (id, display_name, avatar_url, bio, is_business, rating_sum, rating_count)
values
  ('11111111-1111-1111-1111-111111111111', 'Alex Neighbor', null, 'Happy to share extras from my kitchen.', false, 18, 4),
  ('22222222-2222-2222-2222-222222222222', 'Maya Baker', null, 'Home baker — sourdough & seasonal tarts.', false, 45, 10),
  ('33333333-3333-3333-3333-333333333333', 'Green Grocer Co', null, 'Neighborhood produce shop clearing end-of-day stock.', true, 62, 14)
on conflict (id) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  is_business = excluded.is_business;

-- Clear prior demo listings (idempotent re-seed)
delete from public.listings
where owner_id in (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111'
);

-- Seed neighborhood: Lisbon Baixa-ish (override via EXPO_PUBLIC_SEED_LAT/LNG on mobile)
-- Points are within ~1–2 km of 38.7223, -9.1393

insert into public.listings (
  id, owner_id, title, description, category, photos, quantity, suggested_donation,
  status, pickup_window_start, pickup_window_end, true_location, display_location
) values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '22222222-2222-2222-2222-222222222222',
  'Two loaves of sourdough',
  'Baked this morning — too many for us. Soft crumb, crispy crust.',
  'BAKED_GOODS',
  array['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'],
  '2 loaves',
  null,
  'ACTIVE',
  now() - interval '1 hour',
  now() + interval '5 hours',
  ST_SetSRID(ST_MakePoint(-9.1410, 38.7235), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1415, 38.7230), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  '33333333-3333-3333-3333-333333333333',
  'Slightly soft tomatoes (still great for sauce)',
  'End-of-day box from the shop. Perfect for cooking tonight.',
  'PRODUCE',
  array['https://images.unsplash.com/photo-1546097657-6b8b4c2c0c0d?w=800&q=80','https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80'],
  '1 crate',
  'Suggested €2',
  'ACTIVE',
  now() - interval '30 minutes',
  now() + interval '3 hours',
  ST_SetSRID(ST_MakePoint(-9.1375, 38.7210), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1380, 38.7205), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  '22222222-2222-2222-2222-222222222222',
  'Lemon poppy muffins (6)',
  'Batch leftover from a brunch order. Best same day.',
  'BAKED_GOODS',
  array['https://images.unsplash.com/photo-1486427944299-d1955d23e343?w=800&q=80'],
  '6 muffins',
  null,
  'ACTIVE',
  now(),
  now() + interval '2 hours',
  ST_SetSRID(ST_MakePoint(-9.1440, 38.7250), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1435, 38.7246), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  '33333333-3333-3333-3333-333333333333',
  'Bag of mixed salad greens',
  'Washed and ready. Pickup before we close.',
  'PRODUCE',
  array['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'],
  '1 bag',
  null,
  'ACTIVE',
  now() - interval '2 hours',
  now() + interval '4 hours',
  ST_SetSRID(ST_MakePoint(-9.1360, 38.7195), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1365, 38.7190), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
  '11111111-1111-1111-1111-111111111111',
  'Homemade vegetable soup (1L)',
  'Made too much. Vegetarian, no dairy. Bring a container if you can.',
  'COOKED_MEAL',
  array['https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80'],
  '1 liter',
  null,
  'ACTIVE',
  now() - interval '45 minutes',
  now() + interval '6 hours',
  ST_SetSRID(ST_MakePoint(-9.1400, 38.7220), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1404, 38.7216), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
  '33333333-3333-3333-3333-333333333333',
  'Eggs — dozen, farm carton',
  'Carton date is tomorrow; still perfect.',
  'DAIRY_EGGS',
  array['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80'],
  '12 eggs',
  'Suggested €1',
  'ACTIVE',
  now(),
  now() + interval '8 hours',
  ST_SetSRID(ST_MakePoint(-9.1350, 38.7240), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1355, 38.7235), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
  '22222222-2222-2222-2222-222222222222',
  'Jar of apricot jam',
  'Small-batch from last week. Sealed.',
  'PANTRY',
  array['https://images.unsplash.com/photo-1471943311420-88224d3d3c5a?w=800&q=80'],
  '1 jar',
  null,
  'ACTIVE',
  now() - interval '3 hours',
  now() + interval '12 hours',
  ST_SetSRID(ST_MakePoint(-9.1425, 38.7200), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1420, 38.7196), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8',
  '33333333-3333-3333-3333-333333333333',
  'Herbs bundle — parsley, cilantro, mint',
  'We over-ordered for the weekend display.',
  'PRODUCE',
  array['https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80'],
  '3 bunches',
  null,
  'ACTIVE',
  now() - interval '1 hour',
  now() + interval '3 hours',
  ST_SetSRID(ST_MakePoint(-9.1390, 38.7260), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1385, 38.7255), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9',
  '11111111-1111-1111-1111-111111111111',
  'Half a bag of rice + lentils',
  'Pantry clear-out before a move. Unopened bags.',
  'PANTRY',
  array['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80'],
  '2 bags',
  null,
  'ACTIVE',
  now(),
  now() + interval '10 hours',
  ST_SetSRID(ST_MakePoint(-9.1450, 38.7215), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1446, 38.7211), 4326)::geography
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10',
  '22222222-2222-2222-2222-222222222222',
  'Olive oil focaccia squares',
  'Tray leftovers — still warm-ish if you hurry.',
  'BAKED_GOODS',
  array['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80'],
  '8 pieces',
  null,
  'ACTIVE',
  now() - interval '20 minutes',
  now() + interval '90 minutes',
  ST_SetSRID(ST_MakePoint(-9.1370, 38.7228), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-9.1374, 38.7224), 4326)::geography
);

-- Demo conversation for Messages tab
insert into public.conversations (id, listing_id)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
on conflict (id) do nothing;

insert into public.conversation_participants (conversation_id, user_id)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.messages (id, conversation_id, sender_id, body, created_at)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', 'Hi! The loaves are on the porch — green bag.', now() - interval '40 minutes'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', 'Perfect, I can pick up around 6. Thank you!', now() - interval '35 minutes')
on conflict (id) do nothing;

commit;
