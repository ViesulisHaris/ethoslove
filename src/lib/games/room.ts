/** How a game is being played: one phone passed between two people, or two phones in a room. */
export type Mode = "one" | "two";
/**
 * A game under way. `names` is always [player 0, player 1]: on two phones the host is player 0.
 * `peer` is the other phone. `first` is the host's first state as it reached a guest, so the game
 * opens on it instead of asking for it again; it is never saved.
 */
export type Session = { mode: Mode; code: string | null; host: boolean; names: [string, string]; peer: string | null; first?: unknown };
/** A room this phone has gone into, before or during a game: the code, the name it goes by, and whether it made the room. */
export type Entry = { code: string; name: string; host: boolean };

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
