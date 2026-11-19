/**
 * The help chat's last line of defence: a reply that looks like it gives something away never
 * reaches the visitor, whatever the model wrote. The chat can't unlock, refund or discount anything,
 * but a written promise or an invented code still costs money or an argument, so the route swaps such
 * a reply for its fixed line (the team will answer) and logs it. Narrow on purpose: "there are no
 * discount codes" must still get through.
 */

/** Something shaped like a code (LAUNCH40, XMAS-2026): six or more capitals and digits, with both. */
const CODE_LIKE = /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]{6,}\b/;

// Only what says something was or will be given: "Ethos doesn't offer free upgrades" must pass, so
// nouns like "free upgrade" or "gesture" are not on the list, only the acts.
const GIVEAWAY: RegExp[] = [
  /\bhere(?:'s| is) (?:a |your |the )?(?:discount |promo |coupon |free )?code\b/i,
  /\buse (?:the )?(?:discount |promo |coupon )?code\b/i,
  /\bI(?:'ve| have) (?:just )?(?:unlocked|added|extended|refunded|credited|applied)\b/i,
  /\bI(?:'ll| will| can) (?:unlock|extend|refund|credit|waive)\b/i,
  /\b(?:admin|developer|debug) mode (?:is )?(?:now )?(?:on|enabled|activated|unlocked)\b/i,
  // Spanish, the site's other language.
  /\baqu[ií] (?:tienes|est[aá]) (?:un|el|tu) c[oó]digo\b/i,
  /\busa (?:el|este) c[oó]digo\b/i,
  /\bte (?:he|hemos) (?:desbloqueado|reembolsado|regalado)\b/i,
];

export function looksLikeGiveaway(reply: string): boolean {
  return CODE_LIKE.test(reply) || GIVEAWAY.some((p) => p.test(reply));
}
