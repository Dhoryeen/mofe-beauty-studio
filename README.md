# Mofe Beauty Studio

Mofe Beauty Studio lets clients design a makeup and hairstyling look, consult with the studio, approve the plan, book and pay for services, and follow preparation through to completion.

Single-studio product. Clients book studio appointments or request off-site services. Bridal parties and other groups coordinate through one organiser.

## User groups

Two user groups:

- **Clients**: create looks, view prices, book, pay, and receive updates. Includes individual clients, group organisers (coordinate participants, timing, shared arrangements, payment completion), and group members (own preferences, look approval, own payment).
- **Admins**:
  - Studio manager (full-access admin): services, prices, quotes, staffing, bookings, payments, refunds, performance.
  - Beautician / Consultant (limited admin): assigned appointments, availability, client messages, look summaries, preparation updates. Can propose extras/quote changes for manager review. Sees only assigned client information.

## Core journeys

1. **Standard service**: browse gallery / new look → price + extras → choose beautician or studio match → instant book + deposit/full payment → approve look summary → prep instructions/reminders → attend, settle balance, aftercare/receipt → review + save final look.
2. **Bridal / complex / off-site**: look + date/location request → required paid consultation (in-person/video) → studio review + personalised quote (incl. travel) → optional paid trial → approve + pay deposit/full → milestones/prep updates → completion + aftercare.
3. **Group booking**: organiser requests date/location/size/services → invite members → studio confirms plan/staffing/quote → organiser-pay or pay-separately → per-member approvals + deposits → readiness/payment tracking.

Consultations are required for bridal/complex looks, optional otherwise. Paid consultation fee credits once against the associated service. Off-site needs studio confirmation. Date requests/holds and quote expiry are explicit.

## Launch features

- Services + inspiration gallery (makeup, hair, combined; by service/occasion; filters; starting prices clearly labelled).
- Look creation: gallery + uploads, guided preferences, sensitivities/notes, named saved looks (edit/duplicate/archive), drafts kept distinct from approved plans.
- Consultations, look approval/quotes/trials with versioned approvals and visible expiry.
- Booking: beautician choice or studio match, dual specialists for combined bookings, instant vs. confirmation-required bookings, waitlist with alerts (no auto-charge), replacement/reschedule on staff unavailability.
- Payments: deposit (default 30%) or full, consultation credit applied first, balance due day-of, itemised receipts, unpaid/partial/paid/refund states; failed payment ≠ confirmed booking.
- Group coordination with private member notes, shared-charge allocation, missing approval/payment notices.
- Progress milestones + separate payment status, next action/owner/deadline, prep tasks/updates/photos, delay notices.
- Booking-linked messages, email + optional SMS, 48h/24h reminders, response hours.
- Cancellation/reschedule/refunds with pre-commit fee/refund preview; original appointment stays confirmed during reschedule review.
- Completion: aftercare, receipt, review (one per booking, consent-based publication), consent-based final-look save + rebook at current prices.
- Admin workspaces: beautician assigned-work view; manager dashboard (today, urgent requests, overdue prep, unanswered messages, outstanding payments, schedules, content/pricing, quotes, refunds, reports).

## Repo contents

- `Docs/Mofe-Beauty-Studio-PRD.md` — full product requirements (v1.0, 18 Sept 2026).
- `README.md` — this overview.

## Out of scope for launch

Marketplace, nails/other categories, virtual try-on, social feed, loyalty/memberships/gift cards, retail/inventory, multi-branch/payroll.
