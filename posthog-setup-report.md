# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the SalonBook project. A new `posthog-node` server-side SDK instance was wired into `server.ts` via a shared singleton at `src/lib/posthog-server.ts`. Twelve events covering the full customer and seller journey are now captured on every meaningful state change. Users are identified at login and registration on both the server (via `posthog.identify()`) and the frontend (via `identifyUser()`), with client PostHog distinct and session IDs forwarded as `X-POSTHOG-DISTINCT-ID` / `X-POSTHOG-SESSION-ID` headers so client and server events are correlated to the same person profile. An Express error handler calls `posthog.captureException()` to surface unhandled server errors in PostHog. The frontend `analytics.ts` was updated to remove the hardcoded host fallback and expose a `getPostHogHeaders()` helper used by `Login.tsx` and `Register.tsx`.

| Event | Description | File |
|---|---|---|
| `user_registered` | A new user successfully creates an account on SalonBook. | `server.ts` |
| `user_logged_in` | A user successfully authenticates and receives a JWT token. | `server.ts` |
| `booking_created` | A customer successfully creates a new salon appointment booking. | `server.ts` |
| `booking_status_updated` | A booking status changes to confirmed, cancelled, completed, or no-show. | `server.ts` |
| `booking_confirmed_by_seller` | A salon owner or admin confirms a pending booking via the action token link. | `server.ts` |
| `review_submitted` | A customer submits a rating and comment for a completed salon visit. | `server.ts` |
| `salon_created` | A seller successfully registers a new salon profile on the platform. | `server.ts` |
| `salon_updated` | A seller updates their existing salon profile details or hours. | `server.ts` |
| `service_added` | A seller adds a new service with pricing to their salon's menu. | `server.ts` |
| `staff_added` | A seller adds a new staff member to their salon team. | `server.ts` |
| `menu_scan_completed` | A seller successfully extracts services from a menu photo using AI. | `server.ts` |
| `service_deleted` | A seller removes a service from their salon's offering. | `server.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/483921/dashboard/1754054)
- [New User Registrations](https://us.posthog.com/project/483921/insights/EFmNXjDC)
- [Bookings Created Over Time](https://us.posthog.com/project/483921/insights/cAU8bXLo)
- [Registration to First Booking Funnel](https://us.posthog.com/project/483921/insights/pNlVNJ4z)
- [Seller Onboarding Funnel](https://us.posthog.com/project/483921/insights/VgxcgI22)
- [Reviews & Booking Completions](https://us.posthog.com/project/483921/insights/pJVhIrly)

## LLM Analytics (Gemini / Google Gen AI)

SalonBook uses `@google/genai` to extract salon services from menu photos via Gemini. The extraction pipeline (`extractServicesWithModelFallback` → `extractServicesFromMenuFile`) was updated to record per-call timing and token usage from `response.usageMetadata`. Both the seller route (`POST /api/seller/services/extract-from-menu`) and the admin route (`POST /api/admin/salons/:id/services/extract-from-menu`) now emit a `$ai_generation` event immediately after each successful extraction, linked to the authenticated user's distinct ID.

| Property | Source |
|---|---|
| `$ai_model` | Gemini model name used (e.g. `gemini-2.5-flash`), from fallback loop |
| `$ai_provider` | `google` |
| `$ai_input_tokens` | `response.usageMetadata.promptTokenCount` |
| `$ai_output_tokens` | `response.usageMetadata.candidatesTokenCount` |
| `$ai_latency` | Wall-clock seconds for the `generateContent` call |
| `$ai_span_name` | `menu_extraction` |
| `$ai_trace_id` | Fresh UUID per request — groups trace in AI Observability |

PostHog automatically calculates `$ai_total_cost_usd` from the model name and token counts. Generations appear under **AI Observability → Generations** in PostHog.

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.
- [ ] Trigger the menu-scan AI path (upload a menu photo as a seller) and confirm `$ai_generation` events appear in PostHog **AI Observability → Generations**.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
