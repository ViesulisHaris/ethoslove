# Architecture

## Principles

- **Templates are self-contained React components** that take one `GiftData` prop and render with no
  app chrome. The future mobile app renders them in a WebView unchanged.
- **Business logic lives in Supabase and API routes**, never in components. RLS is the security
  boundary; recipients only ever reach the database through narrow `SECURITY DEFINER` functions.
- **Everything runs without third-party keys** so the product can be demoed before accounts exist.
- **Gift links are locale-free** (`/g/abc123`). The page renders in the sender's chosen language
  stored in the gift, not the viewer's browser language. `src/proxy.ts` rewrites `/g/*` to the
  default locale segment and never redirects it.

## Routing

`src/app/[locale]/` is the root layout (next-intl). Route groups give each surface its own shell:

| Group         | Purpose                         | Chrome                       | Rendering        |
| ------------- | ------------------------------- | ---------------------------- | ---------------- |
| `(marketing)` | homepage, gallery, SEO pages    | header + footer + sticky CTA | static           |
| `(app)`       | dashboard, account              | sidebar, dark mode           | dynamic (auth)   |
| `(editor)`    | `/create/[templateSlug]`        | none, full bleed             | static shell     |
| `(gift)`      | `/g/[shortId]`, `/g/.../react`  | none                         | dynamic          |
| `(auth)`      | login, signup                   | logo only                    | static           |

`src/app/auth/*` route handlers sit outside the locale segment (Supabase redirects there).

Marketing pages stay static because auth state is resolved on the client
(`components/marketing/auth-status.tsx`), not in the layout.

## Theme

Brand tokens live in `src/app/globals.css` and are mapped onto shadcn's semantic variables. Dark mode
is scoped to the app shell: `components/app/app-theme.tsx` mounts next-themes inside `(app)` and
removes the class on unmount so marketing and gift pages always render their designed light palette.

## Data model

See `supabase/migrations/0001_init.sql`. Key decisions:

- `gifts.data` is the full `GiftData` JSON; columns duplicate only what queries need
  (`status`, `unlock_at`, `template_slug`, `locale`).
- No anonymous `SELECT` on `gifts`. Recipients call `get_public_gift(short_id, password)` which
  returns `data` only when unlocked and the password matches, and never returns `password_hash`.
- Views and reactions are inserted through `record_gift_view` / `add_reaction`, which re-check that
  the gift is live. Reactions are readable by the owner only.
- Entitlements are rows in `template_unlocks` (`template_slug = '*'` is "Everything"); there is no
  credit counter. `has_template_unlock(user, slug)` is the single check.
- Storage buckets are private. Objects live at `gifts/{gift_id}/…`; owners manage their own folder,
  recipients get long-lived signed URLs minted by the server for live gifts.

## Template system

```
src/templates/
  manifests.ts         every manifest, eager and pure data: what pages that list templates import
  registry.ts          slug → load(): Promise<TemplateModule> (lazy chunk), for code that renders one
  schemas.ts           slug → the template's field schema alone, for validating on the server
  _shared/             GiftRenderer, LoadingScreen, EndScreen, Typewriter, hooks
  <slug>/
    manifest.ts        name, occasions, tier, features, thumbnail, defaultAccent, heavy
    schema.ts          Zod schema for template-specific `fields`
    demo-data.ts       a complete GiftData used for the live demo and the editor's initial state
    Template.tsx       the experience; receives { data, mode, onEvent, onReact }
    index.ts           export const template: TemplateModule
```

### Types

```ts
interface GiftData<TFields = Record<string, unknown>> {
  version: 1
  templateSlug: string
  locale: "en" | "es"
  title: string
  recipientName: string
  senderName: string
  message: string                                  // constrained markdown
  messageStyle: "typewriter" | "fade"
  photos: GiftPhoto[]                              // { id, url, width, height, caption?, alt? }
  music?: GiftMusic                                // { source: "upload" | "library", url, trackId?, title?, startAt? }
  video?: GiftVideo                                // { url, poster? }
  countdown?: GiftCountdown                        // { targetAt: ISO, timezone: IANA, label? }
  surprise?: GiftSurprise                          // { text, reveal: "tap" | "hold" | "shake" }
  accentColor: string
  fontPairing: "editorial" | "modern" | "handwritten"
  showReactionCta: boolean
  watermark: boolean                               // set server-side from entitlement
  fields: TFields                                  // template-specific, validated by schema.ts
}

interface TemplateManifest {
  slug: string
  name: Record<Locale, string>
  tagline: Record<Locale, string>
  description: Record<Locale, string>
  occasions: Occasion[]
  styles: ("cinematic" | "minimal" | "playful" | "romantic" | "retro" | "3d")[]
  tier: "free" | "premium"
  features: {
    music: boolean; video: boolean; countdown: boolean; surprise: boolean; captions: boolean
    photos: { min: number; max: number }
    needs?: ("gyroscope" | "microphone" | "deviceMotion" | "webgl")[]
  }
  thumbnail: { poster: string; webm?: string }
  defaultAccent: string
  heavy: boolean                                   // R3F/three → separate chunk, longer loading screen
  sortOrder: number
}

interface TemplateProps<TFields> {
  data: GiftData<TFields>
  mode: "live" | "preview" | "demo"                // preview = inside the editor (no sound gate)
  onEvent?: (e: { type: "ready" | "started" | "progress" | "ended" | "surprise"; pct?: number }) => void
  onReact?: () => void
}
```

### Runtime pieces

- `_shared/GiftRenderer.tsx` — the only mount point. Lazy-loads the chunk, preloads photos/audio,
  shows the branded loading screen (≥1.6s so the moment lands), applies theme variables
  (`--gift-accent*`, `--gift-font-*`), wraps in an error boundary, adds the watermark.
- `_shared/i18n.ts` — templates carry their own en/es strings so they render with no app context.
- `_shared/hooks` — `useGiftAudio` (gesture-started, fade-in, tab-visibility pause),
  `usePreloadAssets`, `useContainerSize` (templates size to their container, never the viewport),
  `useGyroParallax` (iOS permission aware, pointer fallback), `useShake`, `useCountdown`.
- `_shared/{Typewriter,RichMessage,Countdown,SurpriseReveal,EndScreen,SoundToggle}` — the pieces every
  template composes so the base features feel identical across templates.
- Demo assets: `public/demo/photos/*.webp` (generated, referenced by `_shared/demo-photos.ts`) and
  `public/audio/library/still-light.wav` (synthesised by `scripts/gen-demo-audio.mjs`).

### Scripts

| Script | Purpose |
| --- | --- |
| `node scripts/verify-templates.mjs <outDir>` | Headless phone-size walkthrough of every template with screenshots (needs `npm run dev` + `npx playwright install chromium`). |
| `node scripts/capture-thumbnails.mjs` | Regenerates `public/templates/<slug>/poster.jpg` and `preview.webm` for the gallery. |
| `node scripts/gen-demo-audio.mjs` | Re-renders the demo ambient track. |

### Adding a template

1. `mkdir src/templates/<slug>` and create the five files above.
2. Add its manifest to `manifests.ts`, and a dynamic import to `registry.ts` and `schemas.ts` so it
   code-splits (a unit test checks all three agree). A page that only lists templates must import
   `manifests.ts`: reaching the loaders from a server component ships every template to that page.
3. Put static assets in `public/templates/<slug>/` (textures, lottie, poster, webm).
4. Respect the quality bar: 60fps on a mid-range Android, < 2MB before user media, loading screen
   with the sender's name, spring easings, `prefers-reduced-motion` variant, portrait + landscape.
5. Add a demo-data entry with real-sounding copy — the gallery and editor use it.

The editor builds its form from the base schema plus the template's `schema.ts`; the recipient page
and gallery demo use the same `GiftRenderer`. Nothing else needs to change.
