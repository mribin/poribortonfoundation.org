# Poriborton Foundation — Project Context

This file gives Claude Code the context it needs to work on this repo without
re-explaining the project from scratch each session. Keep it updated as phases
complete — treat it like a running project log, not a one-time README.

## What this is

A charity website for **Poriborton Foundation** ("poriborton" = "change" in
Bengali), a Bangladesh-based registered charity. Domain: poribortonfoundation.org

> **Naming note (2026-09-07):** earlier drafts of this repo used "Paribartan
> Foundation" — a different transliteration of the same Bengali word. The
> live site and NGO registration consistently use "Poriborton," so that's now
> the canonical name everywhere in this repo.

**Real org content, sourced from the live site (poribortonfoundation.org) on
2026-09-07** — treat this as source of truth over any earlier placeholder copy:
- **NGO Registration No.** S-14289/2025
- **Mission:** sustainable social change in Bangladesh through poverty
  alleviation, education, healthcare, and community empowerment.
- **Programs (7):** Education, Healthcare, Mosque Building, Zakat
  Distribution, Qurabani, Skill Development, Disaster Relief.
- **Impact stats:** 50,000+ beneficiaries, 200+ villages, 45 active projects,
  500+ volunteers.
- **Contact:** info@poribortonfoundation.org · +880 1325-066398 / -066399 ·
  House #123, Road #45, Dhanmondi, Dhaka 1209, Bangladesh · Sat–Thu 9am–5pm.
- **Bank accounts (3):** Islami Bank Bangladesh PLC (Zakat), Bank Asia Ltd.
  and AB Bank PLC (general donations) — full account/routing numbers on the
  Donate page.
- **Mobile banking:** separate Bkash/Nagad numbers for Zakat vs. all other
  donations.
- ⚠️ **Known inconsistency, unverified:** the live site's own content
  contradicts itself — homepage says "Trusted Since 2024," About page's
  timeline says founded 2010, and the NGO reg. number implies 2025
  registration. Team bios have no real photos (initials only) and the
  address looks placeholder-ish. Flagged to the owner; not yet corrected.
  Verify against real paperwork before this goes live for real donors.

This project has a dual purpose: (1) a real, working charity website, and
(2) a hands-on AWS learning exercise for the owner (moderate AWS experience).
Prioritize explaining *why*, not just *how*, when making architectural
decisions — the owner wants to understand the AWS services being used, not
just have code appear.

## Current status (update as phases complete)

- [x] Phase 0 — Requirements finalized
- [x] Phase 1 — GitHub repo created, folder structure set up
- [ ] Phase 1 — IAM user (`paribartan-admin`) + billing alerts — **not yet done**
- [x] Phase 2 — Homepage built (static HTML/CSS/JS, not yet deployed to AWS)
- [x] Phase 3 — Full rebuild: multi-page site (home/about/programs/donate/
      gallery/contact), real org content, Lambda source written — **frontend
      done, Lambdas written but not deployed** (2026-09-07)
- [ ] AWS deployment (Amplify Hosting, API Gateway, Lambda, DynamoDB, SES) —
      not yet done, site only runs locally. Needs explicit go-ahead before
      creating real AWS resources.

## Tech stack (locked decisions — don't deviate without asking)

- **Frontend:** Plain HTML/CSS/JS. No framework. Chosen deliberately to keep
  focus on AWS concepts rather than framework tooling.
- **Backend:** Node.js Lambda functions.
- **Hosting:** AWS Amplify Hosting (manages S3 + CloudFront + build pipeline
  from this GitHub repo).
- **DNS:** Route 53.
- **Backend services:** API Gateway → Lambda → DynamoDB / SES.
- **Payments:** Stripe Hosted Checkout, **Test Mode only** for now — Stripe
  does not operate for Bangladesh-registered businesses. Real launch will
  need a local gateway swap (SSLCommerz is the current candidate). Never
  build custom card-handling — always route through Stripe/PayPal hosted
  checkout + a webhook + Lambda to record the result afterward.

## Folder structure

```
frontend/           Static site files (index.html, about.html, programs.html,
                     donate.html, gallery.html, contact.html, css/, js/)
backend/lambdas/     One folder per Lambda function
infrastructure/      Reserved for future IaC / config
```

## Site structure & donation scope (locked decisions, 2026-09-07)

Rebuilt using matwproject.org, humanappeal.org.au, and sadaqa.org.au as
structural references (all Islamic-charity sites with heavy donation
infrastructure — mega-menus, Zakat calculators, sticky quick-donate bars,
multi-appeal flows). Explicitly **scoped down** from that: this site uses one
shared donate flow (fund dropdown + amount, Stripe Checkout) rather than
building a separate flow per appeal. Revisit if the owner wants more parity
with those reference sites later.

- **Nav:** Home · About · Programs · Donate (highlighted CTA) · Gallery · Contact
- **Home:** hero, trust badges, causes grid (all 7 programs), impact stats,
  get-involved/newsletter, footer
- **About:** mission/vision, team, timeline, NGO registration
- **Programs:** full detail per program, each links into Donate with the
  fund pre-selected
- **Donate:** Stripe Checkout flow (fund + amount) *and* the real bank
  transfer / mobile banking (Bkash, Nagad) details as an alternative —
  common pattern for BD charities since card payment adoption is low
- **Gallery:** placeholder image cards (no real photos supplied yet — see
  Content status below)
- **Contact:** volunteer/contact form + real contact info

## Content status

Real facts (programs, stats, contact info, bank details) are sourced from
the live site — see the note at the top of this file. **Photos are still
placeholders** (styled icon/pattern cards, clearly not real photography) —
swap in real images from the owner when available. Team members have no
real photos either (initials-only avatar badges).

## Conventions

- Comment non-obvious lines in Lambda code — the owner is learning, so
  terse "clever" code without explanation is not helpful here.
- Every Lambda function gets its own scoped IAM role (least privilege) —
  never reuse a broad role across functions.
- Never commit secrets. `.env` files are gitignored — verify before adding
  any file that might hold an API key.
- Charity-specific: don't invent or leave placeholder stats/registration
  numbers unlabeled — mark them clearly as examples if real data isn't
  available yet (see homepage impact stats as the existing pattern).

## Design system (homepage, Phase 2)

Nakshi Kantha (Bengali embroidery) inspired. Palette: indigo `#1C2B4A`,
marigold `#E8A23A`, rickshaw red `#BE4235`, paddy green `#33553A`, parchment
`#F5EFE3`. Type: Fraunces (display), Work Sans (body), IBM Plex Mono
(stats/labels). Signature element: a running-stitch line motif. Keep new
pages/components consistent with this system unless explicitly asked to
change direction.

## Cost & security guardrails

- Flag anything that could incur cost beyond AWS Free Tier before building it
  (e.g. Route 53 hosted zone ~$0.50/mo, domain registration are already
  expected small costs; anything larger should be called out).
- SES starts in sandbox mode — can only send to verified addresses until
  production access is requested.
- IAM: the owner's day-to-day console user is `paribartan-admin`
  (AdministratorAccess, for solo learning convenience) — this is separate
  from per-Lambda scoped roles, which should stay minimal.
