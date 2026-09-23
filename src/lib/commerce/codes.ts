import { customAlphabet } from "nanoid";

/**
 * Pass invite codes ride in a link and are never typed, so they only need to be unguessable:
 * 10 characters of lowercase base32 is 50 bits, behind a signed-in, rate-limited endpoint.
 */
export const INVITE_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
export const INVITE_CODE_LENGTH = 10;
export const generateInviteCode = customAlphabet(INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH);
export const INVITE_CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

/**
 * Gift card codes are read off a screen or a card and typed by someone else, so the alphabet drops
 * everything that reads two ways (0/O, 1/I/L). 8 characters of 31 is ~40 bits: far beyond what a
 * signed-in, rate-limited redeem endpoint lets anyone try.
 */
export const GIFT_CARD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const giftCardChars = customAlphabet(GIFT_CARD_ALPHABET, 8);
export const GIFT_CARD_PATTERN = new RegExp(`^ETHOS-[${GIFT_CARD_ALPHABET}]{4}-[${GIFT_CARD_ALPHABET}]{4}$`);

export function generateGiftCardCode(): string {
  const c = giftCardChars();
  return `ETHOS-${c.slice(0, 4)}-${c.slice(4)}`;
}

/**
 * What somebody typed, as the stored code, or null when it can't be one. Forgives case, spaces,
 * missing dashes and a missing "ETHOS" prefix.
 */
export function normaliseGiftCardCode(input: string): string | null {
  const bare = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = bare.startsWith("ETHOS") && bare.length === 13 ? bare.slice(5) : bare;
  if (body.length !== 8) return null;
  const code = `ETHOS-${body.slice(0, 4)}-${body.slice(4)}`;
  return GIFT_CARD_PATTERN.test(code) ? code : null;
}

/** Creator codes are stored upper-case, 3–20 letters and digits (creators.code's check). */
export const CREATOR_CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

/** As typed from a video ("maria 10", "Maria-10"): spaces and dashes go, case doesn't matter. */
export function normaliseCreatorCode(input: string | null | undefined): string | null {
  const code = (input ?? "").replace(/[\s-]+/g, "").toUpperCase();
  return CREATOR_CODE_PATTERN.test(code) ? code : null;
}
