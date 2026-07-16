# Harvest — Design System

## Direction

Most "surplus marketplace" and food apps default to one of two clichés: aggressive red/orange delivery-app energy (DoorDash-style urgency), or generic SaaS blue/purple gradients with rounded-everything cards that scream "AI-generated template." Harvest should feel like **neither**. The reference points are farmers' markets, seed packets, community bulletin boards, and editorial food publications (think Cherry Bombe, Kinfolk) — warm, tactile, human, slightly analog, optimistic without being saccharine.

Grounding principle: this is a **civic/community** product wearing food-app clothes. Warmth and trust matter more than appetite-stimulation or transactional urgency.

## Color

Palette is nature/biophilic-derived (2026 mobile design trend research: warm neutrals + earthy accent, moving away from flat minimalist grey and away from oversaturated gradients), tuned for a dual light/dark system since the majority of users now default to dark mode.

### Light mode
| Token | Hex | Use |
|---|---|---|
| `bg` | `#FBF6EF` | App background — warm cream, not stark white |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surface-alt` | `#F3ECE1` | Secondary surfaces, chips, input fields |
| `border` | `#E8DFD3` | Hairlines, dividers |
| `text-primary` | `#2B231D` | Espresso — primary text |
| `text-secondary` | `#6B5F55` | Secondary text, captions |
| `brand` | `#C1502E` | Terracotta — primary actions, brand mark |
| `brand-strong` | `#9E3D22` | Pressed/active state of brand |
| `accent-sage` | `#6B8F71` | Freshness, success, "free" tags, category: produce |
| `accent-amber` | `#D68C2A` | Expiring-soon, warnings |
| `accent-error` | `#B3462C` | Errors, destructive actions |
| `accent-info` | `#7A93A3` | Business badge, informational tags |

### Dark mode
| Token | Hex | Use |
|---|---|---|
| `bg` | `#1E1913` | Warm near-black (not pure #000 — keeps the earthy tone) |
| `surface` | `#2A241C` | Cards, sheets |
| `surface-alt` | `#352E24` | Chips, inputs |
| `border` | `#413A2F` | Hairlines |
| `text-primary` | `#F5EEE3` | Primary text |
| `text-secondary` | `#B6A996` | Secondary text |
| `brand` | `#E2764F` | Terracotta, brightened for dark contrast |
| `accent-sage` | `#8CAE8F` | Brightened sage |
| `accent-amber` | `#E6A64B` | Brightened amber |
| `accent-error` | `#D06249` | Brightened error |

**Rule:** 60/30/10 — cream/near-black neutrals dominate (60%), sage + secondary surfaces support (30%), terracotta is reserved for primary CTAs and brand moments only (10%). Terracotta should never be a full-screen background; it's a spark, not a wash.

## Typography

Deliberate serif/sans pairing — this is the single biggest lever against "AI slop" default-Inter-everywhere apps.

- **Display / Headings — Fraunces** (variable serif, warm/organic letterforms, available free on Google Fonts). Used for screen titles, listing titles, empty-state headlines. Gives the app an editorial, human, slightly nostalgic voice — like a seed catalog or community newsletter, not a fintech dashboard.
- **UI / Body — Inter**. Used for body copy, labels, buttons, form fields, numbers (distance, time, counts). Neutral and highly legible at small sizes, tabular figures for distances/times.

### Scale (base 16px / 4px spacing grid)
| Style | Font | Size / Line height | Weight |
|---|---|---|---|
| Display | Fraunces | 32/38 | 600 (SemiBold), optical size "opsz" high |
| Title 1 | Fraunces | 24/30 | 600 |
| Title 2 | Fraunces | 20/26 | 500 |
| Body | Inter | 16/24 | 400 |
| Body Emphasis | Inter | 16/24 | 600 |
| Caption | Inter | 13/18 | 500 |
| Overline (category tags) | Inter | 11/14, letter-spacing +0.06em, uppercase | 600 |

## Spacing & Radius

- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64` (px) — no arbitrary values.
- Radius: cards `20px`, buttons `14px`, chips/badges `999px` (full pill), input fields `12px`. Deliberately *not* the ultra-rounded 28px+ "bubbly" look common in template UI kits — soft but grounded.
- Shadows are warm-tinted (`rgba(43,35,29,0.08)` in light mode), never pure black — keeps depth consistent with the palette instead of looking bolted-on.

## Iconography & Imagery

- Icons: `lucide-react-native`, 1.5px stroke, rounded caps — consistent, unbranded base set, tinted with `text-secondary` at rest and `brand` when active.
- Photography is the hero, not illustration: listing photos should feel like someone's actual kitchen counter, not stock food photography. Placeholder/empty states use simple line illustrations (single terracotta line weight) rather than generic 3D-render mascots.
- Avoid: gradients as a crutch, glassmorphism as a default, drop-shadowed emoji, generic "3D blob" illustration packs.

## Core Components (see `mobile/components/`)

- **Button** — primary (filled terracotta), secondary (outlined espresso/cream), ghost (text-only), destructive (error). 48px min height.
- **ListingCard** — photo (4:3), category overline, Fraunces title (2-line clamp), distance + pickup window in Inter caption, status badge (Free / Suggested donation / Expiring soon).
- **Badge/Chip** — pill shape, used for category, status, and trust indicators (e.g. "Verified business").
- **Avatar** — circular, with a thin sage ring when the user has a rating ≥4.5.
- **EmptyState** — Fraunces headline + single-line-weight illustration + one primary action.

## Screen Structure (navigation map)

Bottom tab bar (4 destinations + center FAB), thumb-reachable zone respected:

1. **Home** — segmented control: *Map* / *List*. Nearby active listings.
2. **Browse** — full list with filters (category, distance, "ending soon").
3. **[FAB] Post** — modal flow, not a tab (posting is an action, not a destination).
4. **Messages** — conversations tied to reservations.
5. **Profile** — your listings (active/history), rating, saved preferences, settings.

Each listing flows: `Card (feed)` → `Listing Detail (sheet/screen)` → `Reserve confirmation` → `Conversation` → `Pickup confirmation` → `Rating prompt`.

## Motion

Minimal, purposeful: 150–200ms ease-out for sheet presentations, card press scales to 0.98, no bouncy/spring overkill. Motion should feel calm, not gamified — this is a civic tool, not a rewards app.
