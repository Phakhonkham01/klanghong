"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Smartphone } from "lucide-react";
import { requestOtpAction, verifyOtpAction, type OtpPurpose } from "@/app/(auth)/otp-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";
import { formatPhone } from "@/lib/phone";

const t = lo.otp;
const field = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

function ErrorText({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-semibold text-status-rejected"
    >
      {text}
    </p>
  );
}

/** Two steps: phone number → 6-digit code. Used for sign-up and for "forgot password". */
export function PhoneLogin({ purpose = "signup" }: { purpose?: OtpPurpose }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function send(value: string) {
    setError(null);
    startTransition(async () => {
      const r = await requestOtpAction(value, purpose).catch(() => null);
      if (!r) return setError(lo.errors.generic);
      if (!r.ok) return setError(r.error);
      setPhone(r.phone);
      setRemaining(r.remaining);
      setCooldown(r.resendIn);
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    });
  }

  function verify(value: string) {
    if (!phone) return;
    setError(null);
    startTransition(async () => {
      // On success the action redirects; it only returns on failure.
      const r = await verifyOtpAction(phone, value, purpose).catch(() => null);
      if (r && !r.ok) {
        setError(r.error);
        setCode("");
      }
    });
  }

  if (!phone) {
    return (
      <form
        className="space-y-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send(phoneInput);
        }}
      >
        <div className="relative">
          <Smartphone className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder={t.phonePlaceholder}
            aria-label={t.phone}
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            className={`${field} pl-12 money`}
          />
        </div>
        <ErrorText text={error} />
        <Button
          type="submit"
          variant="chunky"
          size="xl"
          className="w-full"
          disabled={pending || !phoneInput.trim()}
        >
          {pending ? t.sending : t.send}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {purpose === "reset" ? t.resetHint : t.signupHint}
        </p>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
    >
      <button
        type="button"
        onClick={() => {
          setPhone(null);
          setError(null);
        }}
        className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.changePhone}
      </button>
      <div>
        <p className="font-bold">{t.codeTitle}</p>
        <p className="text-sm text-muted-foreground">{t.codeSentTo(formatPhone(phone))}</p>
      </div>
      <Input
        ref={codeRef}
        value={code}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(v);
          if (v.length === 6 && !pending) verify(v);
        }}
        placeholder="••••••"
        aria-label={t.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className={`${field} text-center money text-2xl tracking-[0.5em]`}
      />
      <ErrorText text={error} />
      <Button
        type="submit"
        variant="chunky"
        size="xl"
        className="w-full"
        disabled={pending || code.length !== 6}
      >
        {pending ? t.verifying : t.verify}
      </Button>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {remaining !== null ? t.remaining(Math.max(0, remaining)) : null}
        </span>
        <button
          type="button"
          disabled={cooldown > 0 || pending}
          onClick={() => send(phone)}
          className="font-bold text-sky disabled:text-muted-foreground"
        >
          {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
        </button>
      </div>
    </form>
  );
}
