import "server-only";

import { cache } from "react";
import { bearerToken, getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Current user for the request, or null. Memoised per request. The app's Bearer token is checked
 * with Supabase itself (a token it no longer accepts is nobody); a browser's cookie session as always.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const token = await bearerToken();
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  return user ?? null;
});

export const getCurrentProfile = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});
