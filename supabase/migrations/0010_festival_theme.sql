-- 0010 · Festival theme for the student pages.
-- settings.active_theme: one of the predefined theme keys (src/lib/themes.ts), or null for the
-- default look. One global value, so every student sees the same theme. Only the committee can
-- change it (settings RLS: committee only); the change is audited by the settings trigger.

alter table public.settings add column if not exists active_theme text null;
alter table public.settings drop constraint if exists settings_active_theme_known;
alter table public.settings add constraint settings_active_theme_known check (
  active_theme is null or active_theme in (
    'new-year', 'valentines-day', 'pi-mai-lao', 'khao-phansa',
    'ok-phansa', 'halloween', 'that-luang', 'christmas'
  )
);

grant update (active_theme) on public.settings to authenticated;
