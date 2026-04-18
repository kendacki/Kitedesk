# Source layout note

This folder is a **structural placeholder** for tooling that expects a `src/` tree.

KiteDesk uses **Next.js 14 App Router** with application code at the **repository root**:

- `app/` — pages, layouts, and `app/api/*` route handlers
- `components/` — React UI
- `hooks/` — client hooks (e.g. wallet, task execution)
- `lib/` — shared server/client logic

**AI-generated TestSprite assets** live under `testsprite_tests/` (see root `README.md`).
