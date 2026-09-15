/**
 * Turns on Sign in with Apple in Supabase, or rotates its secret. Apple rejects client secrets
 * older than six months, so run it again before the date it prints.
 *
 *   node scripts/apple-sign-in.mjs --team ABCDE12345 --key XYZ9876543 --services io.tryethos.web --p8 ~/Downloads/AuthKey_XYZ9876543.p8
 *
 * The secret is an ES256 JWT signed locally with the .p8 key from the Apple Developer portal and
 * written to the project's auth config through the Management API (SUPABASE_ACCESS_TOKEN in
 * .env.local). Neither the key nor the secret is printed.
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const PROJECT_REF = "cjfzdleoypnlmyvupvoi";
// Apple's limit is six months; 180 days stays safely inside it.
const MAX_AGE_S = 180 * 24 * 60 * 60;

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[i + 1];
}
const { team, key, services } = args;
const p8 = args.p8?.replace(/^~(?=\/)/, homedir());
if (!team || !key || !services || !p8) {
  console.error("usage: node scripts/apple-sign-in.mjs --team <Team ID> --key <Key ID> --services <Services ID> --p8 <path to AuthKey_….p8>");
  process.exit(1);
}
if (!/^[A-Z0-9]{10}$/.test(team) || !/^[A-Z0-9]{10}$/.test(key)) {
  console.error("The Team ID and the Key ID are both 10 characters: capital letters and digits.");
  process.exit(1);
}

const b64url = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const expires = now + MAX_AGE_S;
const header = b64url(JSON.stringify({ alg: "ES256", kid: key, typ: "JWT" }));
const claims = b64url(JSON.stringify({ iss: team, iat: now, exp: expires, aud: "https://appleid.apple.com", sub: services }));
const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
  key: createPrivateKey(readFileSync(p8)),
  dsaEncoding: "ieee-p1363",
}).toString("base64url");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is missing from .env.local.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify({
    external_apple_enabled: true,
    external_apple_client_id: services,
    external_apple_secret: `${header}.${claims}.${signature}`,
  }),
});
if (!res.ok) {
  console.error(`Supabase refused the update (${res.status}): ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}
console.log(`Sign in with Apple is on for ${services}. The secret expires on ${new Date(expires * 1000).toISOString().slice(0, 10)}: run this again before then.`);
