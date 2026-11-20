/**
 * The sender looking at their own gift is not an open.
 *
 * Seven in ten gifts were first "opened" within two minutes of being sent (a quarter within thirty
 * seconds), from the share screen's own "Open" button, and each of those sent the sender
 * "<Name> opened your gift" and counted in their gift's opens. So an open from the account the
 * gift belongs to is neither recorded nor announced (app/api/gift/[shortId]/view).
 *
 * Almost every open comes from someone with no account, so whether to ask who is signed in is
 * decided here from what the request carries, without a call to anything: Supabase's session
 * cookie in a browser, a Bearer token from the iPhone app.
 */
export function carriesSignIn(cookieNames: readonly string[], hasAuthorization: boolean): boolean {
  return hasAuthorization || cookieNames.some((name) => name.startsWith("sb-") && name.includes("-auth-token"));
}

/** Whether an open of this gift is its own sender's: the signed-in account is the one it belongs to. */
export function isOwnView(viewerId: string | null | undefined, ownerId: string | null | undefined): boolean {
  return Boolean(viewerId) && Boolean(ownerId) && viewerId === ownerId;
}
