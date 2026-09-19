"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";

const S = {
  en: { title: "This one's locked.", blurb: "{sender} set a password. It's something only you would know.", placeholder: "Password", open: "Open", wrong: "That's not it. Try again.", busy: "Checking…" },
  es: { title: "Este está cerrado.", blurb: "{sender} puso una contraseña. Es algo que solo tú sabrías.", placeholder: "Contraseña", open: "Abrir", wrong: "No es esa. Inténtalo otra vez.", busy: "Comprobando…" },
};

export function LockScreen({ shortId, senderName, locale }: { shortId: string; senderName: string; locale: GiftLocale }) {
  const t = S[locale] ?? S.en;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "wrong">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    const res = await fetch(`/api/gift/${shortId}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: value }) });
    if (res.ok) router.refresh();
    else setState("wrong");
  };

  return (
    <div translate="no" className="flex min-h-dvh flex-col items-center justify-center bg-night px-8 text-center text-paper">
      <div className="grain-overlay" />
      <LogoMark className="size-12" />
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.15 }} className="mt-8 grid size-16 place-items-center rounded-full bg-white/8">
        <Lock className="size-6 text-coral" />
      </motion.div>
      <h1 className="mt-6 text-[1.8rem] leading-tight italic" style={{ fontFamily: "var(--font-display)" }}>
        {t.title}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-paper/60">{t.blurb.replace("{sender}", senderName)}</p>
      <form onSubmit={submit} className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === "wrong") setState("idle");
          }}
          placeholder={t.placeholder}
          className="h-12 rounded-full border border-white/15 bg-white/8 px-5 text-center text-base text-paper placeholder:text-paper/40 focus:border-coral focus:outline-none"
        />
        <motion.button type="submit" disabled={!value || state === "busy"} whileTap={{ scale: 0.97 }} animate={state === "wrong" ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="h-12 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow disabled:opacity-50">
          {state === "busy" ? t.busy : t.open}
        </motion.button>
        {state === "wrong" ? <p className="text-sm text-coral">{t.wrong}</p> : null}
      </form>
    </div>
  );
}
