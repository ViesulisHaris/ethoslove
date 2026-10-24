# How a post goes live

1. The daily blog routine (docs/blog/PLAYBOOK.md) writes the post in the cloud and commits it to
   `main` of the public mirror, github.com/ViesulisHaris/ethoslove.
2. At 10:00 and 16:00 UTC the live repository's Publish blog workflow
   (`.github/workflows/publish-blog.yml`) reads the mirror. If the mirror's `main` is ahead, it checks
   the new commits with `scripts/blog-guard.mjs`: only files under `src/content/blog/`,
   `public/blog/` and `docs/blog/`, post files that are plain data, and the team's author.
3. It moves the live `main` to them, runs the blog tests and the type check, and pushes. Vercel
   deploys it.
4. It waits for each new post on tryethos.io and tells IndexNow.

No key is involved: the mirror is public, and the workflow pushes with its own token. To publish a
waiting post at once: Actions, Publish blog, Run workflow.

This file went live through that same path on 24 Oct 2026, as its first test.
