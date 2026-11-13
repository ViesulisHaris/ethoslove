/**
 * How long the success page shows "paid" before taking a buyer back to their gift by itself, so the
 * sale is counted first (TrackPurchase). One number for both ways back: the plain redirect
 * (AutoContinue) and a guest's sign-in on the way (BackToGift). A plain module, so the server page
 * reads the number itself rather than a client reference to it.
 */
export const CONTINUE_AFTER_MS = 900;
