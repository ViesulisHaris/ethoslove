import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { dateLetterOn, type LetterWhere } from "@/lib/lifecycle/date-letter-flag";
import { LetterBox } from "./letter-box";

/** "Write to us" in the blocked line: a mail link to support, the only way off the unsubscribe list (letter-N4). */
export const writeToUs = (chunks: ReactNode) => (
  <a
    href={`mailto:${BRAND.supportEmail}`}
    className="rounded-sm underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
  >
    {chunks}
  </a>
);

/**
 * The date letter's box, once a page, near its end. Draws nothing unless DATE_LETTER=on; the box
 * itself draws nothing until the server says the list exists. The words are read here, on the
 * server, and handed to the box, so with the switch off they are in no page's HTML.
 */
export async function LetterSlot({ locale, where, variant = "card", ground }: { locale: string; where: LetterWhere; variant?: "card" | "band"; ground?: "blush" }) {
  if (!dateLetterOn()) return null;
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations({ locale: l, namespace: "dateLetter" });
  return (
    <LetterBox
      where={where}
      locale={l}
      variant={variant}
      ground={ground}
      words={{
        title: t("title"),
        line: t("line"),
        emailLabel: t("emailLabel"),
        send: t("send"),
        privacy: t("privacy"),
        asked: t("asked"),
        another: t("another"),
        on: t("on"),
        blocked: t.rich("blocked", { write: writeToUs }),
        invalid: t("invalid"),
        limited: t("limited"),
        failed: t("failed"),
      }}
    />
  );
}
