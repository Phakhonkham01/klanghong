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
