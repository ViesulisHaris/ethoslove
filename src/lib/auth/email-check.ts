/**
 * A last look at a typed e-mail address before a sign-in link goes to it (walk-make-2, 23 Nov 2026):
 * the browser's own check lets `maya@gmail` and `ana@gmail.con` through, the link goes nowhere and
 * the person waits for a code that never comes.
 *
 * Two answers only. An address whose domain has no dot is refused. A handful of common slips get a
 * suggestion the person may take or ignore. Anything else is left alone: this never "corrects" a
 * real domain (yahoo.co.uk, mail.co, a company's own), so the list holds whole domains, not patterns.
 */

export type EmailCheck = { kind: "ok" } | { kind: "noDot" } | { kind: "suggest"; suggestion: string };

const SLIPS: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "icloud.con": "icloud.com",
  "outlook.con": "outlook.com",
};

export function checkEmail(raw: string): EmailCheck {
  const email = raw.trim();
  const at = email.lastIndexOf("@");
  // No "@" or nothing before it: the browser's own check already refuses these.
  if (at < 1) return { kind: "ok" };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain) return { kind: "ok" };
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => label === "")) return { kind: "noDot" };
  const fix = SLIPS[domain];
  return fix ? { kind: "suggest", suggestion: `${local}@${fix}` } : { kind: "ok" };
}
