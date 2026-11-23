# PROMPT FOR CLAUDE CODE — KlangHong (ຄັງຫ້ອງ)

You are a senior full-stack engineer. Build a production-quality web app called **KlangHong** from scratch in the current empty directory. Read this entire brief first, then work phase by phase (see "Build phases"). After each phase: run typecheck + lint + tests, fix errors, and make a git commit. Do not stop to ask questions; where the brief is ambiguous, pick the most reasonable option, and list every assumption in `docs/ASSUMPTIONS.md`.

---

## 1. What the app is

A class-fund tracker for the IT department class. Each student pays a fixed weekly amount into the class fund by bank transfer and uploads the slip. The class committee reviews each slip and approves or rejects it (with a reason). Students can only see/manage their own data, plus the total fund balance.

- **UI language: Lao (ພາສາລາວ)** for all user-facing text. Code, comments, identifiers, commit messages: English.
- **Currency:** Lao Kip, display as `50,000 ₭` (thousands separators, no decimals). Store amounts as integer `bigint`.
- **Timezone:** `Asia/Vientiane` (UTC+7) for ALL week/date logic. Never use the server's local timezone.
- **Primary device:** phones (students open it right after transferring money). Mobile-first, then scale up to desktop.

## 2. Tech stack (fixed)

- Next.js 15 (App Router) + TypeScript (strict) + React 19
- Tailwind CSS v4 + shadcn/ui + lucide-react icons
- Supabase: Postgres, Auth, Storage (private bucket), Row Level Security. Use `@supabase/ssr`.
- Server Actions for mutations (no separate API server). Route Handlers only where needed.
- zod for validation, react-hook-form for forms, `date-fns` + `date-fns-tz` for dates
- sonner for toasts, `next-themes` for dark mode
- Vitest for unit tests (week logic is mandatory to test), Playwright optional for one smoke test
- pnpm. ESLint + Prettier. Deploy target: Vercel.
- Fonts: `Noto Sans Lao` (primary, via `next/font/google`) + Inter for digits/latin. Make sure Lao text never renders with fallback tofu boxes and has comfortable line-height (≥ 1.6).

## 3. Roles & authentication

Two roles: `student`, `committee`.

- Login with **student code + password** (not email). Internally map to a Supabase email `"<student_code>@klanghong.local"` so Supabase Auth email/password still works. Disable email confirmation. Show only Lao error messages.
- There is no public sign-up. Accounts are created by the committee (single add or **bulk import from CSV/pasted list**: `student_code, full_name`) via a Server Action using the service-role key (server only, never exposed to the client). Default password = student code; set `must_change_password = true` and force a change-password screen on first login.
- Committee can reset a student's password and deactivate a student (`is_active=false`; deactivated students are hidden from active lists and not counted as owing, but their history is kept).
- First committee account is created by a seed script `pnpm seed:admin` reading `ADMIN_CODE`, `ADMIN_PASSWORD`, `ADMIN_NAME` from `.env.local`.
- `middleware.ts` refreshes the session and protects route groups by role: students cannot open `/committee/*`; committee can open both areas.

## 4. Core business rules (the heart of the app)

1. **Week definition:** a "week" is identified by its Monday date (`week_start`, type `date`, in Asia/Vientiane). The payment window of a week is Monday–Friday (Mon 00:00 → Fri 23:59:59). Saturday/Sunday still belong to the same week and students may still pay for it, but if unpaid after Friday it is shown as "ໃກ້ເກີນກຳນົດ / ເກີນກຳນົດ" style warning. A new week starts every Monday 00:00.
2. **No cron job for reset.** The "reset every Monday" is a *derived* state. Compute everything from dates:
   - All weeks = from `settings.start_date` (normalized to its Monday) up to the current week, inclusive.
   - For each student and each week, status is derived from `payments`:
     - `paid` → has an `approved` payment for that week
     - `pending` → has a `pending` payment (waiting for review)
     - `rejected` → latest payment for that week is `rejected` (student must resubmit)
     - `unpaid` → current week, no payment yet
     - `overdue` (ຄ້າງຊຳລະ) → a **past** week with no `approved` payment and no `pending` payment
3. **Pay for previous weeks:** when submitting a payment, the student picks which week it is for. The default is the oldest unpaid/overdue week, else the current week. Students may pay several overdue weeks in separate submissions (one slip per week, or allow one slip to cover multiple weeks by selecting multiple weeks → creates one payment row per week with the same slip path; total amount transferred is shown to the student as sum of weeks). Future weeks cannot be paid.
4. **No duplicates:** a student can't have two payments for the same week with status in (`pending`,`approved`). Enforce with a partial unique index in the DB, not just in the UI. A rejected payment can be resubmitted for the same week (creates a new row; old one stays as history).
5. **Slip reuse protection:** store `slip_sha256` on each payment; reject (with a clear Lao message) if the same hash already exists on another `pending`/`approved` payment. (Exception: multi-week submission from the same student in the same request.)
6. **Review flow:** committee sees pending payments → opens slip → **Approve** or **Reject (reason required, min 5 chars)**. Only committee can change status. Record `reviewed_by`, `reviewed_at`. A committee member cannot review their own payment (another committee member must). If only one committee member exists, show a warning but allow it, and flag the row `self_reviewed=true`.
7. **Fund total** = SUM(approved payments.amount) − SUM(expenses.amount). Visible to every logged-in student (read-only) through a `SECURITY DEFINER` function `get_fund_summary()` returning totals only — students must NOT be able to read other students' payment rows.
8. **Amount per week** is set in `settings.weekly_amount` and snapshotted into `payments.amount` at submission time (changing the setting later must not rewrite history).
9. Everything the user sees about "today / this week" must be computed with `Asia/Vientiane`, including on the server (Vercel runs in UTC). Put all of it in `src/lib/week.ts` and cover with tests (see §10).

## 5. Database (Supabase migrations in `supabase/migrations/`)

Create SQL migrations (idempotent, ordered) with RLS enabled on every table.

```
profiles   id uuid PK -> auth.users, student_code text unique not null, full_name text not null,
           role text check in ('student','committee') default 'student',
           is_active bool default true, must_change_password bool default true,
           phone text null, created_at timestamptz default now()

settings   id int PK check(id=1) (single row), weekly_amount bigint not null default 10000,
           start_date date not null, bank_name text, account_name text, account_no text,
           qr_path text null, note text null, updated_at timestamptz, updated_by uuid

payments   id uuid PK default gen_random_uuid(),
           student_id uuid not null -> profiles, week_start date not null (must be a Monday: CHECK extract(isodow from week_start)=1),
           amount bigint not null check (amount > 0),
           slip_path text not null, slip_sha256 text not null,
           transfer_ref text null, note text null,
           status text not null default 'pending' check in ('pending','approved','rejected'),
           reject_reason text null, reviewed_by uuid null, reviewed_at timestamptz null, self_reviewed bool default false,
           created_at timestamptz default now()
           UNIQUE INDEX (student_id, week_start) WHERE status in ('pending','approved')
           INDEX (status, created_at), INDEX (week_start)
           CHECK: status='rejected' => reject_reason is not null

expenses   id uuid PK, title text not null, amount bigint not null check(amount>0), spent_at date not null,
           note text, receipt_path text null, created_by uuid, created_at timestamptz default now()

audit_log  id bigserial PK, actor_id uuid, action text, entity text, entity_id text, meta jsonb, created_at timestamptz default now()
```

**RLS policies**
- `profiles`: user reads own row; committee reads all; only committee updates others (via server actions/service role). Users cannot change their own `role`.
- `payments`: student SELECT/INSERT only where `student_id = auth.uid()`; INSERT must force `status='pending'` and null review fields (use a trigger or `WITH CHECK`). Student cannot UPDATE/DELETE. Committee SELECT all and UPDATE only `status, reject_reason, reviewed_by, reviewed_at, self_reviewed`.
- `expenses`, `settings` write: committee only. `settings` read: all authenticated.
- `audit_log`: committee read only; written by triggers/server actions.
- Add a trigger that writes to `audit_log` on payment status change, settings change, expense create/delete.
- Helper SQL function `is_committee()` (`SECURITY DEFINER`, stable) to avoid recursive RLS.
- Functions: `get_fund_summary()` → `{ total_approved, total_expenses, balance, pending_count }`.

**Storage**
- Private bucket `slips` (path: `<student_id>/<week_start>/<uuid>.<ext>`), private bucket `receipts` for expense receipts, public-not-allowed. Policies: student can upload/read only inside their own `<student_id>/` folder; committee can read all. Serve images through short-lived signed URLs generated on the server.
- Limit: images only (jpeg/png/webp/heic→ convert/accept), ≤ 5 MB, validate MIME + magic bytes on the server. Compress client-side before upload (max ~1600px, quality 0.8) with `browser-image-compression`.
- Settings QR image goes to a separate bucket `public-assets` (public read, committee write).

Also provide `supabase/seed.sql` (settings row + a few demo students, clearly marked demo) and a TypeScript type generation script (`pnpm db:types`).

## 6. Pages & features

### Student area `(student)` — mobile bottom-nav: ໜ້າຫຼັກ · ຈ່າຍເງິນ · ປະຫວັດ · ໂປຣໄຟລ໌
1. **`/dashboard` (ໜ້າຫຼັກ)**
   - Greeting + student name.
   - Big card: **ເງິນຄັງຫ້ອງລວມ** (fund balance) from `get_fund_summary()`.
   - **This-week status card**: week range (e.g. `ຈັນ 24 – ສຸກ 28 ພະຈິກ`), status chip (ຈ່າຍແລ້ວ / ລໍຖ້າກວດ / ຖືກປະຕິເສດ / ຍັງບໍ່ຈ່າຍ), amount, countdown "ເຫຼືອ X ວັນ ຮອດວັນສຸກ", and a primary button **ຈ່າຍເລີຍ**.
   - **Overdue banner** (red/amber) if any past weeks are overdue: "ທ່ານມີ N ອາທິດຄ້າງຊຳລະ · ລວມ X ₭" + list of those weeks each with a **ຈ່າຍ** button that opens the pay page preselected to that week.
   - Rejected payment alert showing the committee's reason with a **ສົ່ງໃໝ່** button.
   - Mini week-by-week strip (last 8 weeks) with colored dots.
2. **`/pay` (ຈ່າຍເງິນ)**: show bank name/account/account name with copy buttons and the QR image (tap to enlarge); week picker (multi-select of payable weeks, total auto-calculated); slip upload (camera/gallery, preview, client compression); optional transfer reference + note; submit → status "ລໍຖ້າກວດ". Full validation and Lao error messages. Success screen with a link back to the dashboard.
3. **`/history`**: own payments list/timeline, filter by status, tap to see slip, reviewer result, reject reason, timestamps.
4. **`/profile`**: name, student code, change password, logout.

### Committee area `(committee)` — desktop sidebar / mobile bottom sheet nav
1. **`/committee` overview**: fund balance, total collected, total expenses, pending count, this-week collection progress (X of Y students paid, progress bar), recent activity.
2. **`/committee/review`**: queue of pending slips (oldest first). Each item: student, week(s), amount, submitted time, thumbnail. Detail view/drawer with zoomable slip, student's history summary, and two actions: **ຢືນຢັນ** (one tap) and **ປະຕິເສດ** (opens dialog with required reason; quick-pick reasons such as "ຈຳນວນເງິນບໍ່ຖືກ", "ສະລິບບໍ່ຊັດເຈນ", "ສະລິບຊ້ຳ", "ໂອນໃຫ້ບັນຊີຜິດ" + free text). Support keyboard shortcuts on desktop (A approve, R reject, ←/→ next/prev). Optimistic UI + toast. Include tabs: ລໍຖ້າກວດ / ຢືນຢັນແລ້ວ / ຖືກປະຕິເສດ.
3. **`/committee/members`**: matrix table — rows = students, columns = weeks (latest 8 with horizontal scroll, selector for older), cells colored by status; row shows total paid and number of overdue weeks; search + filter (ຄ້າງຊຳລະ / ຍັງບໍ່ຈ່າຍອາທິດນີ້); export CSV. Click a student → detail page with full history and ability to add a **manual payment** (cash received; creates an `approved` payment with note "ຮັບເງິນສົດ" and `slip_path` allowed null *only* for manual payments — add a `source` column `('transfer','cash')` and adjust constraints accordingly).
4. **`/committee/students`**: list, add, bulk-import, reset password, deactivate/activate.
5. **`/committee/expenses`**: add/edit/delete expenses (title, amount, date, note, optional receipt photo); list with monthly totals; the fund balance updates accordingly.
6. **`/committee/settings`**: weekly amount, start date, bank info, QR upload, note. Warn that changing the amount affects only future submissions.
7. **`/committee/reports`**: simple summary by week/month (collected vs expected vs overdue) with a chart (recharts), CSV export.
8. **`/committee/audit`** (optional, read-only): audit log list.

### Nice-to-have (do after everything above works)
- Light/dark mode toggle; PWA manifest + install icon; empty states and skeleton loaders everywhere; in-app notification dot for students when a payment is reviewed.

## 7. UI / UX direction

**Reference:** I will provide screenshots of the design I want in `/docs/ui-reference/` (if the folder is empty, use the direction below and note it in ASSUMPTIONS.md). Match the reference's layout, spacing, card style, and color mood as closely as possible.

Default direction if no reference is available — clean, modern fintech-dashboard feel:
- Light background (`slate-50`), white rounded cards (`rounded-2xl`, soft shadow, 1px subtle border), generous spacing, one strong accent color (indigo/emerald — define as CSS variables / Tailwind theme tokens so it can be swapped in one place).
- Status colors, used consistently everywhere (chip + dot + matrix cell): paid = green, pending = amber, rejected = red, unpaid = slate/gray, overdue = deep red with an alert icon.
- Big, readable numbers for money (tabular-nums). Hero card with gradient for the fund balance.
- Mobile: sticky bottom navigation with 4 items, large 44px+ tap targets, sticky primary action on the pay page. Desktop: left sidebar + content max-width container.
- Use shadcn components (Card, Button, Badge, Dialog/Drawer, Sheet, Tabs, Table, Select, Calendar-free week picker, Progress, Skeleton, Sonner). Lucide icons only.
- Accessible: visible focus rings, AA contrast, labels on all inputs, `aria-live` for toasts.
- All copy in Lao; keep a single `src/lib/i18n/lo.ts` dictionary of strings instead of hard-coding text in components. Dates formatted in Lao-friendly form (e.g., `24 ພະຈິກ 2026`; Buddhist/Gregorian: use Gregorian) — put helpers in `lib/format.ts`.

## 8. Project structure

```
klanghong/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/  change-password/
│  │  ├─ (student)/dashboard/ pay/ history/ profile/
│  │  ├─ (committee)/committee/{page,review,members,members/[id],students,expenses,settings,reports,audit}/
│  │  ├─ api/ (only if really needed)
│  │  ├─ layout.tsx  globals.css  not-found.tsx  error.tsx
│  ├─ actions/ (auth.ts, payments.ts, review.ts, students.ts, expenses.ts, settings.ts) — each action: zod-validate → check role server-side → mutate → revalidatePath → return typed result {ok, error}
│  ├─ components/ (ui/, layout/, dashboard/, payments/, review/, members/, charts/)
│  ├─ lib/ (supabase/{client,server,admin,middleware}.ts, week.ts, money.ts, format.ts, validators.ts, hash.ts, i18n/lo.ts, auth.ts)
│  ├─ types/ (database.ts generated)
│  └─ middleware.ts
├─ supabase/ (migrations/, seed.sql)
├─ scripts/ (seed-admin.ts)
├─ tests/ (week.test.ts, validators.test.ts, status.test.ts)
├─ docs/ (README sections, ASSUMPTIONS.md, ui-reference/)
├─ .env.example
└─ README.md
```

`.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `ADMIN_CODE`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `APP_TIMEZONE=Asia/Vientiane`.

## 9. Security checklist (must satisfy)

- Service-role key only in server-side code (`lib/supabase/admin.ts` with `import "server-only"`).
- Every Server Action re-checks the current user and role on the server; never trust client-sent `student_id`, `status`, `amount`, or `reviewed_by`. `amount` is read from `settings`, `student_id` from the session.
- RLS tested: write SQL tests or a script proving a student cannot read another student's payments, cannot update status, and cannot read other folders in storage.
- Rate-limit login attempts (simple in-DB or Upstash-free approach is fine) and generic error messages.
- Security headers (CSP-lite, X-Frame-Options, Referrer-Policy) in `next.config.ts`.
- Sanitize filenames; never use user-supplied names as storage paths.

## 10. Testing & quality

- **Unit tests (Vitest) for `week.ts` and status derivation — required.** Cases: Monday 00:00 / Sunday 23:59 boundaries in `Asia/Vientiane`; server running in UTC at Sunday 18:30 UTC (= Monday 01:30 Vientiane → new week); weeks list from `start_date` to now; overdue detection; paid/pending/rejected/unpaid/overdue derivation; multiple weeks; `start_date` not a Monday; future week rejection.
- Validators tests (reject reason length, file type/size, amount).
- One Playwright smoke test: login → submit payment → committee approves → dashboard shows paid (can use seeded local Supabase).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` must pass before each commit. Do not leave `any`, `// @ts-ignore`, or dead code.

## 11. Build phases (commit after each, conventional commit messages)

1. **Scaffold**: Next.js + TS + Tailwind + shadcn + fonts + theme tokens + lo.ts + layout shells (student bottom-nav, committee sidebar) with placeholder pages.
2. **Database**: migrations, RLS, functions, storage buckets/policies, seed, generated types, RLS tests.
3. **Auth**: login by student code, middleware role guards, forced password change, `seed:admin`.
4. **Week engine**: `lib/week.ts` + status derivation + full unit tests.
5. **Student flow**: dashboard, pay (upload + compression + hash + validation), history, profile.
6. **Committee flow**: review queue (approve/reject with reason), members matrix + detail + manual cash payment, students management (+bulk import), expenses, settings.
7. **Reports & polish**: reports + CSV exports, empty/loading/error states, dark mode, PWA, accessibility pass, responsive pass at 360px / 768px / 1280px.
8. **Docs**: README with setup (create Supabase project, run migrations, env vars, seed admin, deploy to Vercel), ASSUMPTIONS.md, short user guide for students and committee (in Lao).

## 12. Definition of done

- A student can log in with their code, see the fund total and this week's status, upload a slip for this or an overdue week, and see it as "ລໍຖ້າກວດ".
- A committee member can approve, or reject with a reason; the student sees the result and can resubmit when rejected.
- On Monday 00:00 (Asia/Vientiane) a new week appears automatically; any past week without an approved/pending payment appears as "ຄ້າງຊຳລະ" with a reminder banner, and can still be paid.
- Fund balance = approved − expenses and is identical on student and committee screens.
- RLS prevents any cross-student data access; all checks in §9 pass.
- App is usable and good-looking at 360px width; all text is Lao; no console errors; `pnpm build` succeeds.

When all phases are complete, print a summary: how to run locally, how to deploy, the list of assumptions, and anything left undone.
