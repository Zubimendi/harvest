# Harvest — Product Requirements Document

**Tagline:** Share more, waste less.
**Owner:** You
**Status:** MVP Draft v1.0
**Last updated:** 2026-07-14

---

## 1. Problem

Roughly a third of all food produced for human consumption is lost or wasted every year, and households are the single largest contributor to that waste — while food insecurity affects hundreds of millions of people, often in the same cities where the waste happens. The gap isn't a shortage of food; it's a shortage of **visibility and coordination** between the person who has surplus food right now and the neighbor who could use it right now.

Existing solutions are either:
- **Charity-scale redistribution** (food banks, FareShare) — great for bulk/commercial surplus, too slow and heavy for "I made too much lasagna" or "my bakery has 12 unsold croissants tonight."
- **General marketplace apps** (Facebook Marketplace, Nextdoor) — not purpose-built for time-sensitive, perishable, hyperlocal exchange; no expiry logic, no pickup-window coordination, no food-safety framing.

## 2. Solution

Harvest is a hyperlocal mobile app where individuals and local businesses post surplus food — free or low-cost — for pickup by nearby neighbors, within a defined time window, before it spoils or is thrown away. Think "a farmers market that only exists for the next few hours, three blocks from you."

## 3. Target Users

| Persona | Description | Primary Need |
|---|---|---|
| **The Household Sharer** | Cooked too much, going on vacation, garden overflow | Quick, low-friction way to post surplus without guilt or waste |
| **The Local Business** | Bakery, café, restaurant, grocer with end-of-day surplus | Recurring, fast posting; reduce disposal cost; goodwill/marketing |
| **The Recipient** | Budget-conscious neighbor, student, anyone nearby | Discover what's available *near me, right now*; trust it's safe and real |

## 4. Goals & Non-Goals (MVP)

**Goals**
- Let a user post a food listing with photo, description, quantity, pickup window, and location in under 60 seconds.
- Let a nearby user discover listings on a map/feed, filter by distance and category, and reserve one.
- Coordinate pickup via in-app chat and a lightweight reservation state machine.
- Establish baseline trust via profile ratings/reviews after pickup.
- Support anonymous browsing, but require auth to post or reserve.

**Non-Goals (explicitly out of scope for MVP)**
- Payments/checkout (MVP is free-and-low-cost listings only; "suggested donation" is a text field, not a payment flow).
- Delivery/courier logic — pickup only.
- Business analytics dashboards, POS integrations.
- Multi-language localization (English only for MVP; architecture should not block it later).
- Admin web console (basic moderation is done via DB/CLI for MVP).

## 5. Core User Flows

1. **Onboarding** → phone/email auth (Supabase Auth) → location permission → set radius preference → land on Home feed.
2. **Post a listing** → tap FAB → photo(s) → title/description → category (produce, baked goods, pantry, cooked meal, other) → quantity → pickup window (start/end time) → location (defaults to current, adjustable pin) → publish.
3. **Discover** → Home shows map + toggleable list view of nearby active listings, sorted by distance/expiry → filter by category/distance → tap a card → Listing Detail.
4. **Reserve** → from Listing Detail, tap "Reserve" → listing moves to `reserved` state, held for the poster to confirm → chat thread opens automatically → coordinate pickup time/location details → poster marks `picked_up` (or `expired`/`cancelled`).
5. **Trust loop** → after `picked_up`, both parties can leave a rating (1–5) + optional comment → aggregated into public profile score.
6. **Notifications** → push notification when: your reservation is confirmed, a new message arrives, your listing is about to expire unclaimed, a listing matching saved preferences appears nearby.

## 6. Functional Requirements & Acceptance Criteria

Format: `GIVEN / WHEN / THEN`. Each maps to a testable acceptance criterion for MVP sign-off.

### 6.1 Authentication
- **AC1:** GIVEN a new user opens the app, WHEN they choose "Continue with Email" and complete OTP verification, THEN a `User` record is created in Postgres and a valid Supabase session is returned to the client.
- **AC2:** GIVEN an unauthenticated user, WHEN they browse the Home feed, THEN they can view listings but are redirected to auth when attempting to post, reserve, or message.

### 6.2 Posting a Listing
- **AC3:** GIVEN an authenticated user on the "Create Listing" screen, WHEN required fields (title, ≥1 photo, category, pickup window, location) are filled and they tap "Publish", THEN a `Listing` record is created with status `active` and appears in nearby feeds within 2 seconds (subscription-driven).
- **AC4:** GIVEN a pickup window end time in the past relative to now, WHEN the user attempts to publish, THEN the client blocks submission with a validation message.
- **AC5:** GIVEN a listing whose pickup window end time has passed with no reservation, THEN a background job transitions it to status `expired` and it disappears from active discovery feeds.

### 6.3 Discovery
- **AC6:** GIVEN a user with location permission granted and a radius preference of N km, WHEN they open Home, THEN only listings with status `active` within N km are returned, sorted by distance ascending by default.
- **AC7:** GIVEN a user applies a category filter, WHEN the filter is active, THEN only listings matching that category are shown, and the count updates without a full screen reload.
- **AC8:** GIVEN the map view, WHEN a user pans/zooms, THEN listing pins update to reflect the current viewport (debounced query, not one query per pixel of movement).

### 6.4 Reservation
- **AC9:** GIVEN an active listing not already reserved, WHEN a user taps "Reserve", THEN the listing transitions to `reserved`, is locked from other reservations, and a `Conversation` between poster and requester is created/opened automatically.
- **AC10:** GIVEN a listing in `reserved` state, WHEN the reserving user cancels OR 24 hours pass without pickup confirmation (whichever first), THEN the listing reverts to `active` and both parties are notified.
- **AC11:** GIVEN a `reserved` listing, WHEN the poster marks it `picked_up`, THEN both users are prompted to leave a rating, and the listing is archived from active/reserved feeds.

### 6.5 Messaging
- **AC12:** GIVEN two users with an open conversation tied to a reservation, WHEN either sends a message, THEN the other receives it in real time (GraphQL subscription) and via push notification if the app is backgrounded.

### 6.6 Trust & Safety
- **AC13:** GIVEN a completed pickup, WHEN a user submits a 1–5 rating, THEN the counterpart's aggregate rating (average + count) updates and is visible on their public profile.
- **AC14:** GIVEN any listing or user profile, WHEN a user taps "Report", THEN a `Report` record is created with a reason enum and is queryable by an operator; the reported content is not auto-hidden at MVP (manual review) but the report is timestamped and actor-attributed.

### 6.7 Notifications
- **AC15:** GIVEN a user has push permission granted, WHEN one of the trigger events in flow 6 occurs, THEN a push notification is delivered within a reasonable delay (best-effort, not hard-real-time for MVP) and deep-links to the relevant screen.

## 7. Data Model (high-level — see `backend/graph/schema.graphqls` for source of truth)

`User`, `Listing`, `Reservation` (implicit via `Listing.status` + `Conversation` for MVP simplicity — see design note in schema), `Conversation`, `Message`, `Review`, `Report`.

Key design decision: rather than a separate `Reservation` table for MVP, listing state is modeled as a state machine on `Listing.status` (`active → reserved → picked_up | expired | cancelled`) with a `reserved_by` foreign key. This is simpler to reason about for MVP and is called out explicitly in the handoff doc as the first thing to reconsider if you need multi-party waitlisting (see §9 of `HANDOFF.md`).

## 8. Non-Functional Requirements

- **Performance:** Nearby-listings query (geospatial radius search) returns in <300ms p95 for a metro-density dataset of ~50k active listings.
- **Offline resilience:** Feed and previously-viewed listings are readable offline (cached); posting/reserving requires connectivity but queues one retry.
- **Accessibility:** All interactive elements meet a 44×44pt minimum touch target; text meets WCAG AA contrast against its background in both light and dark mode.
- **Security:** All mutations require a valid Supabase JWT verified server-side; row-level ownership checks on every mutation (a user can only edit their own listings).
- **Privacy:** Exact home location is never shown to other users — listings show an approximate pin (jittered within ~100m) until a reservation is confirmed, at which point exact pickup details are shared via chat.

## 9. Success Metrics (post-launch, not MVP build targets)

- Listings posted per active user per month
- % of listings resulting in a successful pickup (vs. expired)
- Time-to-reservation (median minutes from post to reserve)
- 7-day and 30-day retention
- Estimated kg of food diverted from waste (self-reported quantity × pickup rate)

## 10. Milestones

| Phase | Scope |
|---|---|
| M0 — Foundation | Auth, DB schema, GraphQL API skeleton, design system, navigation shell |
| M1 — Core Loop | Post, discover (list + map), reserve, chat |
| M2 — Trust | Ratings, reports, profile pages |
| M3 — Polish | Push notifications, offline caching, empty/error states, onboarding animation |
| M4 — Ship | Play Store listing, privacy policy, closed beta, store review |
