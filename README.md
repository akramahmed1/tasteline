# TasteLine

A learning concierge for executives, powered by [Qloo](https://qloo.com)'s taste graph.

Give TasteLine a leader's world: role, industry, learning goal, work trip, and the artists, films, books, and places they already love. It returns one concierge-style brief with three sections:

1. **Learn** — talks, books, and films matched to the business goal AND the leader's actual taste.
2. **Travel** — restaurants and neighborhoods in a named work-trip city, matched to their food and place affinities.
3. **Team offsite** — one offsite plan shaped to the team's combined taste profile, with the per-person affinities shown.

Every recommendation carries a plain-language taste reason ("because your affinity for X connects here") backed by the Qloo entity behind it. If Qloo cannot explain an item in taste terms, it is dropped, not invented.

Built for the **Qloo Agentic Hackathon** (deadline Oct 30, 2026).

## Run it

Prerequisites: Node.js 20+.

```bash
cp .env.example .env.local   # then put your Qloo hackathon key in it
npm install
npm run dev                  # serves on http://localhost:3107
```

The app's default dev port is 3107.

Environment variables (server-side only; never prefixed with `NEXT_PUBLIC_`):

| Name | Value |
|---|---|
| `QLOO_API_KEY` | your Qloo hackathon API key |
| `QLOO_BASE_URL` | `https://hackathon.api.qloo.com` |

## How Qloo is used

TasteLine is designed to fail without Qloo. The judging panel's own test: if the submission works the same without Qloo, it is the wrong build.

- **Entity resolution** — `GET /search` resolves each named love (artists, films, books, restaurants, places) to Qloo entity IDs.
- **Cross-domain insights** — `GET /v2/insights` with `signal.interests.entities` and `feature.explainability=true` jumps affinities across domains: music/film taste into books, talks, dining, places. This jump is what a generic LLM cannot do, and the demo leads with it.
- **Tags** — `GET /v2/tags` resolves the learning goal to a tag, passed as `signal.interests.tags` on the book call to season the brief.
- **Location** — `filter.location.query` scopes places to the trip/offsite city.
- **Source enforcement** — every returned item must carry an explainability contribution back to a seed entity. No reason, no recommendation.
- **Fail-without-Qloo proof** — the in-app "Why Qloo Matters" panel runs taste ON (affinity-grounded books) vs taste OFF (popularity-only books, `filter.popularity.min=0.95`, honestly labeled as no taste signal) side by side.

No `/recommendations` or `/recs` endpoints are used. All Qloo data is fetched live at runtime; no Qloo response data is committed to the repo. Only private in-request caching happens server-side.

## Honest method notes

- **Team aggregation is simple.** The Team offsite section combines each member's taste seeds into one Qloo signal and shows who contributed to each pick. Simple aggregation, no proprietary algorithm. We never claim otherwise.
- **Sync contract.** One Brief JSON schema is generated server-side. Every item carries its seed entity, affinity, and reason, and the reason comes only from Qloo explainability data. The frontend renders that schema verbatim and never constructs or embellishes a reason the API did not supply.

## Why this matters (honest demand framing)

The narrow executive-education market (non-degree, Future Market Insights definition) is about **$10.9B in 2026 at 11.2% CAGR**, with **customized programs the leading segment at about 57% share**. That is the real pond for taste-personalized executive learning and offsite planning.

What is NOT claimed: this is a positioning and proof play, not validated demand. Willingness to pay for TasteLine itself is unproven. Broader leadership-development totals are deliberately not used here.

## Architecture

```
app/
  page.tsx            client UI: persona picker, brief, Why Qloo Matters panel
  globals.css         concierge document styling (custom CSS, no frameworks)
  api/
    brief/route.ts    POST: persona -> full three-section brief (server only)
    tasteoff/route.ts POST: persona -> taste ON vs taste OFF comparison
    health/route.ts   GET:  { ok, qlooConfigured } (boolean only, no key value)
lib/
  qloo.ts             server-only Qloo client (20s timeouts, explainability parsing)
  personas.ts         3 preloaded sample leaders (invented people, real entities)
  types.ts            shared types, safe for client import
```

API key never leaves the server: only route handlers in `app/api` import `lib/qloo.ts`, and `qlooConfigured` in the health endpoint is a boolean.

## Submission notes

- Live demo: hosted app (Vercel)
- Public repo: this repo, MIT license, run instructions above
- No demo video: judges use the live app themselves
- Free through the Nov 2–16 judging period
