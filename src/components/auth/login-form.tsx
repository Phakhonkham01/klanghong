"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lo } from "@/lib/i18n/lo";

const fieldClass = "h-13 rounded-2xl border-2 bg-muted/40 px-4 text-base md:text-base";

export function LoginForm() {
  const [show, setShow] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (!String(data.get("code") ?? "").trim() || !String(data.get("password") ?? "")) {
          toast.error(lo.login.required);
          return;
        }
        // Real sign-in is wired up in Phase 3 (Supabase Auth).
        toast.info(lo.login.notConnected);
      }}
    >
      <Input
        name="code"
        placeholder={lo.login.studentCode}
        aria-label={lo.login.studentCode}
        autoComplete="username"
        autoCapitalize="characters"
        maxLength={20}
        className={fieldClass}
      />
      <div className="relative">
        <Input
          name="password"
          type={show ? "text" : "password"}
          placeholder={lo.login.password}
          aria-label={lo.login.password}
          autoComplete="current-password"
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? lo.login.hidePassword : lo.login.showPassword}
          className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      <Button type="submit" variant="chunky" size="xl" className="mt-3 w-full">
        {lo.login.submit}
      </Button>
    </form>
  );
}
