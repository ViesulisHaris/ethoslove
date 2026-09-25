/**
 * What scripts/setup-billing-portal.mjs does with the account's Customer Portal configurations
 * (docs/MEMBERSHIP.md 2.1 R5 and 2.7). The account is shared with other businesses, and its default
 * configuration is theirs as much as ours: it is what every portal session opened without
 * `configuration` gets. Stripe makes the first configuration an account gets its default, so on an
 * account that has none, creating Ethos's would hand every other business Ethos's portal (the
 * headline, the terms and privacy links, the button back to tryethos.io). That is refused until the
 * account has a default of its own, saved in the Dashboard.
 *
 * A configuration of ours that is the default already (made before this check existed) is never
 * Ethos's again: it is left alone for the owner to turn into the account's own in the Dashboard, and
 * Ethos gets a new one beside it, which can't become the default while one exists.
 *
 * @typedef {{ id: string; is_default: boolean; active: boolean; metadata?: Record<string, string> | null }} PortalConfiguration
 * @typedef {{ action: "update"; id: string } | { action: "create" } | { action: "refuse" }} PortalStep
 */

/** The marker scripts/setup-billing-portal.mjs puts on Ethos's configuration. */
export const PORTAL_MARKER = { app: "ethos", ethos_object: "portal_configuration" };

/**
 * @param {PortalConfiguration} configuration
 * @returns {boolean}
 */
export const isEthosPortal = (configuration) => Object.entries(PORTAL_MARKER).every(([k, v]) => configuration.metadata?.[k] === v);

/**
 * @param {PortalConfiguration[]} configurations every configuration on the account
 * @returns {PortalStep & { strandedDefault: string | null }} what to do, and the id of a configuration of ours that is the default
 */
export function planPortalConfiguration(configurations) {
  const accountDefault = configurations.find((c) => c.is_default) ?? null;
  const strandedDefault = accountDefault && isEthosPortal(accountDefault) ? accountDefault.id : null;
  /** @type {PortalConfiguration | null} */
  let ours = null;
  for (const c of configurations) if (isEthosPortal(c) && !c.is_default && (!ours || c.active)) ours = c;
  if (ours) return { action: "update", id: ours.id, strandedDefault };
  if (!accountDefault) return { action: "refuse", strandedDefault };
  return { action: "create", strandedDefault };
}
