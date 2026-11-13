#!/usr/bin/env bash
# DataForSEO from the cloud routines, through the environment's proxy.
#
#   bash scripts/seo/dfs.sh <path> [json-body]      e.g.
#   bash scripts/seo/dfs.sh appendix/user_data
#   bash scripts/seo/dfs.sh serp/google/organic/live/advanced '[{"keyword":"digital bouquet","location_code":2840,"language_code":"en","depth":10}]'
#
# No key here or anywhere in the repo: the cloud environment holds it as a network secret (header
# Authorization for host api.dataforseo.com) and the proxy adds it to the request, so this works only
# in the cloud routines and only through curl. On the owner's PC, use the DataForSEO MCP instead.
#
# Prints the JSON response. Every paid call adds a row to docs/blog/seo-log.md (time, path, cost in
# USD, what the run was doing from $DFS_WHY), so the decision diary can say what each change cost.
# Exit 2 when DataForSEO can't be reached or refuses the key: callers skip their data steps then.
set -euo pipefail

path="${1:?usage: dfs.sh <path> [json-body]}"
body="${2:-}"
url="https://api.dataforseo.com/v3/${path#/}"

if [ -n "$body" ]; then
  out=$(curl -sS --max-time 180 -X POST -H 'Content-Type: application/json' --data "$body" "$url" 2>&1) || { echo "DFS_UNREACHABLE: $out" >&2; exit 2; }
else
  out=$(curl -sS --max-time 60 "$url" 2>&1) || { echo "DFS_UNREACHABLE: $out" >&2; exit 2; }
fi

# DataForSEO answers 20000 when the request went through; 40100/40101 mean the key is missing or wrong.
status=$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(`${j.status_code ?? "?"} ${j.cost ?? 0}`)}catch{console.log("? 0")}})')
code="${status%% *}"
cost="${status##* }"
case "$code" in
  20000) ;;
  # No access (the proxy refused the host, no key, wrong key) or no money left: skip the data steps.
  401*|402*|"?") echo "DFS_REFUSED ($code): $(printf '%s' "$out" | head -c 300)" >&2; exit 2 ;;
  # Anything else is a request DataForSEO didn't like (a field, a limit): fix the body and retry.
  *) echo "DFS_ERROR ($code): $(printf '%s' "$out" | head -c 500)" >&2; exit 3 ;;
esac

log="docs/blog/seo-log.md"
if [ ! -f "$log" ]; then
  printf '# DataForSEO calls\n\nWritten by `scripts/seo/dfs.sh`: one row per call, cost in USD.\n\n| Time (UTC) | Call | Cost | Why |\n|---|---|---|---|\n' > "$log"
fi
if [ "$cost" != "0" ]; then
  printf '| %s | %s | %s | %s |\n' "$(date -u +%Y-%m-%dT%H:%MZ)" "$path" "$cost" "${DFS_WHY:-}" >> "$log"
fi

printf '%s\n' "$out"
