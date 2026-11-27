/**
 * "Email me this gift" on a guest's send screen (components/editor/email-me-gift.tsx,
 * app/api/gift/later). NEXT_PUBLIC_EMAIL_ME_GIFT=1 shows the link and lets the route answer; anything
 * else, and the link isn't drawn and the route sends nothing. Read at build time in the browser.
 */
export const emailMeGiftOn = (): boolean => process.env.NEXT_PUBLIC_EMAIL_ME_GIFT === "1";
