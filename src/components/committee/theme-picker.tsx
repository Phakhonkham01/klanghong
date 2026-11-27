"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, Palette } from "lucide-react";
import { toast } from "sonner";
import { setThemeAction } from "@/app/actions/committee";
import { FestivalArt } from "@/components/theme/festival-art";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { lo } from "@/lib/i18n/lo";
import { THEMES, type FestivalTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

const t = lo.committee.theme;

/** The app's own look, shown as the first card (values mirror globals.css). */
const DEFAULT_PREVIEW = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#1E293B",
  border: "#E2E8F0",
  primary: "#58CC02",
  bannerFrom: "#5AB0EE",
  bannerTo: "#2F87C7",
};

/** A small phone-like preview drawn from the theme's colors (no screenshots needed). */
function Preview({ theme }: { theme: FestivalTheme | null }) {
  const c = theme
    ? {
        bg: theme.backgroundColor,
        surface: theme.surfaceColor,
        text: theme.textColor,
        border: theme.borderColor,
        primary: theme.primaryColor,
        bannerFrom: theme.banner.from,
        bannerTo: theme.banner.to,
      }
    : DEFAULT_PREVIEW;
  return (
    <div
      aria-hidden
      className="relative h-36 overflow-hidden rounded-xl border-2"
      style={{ background: c.bg, borderColor: c.border }}
    >
      {theme ? (
        <span className="absolute right-2 bottom-2 size-12 opacity-40">
          <FestivalArt kind={theme.decorations.kind} className="size-full" />
        </span>
      ) : null}
      <div className="relative flex flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-5 rounded-md" style={{ background: c.primary }} />
          <span className="h-2 w-14 rounded-full" style={{ background: c.text, opacity: 0.7 }} />
        </div>
        <div
          className="relative overflow-hidden rounded-lg p-2"
          style={{ background: `linear-gradient(135deg, ${c.bannerFrom}, ${c.bannerTo})` }}
        >
          {theme ? (
            <span className="absolute -top-1 right-1 size-9 opacity-90">
              <FestivalArt kind={theme.decorations.kind} className="size-full" />
            </span>
          ) : null}
          <span className="block h-2 w-16 rounded-full bg-white/80" />
          <span className="mt-1.5 block h-1.5 w-24 rounded-full bg-white/50" />
          <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/25">
            <span className="w-3/5" style={{ background: c.primary }} />
          </span>
        </div>
        <div className="flex items-center gap-2 pl-6">
          <span
            className="grid size-7 place-items-center rounded-full"
            style={{ background: c.primary }}
          >
            <Check className="size-4 text-white" strokeWidth={3} />
          </span>
          <span className="h-1 w-6 rounded-full" style={{ background: c.primary }} />
          <span
            className="size-6 rounded-full border-2"
            style={{ background: c.surface, borderColor: c.border }}
          />
        </div>
      </div>
    </div>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {colors.map((c) => (
        <span
          key={c}
          className="size-4 rounded-full ring-1 ring-black/10"
          style={{ background: c }}
        />
      ))}
    </span>
  );
}

/**
 * Committee-only theme management: pick one of the festival themes (or the default), confirm,
 * and it applies to every student's pages.
 */
export function ThemePicker({ activeKey }: { activeKey: string | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(activeKey);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickedTheme = THEMES.find((x) => x.key === picked) ?? null;
  const pickedName = pickedTheme ? `${pickedTheme.nameLo} · ${pickedTheme.name}` : t.default;
  const unchanged = picked === activeKey;

  async function apply() {
    setSaving(true);
    const r = await setThemeAction(picked).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) return void toast.error(r && !r.ok ? r.error : lo.errors.generic);
    toast.success(pickedTheme ? t.applied(pickedName) : t.appliedDefault);
    setConfirming(false);
    router.refresh();
  }

  const cards: { key: string | null; theme: FestivalTheme | null }[] = [
    { key: null, theme: null },
    ...THEMES.map((theme) => ({ key: theme.key, theme })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Palette className="size-6 text-primary" aria-hidden /> {t.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup">
        {cards.map(({ key, theme }) => {
          const isPicked = picked === key;
          const isActive = activeKey === key;
          return (
            <li key={key ?? "default"}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                onClick={() => setPicked(key)}
                className={cn(
                  "flex h-full w-full flex-col gap-2.5 rounded-2xl border-2 p-3 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:ring-4 focus-visible:ring-ring/40",
                  isPicked && "border-primary bg-accent/40",
                )}
              >
                <Preview theme={theme} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{theme ? theme.nameLo : t.default}</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {theme ? theme.name : "Default"}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      <CircleCheck className="size-3.5" aria-hidden /> {t.active}
                    </span>
                  ) : isPicked ? (
                    <span className="shrink-0 rounded-full border-2 border-primary px-2 py-0.5 text-[11px] font-bold text-primary">
                      {t.selected}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {theme ? theme.description : t.defaultDesc}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Swatches
                    colors={
                      theme
                        ? [
                            theme.primaryColor,
                            theme.secondaryColor,
                            theme.backgroundColor,
                            theme.banner.from,
                          ]
                        : [DEFAULT_PREVIEW.primary, DEFAULT_PREVIEW.bannerFrom, "#FFFFFF"]
                    }
                  />
                  {theme ? (
                    <span className="truncate text-[11px] font-semibold text-muted-foreground">
                      {theme.greeting}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Sticky action bar above the phone menu and the floating button. */}
      <div className="sticky bottom-24 z-10 flex justify-end lg:bottom-4">
        <Button
          variant="chunky"
          size="xl"
          className="w-full shadow-lg sm:w-auto sm:px-8"
          disabled={unchanged}
          onClick={() => setConfirming(true)}
        >
          {unchanged ? t.alreadyActive : picked ? t.apply : t.applyDefault}
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-sm">
          <DialogTitle className="text-lg font-bold">{t.confirmTitle(pickedName)}</DialogTitle>
          <DialogDescription>{picked ? t.confirmBody : t.confirmDefaultBody}</DialogDescription>
          <Preview theme={pickedTheme} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="tile" className="h-11" onClick={() => setConfirming(false)}>
              {lo.common.cancel}
            </Button>
            <Button variant="chunky" className="h-11" disabled={saving} onClick={apply}>
              {saving ? lo.common.loading : t.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
