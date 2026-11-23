# Assumptions

Decisions taken where the brief was ambiguous. Items marked **(confirm)** are waiting on the owner.

## Phase 1 — Scaffold
- `docs/ui-reference/` is empty, so the default "clean fintech" direction from §7 is used: slate-50 background, indigo accent (`--brand`), teal second gradient stop (`--brand-2`). Re-theme by editing those two tokens in `src/app/globals.css`. **(confirm)**
- shadcn/ui was initialised with its current default style (`base-nova`, built on Base UI rather than Radix). Components use the `render` prop instead of `asChild`.
- Student area on desktop (≥768px) uses a top header nav instead of the mobile bottom-nav; committee area uses a left sidebar ≥1024px and a bottom sheet menu below that.
- The original brief is kept at `docs/klanghong-claude-code-prompt.md`.
- Default theme is light; dark mode follows the toggle (and the system when chosen).
