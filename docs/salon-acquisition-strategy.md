# SalonBook: City-by-City Salon Acquisition Strategy

**Status:** Proposal  
**Last updated:** July 2026  
**Audience:** Founders, product, ops

---

## Executive summary

**Verdict: Promising growth strategy, but only if you treat it as a supply-side acquisition funnel — not a finished product.**

Pre-populating SalonBook with salon listings scraped or imported from public directories (JustDial, Google Maps, Sulekha, etc.), then converting owners when real customer demand appears, is a well-known marketplace playbook. It can work well for SalonBook because:

- Manual seller onboarding is slow and does not scale city-by-city.
- India’s salon market is fragmented; owners are on WhatsApp, not waiting to sign up for another SaaS tool.
- A real booking is a stronger sales pitch than a cold call (“someone wants to book tomorrow at 4 PM — claim your salon to confirm”).

**However**, the strategy fails fast if listings are inaccurate, bookings cannot be fulfilled, or outreach feels spammy. Success depends on **data quality**, **honest customer expectations**, and a **claim flow** that hands the owner a ready-made dashboard — not on scraping volume alone.

---

## The problem today

| Current state | Pain |
|---------------|------|
| Seller must register → create salon → add services, staff, hours, photos | High friction; ops-heavy |
| Every `Salon` requires a real `ownerId` (`User` with role `SELLER`) | Cannot list “unowned” salons without schema/product changes |
| Owner notification after booking is **client-side WhatsApp** (`wa.me` link opened by customer) | No automated, reliable owner outreach |
| Admin can manage existing salons (`/api/admin/salons/:id`) but cannot bulk-import at scale | No ingestion pipeline |

Manual onboarding does not scale when the goal is **hundreds of salons per city**.

---

## Proposed strategy

### Core idea

1. **Ingest** salon data from public sources for one target city at a time.
2. **Publish** listings on SalonBook as **unclaimed** (or system-owned) profiles with reasonable defaults (hours, generic services, photos where allowed).
3. **Drive demand** via SEO, local ads, and explore/map UX so customers can discover and book.
4. **Trigger conversion** when a booking or inquiry happens: automated WhatsApp/SMS to the salon’s listed phone with a **claim link**.
5. **On signup**, owner verifies identity (phone OTP), claims the pre-built salon, and lands in **Seller Dashboard** with data already filled in.

### City-by-city rollout

| Phase | City | Goal |
|-------|------|------|
| Pilot | 1 tier-2/3 city (e.g. Indore, Jaipur, Lucknow) | Prove claim rate and booking fulfillment |
| Expand | 2–3 more cities in same state | Reuse playbooks, refine scraper + ops |
| Scale | Metro + adjacent cities | Automate ingestion; reduce manual QA |

**Why city-by-city:** Concentrated supply improves SEO (“salons in Indore”), makes ops QA tractable, and lets you measure claim rate per city before burning crawl budget nationally.

### Funnel (high level)

```
Public directories          SalonBook (unclaimed)         Real demand              Owner claims
─────────────────          ─────────────────────         ───────────              ────────────
JustDial / Maps / etc.  →  Listing + default services →  Customer books    →     WhatsApp/SMS
                           Admin QA (sample)               or inquires              ↓
                                                                                Sign up + OTP
                                                                                Seller Dashboard
```

---

## How it maps to SalonBook (product gaps)

To execute this strategy, the platform needs incremental changes — not a rewrite.

### 1. Unclaimed salon model

Today every salon must have `ownerId`. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **A. System placeholder user** per city/batch | Minimal schema change | Messy ownership; hard to audit |
| **B. `claimedAt` + nullable `ownerId` + `listedPhone`** | Clean semantics | Schema migration; auth rules update |
| **C. Separate `SalonListing` → merge on claim** | Clear ingestion boundary | More tables and sync logic |

**Recommendation:** Option B — add `source`, `sourceUrl`, `listedPhone`, `claimedAt`, `claimToken`, and allow `ownerId` to point to a single system user until claimed.

### 2. Ingestion pipeline

- **Sources:** JustDial, Google Maps Places API (paid but legal), Sulekha, Facebook/Instagram bios, municipal listings.
- **Fields:** name, address, phone, lat/lng, categories, hours (if available), photos (only if license allows).
- **Dedup:** normalize phone + fuzzy name/address match before insert.
- **QA:** sample 10–20% manual review per batch; auto-flag missing phone or duplicate.

Prefer **Google Places API** or licensed data over aggressive scraping where ToS risk is high (see Legal).

### 3. Default bookability

Scraped salons rarely have accurate services/prices. Minimum viable listing:

- Default hours (e.g. 10:00–20:00) with “Hours may vary — confirm with salon”
- Generic service menu (Haircut, Beard, Facial) with **estimated** prices marked clearly
- `ensureSalonDefaultStaff` pattern already exists — reuse for slot generation

**Customer UX:** Show badge: **“Listed salon — owner not yet on SalonBook”** and set expectation that confirmation may take time (or booking stays `PENDING` until owner claims).

### 4. Automated owner outreach (critical)

Current flow opens WhatsApp from the **customer’s** browser. For this strategy you need **server-side** messaging.

**Chosen stack (pilot):** [whatsapp-api-venom](https://github.com/diazzaid/whatsapp-api-venom) — NestJS HTTP wrapper around [Venom](https://github.com/orkestral/venom) (WhatsApp Web automation). Free, self-hosted, QR-linked to a dedicated SalonBook phone number.

| | Venom (pilot) | WhatsApp Business API (later) |
|--|---------------|-------------------------------|
| Cost | Free (dedicated SIM) | Per-message pricing |
| Setup | Clone repo, `npm start`, scan QR | Meta Business verification, templates |
| Reliability | Session can drop; number can be banned | Production-grade |
| ToS | Unofficial — use a **burner** ops number, not personal | Compliant for business messaging |

**Message template:**

> Hi [Salon], a customer booked [service] on [date] via SalonBook. Claim your free profile to confirm: [link]

**Deep link:** `/claim?token=…` → register as `SELLER` → auto-attach salon

#### Venom service setup

1. Clone and run on a **separate port** (SalonBook already uses `3000`):

   ```bash
   git clone https://github.com/diazzaid/whatsapp-api-venom.git
   cd whatsapp-api-venom && npm i
   # Edit src/config.service.ts — set token/session path (not /tmp on macOS)
   PORT=3001 npm start
   ```

2. Scan QR in terminal once; session persists in the configured tokens folder.
3. Swagger at `http://localhost:3001/` — send test message:

   ```bash
   curl -X POST http://localhost:3001/api/send-message \
     -H 'Content-Type: application/json' \
     -d '{"number": "919876543210", "message": "SalonBook test"}'
   ```

   Number format: country code + 10 digits, no `+` (e.g. `91` + Indian mobile).

#### SalonBook integration (planned)

- Env: `WHATSAPP_API_URL=http://localhost:3001` (or production host)
- On booking create (unclaimed salon): `POST {WHATSAPP_API_URL}/api/send-message` from `server.ts`
- Fire-and-forget with log on failure; never block booking if Venom is down
- Run Venom on a **VPS or always-on machine** — Vercel serverless cannot host the Venom session

**Upgrade path:** When claim volume grows or Meta bans the ops number, migrate to WhatsApp Business API or MSG91 SMS for the same `sendOwnerNotification()` helper — swap provider behind one function.

### 5. Claim flow

1. Owner clicks link → phone OTP matches `listedPhone` (or manual review if mismatch)
2. Account created or logged in as `SELLER` with `sellerSignupSource = INVITE_CLAIM` and `trialEndsAt = now + 3 months`
3. `salon.ownerId` updated; `claimedAt` set
4. Redirect to Seller Dashboard with pre-filled data and trial banner
5. Prompt: verify services, prices, photos (quick wins)

### 6. Booking handling before claim

| Model | Customer experience | Ops load |
|-------|---------------------|----------|
| **Pending until claimed** | “Request sent; salon will confirm” | Lower risk; some drop-off |
| **Auto-confirm + notify owner** | Instant confirmation | High risk if salon unaware |
| **Concierge call** (pilot only) | Human calls salon | Does not scale |

**Recommendation for pilot:** Pending bookings + SMS/WhatsApp to owner + optional ops phone call for first 50 bookings in a city.

### 7. Admin tooling

Extend admin beyond single-salon edit:

- Bulk import CSV/JSON
- Ingestion job status, dedup queue, claim metrics per city
- “Merge duplicate listing” and “Delist” actions

### 8. Seller monetization (pricing by signup path)

Charge sellers differently depending on **how they joined** — reward demand-led claims, monetize organic signups.

| Signup path | Definition | Seller access |
|-------------|------------|---------------|
| **Customer invite (claim)** | Owner signs up via **claim link** sent after a **real customer booking** (or inquiry) at their unclaimed listing — WhatsApp/SMS from SalonBook | **Free for first 3 months**, then standard seller subscription |
| **Manual signup** | Owner registers as SELLER directly (e.g. “List your salon” on homepage, ads, word of mouth) **without** a valid claim/booking invite token | **Paid from month 1** — no free trial |

**Why this works**

- **Invite path** = you already delivered value (a customer). Three free months reduce friction to claim and align with the acquisition funnel.
- **Manual path** = they found you without proven demand on the platform. Charging from day one filters serious owners and funds ops.

**Rules to enforce in product**

1. **Trial only via claim token** — `trialEndsAt` set on claim when `claimToken` is tied to a booking or unclaimed salon with listed phone verified.
2. **Manual `/register` as SELLER** — no trial; show pricing before or right after signup; dashboard gated or limited until payment (pick one for pilot).
3. **One trial per salon / phone** — prevent re-claiming or new accounts to reset the 3 months.
4. **Transparent UI** — Seller Dashboard shows: *“Free until [date] — customer booking invite”* vs *“Subscription required”*.
5. **After trial** — same plan for both paths (single monthly price; avoid two tiers unless you add features later).

**Suggested schema (when billing ships)**

Implemented on `User` in `prisma/schema.prisma`:

```
sellerSignupSource       MANUAL | INVITE_CLAIM
trialEndsAt              DateTime?
sellerSubscriptionStatus TRIAL | ACTIVE | PAST_DUE
```

Helpers: `src/lib/sellerSubscription.ts` · API: `GET /api/seller/subscription` · Manual seller register sets `MANUAL` + `PAST_DUE`. Claim flow will call `grantSellerInviteClaimTrial` (3 months `TRIAL`).

Link invite to booking: `ClaimToken.bookingId` or `firstBookingAt` on salon so “customer invite” is auditable.

**Edge cases**

| Case | Policy |
|------|--------|
| Owner opens claim link but registers via `/register` without token | No trial — must complete claim flow with token |
| Owner manual-signups, then later gets a booking at scraped listing | Trial does **not** retroactively apply; they already chose manual path |
| Two owners, same salon | Trial once per claimed salon; first verified claim wins |
| Owner invited, trial ends, churns, re-signs manually | Manual rules — pay from month 1 |

**Messaging**

- **Invite WhatsApp:** *“…Claim your salon — **3 months free** when you sign up from this link.”*
- **Manual landing:** *“List your salon — plans from ₹X/month”* (no free trial mention)

Billing provider (Razorpay Subscriptions, Stripe India, etc.) is a Phase 1+ build — until then, track `sellerSignupSource` and `trialEndsAt` in DB and enforce access in middleware.

---

## Pros

1. **Scales supply faster than door-to-door onboarding** — one ops person + scripts can onboard hundreds of listings per week.
2. **Demand-led conversion** — owners respond to money on the table, not a generic “join our platform” pitch.
3. **SEO and discovery** — more listings → more long-tail search (“best salon near [locality]”) → organic customer acquisition.
4. **City-by-city focus** — measurable unit economics (listings → bookings → claims) before national spend.
5. **Leverages existing product** — Seller Dashboard, booking flow, menu OCR, admin salon tools become the “reward” for claiming.
6. **Low CAC narrative** — listings act as free marketing; **3-month invite trial** converts owners without upfront cost.
7. **Competitive moat over time** — claimed salons with real bookings are harder for a clone to poach.

---

## Cons

1. **Legal and ToS risk** — scraping JustDial and similar sites may violate terms; photos and reviews often cannot be republished without permission.
2. **Data quality** — wrong phone, closed business, duplicate listings → bad UX and trust damage.
3. **Booking fulfillment risk** — customer books; owner never saw the message; SalonBook gets blamed.
4. **Owner backlash** — unsolicited listing + customer messages can feel like spam; reputational risk on WhatsApp.
5. **Inaccurate prices/services** — estimated menus mislead customers; disputes and refunds.
6. **Engineering cost** — unclaimed model, claim auth, messaging API, ingestion pipeline, and ops dashboards are non-trivial.
7. **Messaging cost** — WhatsApp Business API and SMS are paid; ROI depends on claim rate.
8. **Duplicate ownership disputes** — two people claim same salon; need verification workflow.
9. **Platform liability** — in India, consumer expectations may treat you like the booking agent even if you disclaim responsibility.
10. **Does not replace relationships** — high-value salons may still need human sales after claim.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Scraping blocked or sued | Prefer Google Places API / licensed data; store only facts you have rights to use |
| Low claim rate | Optimize message copy; show booking value; follow up 24h later; ops call for high-value bookings |
| Bad bookings on dead listings | Pending status; phone validation; periodic “listing health” checks |
| Customer trust | Clear “unclaimed” badge; honest ETAs; easy cancel |
| Wrong owner gets account | OTP on listed phone + optional GST/shop photo for disputes |
| SEO thin content | Unique copy per salon where possible; user reviews after real visits |

---

## Legal and ethics (India)

- **Personal data:** Phone numbers from directories are personal data under DPDP Act 2023. Use for **transactional** outreach (booking notification) with clear opt-out; avoid bulk promotional spam without consent.
- **Copyright:** Do not copy JustDial reviews, proprietary photos, or long descriptive text verbatim.
- **Misrepresentation:** Do not imply a partnership with salons that have not claimed; badge unclaimed listings clearly.
- **Consumer protection:** Terms should state SalonBook is a discovery/booking platform; confirmation depends on salon participation until claimed.

*This is not legal advice — consult counsel before large-scale ingestion.*

---

## Success metrics (pilot city)

| Metric | Target (illustrative) |
|--------|------------------------|
| Listings ingested (QA-passed) | 200–500 |
| Listing → profile view rate | Track baseline |
| Booking request rate | Track baseline |
| Owner message delivery rate | > 95% |
| Claim rate within 7 days of first booking | > 30% (validate in pilot) |
| Claim rate within 7 days of listing only | > 5% (cold) |
| Customer booking completion (confirmed) | > 70% post-claim |
| Time to first claimed salon | < 2 weeks from launch |

Kill or pivot the city if claim rate stays near zero after 100+ booking notifications.

---

## Recommended phased plan

### Phase 0 — Foundation (2–3 weeks)

- Schema: unclaimed salon fields + claim token
- Claim page + phone OTP
- `sellerSignupSource` + `trialEndsAt` (invite = 3 months free; manual = paid from day 1)
- Server-side WhatsApp/SMS for booking events (not client `wa.me` only)
- “Unclaimed” badge on salon detail and booking confirm

### Phase 1 — Pilot city (4–6 weeks)

- Ingest 200 listings (manual CSV + light automation OK)
- Manual QA on phones and addresses
- Soft launch SEO + local Instagram/Google ads
- Ops playbook for pending bookings and owner calls
- Measure claim rate and customer NPS

### Phase 2 — Automate ingestion (ongoing)

- Scraper or Places API pipeline with dedup
- Admin bulk import and metrics dashboard
- Second city only after pilot metrics hit thresholds

### Phase 3 — Growth loop

- Claimed owners invite staff, upload real menus (menu OCR already exists)
- Reviews and featured placement as incentives to complete profile

---

## Alternatives to consider

| Alternative | When to use |
|-------------|-------------|
| **Partnership with local salon associations** | Higher trust, slower scale |
| **Freelancer “city captains”** | Pay per claimed salon; replaces pure scraping |
| **“List your salon” self-serve + ads** | Complements scrape; owners who find you organically |
| **Lead-gen only (no booking until claimed)** | Lower fulfillment risk; weaker customer UX |
| **WhatsApp-first mini-app for owners** | Owners never visit web; claim via WhatsApp bot |

Hybrid often wins: **scrape for discovery**, **require claim before instant confirm**, **city captains for top 20 salons per city**.

---

## Opinion: Is this a good plan?

**Yes, as a supply acquisition strategy — with guardrails.**

It is **not** a shortcut to a fully working marketplace. It is a **way to buy inventory and attention** cheaply, then convert owners when demand proves value. That matches how many local marketplaces grew in India.

**Do it if:**

- You commit to honest customer messaging for unclaimed listings
- You invest in claim flow and server-side owner notifications
- You pilot one city and measure claim rate before scaling
- You use legally defensible data sources

**Do not do it if:**

- The goal is thousands of listings with no ops to handle failed bookings
- You plan to scrape reviews/photos blindly
- You expect owners to sign up without seeing customer intent

---

## Related SalonBook code (today)

| Area | Location |
|------|----------|
| Salon ownership model | `prisma/schema.prisma` — `Salon.ownerId` required |
| Seller onboarding | `POST /api/seller/salon`, `SellerDashboard.tsx` |
| Admin salon management | `AdminSalonManage.tsx`, `/api/admin/salons/*` |
| Post-booking WhatsApp (client) | `SalonDetails.tsx` — opens `wa.me` for owner |
| Default staff for booking slots | `ensureSalonDefaultStaff` in `server.ts` |
| Menu import (useful after claim) | `POST /api/admin/salons/:id/services/extract-from-menu` |

---

## Next steps

1. Pick pilot city and target listing count (e.g. 300 salons in one city).
2. Legal review on data sources and owner messaging.
3. Implement unclaimed salon + claim flow (smallest schema option that works).
4. Run [whatsapp-api-venom](https://github.com/diazzaid/whatsapp-api-venom) on port 3001; wire `WHATSAPP_API_URL` into booking notifications.
5. Manual CSV import of 50 listings → internal dogfood → expand to 200.
6. Launch customer-facing explore with unclaimed badges; track funnel metrics.

---

*Document owner: product strategy. Update as pilot results come in.*
