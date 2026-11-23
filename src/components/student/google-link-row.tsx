"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/auth/google-button";
import { lo } from "@/lib/i18n/lo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STATUS_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: lo.profile.googleLinked },
  google_in_use: { ok: false, text: lo.profile.googleInUse },
  google_failed: { ok: false, text: lo.profile.googleLinkFailed },
  google_disabled: { ok: false, text: lo.profile.googleLinkDisabled },
  google_not_linked: { ok: false, text: lo.profile.googleLinkFailed },
};

/** Profile row: link or unlink a Google account so the student can sign in with Gmail. */
export function GoogleLinkRow({ className, status }: { className?: string; status?: string }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<UserIdentity | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUserIdentities().then(({ data }) => {
      setIdentity(data?.identities.find((i) => i.provider === "google") ?? null);
    });
  }, []);

  // One-time message after returning from Google (?google=…), then clean the URL.
  useEffect(() => {
    const msg = status ? STATUS_MESSAGES[status] : undefined;
    if (!msg) return;
    if (msg.ok) toast.success(msg.text);
    else toast.error(msg.text);
    router.replace("/profile", { scroll: false });
  }, [status, router]);

  const email =
    identity && typeof identity.identity_data?.email === "string"
      ? identity.identity_data.email
      : null;

  async function link() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("link", "1");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      toast.error(
        /manual linking|not enabled|disabled/i.test(error.message)
          ? lo.profile.googleLinkDisabled
          : lo.profile.googleLinkFailed,
      );
    }
  }

  async function unlink() {
    if (!identity) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setBusy(false);
    if (error) return void toast.error(lo.profile.googleLinkFailed);
    setIdentity(null);
    toast.success(lo.profile.googleUnlinked);
  }

  return (
    <div className={className}>
      <GoogleIcon className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block">{lo.profile.google}</span>
        <span className="block truncate text-xs font-semibold text-muted-foreground">
          {identity === undefined ? lo.common.loading : (email ?? lo.profile.googleNotLinked)}
        </span>
      </span>
      {identity === undefined ? null : identity ? (
        <button
          type="button"
          onClick={unlink}
          disabled={busy}
          className="rounded-xl px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {lo.profile.googleUnlink}
        </button>
      ) : (
        <button
          type="button"
          onClick={link}
          disabled={busy}
          className="press-3d rounded-xl border-2 border-tile-shade bg-tile px-3 py-1.5 text-sm font-bold text-sky [--press-depth:3px] disabled:opacity-50"
        >
          {lo.profile.googleLink}
        </button>
      )}
    </div>
  );
}
