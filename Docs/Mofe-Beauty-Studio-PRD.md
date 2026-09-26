# Mofe Beauty Studio
## Product Requirements Document

**Version:** 1.0  
**Status:** Proposed launch scope  
**Date:** 18 September 2026

## 1. Product overview

Mofe Beauty Studio allows clients to design a makeup and hairstyling look, consult with the studio’s beauticians, approve the plan, book and pay for services, and follow preparation through to completion.

The product serves one beauty studio and its clients. Clients may book studio appointments or request services at their own location. Bridal parties and other groups can coordinate their services through one organiser.

The experience should feel personal, clear, and reassuring. At each stage, clients should understand what has been agreed, what it costs, what happens next, and whether they need to take action.

## 2. Goals and measures of success

| Goal | Measure |
| --- | --- |
| Help clients turn ideas into bookable looks | Proportion of saved looks that lead to consultation or appointment bookings |
| Convert consultations into appointments | Proportion of completed consultations followed by a service booking |
| Make bookings easy to complete | Booking completion rate and number of clients needing booking assistance |
| Reduce uncertainty before appointments | Client satisfaction with preparation and communication; number of clarification requests |
| Improve attendance and preparation | No-show rate, late cancellations, and appointments with overdue preparation tasks |
| Encourage repeat visits | Repeat booking rate and reuse of saved final looks |
| Give management control of daily work | Outstanding payments, unanswered requests, and overdue approvals |

Management should establish a baseline after launch before setting numerical performance targets.

## 3. People using the product

The product has two user groups: Clients and Admins.

| User group | Main needs |
| --- | --- |
| Clients | Create a look, understand the price, book services, pay, and receive updates; group organisers also coordinate participants, appointments, shared arrangements, and payment completion, while group members provide personal preferences, approve their own look, and pay when required |
| Admins | Manage availability, appointments, client messages, look summaries, preparation updates, services, prices, quotes, staffing, bookings, payments, refunds, and performance |

Admins have two types with different permissions:
- Studio manager (full-access admin): controls services, prices, personalised quotes, staffing, bookings, payments, refunds, and performance.
- Beautician / Consultant (limited admin): manages assigned appointments, availability, client messages, look summaries, and progress updates; can propose chargeable extras or quote changes for studio manager review, and can access only client information needed for assigned work.

## 4. Core client journeys

### A. Standard service

1. Browse the gallery or start a new look.
2. Choose makeup, hairstyling, or both; add preferences and inspiration.
3. View the service price and optional extras.
4. Choose a beautician or request a studio match.
5. Choose an available studio appointment and pay a deposit or the full amount.
6. Review and approve the look summary before preparation begins.
7. Receive preparation instructions, reminders, and relevant updates.
8. Attend the appointment, settle any balance, and receive aftercare and a receipt.
9. Review the service and save the final look for another visit.

A consultation is optional for standard services. Clients who choose one follow the consultation journey before confirming their service plan.

### B. Bridal, complex, or off-site service

1. Create a look and request a service date, location, and preferred beautician or studio match.
2. For bridal and complex looks, book and pay for a required consultation, in person or by video.
3. The studio checks staffing, preparation needs, and travel where relevant.
4. The client receives a look summary and personalised quote, including any travel fees.
5. The client may book a paid trial appointment.
6. Approve the look summary and quote; pay a deposit or the full amount to confirm the service appointment.
7. Follow milestones, preparation updates, and optional progress photos.
8. Complete the appointment and receive aftercare and final records.

An off-site booking requires studio confirmation but does not automatically require a consultation unless the look is bridal or complex. A date request alone does not secure an appointment; the studio must clearly state any temporary hold and its expiry.

### C. Group booking

1. The organiser requests a date, location, group size, services, and any event readiness deadline.
2. Invite participants to provide their own looks and preferences.
3. The studio confirms the plan, staffing, timing, and quote.
4. The organiser chooses to pay for everyone or have members pay separately.
5. Participants approve their personal look summaries; the organiser approves shared arrangements.
6. Required deposits are collected before the group booking is confirmed.
7. The organiser tracks group readiness and payment completion; members receive their own appointment details.

## 5. Launch feature requirements

### 5.1 Studio services and inspiration gallery

- Offer makeup, hairstyling, and combined services.
- Organise the gallery by both service and occasion, including bridal, birthdays, everyday looks, and other events.
- Provide filters for relevant preferences, such as makeup finish and hair length.
- Let clients use a gallery look as the starting point for their own inspiration board.
- Show service descriptions, expected duration, fixed prices or indicative starting prices, available extras, and consultation requirements.
- Label starting prices clearly; a personalised quote must establish the actual payable amount.
- Management selects which services are available at the studio, off-site, or both.

### 5.2 Create and save a look

- Let clients start from gallery images, upload their own inspiration photos, or combine both.
- Guide clients through occasion, makeup preferences, hairstyle, hair length or texture, desired finish, and details to avoid.
- Include optional notes for sensitivities, product preferences, and other relevant needs. Clients may discuss sensitive details privately during consultation.
- Present the result as an inspiration board with images and written preferences.
- Allow multiple named saved looks that clients can edit, duplicate, archive, or select for a booking.
- Keep unbooked drafts distinct from an approved booking plan. Editing a draft must not silently change an agreed service.
- Make clear that inspiration photos guide the discussion and do not guarantee an identical result.

### 5.3 Consultations

- Require consultations for bridal and complex custom looks; make them optional for simpler services.
- Let clients choose in-person or video consultation, subject to studio availability.
- Display the fee, duration, preparation guidance, and attendance details before payment.
- Credit the paid consultation fee against the associated beauty appointment if the client books.
- Show the credit as a separate deduction and prevent duplicate use. The credit cannot exceed the associated service total.
- Let the beautician record recommendations, unresolved questions, and agreed next steps.
- A consultation booking does not automatically confirm a beauty appointment.
- Management defines what counts as a complex look and publishes that guidance to clients.

### 5.4 Look approval, quotes, and trials

- Provide a look summary covering makeup, hairstyle, reference photos, agreed extras, and preparation requirements.
- Show the quote alongside the summary, with service charges, travel, consultation credit, deposit, and remaining balance clearly separated.
- Require client approval of the look summary and price before preparation begins.
- Offer an optional paid trial appointment with its own date, fee, and booking conditions.
- Record trial feedback and update the look summary for approval where needed.
- Require renewed approval when an agreed look, price, or material service detail changes.
- Retain the prior agreement so both sides can understand the change.
- Quote expiry and any date-hold expiry must be visible. An expired quote requires studio review before payment.

### 5.5 Booking and beautician selection

- Let clients choose a beautician by portfolio and availability or ask the studio to match them.
- Support separate makeup and hair specialists within a combined booking.
- Offer instant booking for standard studio services.
- Require studio confirmation for bridal, complex, group, and off-site bookings.
- For event bookings, collect the time the client or group must be ready, as well as the preferred service time.
- Confirm that the full service can be accommodated before presenting an appointment as bookable.
- Show alternatives when the requested time is unavailable.
- Allow clients to join a free waitlist with their preferred date, time range, and service.
- Alert clients when a suitable opening is available. A waitlist alert does not automatically book or charge them.
- If a confirmed beautician becomes unavailable, offer a replacement or rescheduling and obtain the client’s agreement.

### 5.6 Payments and booking confirmation

- Let clients pay a deposit or the full amount at booking.
- Apply consultation credit before calculating the remaining amount due.
- Collect any outstanding balance on the appointment day and show when it is due.
- Display the full agreed total and all applicable fees before payment.
- Support the payment methods selected by studio management for its operating market.
- Issue payment acknowledgements and a final itemised receipt.
- Clearly distinguish unpaid, partially paid, paid, refund pending, and refunded amounts.
- A failed or incomplete payment must not be presented as a confirmed booking.
- For request-based bookings, request service payment after the studio accepts the arrangements and the client accepts the quote.
- Avoid charging for additional services without the client’s approval.

### 5.7 Group coordination

- Let an organiser invite members and track each person’s service selection, appointment timing, approval status, and payment completion.
- Support one organiser paying for the group or each member paying their allocated amount.
- Show shared charges and their allocation before anyone pays.
- Each member has their own inspiration board and look approval.
- Keep personal notes, sensitivities, and private conversations visible only to the relevant client and authorised studio staff.
- Notify the organiser about missing approvals or payments and explain the deadline and effect on confirmation.
- If group size changes, the studio reviews staffing, timing, and charges and sends revised arrangements for approval.

### 5.8 Progress tracking

Show meaningful milestones appropriate to each booking, including:

1. Request received, where applicable.
2. Consultation booked and completed, where applicable.
3. Look and quote awaiting approval.
4. Look approved.
5. Appointment confirmed.
6. Preparation in progress.
7. Ready for appointment.
8. Service completed.

- Display payment status separately so clients can understand both appointment progress and money owed.
- Show the next action, who needs to take it, and any deadline.
- Let beauticians post preparation updates, trial outcomes, and relevant progress photos.
- Support preparation tasks such as extensions or accessories being prepared and instructions the client needs to complete.
- Skip stages that do not apply; do not require photos for every booking.
- Notify the client promptly if preparation is delayed and explain the revised plan.

### 5.9 Messages and notifications

- Provide private messages linked to each booking, supporting text and inspiration or progress photos.
- Keep relevant decisions accessible alongside the booking.
- Require price or look changes discussed in messages to be reflected in the formal summary or quote for approval.
- Send booking confirmations, payment updates, approval requests, preparation instructions, and changes through the product and email.
- Offer optional SMS for time-sensitive reminders.
- Recommended appointment reminders: 48 hours and 24 hours before attendance, with immediate notification of important changes.
- Show studio response hours and a contact option for urgent appointment-day issues.
- Separate promotional communication preferences from booking updates.

### 5.10 Cancellations, rescheduling, and refunds

- Allow clients to manage standard booking changes themselves within the published policy.
- Route bridal, complex, group, and off-site changes to management for approval.
- Display applicable deadlines, fees, refunds, and credits before the client confirms a change.
- Keep the original appointment confirmed while a rescheduling request is awaiting a decision, unless the client explicitly cancels it.
- Let management approve exceptions and explain the outcome to the client.
- Show refund amount, status, and expected timing when a refund is approved.
- If the studio cancels, offer rescheduling or a refund for the cancelled, undelivered services.
- Publish consultation and trial cancellation terms separately where they differ from beauty appointments.

### 5.11 Completion, aftercare, and repeat booking

- Mark services complete after the appointment and record any remaining payment obligation separately.
- Provide an itemised receipt, personalised aftercare, and a review request.
- Save a final look with the client’s consent, including approved photos and useful notes.
- Let clients rebook a previous look or copy it to create a variation. Rebooking uses current prices and availability.
- Provide a private way to raise a concern after the service.
- Keep permission to privately save client photos separate from permission to publish them in the gallery or marketing.

### 5.12 Beautician workspace

- Show assigned appointments, consultation details, client inspiration, approved summaries, and preparation tasks.
- Allow beauticians to manage availability without silently cancelling existing appointments.
- Support booking messages, look-summary updates, aftercare notes, and progress posts.
- Highlight outstanding approvals and preparation deadlines.
- Let beauticians propose chargeable extras or quote changes for management review.
- Limit access to client information needed for their assigned work.

### 5.13 Studio management dashboard

- Prioritise today’s appointments, urgent requests, overdue preparation, unanswered messages, and outstanding payments.
- Show staff schedules and assignments, including coordinated makeup and hair services.
- Manage services, gallery content, prices, extras, consultation fees, deposits, and off-site availability.
- Review requested bookings, create personalised quotes, allocate staff, and manage group arrangements.
- Approve refunds, booking exceptions, and price changes.
- Show collected payments, refunds, outstanding balances, completed appointments, popular services, and repeat bookings.
- Distinguish money collected from the value of services completed.

## 6. Recommended defaults for remaining decisions

These are proposed product defaults, added to complete the agreed feature set.

| Area | Recommended default |
| --- | --- |
| Browsing | Allow gallery and service browsing before sign-in; require a client account to retain looks, book, pay, and message |
| Deposit | Begin with a configurable 30% service deposit; apply consultation credit toward the deposit requirement first |
| Standard booking changes | Allow one free reschedule with at least 48 hours’ notice, subject to availability |
| Cancellation terms | Require management to publish exact refund and late-cancellation terms before accepting bookings; show them before payment |
| Consultation credit | Apply to the associated service booking; no additional expiry at launch |
| Trials | Charge separately; do not automatically deduct the trial fee from the final service |
| Quote validity | Seven days by default, with any appointment hold stated separately |
| Group confirmation | Confirm once all required deposits are paid; let the organiser cover missing member payments |
| Off-site eligibility | Management sets service areas, travel fees, and minimum booking conditions |
| Reviews | One review per completed booking; publication is optional and requires the client’s consent |
| Photo permissions | Ask separately for private storage and public use; leave public use unselected by default |
| Communication | Display the studio’s published response hours; do not promise continuous availability |

Management should confirm the operating currency, payment methods, opening hours, travel area, fee amounts, and final booking policies before launch. These are business settings rather than additional product features.

## 7. Launch acceptance criteria

The launch is ready when:

- A client can create and retain multiple inspiration boards using gallery photos, uploads, guided preferences, and notes.
- The gallery can be explored by service, occasion, and relevant style filters.
- Consultation requirements are clear, and paid consultation credit is applied once to the associated appointment.
- A standard booking can be completed at a visible fixed price with a deposit or full payment.
- Bridal, complex, group, and off-site requests receive studio review before service confirmation.
- Clients can review and approve their look, quote, and subsequent material changes.
- A paid trial can be booked and its feedback incorporated into the approved plan.
- Combined services can include two specialists without conflicting appointment arrangements.
- Group organisers can choose a payment arrangement and track readiness without seeing members’ private notes.
- Clients and staff see accurate progress, payment status, upcoming actions, and relevant booking messages.
- Cancellation and rescheduling outcomes are visible before a client commits to a change.
- Failed payments, unavailable staff, overdue group deposits, and preparation delays have clear next steps.
- Aftercare, receipts, review requests, and consent-based final-look saving work after completion.
- Management can identify today’s work and urgent issues, and beauticians can manage their assigned client work.

## 8. Outside the initial release

- A marketplace for independent beauticians or other studios.
- Nails and other beauty service categories beyond makeup and hairstyling.
- Generated beauty previews or virtual try-on.
- Public sharing of draft inspiration boards or a social feed.
- Loyalty points, memberships, referral schemes, and gift cards.
- Retail shopping, product delivery, and inventory management.
- Multiple studio branches and staff payroll.

These can be considered after the core look-to-booking experience is established and client feedback shows a clear need.

## 9. Technical decision record — PostgreSQL over MongoDB

**Decision:** Use PostgreSQL as the primary database (running locally for development/testing).

**Why:**
- The domain is relational: clients, looks, consultations, quotes/versions/approvals, bookings, staff assignments, groups/members, payments/refunds, messages. These need joins, foreign keys, and uniqueness constraints (e.g. single-use consultation credit, one review per booking) that Postgres enforces at the database level.
- Money integrity needs ACID transactions: deposit/partial/paid states, capped consultation credit applied once, shared group charges, and refunds must never double-apply or half-commit. Postgres transactions cover this; MongoDB would push that integrity into application code.
- Agreement integrity needs versioning and audit: prior quotes/summaries retained across re-approvals, with an audit log of price/look changes. Relational tables plus migrations fit this better than flexible documents.
- Access control is join-based: beauticians see only assigned bookings, organisers track group readiness without seeing member private notes, managers see all. Postgres handles these scoped queries and reporting aggregations (collected vs. service value, balances, popular services, repeat bookings) in SQL.
- Scale profile favours Postgres: one studio, structured catalogue and bookings, not variable-shape documents at massive horizontal scale where MongoDB shines.

MongoDB was rejected because its strengths (schema flexibility, horizontal document scale) do not match this project's needs, and it would leave financial and approval invariants to application code instead of the database.

## Design Refinement Notes

Requested Improvements:
* Specific Change: Requested a button styling refinement to add rounded corners and a subtle drop shadow, alongside increasing text contrast for better accessibility.
* Verification: Confirmed that the updated `design.html` file accurately reflects these visual contrast and button modifications.

## Current Progress & Roadmap

Current Status:
* Phase Reached: Phase 1 - Functional Local Prototype Complete. The initial single working page runs successfully on a local server using mock data.

Next Steps in Roadmap:
1. Integrate a local database (PostgreSQL) to replace mock data streams.
2. Build out user authentication routes (Sign-in/Sign-up flows).
