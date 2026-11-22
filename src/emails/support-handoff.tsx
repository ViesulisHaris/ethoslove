import { EmailLayout, P, Quiet } from "./layout";
import type { SupportAccount } from "@/lib/support/account";
import type { Chat, TranscriptEntry } from "@/lib/support/store";

/** The subject and body for one chat's hand-off. */
export function supportHandoffEmail(chat: Chat, email: string, account: SupportAccount = { kind: "unknown" }) {
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
        account={account}
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
  account = { kind: "unknown" },
}: {
  email: string;
  transcript: TranscriptEntry[];
  page: string | null;
  locale: "en" | "es";
  currency: string;
  costMicros: number;
  account?: SupportAccount;
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
      <AccountBlock account={account} />
      <Quiet>Chat cost so far: ${(costMicros / 1_000_000).toFixed(4)}.</Quiet>
    </EmailLayout>
  );
}

const day = (iso: string) => iso.slice(0, 10);
const money = (amount: number, currency: string) => `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** The account behind the address (lib/support/account.ts), so the reply needs no digging. */
function AccountBlock({ account }: { account: SupportAccount }) {
  if (account.kind === "unknown") return <Quiet>Account: could not be looked up.</Quiet>;
  if (account.kind === "none") return <P><strong>Account:</strong> no account uses this address (a typo at checkout, or another address?).</P>;
  return (
    <>
      <P>
        <strong>Account</strong> since {day(account.createdAt)}.
      </P>
      <Quiet>
        {account.purchases.length === 0
          ? "Purchases: none."
          : account.purchases.map((p, i) => (
              <span key={i}>
                Purchase {day(p.createdAt)}: {p.product}
                {p.templates.length > 0 ? ` (${p.templates.join(", ")})` : ""}, {money(p.amount, p.currency)}, <strong>{p.status === "refunded" ? "refunded or disputed" : p.status}</strong>
                <br />
              </span>
            ))}
      </Quiet>
      <Quiet>
        {account.gifts.length === 0
          ? "Gifts: none saved."
          : account.gifts.map((g, i) => (
              <span key={i}>
                Gift tryethos.io/g/{g.shortId}: {g.template}, <strong>{g.status}</strong>, made {day(g.createdAt)}
                {g.publishedAt ? `, published ${day(g.publishedAt)}` : ""}, opened {g.opens}×
                <br />
              </span>
            ))}
      </Quiet>
    </>
  );
}
