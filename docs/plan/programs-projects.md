# Programs → Projects feature — Plan

Status: **PLANNING.** Part 1 (data model) is agreed. Parts 2–8 are still to do.
Agreed in the claude.ai planning chat on 2026-11-24. Build from this file; don't redesign silently.

## Feature summary

Program → Project hierarchy with per-project donations, plus staff-managed news.
Inspired by BrickX (a listing of ID'd items, each with a tabbed detail page). This is
DONATION, not investment: no investment language and no "sell"/refund equivalent.

Flow: Programs page → Program page → project cards → Project page → donate (to that
project, or to the program's general fund).

## Decisions so far

- **Program prefixes (3 letters, locked):** EDU (Education), HLT (Healthcare),
  MSQ (Mosque Building), ZAK (Zakat), QRB (Qurbani), SKL (Skill Development),
  DIS (Disaster Relief), WAT (Drinking Water).
- **Project IDs:** prefix + number (WAT01, EDU03). Never reused. Issued by an atomic
  counter that only goes up.
- **Qurbani is parked for release 1.** The QRB program page still exists: program info,
  a "Give to the general Qurbani fund" box, and a note ("Qurbani shares open closer
  to Eid") in place of project cards. There is no `pricing` field in release 1; every
  project is an open amount.
- **`beneficiaries` is optional:** `{ count, unit }`, with `unit` picked from a short
  list per program (families, students, patients, worshippers…). When it is missing,
  the 4th stat cell on the card shows "Days left" instead.
- **Post `body` is plain text only.** Always render it with `textContent`, never
  `innerHTML` (prevents script injection).
- **Infrastructure as code:** AWS SAM in `infrastructure/`. Click through each new
  service once in the console first, then capture it in SAM.
- **Workflow:** plan here (claude.ai) → brief in `docs/plan/` → Claude Code builds
  in Cursor → test → validate → retest → commit.

## Phase list (agreed)

| Phase | Name | AWS service it teaches |
|---|---|---|
| 0–3 | Requirements, foundations, homepage, multi-page site | ✅ done |
| 4 | Programs & Projects on local JSON (GitHub Pages beta) | — (no AWS) ← NEXT |
| 5 | Data layer | DynamoDB |
| 6 | Public read API; flip `API_BASE_URL` | API Gateway, Lambda, IAM roles |
| 7 | Contact form & newsletter | SES |
| 8 | Donations: Stripe Checkout + webhook → live totals | Lambda, Secrets Manager/SSM, DynamoDB transactions |
| 9 | Staff login | Cognito |
| 10 | Admin tools + photo uploads | API Gateway authorisers, S3 pre-signed URLs |
| 11 | Production hosting & DNS | Amplify Hosting, Route 53, ACM |
| 12 | Launch review & go-live | CloudWatch, review of everything |

**Before Phase 5:** the `PoribortonBuilder` permission set needs CloudFormation,
CloudWatch Logs, Cognito (for Phase 9), and IAM role creation scoped to
`poriborton-*` roles only (SAM creates the Lambda roles). Design this together;
don't just widen permissions.

---

## Part 1 — Data model (AGREED)

### Entities

```
 Program (WAT) ──1───────*── Project (WAT01, WAT02…)
    │ 0..*                       │ 0..*
    └────────── Post ────────────┘   (a post links to a program, a project, or neither = site news)

 Donation ──► exactly one fund: a Project's fund OR a Program's general fund
              (private — never sent to the public site)
```

### JSON contract (what the public pages read)

The local files mirror the future API URLs. Switching to the API = changing `API_BASE_URL`.

```
frontend/data/programs.json          ↔  GET /programs
frontend/data/programs/WAT.json      ↔  GET /programs/WAT
frontend/data/projects/WAT01.json    ↔  GET /projects/WAT01
frontend/data/posts/home.json        ↔  GET /posts?feed=home
```

- One `apiUrl(path)` function appends `.json` when `API_BASE_URL` points at local data.
- `API_BASE_URL` must be **relative** (`./data`). The GitHub Pages site lives under
  `/poribortonfoundation.org/`, so an absolute `/data` path would 404.

Example `GET /projects/WAT01` (illustrative data, not a real project):

```json
{
  "schemaVersion": 1,
  "project": {
    "id": "WAT01",
    "programId": "WAT",
    "title": "Deep tube well for Char Fasson primary school",
    "type": "tube_well",
    "status": "fundraising",
    "zakatEligible": true,
    "location": { "district": "Bhola", "upazila": "Char Fasson" },
    "goalBdt": 140000,
    "raisedBdt": 92500,
    "donorCount": 23,
    "donationsLast30Days": 7,
    "deadline": "2027-02-28",
    "deadlineExtended": false,
    "beneficiaries": { "count": 120, "unit": "families" },
    "photos": [
      { "src": "images/projects/WAT01/1.jpg", "alt": "Students queueing at the old shallow well", "caption": "Before" }
    ],
    "budget": [
      { "item": "Drilling to 120 m", "amountBdt": 80000 },
      { "item": "Pump, platform and drainage", "amountBdt": 45000 },
      { "item": "Water quality testing", "amountBdt": 15000 }
    ],
    "suggestedNextProjectId": null
  },
  "updates": [
    { "id": "p_9a1", "kind": "update", "title": "Site survey done", "body": "…", "publishedAt": "2026-11-12T04:00:00Z" }
  ]
}
```

`GET /programs/WAT` returns `{ program, projects: [card-sized summaries], posts }`.
The program object includes `projectTypes` (code + label, used for the type badges)
and `generalFund.raisedBdt`.

### Contract rules

- **Money:** integers in whole taka, with `Bdt` in the field name. Lakh formatting is
  display-only (`Intl.NumberFormat('en-IN', { style:'currency', currency:'BDT',
  currencyDisplay:'narrowSymbol', maximumFractionDigits:0 })`; check the output in the
  browser). Stripe minor units (×100) appear only inside the checkout Lambda.
- **Derive in the browser** anything that can be worked out from public fields:
  still-needed, %, days-left.
- **Derive on the server** anything that needs private data: `donationsLast30Days`.
- **The ≥5 donor rule is enforced server-side:** below 5 donors, `donorCount` and
  `donationsLast30Days` are sent as `null`.
- **`deadline`** is a date interpreted in **Asia/Dhaka** time.
- **`alt` is required** on every photo.
- **`schemaVersion`** is included so the contract can evolve safely.
- **Donations never appear in any public response.** Only totals are public.
- **Status enum:** `fundraising` | `funded` | `in_progress` | `completed`.

### DynamoDB design: hybrid (single-table for content, separate table for donations)

**Content table**

```
PK             SK                                      item
PROGRAM#WAT    META                                    program
PROGRAM#WAT    COUNTER                                 { next: 3 }
PROGRAM#WAT    POST#<publishedAt>#<postId>             program-level update
PROGRAM#WAT    PROJECT#WAT01                           project
PROGRAM#WAT    PROJECT#WAT01#POST#<publishedAt>#<id>   project update
SITE           POST#<publishedAt>#<postId>             general news / event
GSI1 (sparse): GSI1PK = HOME#NEWS | HOME#EVENT, GSI1SK = date  (homepage posts only)
```

| Access pattern | How it's answered |
|---|---|
| Program page (program + projects + posts) | One Query: `PK = PROGRAM#WAT` |
| Project page (project + updates) | Query `PK = PROGRAM#<prefix>`, `SK begins_with PROJECT#WAT01` (the PK comes from the ID's prefix, so no GSI is needed) |
| Homepage news / upcoming events | GSI1 |
| Next project number | `UpdateItem ADD next 1` (atomic) |
| (Future) all fundraising projects across programs | GSI on `status`, added when needed |

**Donations table (separate)**

- `PK = donationId` (the Stripe Checkout session ID). Writes use the condition
  `attribute_not_exists(PK)`, so a webhook Stripe delivers twice is never counted twice.
- GSI1: `fund` (`PROJECT#WAT01` / `GENERAL#WAT`) + `createdAt`.
- GSI2 (sparse): Zakat donations only, which gives a one-query Zakat report.
- The webhook Lambda writes the donation **and** updates `raisedBdt` in one
  `TransactWriteItems` (both happen or neither does).
- **Why a separate table:** IAM is granted per table. Public-read Lambdas get zero
  permission on Donations, so AWS itself refuses any read attempt. It also allows
  separate backups and longer retention for financial records.

---

## Still to do

- **Part 2:** API contract (endpoints, public read vs admin write, request/response shapes)
- **Part 3:** Page map; how project.html handles a missing, invalid or closed ID
- **Part 4:** Donation flow end to end (closed project, deadline passed, Zakat cases;
  overage split into the general fund)
- **Part 5:** Admin page (login, forms, photo upload, staff can/can't)
- **Part 6:** Charity-specific items (disclosures, Zakat ring-fencing, receipts,
  accessibility, display of reg. no. S-14289/2025)
- **Part 7:** Security & cost flags
- **Part 8:** Build order in small steps, mapped to the phases above

## Open items

- [CONFIRM] Deadline-missed policy. Proposed: extend once, then the funds move to the
  program's general fund.
- [VERIFY] Stripe Test Mode support for BDT, and its minor-unit handling.
- [LEARNER RE-CHECK, unanswered] % funded and the date of the most recent donation:
  browser or server, and why?
