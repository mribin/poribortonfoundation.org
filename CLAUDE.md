# Paribartan Foundation — Project Context

This file gives Claude Code the context it needs to work on this repo without
re-explaining the project from scratch each session. Keep it updated as phases
complete — treat it like a running project log, not a one-time README.

## What this is

A charity website for **Paribartan Foundation**, a Bangladesh-based registered
charity (community development: clean water, girls' education, emergency
relief). Domain: poribortonfoundation.org

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
- [ ] Phase 3+ — Contact form, newsletter signup, donation flow (not started)
- [ ] AWS deployment (Amplify Hosting) — not yet done, site only runs locally

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
frontend/           Static site files (index.html, css/, js/)
backend/lambdas/     One folder per Lambda function
infrastructure/      Reserved for future IaC / config
```

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
