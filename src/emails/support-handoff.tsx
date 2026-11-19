import { EmailLayout, P, Quiet } from "./layout";
import type { Chat, TranscriptEntry } from "@/lib/support/store";

/** The subject and body for one chat's hand-off. */
export function supportHandoffEmail(chat: Chat, email: string) {
  return {
    subject: supportHandoffSubject(chat.transcript),
    react: (
      <SupportHandoffEmail
        email={email}
        transcript={chat.transcript}
        page={chat.page}
        locale={chat.locale}
        currency={chat.currency}
        costMicros={chat.totals.costMicros}
      />
    ),
  };
}

/**
 * The help chat handing a conversation to the team (POST /api/support/handoff): sent to the support
 * inbox, with the visitor's address as reply-to, so a plain Reply answers them. Internal, so English.
 */

export function supportHandoffSubject(transcript: TranscriptEntry[]): string {
  const first = transcript.find((e) => e.role === "visitor")?.text.replace(/\s+/g, " ").trim() ?? "";
  return `Help chat: ${first.length > 70 ? `${first.slice(0, 69)}…` : first || "a visitor needs a reply"}`;
}

export function SupportHandoffEmail({
  email,
  transcript,
  page,
  locale,
  currency,
  costMicros,
}: {
  email: string;
  transcript: TranscriptEntry[];
  page: string | null;
  locale: "en" | "es";
  currency: string;
  costMicros: number;
}) {
  return (
    <EmailLayout
      preview={`${email} asked the help chat for a reply.`}
      heading="A visitor needs a reply"
      footer="Sent by the help chat on tryethos.io. Reply to this email to answer the visitor."
    >
      <P>
        Reply to <strong>{email}</strong>, which is set as the reply-to address. They were on {page ?? "an unknown page"}, in {locale === "es" ? "Spanish" : "English"}, paying in {currency.toUpperCase()}.
      </P>
      {transcript.map((entry, i) =>
        entry.role === "visitor" ? (
          <P key={i}>
            <strong>Visitor:</strong> {entry.text}
          </P>
        ) : (
          <Quiet key={i}>Bot: {entry.text}</Quiet>
        ),
      )}
      <Quiet>Chat cost so far: ${(costMicros / 1_000_000).toFixed(4)}.</Quiet>
    </EmailLayout>
  );
}
