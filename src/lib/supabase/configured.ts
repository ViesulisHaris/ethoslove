/**
 * Whether the browser build has Supabase to talk to, from the inlined public env alone, so code
 * can decide without loading the client library — 60 KB that most visitors never need.
 */
export const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
