import { getTranslations } from "next-intl/server";
import { dateLetterOn, type LetterWhere } from "@/lib/lifecycle/date-letter-flag";
import { LetterBox } from "./letter-box";

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
        blocked: t("blocked"),
        invalid: t("invalid"),
        limited: t("limited"),
        failed: t("failed"),
      }}
    />
  );
}
