# Assumptions

Decisions taken where the brief was ambiguous. Items marked **(confirm)** are waiting on the owner.

## Phase 1 — Scaffold
- `docs/ui-reference/` is empty, so the default "clean fintech" direction from §7 is used: slate-50 background, indigo accent (`--brand`), teal second gradient stop (`--brand-2`). Re-theme by editing those two tokens in `src/app/globals.css`. **(confirm)**
- shadcn/ui was initialised with its current default style (`base-nova`, built on Base UI rather than Radix). Components use the `render` prop instead of `asChild`.
- Student area on desktop (≥768px) uses a top header nav instead of the mobile bottom-nav; committee area uses a left sidebar ≥1024px and a bottom sheet menu below that.
- The original brief is kept at `docs/klanghong-claude-code-prompt.md`.
- Default theme is light; dark mode follows the toggle (and the system when chosen).

## UI direction (playful, game-like)
- The owner shared a screen recording of a gamified language-learning app as the visual reference. We borrow the *feel* only: chunky 3D "pressable" buttons (`press-3d` utility, `chunky*` / `tile` button variants), bright fills, a top stat row, a snake-like path of week nodes, word-tile style week picking, a full-screen pay flow with a progress bar, and a green success sheet. No mascot, characters, logo, name or signature colours from that app are copied.
- Palette is now fresh emerald (`--brand`) + sky (`--sky`) with streak orange and gold accents; white background; radius 1rem. Re-theme via the tokens at the top of `src/app/globals.css`.
- Student dashboard, pay flow and login run on demo data from `src/lib/demo.ts` until Supabase is connected; the pay flow does not upload anything yet and the login form only validates and shows a toast.
- `/pay` runs full-screen (no header/bottom nav), like a focused task.
- Committee area (overview, review queue, payment matrix + student detail, students, expenses, reports, settings, audit) runs on demo data from `src/lib/demo-committee.ts`. Approve/reject, cash payments, student add/import/deactivate, expense add/edit/delete and settings save only change local page state or show a toast until server actions exist.
- Review queue shows a generated stand-in slip; real slips will come from short-lived signed URLs. Desktop shortcuts: A approve, R reject, ←/→ move.
- Matrix cells use slate for "unpaid" (not the brand green) so they can't be confused with "paid". CSV exports add a UTF-8 BOM for Excel and neutralize formula injection.

## Phase 2 — Database
- Supabase project: for now the schema lives in the owner's existing project (ref `wlda…`), next to another app's storage buckets; no table or function names collide. Moving to a dedicated project later = run the three migrations there and `pnpm setup:env`.
- Migrations were applied by pasting them into the SQL Editor (no `SUPABASE_DB_URL`), so `ops.migrations` is not populated; future migrations must be pasted the same way or applied with `pnpm db:migrate` once the DB URL is set.
- `pnpm test:rls` (29 checks) passed on 2026-11-23 and left no test data behind.
- The service_role / secret keys were shared in chat on 2026-11-23 and must be rotated in the dashboard; then re-run `pnpm setup:env`.

## Phase 3 — Auth
- Students sign in with student code + password. Supabase Auth needs an email, so each code maps to `<code>@klanghong.local` (never receives mail). Codes are uppercased, 3–20 letters/digits.
- `src/middleware.ts` refreshes the session and guards routes: signed out → `/login?next=…`; inactive → signed out; `must_change_password` → `/change-password`; students cannot open `/committee/*`.
- Clearing `must_change_password` after a password change uses the service-role client for the caller's own row only (users have no UPDATE on profiles).
- `pnpm seed:admin` creates/repairs the first committee account from `ADMIN_*` (created `ADMIN001` on 2026-11-23, `must_change_password = false`).
- `pnpm test:auth` (15 route-guard checks with real sessions, needs `pnpm dev`) passed on 2026-11-23.
- Recommended in the Supabase dashboard: Authentication → turn off "Allow new users to sign up" (accounts are created by the committee only).
- Pages still show demo data; wiring them to the database is the next phase.

## Phone OTP sign-in (replaces Google)
- Students sign in with a Lao mobile number + 6-digit SMS code sent through `wenova-link` (`WENOVA_API_TOKEN` in `.env.local`). Committee members keep code + password; that form is hidden on the login page and appears after three quick taps on the piggy logo (obscurity only, the account still needs its password). Google sign-in was removed.
- Anyone may register by phone; a new number becomes a `pending` profile, sets its full name on first sign-in (`/welcome`), then waits on `/pending` until the committee approves it on the Students page. Committee can also add students by phone (approved immediately).
- OTP limits: 3 SMS per number per calendar month (Asia/Vientiane), reset early by the committee ("ຣີເຊັດ OTP"); 60 s between sends; 5 wrong tries per code; code valid 5 min. Abuse guards: 5 SMS per IP per hour and `OTP_GLOBAL_DAILY_LIMIT` (default 100) per 24 h. A failed SMS send does not count.
- Codes are stored only as HMAC hashes (`OTP_SECRET`, defaulting to the service role key) in `otp_requests`, which has RLS on and no user grants.
- After a verified code the server creates the Supabase session via an admin magic-link token (no password involved); sessions refresh automatically, so OTP is rarely needed again.
- Pending/rejected accounts cannot submit payments (DB trigger) and only see the waiting page.
