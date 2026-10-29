import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { env, isConfigured } from "@/lib/env";
import { BRAND } from "@/config/brand";

let client: Resend | null = null;

/**
 * Domains that can never receive mail (RFC 2606 and 6761). Test checkouts and scripted runs use
 * them, and a send to one only comes back as a bounce, which counts against the sending domain's
 * reputation with every mailbox provider.
 */
const UNDELIVERABLE = /@(?:[^@]+\.)?(?:example\.(?:com|org|net)|[^@]+\.(?:test|invalid|localhost|example))$/i;

export const isUndeliverable = (to: string): boolean => UNDELIVERABLE.test(to.trim());

/**
 * Sends a transactional email through Resend. Without a key it logs and returns
 * `skipped` so every caller can fire-and-forget safely in development.
 *
 * `headers` is for List-Unsubscribe on the optional emails: mail apps show their own
 * unsubscribe button for it, and Gmail and Yahoo expect it from anyone who sends in bulk.
 *
 * `idempotencyKey` makes an email once-only on Resend's side for 24 hours: a second send with the
 * same key gets the first one's answer and sends nothing.
 */
export async function sendEmail({
  to,
  subject,
  react,
  headers,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  react: ReactElement;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; skipped?: boolean; id?: string; error?: string }> {
  if (!to) return { ok: false, error: "no_recipient" };
  if (isUndeliverable(to)) {
    console.info(`[email] skipped (reserved test domain): ${subject}`);
    return { ok: true, skipped: true };
  }
  if (!isConfigured.resend) {
    console.info(`[email] skipped (no RESEND_API_KEY) → ${to}: ${subject}`);
    return { ok: true, skipped: true };
  }
  try {
    client ??= new Resend(env.resendApiKey);
    const html = await render(react);
    const { data, error } = await client.emails.send(
      { from: env.emailFrom, to, subject, html, replyTo: BRAND.supportEmail, ...(headers ? { headers } : {}) },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
