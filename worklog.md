# KumBola — Build Worklog

Shared worklog. Every agent MUST read this file before working and append a section
after finishing (Task ID, Agent, Work Log, Stage Summary).

---

Task ID: 1
Agent: Z.ai Code (orchestrator)
Task: Project foundation — env, Supabase provisioning, schema, seed

Work Log:
- Explored Next.js 16 + Tailwind 4 + shadcn/ui scaffold; dev server on :3000.
- Wrote full `.env` with Supabase URL, publishable/anon keys, service-role key, secret key, JWKS, and both pooler DB URLs.
- Installed `@supabase/supabase-js@2.118.0`, `pg`, `@types/pg`.
- Verified Supabase health (GoTrue v2.197.0) and PostgREST reachability.
- Created `supabase/schema.sql` (plans, disposal_sites, profiles, bookings, disposal_verifications, transactions, notifications, dumping_reports) + RLS + indexes + explicit GRANTS (needed because tables are created via the Supavisor pooler role).
- Ran migration via `supabase/migrate.ts` (pg over session pooler `:5432`).
- Fixed PostgREST multi-row-insert NULL pitfall in `supabase/seed.ts`; seeded successfully.

Stage Summary:
- Supabase project live with 8 tables + RLS + grants; demo data seeded: 19 profiles, 58 bookings, 42 verifications, 141 transactions, 6 plans, 5 disposal sites, 6 dumping reports.
- Demo logins (password `kumbola123`): customer@kumbola.com, business@kumbola.com, driver@kumbola.com, admin@kumbola.com.
- Auth verified end-to-end via password grant (access_token OK).
- Next: core libs (`src/lib/*`), page orchestrator, then parallel subagent tasks.
- API contract for subagents lives in this file under Task 2/3 notes (see `src/lib/types.ts` + `src/lib/api-client.ts` once written).

---
Task ID: 3-b
Agent: general-purpose (Kumi widget)
Task: Kumi AI chat widget

Work Log:
- Read worklog + inspected brand/logo.tsx, lib/store.ts, ui primitives (Button/Input/ScrollArea), globals.css tokens, layout Toaster mount, page.tsx usage (`<KumiChat authed={!!session} />`).
- Replaced placeholder `src/components/ai/kumi-chat.tsx` with full production widget (single file, ~500 lines, no `any`, TS strict clean).
- Floating trigger: fixed bottom-4/right-4 (sm: bottom-6/right-6), 56px circular bg-primary button with Sparkles icon (X when open), shadow-lg, hover scale, z-50, aria-label "Chat with Kumi", desktop-only "Kumi" label pill beside it.
- Panel: plain fixed div (no Dialog), role="dialog", mobile inset-x-3 bottom-3 sheet / desktop 380px × 560px (max-h 70vh) above the trigger, rounded-2xl shadow-2xl border bg-card, animate-in entrance. Header: LogoMark + "Kumi — your KumBola guide" + pulsing online dot + Trash2 clear + X close.
- Greeting is a persisted assistant message (authed-personalized), seeded on first load / when store is greeting-only; mentions pickups, plans & pricing, driver earnings, proof of disposal.
- Suggestion chips (5, spec-exact) in horizontally scrollable row, visible only while history is greeting-only and not busy; click sends immediately.
- Messages: auto-scroll with stick-to-bottom heuristic (only autoscroll when near bottom), user bubbles right bg-primary rounded-br-md, assistant left bg-muted with LogoMark avatar, react-markdown with manually styled p/ul/ol/strong/a/code/pre (no syntax highlighting), no timestamps.
- Typing indicator: three staggered bouncing dots in assistant bubble while awaiting reply.
- Input: rounded-full Input + circular SendHorizontal button, Enter sends (Shift+Enter/native-composition guarded), disabled while busy, footer disclaimer "Kumi is an AI guide — for urgent issues call +233 55 000 0000".
- Persistence: localStorage `kumi-chat-history`, JSON {role, content} array capped at 40, system error bubbles never stored; Trash2 clears (aborts in-flight request, reseeds greeting, sonner toast "Conversation cleared").
- API: POST /api/ai/chat with last 12 user/assistant messages + `context.view` from `useSession.getState().view`; 200 → {reply} appended; non-OK → {error} shown verbatim in a destructive system bubble with a Retry chip (retry re-sends last user message without duplicating it); fetch/network failure → "Kumi couldn't reach the server — try again."; error mentioning sign-in additionally shows a gold "Sign in to continue" hint chip; AbortController wired for clear/unmount races.
- Accessibility: aria-expanded trigger, Escape closes and refocuses trigger, input autofocused on open, aria-live message list, focus-visible rings.
- Verified: `bun run lint` → 0 errors/warnings in my file (only a pre-existing warning in landing/hero.tsx from another agent); `bunx tsc --noEmit` → no errors in components/ai (remaining errors are other agents' files).

Stage Summary:
- Files: `src/components/ai/kumi-chat.tsx` (only file touched; API route NOT created per instructions).
- Decisions: plain overflow-y-auto list instead of radix ScrollArea for reliable scrollTop autoscroll; transient 'system' role for error/retry UI so stored history stays a clean user/assistant transcript; request split into send() + requestReply() so Retry never duplicates the user bubble; greeting refreshed when stored history is greeting-only so auth-state change updates the welcome.
- Contract honored: request `{ messages[≤12], context.view }`, response `{ reply }` / `{ error }`; `/api/ai/chat` route still owned by the other agent — widget surfaces its `{error}` strings verbatim.
- Issues: none blocking. Next agent wiring page.tsx needs nothing extra — existing `<KumiChat authed={!!session} />` works; optional future hook: listen for `kumbola:open-auth` event if sign-in deep-linking is desired.

---
Task ID: 3-a
Agent: frontend-styling-expert
Task: KumBola landing/marketing page

Work Log:
- Read worklog, constants (PLAN_CARDS, FAQS, PROBLEM_STATS, HOW_IT_WORKS, PARTNERS, USSD_CODE), brand logo component, globals.css tokens and page.tsx contract before writing anything.
- Replaced placeholder `src/components/landing/index.tsx`; kept exact named-export contract `LandingPage({ onSignIn, onGetStarted })` and wired every CTA: customer CTAs → onGetStarted('customer'), driver CTAs → onGetStarted('driver'), nav Sign in → onSignIn().
- Built modular landing kit inside `src/components/landing/` only:
  - motion.tsx — `Reveal` whileInView fade/slide helper (framer-motion), respects prefers-reduced-motion; supports div/li.
  - nav.tsx — sticky cream/90 backdrop-blur nav (h-16), anchor links (#how #plans #drivers #city #faq), Sign in ghost + Book a pickup primary, mobile hamburger → shadcn Sheet with same links + CTAs; 44px touch targets.
  - hero.tsx — dark forest bg-dots hero with gold eyebrow badge (Suame · Kwabre East · Oforikrom), h1 "Kum Bola: kill trash.", gold + outline-cream CTAs, 3 trust chips, 4/3 image card (gradient placeholder + Truck icon fallback; /images/hero-tricycle.png has onError hide — image NOT in public/ yet), floating "2,000 t" stat card + "Verified disposal" mini-card with gentle reduced-motion-aware float; plus PartnerBar (KoomBei, WasteCure, KMA, Tricycle Riders Assn., KNUST).
  - sections.tsx — Problem (4 stat cards from PROBLEM_STATS with sources), How it works (5 numbered cards, icon map smartphone/radar/trash-2/shield-check/wallet, paid-only-after-verification footnote), Plans (6 cards from PLAN_CARDS, gold Badge, ring-2 ring-primary on "Most popular", Check features, "Choose this plan" → customer).
  - drivers.tsx — dark For-drivers section (6 benefit rows w/ icons + GHS 2,296–3,296 / 5.8× / 127 earnings card, CTA → driver), City section (copy + 4 impact chips + pure-CSS mock dashboard: live badge, stat tiles, 7-week bar chart, 40-cell deterministic heatmap, proof points), gold ImpactStrip (20,000 / 72,000 / 600 / 127 / GHS 11.6m).
  - faq.tsx — shadcn Accordion over FAQS (6 Q&As) + dark FinalCta ("Ready to kill trash?", USSD *920*88# line).
  - footer.tsx — forest footer: LogoMark + "KumBola — kill trash" + partnership tagline, Product/Company (mailto hello@kumbola.com, tel WhatsApp)/Legal columns, © 2026 row + 🇬🇭.
- Stuck to design tokens only (primary/gold/forest/cream/secondary; no blue/indigo/purple), font-display headings, Manrope body, py-16 md:py-24 rhythm, max-w-6xl px-4 sm:px-6 container, rounded-2xl cards, tabular-nums on figures, scroll-mt-20 on anchor sections, one h1, semantic header/main/section/footer + aria labels.
- `bun run lint` → 0 problems (removed one unused eslint-disable). `bunx tsc --noEmit` → 0 errors in src/components/landing/ (remaining tsc errors are other agents' missing files: customer/driver/admin-app, supabase/seed.ts, examples/, skills/).

Stage Summary:
- Files: src/components/landing/{index,nav,hero,sections,drivers,faq,footer,motion}.tsx (8 files, nothing outside landing/ touched).
- ⚠️ SEVERE for orchestrator: dev server returns 500 on / — pre-existing bug in src/app/layout.tsx (not mine): Fraunces is configured with BOTH `weight: [...]` and `axes: ["opsz","SOFT","WONK"]`; Next 16 requires dropping `weight` (or `axes`) for variable fonts. One-line fix in layout.tsx; blocked me from runtime-verifying the rendered page (tsc+eslint are clean).
- /images/hero-tricycle.png does not exist yet; hero degrades gracefully to gradient + Truck icon while keeping floating cards. Drop the PNG into public/images/ later, no code change needed.
- Next: whoever owns layout.tsx fixes the font axes conflict; then visual QA at 320/360/768/1440.

---
Task ID: 2 (orchestrator, post-subagent integration)
Agent: Z.ai Code (orchestrator)
Task: API layer, three app surfaces, Kumi backend, QA + browser E2E verification

Work Log:
- Built server libs: types, constants (plans/pricing/impact), supabase-server (service client + token verify + geofence sim), api-client (Bearer + auto-refresh), zustand session store, format helpers.
- Built 10 API routes: auth (stateless password grants), me, bookings (GET/POST), bookings/actions (accept/collect/verify/cancel), wallet (topup/subscribe), driver (dashboard/online-toggle), admin (KPIs+charts data), data (public plans/sites), notifications, ai/chat (Kumi, LLM skill, rate-limited).
- Key bug found & fixed: supabase-js `signInWithPassword` on the shared service client mutated its in-memory session → later PostgREST calls ran as `authenticated` (RLS ⇒ 0 rows). Fixed by calling `/auth/v1/token` grants statelessly.
- Built UI: app header w/ notifications, status badges + timeline, customer app (book dialog w/ plan credits, wallet, plans, receipts), driver app (online hero, available jobs, code entry, verify-disposal w/ weight + recyclables, earnings, benefits), admin city dashboard (KPIs, SVG daily chart, municipality bars, donuts, operator register, dumping reports), auth dialog w/ demo account quick-login.
- Integrated subagent landing (Task 3-a) + Kumi widget (Task 3-b); fixed Fraunces font axes/weight conflict in layout.
- Generated brand images via image-generation skill: hero-tricycle.png + disposal site photos (5 sites).
- Fixed: React hooks lint (set-state-in-effect, donut render mutation), Skeleton-in-<p> hydration error, TS errors (Transaction.amount_ghs, Map typing, refresh null-guard).
- Browser E2E verified end-to-end: landing → demo sign-in (4 roles) → customer books pickup (code issued, plan credit used) → driver accepts job → pickup-code collect → geofenced disposal verify (ticket TKT-…) → earnings update (+GHS 13.95) → city dashboard KPIs/charts → Kumi AI answers with exact driver economics → mobile 390px responsive + sticky footer. Signup flow verified via API (GHS 20 welcome credit). Test user cleaned up.

Stage Summary:
- App is production-shaped and verified: lint clean, tsc clean (src), dev.log healthy (all 200s), demo data live in Supabase.
- Deploy artifacts: netlify.toml (plugin + env var list + security headers), README with architecture + deploy steps.
- Remaining for later phases: USSD/WhatsApp channels, real Paystack/Hubtel MoMo wiring, native app shells.

---
Task ID: 4
Agent: Z.ai Code (orchestrator)
Task: User corrections round 1 — KMA as partner only, real pages instead of anchor glide, new hero image

Work Log:
- Correction 3 first: downloaded user's Cloudinary image (2752×1536 JPEG of an Aboboyaa on a Kumasi street) to public/images/hero-tricycle.jpg; switched hero <img> src + descriptive alt; deleted the old generated hero-tricycle.png.
- Correction 1 (KMA = partner, never sole owner): PARTNERS now lists KoomBei, WasteCure, partner assemblies, KMA (Partner assembly · MoU), Riders Assn., KNUST; PartnerBar heading now "An independent platform built by KoomBei Digital × WasteCure — working with our partners"; CitySection gained "…as MoU partners — built to serve any municipality" line; DEMO_ACCOUNTS + seed.ts + live DB profile renamed KMA Sanitation Desk → City Sanitation Desk (pg UPDATE verified); new FAQ "Is KumBola a government or KMA project?"; Kumi SYSTEM_PROMPT now declares independence + KMA-as-partner rule (browser-verified answer); README demo row updated.
- Correction 2 (real pages): new MarketingShell (src/components/marketing/marketing-shell.tsx) — nav+footer+AuthDialog+KumiChat+SessionKeeper, CTA context hook useMarketingCta(); sections (nav/hero/sections/drivers/faq) refactored from prop-drills+anchors to hook + next/link; store.roleView exported; new SessionKeeper shared refresh component.
- Created 6 routes: /how-it-works (steps + new DifferentiatorsSection "Why KumBola" + CTA), /plans, /drivers, /city, /faq, /legal (new LegalContent: Act 843 privacy, terms, grievance). Home now lean: Hero/Partners/Problem/Impact/FinalCta.
- page.tsx: app-view branch (customer/driver/admin) vs MarketingShell+LandingHome; session-aware nav label ("Sign in" ↔ "Open app").
- Bug found & fixed: full page load of a sub-page while signed in bounced to / — zustand persist rehydration null→session was misread as fresh sign-in; fixed by snapshotting localStorage at first render (hadPersistedSession) + hydrating guard in MarketingShell.
- layout.tsx: added data-scroll-behavior="smooth" to <html> so route changes open instantly (Next.js bypasses smooth scroll on navigation).
- E2E verified (agent-browser): all 6 routes open directly with correct titles + active nav state; cross-links work; mobile 390px home/menu-sheet/plans OK; demo sign-in from /plans and /faq bounces to app; exit-to-website works; FAQ accordion shows KMA answer; Kumi AI answers KMA-partner question correctly; PartnerBar shows 6-partner coalition. eslint 0 problems, tsc src/ clean (also fixed pre-existing noStoreFetch fetch-type error), dev.log all 200s.

Stage Summary:
- Marketing site is now multi-page (/, /how-it-works, /plans, /drivers, /city, /faq, /legal) — no anchor glide anywhere; every CTA is hook-driven via MarketingShell context.
- KumBola is consistently framed as an independent KoomBei × WasteCure platform with KMA as one of several MoU partners across UI copy, FAQ, AI prompt, demo data and DB.
- Hero uses the user-supplied Cloudinary image (public/images/hero-tricycle.jpg).
- Known minor tradeoff: if a user signs out while on a sub-page and signs in again on that same sub-page, they stay there (nav shows "Open app") instead of bouncing to /.

---
Task ID: 5
Agent: Z.ai Code (orchestrator)
Task: Recover app after sandbox reset + connect GitHub repo (Frank0751/kumbola)

Work Log:
- Discovered KumBola source files were wiped from /home/z/my-project (sandbox reset); only scaffold remained, dev server had been serving stale in-memory pages.
- Found complete project backup at /tmp/my-project (100 src files, full .env, public/images incl. user's Cloudinary hero + verify site photos).
- rsync-restored src/, public/, .env, package.json, supabase/, prisma/, netlify.toml, worklog, README into /home/z/my-project (excluded node_modules/.next/.git/.zscripts/db/upload).
- bun install (added @supabase/supabase-js, pg, @types/pg); restarted dev server via setsid + .zscripts/dev.sh (plain nohup/setsid spawns get reaped between tool calls).
- Verified: all 7 routes 200, hero image 200 (3.2MB), auth API issues Supabase sessions, /api/ai/chat answers with KMA-as-partner framing, /api/data serves plans.
- Git hardening: untracked .env (was committed in scaffold!), db/custom.db, .zscripts/*; added /db/, /.zscripts/, /.initial_snapshot.json, /download/, /upload/ to .gitignore + !.env.example; created .env.example template with placeholders.
- Set repo-local git identity Frank0751 <Frank0751@users.noreply.github.com>; committed 142 files (68d58b7) "KumBola: full production app…"; added remote origin https://github.com/Frank0751/kumbola.git.
- Push blocked: needs GitHub Personal Access Token (no gh CLI / SSH / stored credentials in sandbox).

Stage Summary:
- App fully restored & verified; commit 68d58b7 ready on main; origin configured.
- BLOCKED on: user PAT (repo scope) to run `git push -u origin main`. Once pushed, Netlify import can proceed.
