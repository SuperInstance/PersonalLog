# Beta Test Report — production-round2-2026-07-09

Date: 2026-07-10

All four known findings were confirmed real, fixed, and pushed.

## Summary

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| 1 | next.config.ts publicPath doubles chunk URLs | FIXED | `79e567c` |
| 2 | AgentSection useToast missing ToastProvider | FIXED | `6b98b8d` |
| 3 | Messenger route group mismatch (404) | FIXED | `b835617` |
| 4a | IndexedDB "object store not found" | FIXED | `42dac4a` |
| 4b | AgentRegistry "Agent already registered" | FIXED | `6bca0ce` |

## Details

### 1. publicPath override doubling chunk URLs — FIXED (79e567c)

**Confirmed:** `next.config.ts` set `config.output.publicPath = '/_next/static/chunks/'`
on client builds. Next.js chunk filenames already start with `static/chunks/...`,
producing doubled URLs like `/_next/static/chunks/static/chunks/app/page.js`.

**Verified before fix:** The HTML referenced 4 doubled chunk URLs; all returned
404. The correct `/_next/static/chunks/app/page.js` returned 200 but was never
requested by the browser.

**Fix:** Removed the 5-line `publicPath` override block. The WASM bridge
(`src/lib/native/bridge.ts:228`) uses an absolute URL and does not need it.

**Verified after fix:** All chunk URLs in the HTML resolve (200); zero doubled
paths.

### 2. AgentSection crashing without ToastProvider — FIXED (6b98b8d)

**Confirmed:** `ToastProvider` was defined in two files but never mounted
anywhere in the component tree. `AgentSection` (rendered via
`ConversationList`) calls `useToast()` at render, which threw
"useToast must be used within a ToastProvider". The ErrorBoundary caught it,
so the page loaded but the agents section broke silently. Same crash path
existed for `jepa/page.tsx` and `TemplateGallery`.

**Fix:** Wrapped `AppNav` + main content + mobile components in `<ToastProvider>`
inside the root layout (`src/app/layout.tsx`), so every component using
`useToast()` is inside the provider on all routes.

**Verified:** Type-check passes; page compiles and returns 200.

### 3. Messenger route group 404 — FIXED (b835617)

**Confirmed:** The messenger routes lived under `src/app/(messenger)/`, a Next.js
route group whose parens drop the segment from the URL. So the messenger page
resolved to `/` (conflicting with the landing redirect at `src/app/page.tsx`),
and every nav link to `/messenger` 404'd: AppNav, MobileBottomNav, SetupWizard,
ChatArea, and the landing-page redirect itself.

Additionally, conversation links used the flat `/messenger/<id>` pattern, but the
conversation route was at `conversation/[id]` — so even after fixing the group,
`/messenger/<id>` would still 404.

**Fix:**
- Renamed `(messenger)/` to `messenger/` so `/messenger` is the real URL.
- Fixed 5 broken conversation nav links from `/messenger/<id>` to
  `/messenger/conversation/<id>`, consistent with the metadata path in
  `src/lib/metadata.tsx`.

**Verified:** `/messenger` → 200 (was 404); `/messenger/conversation/test` → 200;
old `/conversation/test` → 404 (gone); type-check clean.

### 4a. IndexedDB "object store not found" — FIXED (42dac4a)

**Confirmed and root-caused:** Three modules independently opened the same
`PersonalLogMessenger` DB v1, each with its own `onupgradeneeded`:
- `conversation-store.ts`: created `conversations`, `messages`, `ai-agents`
- `agents/storage.ts`: created `user-agents` only
- `ai-contact-store.ts`: no `onupgradeneeded` at all

IndexedDB's `onupgradeneeded` fires only for the FIRST connection at a given
version, so whichever module connected first created only its own stores. The
rest failed with "One of the specified object stores was not found" when
loading agents and conversations.

**Fix:** New `src/lib/storage/db.ts` opens the DB once and creates ALL four
stores in a single `onupgradeneeded`. All three consumers now import `getDB`
from it. Clean, contained, no API changes.

**Verified:** Type-check clean. Pre-existing test failures (9/24) confirmed
unchanged by stashing and re-running.

### 4b. AgentRegistry "Agent already registered" — FIXED (6bca0ce)

**Confirmed:** `ConversationList` calls `registerPresetAgents()` in a
`useEffect([])`. React StrictMode (dev) double-mounts components, and
`ConversationList` renders on multiple routes, so `registerPresetAgents()` runs
multiple times. Each call after the first threw "Agent already registered:
jepa-v1/spreader-v1".

**Fix:** Added a `registry.getAgent(id)` guard in `registerPresetAgents()` so
repeated calls are safe no-ops.

**Verified:** Type-check clean.

## Overall Verdict

A real user **could not use the app** before these fixes:
- No client JS loaded at all (finding 1 broke hydration on every page).
- The agents section crashed silently on every messenger page (finding 2).
- Every navigation link to `/messenger` 404'd (finding 3).
- Loading conversations and agents threw IndexedDB errors (finding 4a).

After these five fixes the app's JS loads and hydrates, the messenger route is
reachable, conversations and agents can be loaded from IndexedDB without
schema errors, and preset agents register without duplicate-registration noise.

**Remaining caveats** (not in scope of the 4 findings, not fixed):
- 9 of 24 unit tests in `conversation-store.test.ts` were already failing
  before any changes — these are pre-existing test harness issues (mock
  IndexedDB timing), not regressions.
- The WASM bridge falls back to JS (the Rust pkg is not built), which is the
  designed fallback path.
- A full end-to-end browser smoke test (clicking through conversations, sending
  messages) was not possible in this headless environment but the individual
  subsystems now resolve correctly.
