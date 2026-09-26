# Mofe Beauty Studio — Detailed Implementation Plan

Source: `Docs/Mofe-Beauty-Studio-PRD.md` v1.0 (18 Sept 2026). Two user groups: **Clients** and **Admins** (Manager = full access, Beautician/Consultant = limited, assignment-scoped).

## 0. Decisions and principles

1. **Single-studio, single-codebase monolith first.** One deployable web app (responsive, mobile-first) + Postgres + object storage for photos + background jobs for reminders/notifications. No marketplace, multi-branch, or native apps (PRD §8).
2. **Two roles, three permission profiles:** `client`, `manager`, `beautician_consultant`. Clients see only their own data; organiser sees group readiness/payments but never member private notes; beauticians see only assigned bookings; manager sees all + settings/pricing/refunds.
3. **Money and agreement integrity:** payment state machine (`unpaid → partial → paid`, plus `refund_pending → refunded`; failed ≠ confirmed); quote/summary versioning (draft → awaiting_approval → approved; material change → re-approval, prior version retained); draft looks never mutate approved plans.
4. **Confirmation gating:** standard studio services = instant booking; bridal/complex/group/off-site = request → studio review → client accepts quote → deposit → confirmed.
5. **Build order:** design tokens → app shell/auth/settings → gallery/looks → standard booking/payments → consult/quotes/trials → off-site/groups → progress/messages/changes/completion → admin dashboards → hardening.

## Tech Stack & Environment

Chosen Tools:
* Framework: Next.js 14.2.35 + React 18 + Tailwind + TypeScript
* Database: PostgreSQL
* Authentication: Better Auth
* File Storage: Cloudflare R2
* Payments: Paystack
* Email: Resend

Environment Configuration:
* Application Status: Running locally.
* Database Status: Running locally.
* Deployment Note: Both the application server and the database are strictly configured to run in a local environment for development and testing. No cloud hosting or remote databases are active at this stage.

Implications: Postgres with ownership checks + audit log; R2 private-by-default with signed URLs (public only on explicit consent); Paystack behind a `payments` interface with webhook reconciliation (never trust client-side success); Resend for product + email notifications with scheduled 48h/24h reminder jobs; Better Auth with `client / manager / beautician_consultant` guards.

### Repo shape (proposed)

- `/app` routes: `(public)/gallery, /services`, `(client)/looks, /book, /consultations, /groups, /messages`, `(admin)/work, /admin/*`.
- `/components/design-system/*`, `/lib/auth, /lib/payments, /lib/notifications, /lib/quotes`, `/db/migrations/*`.

---

## Phase 1 — Design system and UX shell

Goal: personal, clear, reassuring experience; every stage shows what was agreed, cost, next step, owner, deadline.

Outputs:
- Tokens: colour, typography, spacing, radius, elevation; light theme first; focus-visible states; WCAG AA contrast.
- Components (documented with states: default/loading/empty/error): button, input/select/textarea/date-time, file upload, gallery card + filter bar, inspiration-board grid, service-price block (fixed vs. starting-price label), quote line-item table (service/travel/credit/deposit/balance), approval banner + version diff, milestone tracker (8 PRD milestones, skippable), message thread + photo attach, payment-status pill, admin data table + urgent-queue cards, consent checkboxes (private-save vs. public-use, public off by default).
- App shell: public header (gallery/services), client dashboard (looks/bookings/messages), admin shell (work queue vs. manager dashboard), response-hours + urgent-contact slot, promo-vs-booking notification preferences.
- UX rules: disclaimer that inspiration ≠ guaranteed result; quote/hold expiry always visible; failed payment never styled as confirmed.

Exit: Storybook/preview page renders all components with mock data; responsive at 360px and desktop.

## Phase 2 — Architecture, auth, settings, data model

Outputs:
- Auth: public browsing; account required to retain looks/book/pay/message. Session + guards for `client / manager / beautician_consultant`; beautician queries always filtered by assignment.
- Settings (manager-only, seeded from PRD §6): currency, payment methods, hours, response hours, travel areas/fees, deposit % (30%), quote validity (7d), reschedule/cancel terms (bookings blocked until published), consultation fees, complex-look definition, review/photo defaults.
- Migrations (tables + constraints): `users, services, gallery_items, looks, look_images, consultations, consultation_credits, quotes, quote_versions, approvals, trials, bookings, booking_staff, availability, waitlist, payments, refunds, groups, group_members, messages, notifications, prep_tasks, progress_updates, reviews, photo_consents, audit_log`.
- State machines + invariants: booking (`request → awaiting_approval → approved → confirmed → in_prep → ready → completed`, plus `reschedule_pending` keeps original confirmed); payment ledger; single-use consultation credit capped at service total; expired quote blocks payment.
- File privacy: uploads private; gallery publish requires consent record.

Exit: client registers; manager edits settings; beautician login sees empty assigned queue; migration + seed run clean.

## Phase 3 — Services, gallery, look builder (PRD §5.1, §5.2)

Outputs:
- Service catalogue: makeup/hair/combined, duration, fixed/starting price, extras, consultation-required flag, studio/off-site/both.
- Gallery: service × occasion (bridal/birthday/everyday/other), filters (finish, hair length, etc.), detail with price/consultation info, "use as starting point".
- Look builder: gallery + upload + guided fields (occasion, makeup, hairstyle, length/texture, finish, avoid), sensitivities/notes, board preview, save named looks, edit/duplicate/archive, select-for-booking.
- Draft isolation: approved snapshot copied to booking; later draft edits do not alter it.

Exit (maps to §7): multiple retained boards; gallery explorable by service/occasion/filters.

## Phase 4 — Standard booking and payments (PRD §5.5-standard, §5.6)

Outputs:
- Specialist select (portfolio + availability) or studio-match; dual-specialist support for combined services without double-booking; readiness-deadline + preferred-time capture; capacity check before slot shown; alternatives + free waitlist (alert ≠ book/charge).
- Checkout: full total pre-payment, deposit (credit-first) or full, balance-due display, acknowledgements + itemised receipt, ledger states; webhook reconciliation; request-based bookings only request payment after studio-accept + client-accept.
- Failure paths: failed payment stays unconfirmed with retry; staff-unavailable → replacement/reschedule requiring client agreement.

Exit: standard booking completable at fixed price with deposit/full + receipt.

## Phase 5 — Consultations, quotes/approvals, trials (PRD §5.3, §5.4)

Outputs:
- Consultation booking (in-person/video, fee/duration/prep/attendance pre-payment), outcome record (recommendations/open questions/next steps), no auto-confirm of service; credit issued once, shown as separate capped deduction.
- Quote + look summary: makeup/hair, photos, extras, prep needs; line items; approve-before-prep gate; trial (own date/fee/terms) + feedback → revised version; re-approval on material change with history; visible expiry; expired = review-before-pay.
- Manager-published complex-look guidance page.

Exit: consultation required where flagged; credit applies once; trials feed into approvals.

## Phase 6 — Off-site and group coordination (PRD §5.5-confirm, §5.7)

Outputs:
- Request flow: date/location/staff preference, explicit hold-with-expiry copy, studio accept/decline, client quote accept, deposit collection, confirmation.
- Groups: organiser request (date/location/size/services/readiness deadline), invites, per-member boards/approvals, organiser-pay vs. split-pay with shared-charge allocation preview, readiness/payment tracker, missing-item notices with deadline + effect, size-change → staffing/timing/charge review + re-approval.
- Privacy enforcement: organiser/members cannot see others' private notes; staff see only assigned.

Exit: bridal/complex/group/off-site confirm only after review + deposits; organiser tracks readiness without private-note access.

## Phase 7 — Progress, messaging, changes, completion (PRD §5.8–§5.11)

Outputs:
- Booking detail: milestone tracker (request → consult → awaiting approval → approved → confirmed → in prep → ready → completed, skippable), separate payment status, next-action/owner/deadline, beautician updates/photos, client tasks, delay notice + revised plan.
- Messaging: per-booking thread (text + photos), decisions pinned, price/look talk must link to formal re-quote; notifications via product + email (+ optional SMS), 48h/24h reminders, urgent-contact display.
- Changes: self-serve standard change (default one free reschedule 48h+, subject to availability) with pre-commit fee/refund preview; complex/group/off-site routed to manager; original slot held during review; exceptions with explanation; refund amount/status/timing; studio-cancel → reschedule-or-refund; separate consult/trial terms.
- Completion: mark complete (residual balance kept separate), itemised receipt, aftercare, one review per booking (consent-gated publication), dual photo consents, private concern channel, rebook/copy at current prices.

Exit: progress/payment/actions/messages accurate; change outcomes visible pre-commit; failure paths have next steps; aftercare/receipt/review/consent work.

## Phase 8 — Admin workspaces, reports, launch hardening (PRD §5.12, §5.13, §6, §7)

Outputs:
- Beautician workspace: assigned appointments/consultations, inspiration + approved summaries, prep tasks, availability editor (blocks silent cancellation of booked slots), messages/summary updates/aftercare/progress posts, approval/prep-deadline highlights, propose-extras → manager review.
- Manager dashboard: today/urgent/overdue-prep/unanswered-messages/outstanding-payments queues; staff schedules (incl. dual-specialist); content/pricing/extras/fees/deposits/off-site controls; request inbox (quote/allocate/groups); refund/exception/price approvals; reports (collected vs. service-value, balances, completions, popular services, repeats).
- Hardening: publish all fees/terms/policies; run §7 acceptance checklist end-to-end (standard, bridal/complex/off-site, group, trial, dual-specialist, waitlist, staff-unavailable, overdue deposits, prep delays); seed demo data; backup/restore + log review.

Exit: launch-ready per §7; manager sees today's work + urgents; beauticians manage assigned work only.

## Traceability (each phase demos its §7 items)

- Ph3 → boards + gallery filters. Ph4 → fixed-price booking + dual specialists + waitlist. Ph5 → consultation clarity + single credit + trials + approvals. Ph6 → studio review gate + group payments/privacy. Ph7 → progress/payment/messages + pre-commit change preview + failure next-steps + aftercare/receipt/review/consent. Ph8 → daily-ops visibility for both admin types.
