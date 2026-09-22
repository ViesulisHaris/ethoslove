/** Room codes: four letters from an alphabet with no look-alikes, so one can be read out across a table. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

export function makeRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

/** Whatever was typed or pasted, as a code, or null. Lowercase and stray spaces are forgiven; 0/O and 1/I are not codes. */
export function parseRoomCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** A player's id for this browser tab, so a reload rejoins as the same person. */
export function playerId(storage: Pick<Storage, "getItem" | "setItem"> | null, random: () => number = Math.random): string {
  const key = "ethos.games.player";
  try {
    const existing = storage?.getItem(key);
    if (existing && /^[a-z0-9]{10,}$/.test(existing)) return existing;
  } catch {
    // No storage: a fresh id each time, which only matters across reloads.
  }
  const id = Array.from({ length: 12 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(random() * 36)]).join("");
  try {
    storage?.setItem(key, id);
  } catch {
    // Same.
  }
  return id;
}
